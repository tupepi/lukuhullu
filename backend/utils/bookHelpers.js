// Jaettu apufunktio kirjojen deduplikointiin books-taulussa.
// Sekä tavallinen kirjan lisäys (routes/userBooks.js) että massatuonti
// (routes/import.js) päätyvät luomaan/hakemaan books-rivin saman kirjan
// tunnisteilla - tämä tiedosto pitää sen logiikan yhdessä paikassa, jottei
// "onko kirja jo tietokannassa" -logiikkaa toisteta kahdessa reitissä.
import pool from "../db.js";

// Etsii olemassa olevan kirjan open_library_id/google_books_id perusteella,
// tai luo uuden rivin books-tauluun jos sitä ei löydy. Palauttaa aina bookId:n.
// Käytetään sekä routes/userBooks.js:n POST-reitissä että routes/import.js:ssä.
export async function findOrCreateBook({
  openLibraryId,
  googleBooksId,
  title,
  author,
  coverUrl,
  yearPublished,
  subjects,
  isbn,
}) {
  // Huom: jos molemmat tunnisteet ovat null (manuaalinen kirjan lisäys ilman
  // API-osumaa, ks. PAATOKSET.md: Manuaalinen kirjan lisäys), tämä kysely ei
  // koskaan löydä osumaa vahingossa. SQL:ssä "sarake = NULL" palauttaa aina
  // NULL (ei true), joten "open_library_id = NULL OR google_books_id = NULL"
  // ei täsmää mihinkään riviin - jokainen manuaalisesti lisätty kirja luo siis
  // aina uuden books-rivin, mikä on haluttu käytös.
  const existing = await pool.query(
    `SELECT id FROM books WHERE open_library_id = $1 OR google_books_id = $2`,
    [openLibraryId || null, googleBooksId || null],
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const inserted = await pool.query(
    `INSERT INTO books (open_library_id, google_books_id, title, author, cover_url, year_published, api_subjects, isbn)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      openLibraryId || null,
      googleBooksId || null,
      title,
      author || null,
      coverUrl || null,
      yearPublished || null,
      subjects || [],
      isbn || null,
    ],
  );
  return inserted.rows[0].id;
}

// Sovellustason validointisäännöt jotka eivät ole tietokannan CHECK-
// rajoituksia (ks. PAATOKSET.md: "read_year ei ole NOT NULL tietokanta-
// tasolla ... varmistetaan sovelluslogiikassa"). Palauttaa virheviestin
// jos jokin sääntö rikkoutuu, muuten null.
export function validateReadingDate({ status, readYear, readMonth, readDay }) {
  if ((status === "read" || status === "abandoned") && !readYear) {
    return "Lukuvuosi (readYear) vaaditaan kun status on read tai abandoned";
  }
  if (readDay && !readMonth) {
    return "Kuukausi (readMonth) vaaditaan jos päivä (readDay) on annettu";
  }
  return null;
}
