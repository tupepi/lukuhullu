// Julkinen selailunäkymä: näyttää kaikki kirjat (TAI KIRJARYHMÄT, jos
// painoksia on yhdistetty) joita joku käyttäjä on merkinnyt luetuksi tai
// kesken jääneeksi, yhdessä kommenttien kanssa.
//
// Ryhmittely tapahtuu nyt work_group_id:n mukaan (ks. utils/workGroup.js
// ja PAATOKSET.md: Painosten ja kieliversioiden niputus), ei enää
// suoraan book_id:n mukaan - eri kieliversiot samasta teoksesta lasketaan
// yhteen jos ne on yhdistetty.

import express from "express";
import { requireAuth } from "@clerk/express";
import pool from "../db.js";

const router = express.Router();

router.get("/", requireAuth(), async (req, res) => {
  try {
    // COALESCE(b.work_group_id, b.id) laskee "rootin" jokaiselle riville
    // suoraan SQL:ssä. root_book-JOIN hakee sen kirjan tiedot jota
    // näytetään RYHMÄN edustajana (globaali kanoninen, ei käyttäjäkohtainen
    // - ks. PAATOKSET.md kahdesta eri kanonisesta käsitteestä).
    const result = await pool.query(`
      SELECT
        ub.status, ub.comment, ub.created_at,
        COALESCE(b.work_group_id, b.id) AS root_id,
        root_book.title, root_book.author, root_book.cover_url, root_book.year_published,
        u.display_name
      FROM user_books ub
      JOIN books b ON ub.book_id = b.id
      JOIN books root_book ON root_book.id = COALESCE(b.work_group_id, b.id)
      LEFT JOIN users u ON ub.clerk_user_id = u.clerk_user_id
      WHERE ub.status IN ('read', 'abandoned')
      ORDER BY ub.created_at DESC
    `);

    // Ryhmittely (rivit -> per kirja/ryhmä-objekti) tehdään täällä JS:ssä
    // SQL:n GROUP BY:n sijaan - tietoinen valinta: pienelle datamäärälle
    // (henkilökohtainen/pieni käyttäjämäärä) tämä on luettavampaa kuin
    // vastaava SQL (array_agg/JSON-aggregointi kommenteille olisi
    // huomattavasti vaikeaselkoisempi), eikä tehokkuusero ole merkityksellinen.
    const bookMap = new Map();

    for (const row of result.rows) {
      if (!bookMap.has(row.root_id)) {
        bookMap.set(row.root_id, {
          bookId: row.root_id, // huom: tämä on nyt ryhmän ROOT-id, ei yksittäisen painoksen id
          title: row.title,
          author: row.author,
          coverUrl: row.cover_url,
          yearPublished: row.year_published,
          latestActivity: row.created_at,
          readerCount: 0,
          abandonedCount: 0,
          comments: [],
        });
      }

      const book = bookMap.get(row.root_id);
      if (row.status === "read") {
        book.readerCount += 1;
      } else {
        book.abandonedCount += 1;
      }

      // display_name-tarkistus on turvaverkko, ei pääasiallinen sääntö:
      // sovelluslogiikka (userBooks.js) estää kommentoinnin jo ennen
      // näyttönimen asettamista, joten tämän ei pitäisi koskaan laueta -
      // mutta jos vanhaa dataa tms. löytyisi ilman nimeä, sitä ei silti
      // näytetä julkisesti nimettömänä (kommentit ovat AINA nimellisiä,
      // ks. PAATOKSET.md: Yksityisyysraja)
      if (row.comment && row.comment.trim() && row.display_name) {
        book.comments.push({
          displayName: row.display_name,
          comment: row.comment,
          status: row.status,
        });
      }
    }

    const books = Array.from(bookMap.values()).sort(
      (a, b) =>
        new Date(b.latestActivity).getTime() -
        new Date(a.latestActivity).getTime(),
    );

    res.json({ results: books });
  } catch (error) {
    console.error("Selailun haku epäonnistui:", error);
    res.status(500).json({ error: "Selailun haku epäonnistui" });
  }
});

export default router;
