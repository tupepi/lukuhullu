// API-reitit painosten/kieliversioiden manuaaliseen niputukseen (ks.
// PAATOKSET.md: Painosten ja kieliversioiden niputus). Itse ryhmittelylogiikka
// (root-ratkaisu, litistys) asuu utils/workGroup.js:ssä - tämä tiedosto vain
// validoi pyynnöt, kutsuu sitä logiikkaa ja muotoilee HTTP-vastaukset.
// Kytketty index.js:ssä polkuun /api/books, joten reitit ovat lopulta
// /api/books/ensure, /api/books (GET), /api/books/:bookId/merge, /unmerge,
// /editions ja /cover-url.
import express from "express";
import { requireAuth } from "@clerk/express";
import pool from "../db.js";
import {
  resolveRoot,
  getGroupMembers,
  mergeBooks,
  unmergeBook,
} from "../utils/workGroup.js";
import { findOrCreateBook } from "../utils/bookHelpers.js";

const router = express.Router();

// POST /api/books/ensure - varmistaa että ulkoisesta hausta löytynyt
// kirja on olemassa omassa books-taulussa, palauttaa sen book_id:n.
// Käytetään BookSearch.tsx:ssä: käyttäjä klikkaa hakutulosta, tämä reitti
// tallentaa kirjan tarvittaessa, ja frontend navigoi saatuun bookId:hen
// BookDetail-sivulle - siellä AddEntryForm hoitaa varsinaisen lisäyksen
// (ja sen mukana tulevan read_year-validoinnin, ks. PAATOKSET.md).
router.post("/ensure", requireAuth(), async (req, res) => {
  const {
    openLibraryId,
    googleBooksId,
    title,
    author,
    coverUrl,
    yearPublished,
    subjects,
    isbn,
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: "title on pakollinen" });
  }

  try {
    const bookId = await findOrCreateBook({
      openLibraryId,
      googleBooksId,
      title,
      author,
      coverUrl,
      yearPublished,
      subjects,
      isbn,
    });
    res.json({ bookId });
  } catch (error) {
    console.error("Kirjan varmistus epäonnistui:", error);
    res.status(500).json({ error: "Kirjan varmistus epäonnistui" });
  }
});

router.post("/:bookId/merge", requireAuth(), async (req, res) => {
  const { bookId } = req.params;
  const { targetBookId, targetExternal } = req.body;

  try {
    // Kaksi tapaa antaa kohde: joko valmis sisäinen bookId (jos kohde on
    // jo tietokannassamme), tai ulkoisen haun tulos (targetExternal) josta
    // luodaan/etsitään kirja ensin - tämä mahdollistaa suoran "hae ja
    // yhdistä samalla kertaa" -käytön ilman erillistä lisäysvaihetta
    let resolvedTargetId = targetBookId;
    if (!resolvedTargetId && targetExternal) {
      resolvedTargetId = await findOrCreateBook(targetExternal);
    }
    if (!resolvedTargetId) {
      return res
        .status(400)
        .json({ error: "targetBookId tai targetExternal vaaditaan" });
    }

    const result = await mergeBooks(Number(bookId), Number(resolvedTargetId));
    res.json(result);
  } catch (error) {
    console.error("Yhdistäminen epäonnistui:", error);
    res.status(500).json({ error: "Yhdistäminen epäonnistui" });
  }
});

// POST /api/books/:bookId/unmerge - irrottaa kirjan ryhmästään
router.post("/:bookId/unmerge", requireAuth(), async (req, res) => {
  const { bookId } = req.params;
  try {
    await unmergeBook(Number(bookId));
    res.status(204).send();
  } catch (error) {
    console.error("Irrottaminen epäonnistui:", error);
    res.status(500).json({ error: "Irrottaminen epäonnistui" });
  }
});

// GET /api/books/:bookId/editions - listaa kirjan ryhmän kaikki painokset
router.get("/:bookId/editions", requireAuth(), async (req, res) => {
  const { bookId } = req.params;
  try {
    const rootId = await resolveRoot(Number(bookId));
    const members = await getGroupMembers(rootId);
    res.json({
      rootId,
      editions: members.map((m) => ({
        bookId: m.id,
        openLibraryId: m.open_library_id, // UUSI: tarvitaan hakutulosten suodatukseen
        googleBooksId: m.google_books_id, // UUSI
        title: m.title,
        author: m.author,
        coverUrl: m.cover_url,
        yearPublished: m.year_published,
        isRoot: m.id === rootId,
      })),
    });
  } catch (error) {
    console.error("Painosten haku epäonnistui:", error);
    res.status(500).json({ error: "Painosten haku epäonnistui" });
  }
});

// GET /api/books/ - listaa kaikki ryhmät.
// HUOM: created_at on mukana koska frontendin pickRepresentative
// (utils/libraryGrouping.ts) tarvitsee sen valitakseen ryhmän varhaisimman
// jäsenen edustajaksi - aiemmin puuttui täältä, mikä rikkoi lajittelun
// hiljaisesti (ks. PAATOKSET.md: "GET /api/books tyypitetään..."-kohta).
router.get("/", requireAuth(), async (req, res) => {
  try {
    let query = `
      SELECT  b.id, b.title, b.author, b.cover_url, b.year_published, b.api_subjects,
            b.created_at,
            COALESCE(b.work_group_id, b.id) AS work_group_root_id
      FROM books b
      ORDER BY b.created_at DESC`;
    const result = await pool.query(query);
    res.json({ results: result.rows });
  } catch (error) {
    console.error("Kirjaston haku epäonnistui:", error);
    res.status(500).json({ error: "Kirjaston haku epäonnistui" });
  }
});

// PUT /api/books/:bookId/cover-url - päivittää kirjan kansikuvan URL:n
// käsin. Books-taulu on jaettu kaikkien käyttäjien kesken, joten tämä
// vaikuttaa siihen mitä KAIKKI näkevät - tarkoituksellista, koska
// korjataan yhteinen virhe (Open Libraryn/Google Booksin väärä/puuttuva
// kansikuva) kaikille kerralla. Kuka tahansa kirjautunut käyttäjä saa
// muokata (ei omistajuustarkistusta), koska kansikuva ei ole kenenkään
// henkilökohtaista dataa.
router.put("/:bookId/cover-url", requireAuth(), async (req, res) => {
  const { bookId } = req.params;
  const { coverUrl } = req.body;

  if (!coverUrl || typeof coverUrl !== "string" || !coverUrl.trim()) {
    return res.status(400).json({ error: "coverUrl on pakollinen" });
  }

  try {
    const result = await pool.query(
      `UPDATE books SET cover_url = $1 WHERE id = $2 RETURNING id, cover_url`,
      [coverUrl.trim(), bookId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Kirjaa ei löytynyt" });
    }
    res.json({ bookId: result.rows[0].id, coverUrl: result.rows[0].cover_url });
  } catch (error) {
    console.error("Kansikuvan päivitys epäonnistui:", error);
    res.status(500).json({ error: "Kansikuvan päivitys epäonnistui" });
  }
});

export default router;
