// CSV-rivien jäsennys massatuontia varten (ks. PAATOKSET.md: UI-periaatteet /
// Massatuonti). Kaksi tuettua formaattia: oma yksinkertainen CSV ja
// Goodreadsin export-formaatti - molemmat jäsennetään samaan yhtenäiseen
// muotoon jota routes/import.js:n buildPreviewRow käyttää eteenpäin.

// ---- Oman CSV-formaatin jäsennys ----
// title,year,author,ownership,comment - tämä formaatti edustaa aina jo
// luettuja kirjoja (historiadataa), joten status on aina 'read'.
export function parseOwnRow(row) {
  return {
    title: row.title?.trim() || null,
    author: row.author?.trim() || null,
    isbn: null,
    status: "read",
    readYear: row.year ? parseInt(row.year, 10) : null,
    readMonth: null,
    readDay: null,
    ownership: ["physical", "ebook", "none"].includes(row.ownership)
      ? row.ownership
      : undefined,
    comment: row.comment?.trim() || undefined,
  };
}

// ---- Goodreads-formaatin jäsennys ----

// Goodreads kirjoittaa ISBN:t muodossa ="0141439513" (Excel-yhteensopivuuden
// vuoksi, jotta Excel ei tulkitse numeroa ja pudota etunollia). Poistetaan
// kaikki paitsi numerot ja mahdollinen X (ISBN-10:n tarkistusmerkki voi
// olla kirjain X).
export function stripIsbn(value) {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9Xx]/g, "");
  return cleaned.length > 0 ? cleaned : null;
}

// Goodreadsin "Exclusive Shelf" on aina yksi kolmesta arvosta. Huomaa ettei
// Goodreadsin vakiovienti erottele "jäi kesken" -tilaa omaksi arvoksi -
// käyttäjät merkitsevät sen yleensä omalla vapaalla hyllyllä (Bookshelves),
// jota emme tässä yksinkertaisuuden vuoksi erikseen tulkitse.
export const SHELF_TO_STATUS = {
  read: "read",
  "currently-reading": "reading",
  "to-read": "to_read",
};

export function parseGoodreadsDate(value) {
  // Goodreadsin "Date Read" -muoto on "YYYY/MM/DD"
  if (!value) return { year: null, month: null, day: null };
  const parts = value.split("/").map((p) => parseInt(p, 10));
  return {
    year: parts[0] || null,
    month: parts[1] || null,
    day: parts[2] || null,
  };
}

export function parseGoodreadsRow(row) {
  const { year, month, day } = parseGoodreadsDate(row["Date Read"]);
  // ISBN13 ensisijainen (täsmällisempi), ISBN (10-numeroinen) fallbackina
  const isbn = stripIsbn(row["ISBN13"]) || stripIsbn(row["ISBN"]);
  const binding = (row["Binding"] || "").toLowerCase();
  const ownedCopies = parseInt(row["Owned Copies"], 10) || 0;

  // Karkea heuristiikka omistustyypille - Goodreads ei erottele tätä
  // suoraan yhtä selkeästi kuin meidän oma skeemamme
  let ownership;
  if (binding.includes("kindle") || binding.includes("ebook")) {
    ownership = "ebook";
  } else if (ownedCopies > 0) {
    ownership = "physical";
  }

  return {
    title: row["Title"]?.trim() || null,
    author: row["Author"]?.trim() || null,
    isbn,
    status: SHELF_TO_STATUS[row["Exclusive Shelf"]] || "to_read",
    readYear: year,
    readMonth: month,
    readDay: day,
    ownership,
    comment: row["My Review"]?.trim() || undefined,
  };
}
