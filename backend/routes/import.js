// Massatuonti: CSV:n jäsennys (oma formaatti tai Goodreads-vienti),
// kunkin rivin kirjan tunnistus (ensin omasta tietokannasta, sitten
// ulkoisista API:sta), ja lopulta valittujen rivien tallennus.
// Ks. PAATOKSET.md: Massatuonti-osio täydellistä perustelua varten.

import express from "express";
import Papa from "papaparse";
import { requireAuth, getAuth } from "@clerk/express";
import pool from "../db.js";
import {
  searchOpenLibrary,
  searchGoogleBooks,
  searchBooksByQuery,
} from "./booksSearch.js";
import { pickBestMatch, rankCandidates } from "../utils/matching.js";
import { findOrCreateBook, validateReadingDate } from "../utils/bookHelpers.js";
import { mapWithConcurrencyLimit } from "../utils/concurrency.js";
import { parseOwnRow, parseGoodreadsRow } from "../utils/csvParsers.js";

const router = express.Router();

const MATCH_OPTIONS = { minTitleSimilarity: 0.75, minScore: 60 };
const SUGGESTION_COUNT = 10;

// Hakee KOKO oman books-taulun kertaalleen ennen CSV:n rivien käsittelyä.
// Näin jokainen rivi voi tarkistaa osuuko se johonkin jo tietokannassa
// olevaan kirjaan ILMAN ulkoista API-kutsua - säästää sekä aikaa että
// Google Booksin/Open Libraryn kiintiötä. Henkilökohtaisen projektin
// datamäärillä koko taulun hakeminen kerralla on selvästi yksinkertaisempi
// ja nopeampi ratkaisu kuin rivikohtainen tekstihaku SQL:ssä.
async function getOwnBooksAsCandidates() {
  const result = await pool.query(
    `SELECT id, open_library_id, google_books_id, title, author, cover_url, year_published, api_subjects
     FROM books`,
  );
  return result.rows.map((row) => ({
    source: "database",
    openLibraryId: row.open_library_id,
    googleBooksId: row.google_books_id,
    title: row.title,
    author: row.author,
    coverUrl: row.cover_url,
    yearPublished: row.year_published,
    subjects: row.api_subjects || [],
    // Sisäinen kirja-ID - tarvitaan koska manuaalisesti lisätyillä kirjoilla
    // sekä openLibraryId että googleBooksId voivat olla null, jolloin
    // findOrCreateBook:in normaali ID-pohjainen tunnistus ei toimisi
    // (SQL: null = null ei ole koskaan tosi). Kun tämä kenttä on asetettu,
    // /confirm käyttää sitä suoraan sen sijaan että etsisi/loisi kirjaa
    // uudelleen ID:iden perusteella.
    localBookId: row.id,
  }));
}

// Palauttaa aina saman muotoisen tuloksen: { status, match, suggestions }.
// Neljä mahdollista tilaa:
//  - 'matched': löytyi riittävän hyvä osuma (omasta tietokannasta tai
//    ulkoisesta hausta)
//  - 'suggestions': haku(ja) onnistui teknisesti ja löysi ehdokkaita,
//    mutta mikään ei ylittänyt hyväksymiskynnystä - näytetään parhaat
//    top 5 valittavaksi
//  - 'no_results': haku(ja) onnistui teknisesti mutta ehdokkaita ei ollut
//    yhtään (aito "kirjaa ei ole tietokannoissa")
//  - 'connection_error': KAIKKI ulkoiset haut epäonnistuivat teknisesti
//    (yhteysvirhe uudelleenyritystenkin jälkeen) - emme tiedä olisiko
//    kirjaa löytynyt, eri tilanne kuin 'no_results'
async function findBestMatch(parsed, ownBooks) {
  const localMatch = pickBestMatch(parsed, ownBooks, MATCH_OPTIONS);
  if (localMatch) {
    return { status: "matched", match: localMatch, suggestions: [] };
  }

  const query = parsed.author
    ? `${parsed.title} ${parsed.author}`
    : parsed.title;
  const [olResults, gbResults] = await Promise.all([
    searchOpenLibrary(query),
    searchGoogleBooks(query),
  ]);

  if (olResults === null && gbResults === null) {
    return { status: "connection_error", match: null, suggestions: [] };
  }

  const externalCandidates = [...(olResults || []), ...(gbResults || [])];
  const allCandidates = [...ownBooks, ...externalCandidates];

  const match = pickBestMatch(parsed, allCandidates, MATCH_OPTIONS);
  if (match) {
    return { status: "matched", match, suggestions: [] };
  }

  // Oma tietokanta: tiukka suodatus (sama kynnys kuin varsinainen osuma),
  // koska joukko on kohdistamaton - kaikki sovelluksen kirjat.
  const ownSuggestions = rankCandidates(
    parsed,
    ownBooks,
    SUGGESTION_COUNT,
    MATCH_OPTIONS,
  );

  // Ulkoiset tulokset: EI omaa pisteytystä - haku oli jo kohdistettu juuri
  // tähän nimeen/kirjailijaan, joten API:n oma järjestys riittää. Tämä
  // sallii myös eri kieliset käännökset ehdotuksiksi (esim. "Into the
  // Water" haulle "Tummiin vesiin Paula Hawkins"), koska tekstillinen
  // samankaltaisuus ei koskaan toimisi niiden välillä.
  const remainingSlots = SUGGESTION_COUNT - ownSuggestions.length;
  const suggestions = [
    ...ownSuggestions,
    ...externalCandidates.slice(0, remainingSlots),
  ];

  if (suggestions.length === 0) {
    return { status: "no_results", match: null, suggestions: [] };
  }

  return { status: "suggestions", match: null, suggestions };
}

async function buildPreviewRow(parsed, rowIndex, ownBooks) {
  if (!parsed.title) {
    return {
      rowIndex,
      parsed,
      status: "no_results",
      match: null,
      suggestions: [],
      error: "Kirjan nimi puuttuu",
    };
  }

  // ISBN yksilöi tarkalleen oikean painoksen - ei tarvita pisteytystä
  // eikä kolmivaiheista erottelua, luotetaan suoraan ensimmäiseen tulokseen.
  if (parsed.isbn) {
    try {
      const results = await searchBooksByQuery(parsed.isbn);
      const match = results[0] || null;
      return {
        rowIndex,
        parsed,
        match,
        suggestions: [],
        error: null,
        status: match ? "matched" : "no_results",
      };
    } catch (err) {
      console.error("ISBN-haku epäonnistui:", err);
      return {
        rowIndex,
        parsed,
        status: "connection_error",
        match: null,
        suggestions: [],
        error: null,
      };
    }
  }

  try {
    const result = await findBestMatch(parsed, ownBooks);
    return { rowIndex, parsed, ...result, error: null };
  } catch (err) {
    console.error("Haku epäonnistui tuonnin esikatselussa:", err);
    return {
      rowIndex,
      parsed,
      status: "connection_error",
      match: null,
      suggestions: [],
      error: null,
    };
  }
}

// POST /api/import/preview - jäsentää CSV:n ja hakee ehdotetut osumat,
// EI tallenna mitään tietokantaan
router.post("/preview", requireAuth(), async (req, res) => {
  const { format, csv } = req.body;

  if (!csv || !format) {
    return res.status(400).json({ error: "format ja csv ovat pakollisia" });
  }

  // Toisin kuin useimmat reitit tässä sovelluksessa, tämä käsittelijä tekee
  // työtä (CSV-jäsennys, useita tietokanta-/ulkoisia kutsuja) ennen
  // vastaustaan - try/catch koko rungon ympärillä varmistaa että esim.
  // tietokantavirhe getOwnBooksAsCandidates:issa palauttaa siistin 500:n
  // muiden reittien tapaan sen sijaan että pyyntö jäisi roikkumaan.
  try {
    const parseResult = Papa.parse(csv, { header: true, skipEmptyLines: true });
    if (parseResult.errors.length > 0) {
      // Papaparse raportoi rivikohtaisia varoituksia (esim. epätasainen
      // sarakemäärä jollain rivillä) - kirjataan lokiin mutta ei keskeytetä,
      // koska data on usein silti suurelta osin käyttökelpoista
      console.warn("CSV-jäsennysvaroituksia:", parseResult.errors);
    }

    const parsedRows = parseResult.data.map((row) =>
      format === "goodreads" ? parseGoodreadsRow(row) : parseOwnRow(row),
    );

    // Haetaan oma kirjakanta VAIN KERRAN koko CSV:tä varten, ei per rivi
    const ownBooks = await getOwnBooksAsCandidates();

    const previewRows = await mapWithConcurrencyLimit(
      parsedRows,
      2,
      (parsed, rowIndex) => buildPreviewRow(parsed, rowIndex, ownBooks),
    );

    res.json({ rows: previewRows });
  } catch (error) {
    console.error("Tuonnin esikatselu epäonnistui:", error);
    res.status(500).json({ error: "Tuonnin esikatselu epäonnistui" });
  }
});

// POST /api/import/confirm - tallentaa käyttäjän hyväksymät rivit.
// Body: { items: [...] } - jokainen kohde samassa muodossa kuin
// POST /api/user-books odottaa, plus valinnainen existingBookId.
//
// Huom kommenttien julkisuudesta: emme tarkista tässä erikseen onko
// käyttäjällä display_name asetettuna (kuten routes/userBooks.js tekee),
// koska App.tsx estää koko sovelluksen käytön - myös tuontinäkymän - ennen
// kuin näyttönimi on asetettu. Tarkistus olisi siis aina joka tapauksessa
// läpäisty tähän mennessä.
router.post("/confirm", requireAuth(), async (req, res) => {
  const { userId } = getAuth(req);
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ error: "items-taulukko puuttuu tai on tyhjä" });
  }

  const result = { inserted: 0, failed: [] };

  // Peräkkäin (ei rinnakkain) - tässä ei enää tehdä ulkoisia API-kutsuja,
  // vain tietokantakirjoituksia, joten nopeus ei ole ongelma. Peräkkäisyys
  // pitää virheenkäsittelyn yksinkertaisena (yksi epäonnistunut rivi ei
  // vaikuta muihin).
  for (const item of items) {
    // Sama sovellustason validointi kuin routes/userBooks.js:ssä
    // (read_year pakollinen read/abandoned-tilassa, read_day vaatii
    // read_month:in) - massatuonnissa virheellinen rivi ei kaada koko
    // tuontia, vaan päätyy failed-listalle ja muut rivit käsitellään silti.
    const dateError = validateReadingDate({
      status: item.status,
      readYear: item.readYear,
      readMonth: item.readMonth,
      readDay: item.readDay,
    });
    if (dateError) {
      result.failed.push({ title: item.title || null, error: dateError });
      continue;
    }

    try {
      // Jos frontend tietää jo oikean sisäisen book_id:n (osuma omasta
      // tietokannasta esikatselussa), käytetään sitä suoraan - ei yritetä
      // etsiä/luoda kirjaa uudelleen ID:iden perusteella.
      const bookId =
        item.existingBookId ||
        (await findOrCreateBook({
          openLibraryId: item.openLibraryId,
          googleBooksId: item.googleBooksId,
          title: item.title,
          author: item.author,
          coverUrl: item.coverUrl,
          yearPublished: item.yearPublished,
          subjects: item.subjects,
        }));

      await pool.query(
        `INSERT INTO user_books (clerk_user_id, book_id, status, read_year, read_month, read_day, ownership, comment)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          bookId,
          item.status,
          item.readYear || null,
          item.readMonth || null,
          item.readDay || null,
          item.ownership || null,
          item.comment || null,
        ],
      );
      result.inserted += 1;
    } catch (err) {
      console.error("Tuontirivin tallennus epäonnistui:", err);
      result.failed.push({
        title: item.title || null,
        error: "Tallennus epäonnistui",
      });
    }
  }

  res.status(201).json(result);
});

export default router;
