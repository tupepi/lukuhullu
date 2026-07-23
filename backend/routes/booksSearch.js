// Tämä tiedosto vastaa kirjahausta ulkoisista API:sta (Open Library + Google Books).
// Ei tee mitään tietokantaoperaatioita - vain hakee ja muotoilee dataa.

import express from "express";

// Router on "mini-sovellus" jonka voi kytkeä pääsovellukseen (index.js)
// tiettyyn polkuun. Tämä pitää reittien logiikan erillään palvelimen
// alustuskoodista.
const router = express.Router();

import pool from "../db.js";

function mapDbRow(row) {
  return {
    source: "database",
    openLibraryId: row.open_library_id,
    googleBooksId: row.google_books_id,
    title: row.title,
    author: row.author,
    coverUrl: row.cover_url,
    yearPublished: row.year_published,
    subjects: row.api_subjects || [],
    isbn: row.isbn,
  };
}

// UUSI: hakee omasta books-taulusta yksinkertaisella osittaisella
// tekstihaulla (ILIKE) - eri periaate kuin massatuonnin pickBestMatch,
// koska tässä käyttäjä syöttää vapaan hakusanan (ei valmiiksi eroteltua
// title/author-paria), joten tarkka pisteytys ei sovellu yhtä hyvin.
// Riittää yksinkertainen "sisältyykö hakusana nimeen tai kirjailijaan".
async function searchOwnDatabase(query) {
  const result = await pool.query(
    `SELECT id, open_library_id, google_books_id, title, author, cover_url, year_published, api_subjects, isbn
     FROM books
     WHERE title ILIKE '%' || $1 || '%' OR author ILIKE '%' || $1 || '%'
     LIMIT 20`,
    [query],
  );
  return result.rows.map(mapDbRow);
}

// ISBN yksilöi täsmälleen oikean painoksen - tarkka WHERE isbn = $1 -haku,
// ei ILIKE-osittaishaku kuten yllä.
async function searchOwnDatabaseByIsbn(isbn) {
  const result = await pool.query(
    `SELECT id, open_library_id, google_books_id, title, author, cover_url, year_published, api_subjects, isbn
     FROM books
     WHERE isbn = $1
     LIMIT 20`,
    [isbn],
  );
  return result.rows.map(mapDbRow);
}

// Poistaa duplikaatit yhdistetystä tulosjoukosta. Sama kirja voi löytyä
// sekä omasta tietokannasta ETTÄ ulkoisesta hausta (esim. jos oma tietokanta
// antoi alle 5 tulosta ja täydensimme Open Librarystä, joka löytää saman
// kirjan uudelleen sen omalla ID:llä). Avain on openLibraryId/googleBooksId
// jos saatavilla, muuten title+author-yhdistelmä. "Ensimmäinen voittaa" -
// koska oma tietokanta haetaan aina ensin, sen versio säilyy duplikaatin
// sattuessa (looginen, koska se on jo sovelluksemme kanoninen tietue).
function deduplicateResults(results) {
  const seen = new Set();
  const deduped = [];
  for (const result of results) {
    const key =
      result.openLibraryId ||
      result.googleBooksId ||
      `${result.title}|${result.author}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(result);
    }
  }
  return deduped;
}

// Poistaa väliviivat/välilyönnit ja normalisoi ISBN-10:n tarkistusmerkin
// isoksi X:ksi, jotta sama ISBN tunnistuu riippumatta käyttäjän syöttämästä
// muodosta (esim. "978-951-1-...", "978 951 1 ...").
function normalizeIsbn(str) {
  return str.replace(/[\s-]/g, "").toUpperCase();
}

// Pelkkä muotovalidointi (10 tai 13 merkkiä oikeassa muodossa) riittää
// päättämään ohjataanko haku ISBN-polkuun - tarkistusmerkin laskennallinen
// validointi ei ole tarpeen tässä, koska väärän ISBN:n haku palauttaa vain
// tyhjän tuloksen (ei virhettä).
function isIsbn(str) {
  return /^\d{9}[\dX]$/.test(str) || /^\d{13}$/.test(str);
}

// Open Libraryn dedikoitu ISBN-rajapinta (bibkeys/jscmd=data) - eri asia
// kuin search.json, jonka työtasoiset tulokset eivät luotettavasti sisällä
// oikeaa painoskohtaista ISBN:ää (ks. mapOpenLibraryResult). Tämä hakee
// suoraan sen yhden painoksen tiedot jolla on annettu ISBN.
async function searchOpenLibraryByIsbn(isbn) {
  const response = await fetchWithRetry(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
  );
  if (!response) return null;
  const data = await response.json();
  const book = data[`ISBN:${isbn}`];
  if (!book) return null;

  // publish_date voi olla esim. "1994", "March 1994" tai "1994-03-15" -
  // poimitaan ensimmäinen 4-numeroinen jakso vuodeksi.
  const yearMatch = book.publish_date?.match(/\d{4}/);

  return {
    source: "openlibrary",
    openLibraryId: book.key || null,
    googleBooksId: null,
    title: book.title,
    author: book.authors ? book.authors[0]?.name : null,
    coverUrl: book.cover?.medium || null,
    yearPublished: yearMatch ? parseInt(yearMatch[0]) : null,
    subjects: book.subjects
      ? book.subjects.slice(0, 10).map((s) => s.name)
      : [],
    // Haettiin juuri tällä ISBN:llä - ei tarvetta poimia sitä vastauksesta.
    isbn,
  };
}

// ISBN yksilöi täsmälleen oikean painoksen, joten toisin kuin
// searchBooksByQuery (joka täydentää tuloksia usealla lähteellä kunnes
// tuloksia on ≥5), tässä riittää ensimmäinen lähde joka löytää osuman -
// sama "oma tietokanta voittaa" -periaate kuin yleisessä haussa.
async function searchBooksByIsbn(isbn) {
  const dbResults = await searchOwnDatabaseByIsbn(isbn);
  if (dbResults.length > 0) return dbResults;

  const olResult = await searchOpenLibraryByIsbn(isbn);
  if (olResult) return [olResult];

  // Google Booksin q=isbn:{ISBN} on dokumentoitu ja luotettava kysely -
  // toisin kuin Open Libraryn search.json, Google Books palauttaa aina
  // täsmälleen kyseisen painoksen industryIdentifiers-listan.
  return (await searchGoogleBooks(`isbn:${isbn}`)) || [];
}

export async function searchBooksByQuery(query) {
  const normalized = normalizeIsbn(query);
  if (isIsbn(normalized)) {
    return searchBooksByIsbn(normalized);
  }

  let results = await searchOwnDatabase(query);

  if (results.length < 5) {
    const olResults = (await searchOpenLibrary(query)) || [];
    results = [...results, ...olResults];
  }
  if (results.length < 5) {
    const gbResults = (await searchGoogleBooks(query)) || [];
    results = [...results, ...gbResults];
  }

  return deduplicateResults(results);
}

// Open Libraryn hakuvastaus on omassa muodossaan (esim. doc.key, doc.author_name
// on lista jne). Tämä funktio muuntaa yhden Open Library -tuloksen samaan
// "yhteiseen muotoon" jota koko sovellus käyttää, riippumatta mistä kirja
// alunperin löytyi.
function mapOpenLibraryResult(doc) {
  return {
    source: "openlibrary", // kertoo frontendille/debug-tarkoituksiin mistä data tuli
    openLibraryId: doc.key, // esim. "/works/OL45804W" - uniikki tunniste Open Libraryssä
    googleBooksId: null, // ei relevantti tälle lähteelle
    title: doc.title,
    // author_name on lista (kirjalla voi olla useita kirjailijoita) -
    // otetaan yksinkertaisuuden vuoksi vain ensimmäinen
    author: doc.author_name ? doc.author_name[0] : null,
    // cover_i on Open Libraryn sisäinen kansikuvan ID - rakennetaan siitä
    // suora URL heidän kansikuvapalvelimelleen. "-M" tarkoittaa "medium"-kokoa.
    coverUrl: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : null,
    yearPublished: doc.first_publish_year || null,
    // subject-lista voi sisältää kymmeniä/satoja tageja - rajataan 10 ekaan
    // ettei tietokantaan/frontendiin päädy kohtuutonta määrää dataa
    subjects: doc.subject ? doc.subject.slice(0, 10) : [],
    // Open Libraryn search.json on työtasoinen rajapinta eikä anna
    // luotettavaa painoskohtaista ISBN:ää - tietoinen rajaus, ei poimintaa
    // tässä vaiheessa (ks. PAATOKSET.md)
    isbn: null,
  };
}

// Sama muunnos Google Books -tulokselle. Huomaa että kenttien nimet ovat
// erilaisia (volumeInfo-objektin sisällä), mutta lopputulos on identtinen
// muotoinen kuin Open Libraryn versiossa - tämä on koko pointti: frontend
// ei koskaan tarvitse tietää kumpi lähde on kyseessä.
function mapGoogleBooksResult(item) {
  const info = item.volumeInfo;
  // industryIdentifiers on lista {type, identifier}-objekteja, esim.
  // [{type: "ISBN_10", identifier: "..."}, {type: "ISBN_13", identifier: "..."}].
  // ISBN_13 suositaan jos molemmat löytyvät (nykyaikaisempi, kattavampi standardi).
  const identifiers = info.industryIdentifiers || [];
  const isbn13 = identifiers.find((i) => i.type === "ISBN_13");
  const isbn10 = identifiers.find((i) => i.type === "ISBN_10");
  const isbn = isbn13?.identifier || isbn10?.identifier || null;

  return {
    source: "googlebooks",
    openLibraryId: null,
    googleBooksId: item.id,
    title: info.title,
    author: info.authors ? info.authors[0] : null,
    // Google Books käyttää imageLinks.thumbnail eikä erillistä ID:tä
    coverUrl: info.imageLinks ? info.imageLinks.thumbnail : null,
    // publishedDate on merkkijono esim. "2019-03-15" tai pelkkä "2019" -
    // otetaan aina 4 ensimmäistä merkkiä ja muunnetaan numeroksi
    yearPublished: info.publishedDate
      ? parseInt(info.publishedDate.slice(0, 4))
      : null,
    subjects: info.categories || [],
    isbn,
  };
}

// Hakee annetun URL:in, ja yrittää uudelleen VAIN jos palvelin palautti
// virhestatuksen (esim. 503 "backendFailed", 429 rate limit). EI yritä
// uudelleen jos vastaus on kelvollinen mutta tulos tyhjä (numFound/
// totalItems: 0) - olemme käytännössä todistaneet (ks. PAATOKSET.md:
// massatuonnin hakulogiikka) että nämä kaksi ovat rakenteellisesti eri
// vastauksia eikä jälkimmäisessä uudelleenyritys auttaisi.
//
// Viive noudattaa Googlen omaa suositusta (ks. PAATOKSET.md): 429-virheelle
// (kiintiö ylittyi) vähintään 30s odotus, koska lyhyempi ei todennäköisesti
// ehdi nollata kiintiötä. 500/503-virheille (hetkellinen palvelinvika)
// eksponentiaalinen viive alkaen 1s, tuplaantuen joka yrityksellä, katossa
// 8s - tämä vastaa Googlen IAM-dokumentaation kaavaa (1s, 2s, 4s, 8s...).
// Molempiin lisätään "jitter" (satunnainen lisäys) estämään usean
// rinnakkaisen työläisen (ks. utils/concurrency.js) samanaikaista
// uudelleenyritystä samalla hetkellä.
async function fetchWithRetry(
  url,
  {
    maxRetries = 5,
    baseDelayMs = 1500,
    maxDelayMs = 10000,
    maxRetriesFor429 = 1,
  } = {},
) {
  let lastStatus = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url);
    if (response.ok) {
      return response;
    }

    lastStatus = response.status;

    // 429:lle oma, huomattavasti pienempi yritysraja - pitkä viive (35s+)
    // yhdistettynä moneen yritykseen voisi venyttää yhden rivin käsittelyn
    // useiksi minuuteiksi, mikä uhkaisi koko /preview-pyynnön aikakatkaisua
    // (ks. PAATOKSET.md: massatuonnin hakulogiikka)
    const isLastAttemptFor429 =
      lastStatus === 429 && attempt >= maxRetriesFor429;
    if (attempt === maxRetries || isLastAttemptFor429) {
      break;
    }

    let delay;
    if (lastStatus === 429) {
      delay = 35_000 + Math.random() * 5_000;
    } else {
      const exponential = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      delay = exponential + Math.random() * exponential * 0.5;
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  console.error(`Toistuva virhe (${lastStatus}) osoitteelle ${url}`);
  return null;
}

export async function searchOpenLibrary(query, language) {
  const langParam = language ? `&language=${language}` : "";
  const response = await fetchWithRetry(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}${langParam}&limit=20`,
  );
  // null = yhteys/palvelinvirhe kaikkien uudelleenyritysten jälkeenkin -
  // ERI ASIA kuin tyhjä taulukko (= kysyttiin onnistuneesti, ei löytynyt
  // mitään). Tämä ero on tärkeä routes/import.js:n kolmivaiheiselle
  // tila-erottelulle (matched/suggestions/no_results/connection_error).
  if (!response) return null;
  const data = await response.json();
  return (data.docs || []).map(mapOpenLibraryResult);
}

export async function searchGoogleBooks(query, language) {
  const langParam = language ? `&langRestrict=${language}` : "";
  const response = await fetchWithRetry(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}${langParam}&key=${process.env.GOOGLE_BOOKS_API_KEY}&maxResults=20`,
  );
  if (!response) return null;
  const data = await response.json();
  return (data.items || []).map(mapGoogleBooksResult);
}

// GET /api/books/search?q=hakusana
// (polun alkuosa /api/books/search määritellään index.js:ssä kun tämä
// router kytketään - tässä tiedostossa käytetään vain suhteellista '/')
router.get("/", async (req, res) => {
  const query = req.query.q;

  // Ilman hakusanaa ei ole mitään järkevää haettavaa - palautetaan heti
  // selkeä virhe sen sijaan että yritettäisiin hakea tyhjällä merkkijonolla
  if (!query) {
    return res.status(400).json({ error: "Hakusana (q) puuttuu" });
  }

  try {
    const results = await searchBooksByQuery(query);
    res.json({ results });
  } catch (error) {
    // Jos jompikumpi API on esim. hetkellisesti alhaalla tai vastaus on
    // odottamattomassa muodossa, ei kaadeta koko palvelinta - palautetaan
    // siisti 500-virhe ja kirjataan tarkempi syy palvelimen lokiin debugausta varten
    console.error("Kirjahaku epäonnistui:", error);
    res.status(500).json({ error: "Haku epäonnistui" });
  }
});

export default router;
