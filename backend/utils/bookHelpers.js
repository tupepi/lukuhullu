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
  localBookId,
  openLibraryId,
  googleBooksId,
  title,
  author,
  coverUrl,
  yearPublished,
  subjects,
  isbn,
}) {
  // Jos kutsuja jo tietää books-rivin id:n (esim. haku omasta tietokannasta,
  // ks. routes/booksSearch.js:n mapDbRow), käytetään sitä suoraan eikä
  // yritetä etsiä/luoda riviä uudelleen tunnisteiden perusteella - sama
  // oikotie kuin routes/import.js:n existingBookId. Tämä on pakollista
  // manuaalisesti lisätyille/aiemmin duplikoituneille kirjoille, joilla
  // sekä open_library_id että google_books_id ovat null (ks. kommentti alla).
  if (localBookId) {
    return localBookId;
  }

  // Huom: jos molemmat tunnisteet ovat null (manuaalinen kirjan lisäys ilman
  // API-osumaa, ks. PAATOKSET.md: Manuaalinen kirjan lisäys), tämä kysely ei
  // koskaan löydä osumaa vahingossa. SQL:ssä "sarake = NULL" palauttaa aina
  // NULL (ei true), joten "open_library_id = NULL OR google_books_id = NULL"
  // ei täsmää mihinkään riviin - jokainen kutsu luo siis aina uuden
  // books-rivin kun molemmat tunnisteet ovat null. Tämä on haluttu käytös
  // AINOASTAAN kun kutsuja ei vielä tiedä books-rivin id:tä (esim. tuore
  // manuaalinen lisäys tai ulkoisen API:n hakutulos) - jos id on jo tiedossa
  // (esim. haku omasta tietokannasta, ks. localBookId yllä), kutsujan pitää
  // käyttää sitä id:tä suoraan eikä kutsua tätä funktiota tunnisteiden
  // kanssa, tai jokainen kutsu luo vahingossa uuden duplikaattikirjan
  // (ks. PAATOKSET.md: bugikorjaus "luetuksi-merkintä loi duplikaatin
  // painoksen", routes/userBooks.js:n POST-reitin bookId-oikotie).
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
