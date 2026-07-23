// Tämä tiedosto vastaa käyttäjän oman kirjaston hallinnasta:
// kirjan lisäys, listaus, muokkaus ja poisto (CRUD) user_books-tauluun.
// Kaikki reitit tässä tiedostossa vaativat kirjautumisen (requireAuth()).
// Vastaa myös kommentin julkisuustarkistuksesta (näyttönimi pakollinen ennen
// kommentointia, ks. PAATOKSET.md: Julkinen selailu ja kommentit) ja
// palauttaa work_group_root_id-tiedon GET-listauksessa painosniputusta
// varten (ks. PAATOKSET.md: Painosten ja kieliversioiden niputus).

import express from "express";
import { requireAuth, getAuth } from "@clerk/express";
import pool from "../db.js"; // '../' koska db.js on yksi kansio ylempänä
import { findOrCreateBook, validateReadingDate } from "../utils/bookHelpers.js";
import { mergeBooks } from "../utils/workGroup.js";

const router = express.Router();

// Kommentti näkyy julkisesti nimellä varustettuna (ks. PAATOKSET.md:
// Julkinen selailu ja kommentit). Tämä tarkistaa onko käyttäjällä jo
// asetettu näyttönimi ennen kuin kommentti sallitaan tallentaa.
async function hasDisplayName(userId) {
  const result = await pool.query(
    `SELECT 1 FROM users WHERE clerk_user_id = $1`,
    [userId],
  );
  return result.rows.length > 0;
}

// POST /api/user-books - lisää kirja käyttäjän kirjastoon.
// Käsittelee samalla myös sen, että itse kirjaa (books-taulun rivi) ei
// välttämättä ole vielä olemassa - se luodaan tarvittaessa ensin.
router.post("/", requireAuth(), async (req, res) => {
  // getAuth(req) lukee Clerkin middlewaren (clerkMiddleware, kytketty
  // index.js:ssä) jo validoiman tokenin tiedot. userId on Clerkin oma
  // käyttäjätunniste, esim. "user_2abc123...".
  const { userId } = getAuth(req);

  const {
    openLibraryId,
    googleBooksId,
    title,
    author,
    coverUrl,
    yearPublished,
    subjects,
    isbn,
    status,
    readYear,
    readMonth,
    readDay,
    ownership,
    comment,
  } = req.body;

  // Vähimmäisvaatimus: pitää tietää mikä kirja ja missä tilassa (to_read/
  // reading/read). Muut kentät voivat olla tyhjiä (esim. jos käyttäjä ei
  // muista tarkkaa lukuvuotta vielä).
  if (!title || !status) {
    return res.status(400).json({ error: "title ja status ovat pakollisia" });
  }

  const dateError = validateReadingDate({
    status,
    readYear,
    readMonth,
    readDay,
  });
  if (dateError) {
    return res.status(400).json({ error: dateError });
  }

  // Jos kommentti annetaan heti lisäyksen yhteydessä, vaaditaan että
  // näyttönimi on jo asetettu (kommentti on julkinen)
  if (comment && comment.trim() && !(await hasDisplayName(userId))) {
    return res.status(412).json({
      error: "Aseta näyttönimesi ennen kommentointia",
      code: "DISPLAY_NAME_REQUIRED",
    });
  }

  try {
    // 1. Tarkistetaan onko tämä kirja jo aiemmin lisätty books-tauluun
    // (esim. toisen käyttäjän toimesta, tai tämän käyttäjän aiemmalla
    // lukukerralla). Haetaan joko Open Libraryn tai Google Booksin ID:llä.
    //
    // Huom: jos molemmat ID:t ovat null (manuaalinen lisäys, ei API-osumaa),
    // "null = null" on SQL:ssä aina epätosi - tämä rivi ei siis koskaan
    // löydä väärää kirjaa manuaalisen lisäyksen yhteydessä.
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

    // 2. Nyt kun tiedetään bookId (joko vanha tai juuri luotu), lisätään
    // varsinainen käyttäjäkohtainen rivi. Huomaa ettei tässä estetä
    // duplikaatteja - sama book_id voi esiintyä käyttäjällä useaan kertaan,
    // koska saman kirjan uudelleenlukeminen on tarkoituksella sallittu
    // (ks. PAATOKSET.md: Duplikaatit-osio).
    const insertUserBook = await pool.query(
      `INSERT INTO user_books (clerk_user_id, book_id, status, read_year, read_month, read_day, ownership, comment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        bookId,
        status,
        readYear || null,
        readMonth || null,
        readDay || null,
        ownership || null,
        comment || null,
      ],
    );

    // 201 Created on HTTP-standardin mukainen status-koodi onnistuneelle
    // resurssin luonnille (erotuksena esim. 200 OK:sta joka sopii hauille)
    res.status(201).json(insertUserBook.rows[0]);
  } catch (error) {
    console.error("Kirjan lisäys epäonnistui:", error);
    res.status(500).json({ error: "Kirjan lisäys epäonnistui" });
  }
});

// GET /api/user-books - listaa kirjautuneen käyttäjän kirjat.
// Tukee valinnaisia suodattimia query-parametreina, esim:
// /api/user-books?status=read&year=2023
router.get("/", requireAuth(), async (req, res) => {
  const { userId } = getAuth(req);
  const { status, year, bookId, groupRootId } = req.query; // UUSI: groupRootId

  try {
    let query = `
      SELECT ub.*, b.title, b.author, b.cover_url, b.year_published, b.api_subjects,
             COALESCE(b.work_group_id, b.id) AS work_group_root_id
      FROM user_books ub
      JOIN books b ON ub.book_id = b.id
      WHERE ub.clerk_user_id = $1
    `;
    const params = [userId];

    if (status) {
      params.push(status);
      query += ` AND ub.status = $${params.length}`;
    }
    if (year) {
      params.push(year);
      query += ` AND ub.read_year = $${params.length}`;
    }
    if (bookId) {
      params.push(bookId);
      query += ` AND ub.book_id = $${params.length}`;
    }
    // UUSI: hakee kaikki käyttäjän omat merkinnät KOKO RYHMÄSTÄ, ei vain
    // yhdestä painoksesta - käytetään BookDetailissa näyttämään "Omat
    // merkintäsi" ryhmätasolla riippumatta mitä yksittäistä painosta
    // parhaillaan katsotaan (ks. PAATOKSET.md).
    if (groupRootId) {
      params.push(groupRootId);
      query += ` AND COALESCE(b.work_group_id, b.id) = $${params.length}`;
    }

    query += ` ORDER BY ub.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ results: result.rows });
  } catch (error) {
    console.error("Kirjaston haku epäonnistui:", error);
    res.status(500).json({ error: "Kirjaston haku epäonnistui" });
  }
});

// PUT /api/user-books/:id - muokkaa yhtä käyttäjän omaa kirjaa
// (esim. statuksen vaihto to_read -> read, kommentin lisäys, tagit)
router.put("/:id", requireAuth(), async (req, res) => {
  const { userId } = getAuth(req);
  const { id } = req.params; // URL-polusta, esim. /api/user-books/42 -> id = "42"
  const {
    status,
    readYear,
    readMonth,
    readDay,
    ownership,
    comment,
    userTags,
    newBookId,
  } = req.body;

  const dateError = validateReadingDate({
    status,
    readYear,
    readMonth,
    readDay,
  });
  if (dateError) {
    return res.status(400).json({ error: dateError });
  }

  if (comment && comment.trim() && !(await hasDisplayName(userId))) {
    return res.status(412).json({
      error: "Aseta näyttönimesi ennen kommentointia",
      code: "DISPLAY_NAME_REQUIRED",
    });
  }

  // newBookId: valinnainen kentän vaihto olemassa olevalle merkinnälle -
  // käyttäjä huomaa jälkikäteen että tarkempi painos löytyy ja vaihtaa
  // suoraan tämän yhden rivin kohdekirjan (ks. PAATOKSET.md: Kanoninen
  // käsite / "Uusi ominaisuus tilalle"). Eri asia kuin EditionsManagerin
  // ryhmien yhdistäminen - tässä ei kosketa work_group_id:tä ollenkaan.
  if (newBookId) {
    const bookExists = await pool.query(`SELECT 1 FROM books WHERE id = $1`, [
      newBookId,
    ]);
    if (bookExists.rows.length === 0) {
      return res.status(404).json({ error: "Uutta painosta ei löytynyt" });
    }
  }
  // Jos painosta vaihdetaan, yhdistetään vanha ja uusi kirja samaan
  // ryhmään ENNEN kuin book_id vaihdetaan - muuten uusi painos jäisi
  // omaksi, muusta ryhmästä irralliseksi kirjaksi, ja esim. muiden
  // käyttäjien lukijamäärät/kommentit tästä samasta teoksesta eivät
  // enää löytyisi yhdessä (ks. PAATOKSET.md: painosten niputus).
  if (newBookId) {
    const currentEntry = await pool.query(
      `SELECT book_id FROM user_books WHERE id = $1 AND clerk_user_id = $2`,
      [id, userId],
    );
    if (currentEntry.rows.length > 0) {
      const oldBookId = currentEntry.rows[0].book_id;
      if (oldBookId !== newBookId) {
        await mergeBooks(oldBookId, newBookId);
      }
    }
  }
  try {
    // COALESCE(a, b) palauttaa a:n jos se ei ole null, muuten b:n.
    // Tämän ansiosta frontendin ei tarvitse lähettää KAIKKIA kenttiä joka
    // kerta - jos esim. vain "comment" lähetetään, muut kentät (status,
    // readYear jne, jotka tulevat req.bodysta undefined -> null) säilyvät
    // ennallaan sen sijaan että ne tyhjentyisivät vahingossa.
    const result = await pool.query(
      `UPDATE user_books
       SET status = COALESCE($1, status),
           read_year = COALESCE($2, read_year),
           read_month = COALESCE($3, read_month),
           read_day = COALESCE($4, read_day),
           ownership = COALESCE($5, ownership),
           comment = COALESCE($6, comment),
           user_tags = COALESCE($7, user_tags),
           book_id = COALESCE($8, book_id)
       WHERE id = $9 AND clerk_user_id = $10
       RETURNING *`,
      [
        status,
        readYear,
        readMonth,
        readDay,
        ownership,
        comment,
        userTags,
        newBookId,
        id,
        userId,
      ],
    );

    // WHERE-ehdossa clerk_user_id = $9 on tietoturvan kannalta kriittinen:
    // ilman sitä käyttäjä voisi muokata KENEN TAHANSA riviä arvaamalla id:n.
    // Koska ehto rajaa hakua, mahdollinen "toisen käyttäjän rivi" -yritys
    // palauttaa yksinkertaisesti tyhjän tuloksen (ei paljasta edes että
    // rivi on olemassa jollain toisella käyttäjällä).
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Kirjaa ei löytynyt" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Muokkaus epäonnistui:", error);
    res.status(500).json({ error: "Muokkaus epäonnistui" });
  }
});

// DELETE /api/user-books/:id - poistaa yhden lukukerran/wishlist-rivin
router.delete("/:id", requireAuth(), async (req, res) => {
  const { userId } = getAuth(req);
  const { id } = req.params;

  try {
    // Sama tietoturvaperiaate kuin PUT:ssa: clerk_user_id-ehto estää
    // toisen käyttäjän rivien poistamisen
    const result = await pool.query(
      `DELETE FROM user_books WHERE id = $1 AND clerk_user_id = $2 RETURNING id`,
      [id, userId],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Kirjaa ei löytynyt" });
    }
    // 204 No Content: onnistunut poisto, ei ole mitään sisältöä palautettavaksi
    res.status(204).send();
  } catch (error) {
    console.error("Poisto epäonnistui:", error);
    res.status(500).json({ error: "Poisto epäonnistui" });
  }
});

export default router;
