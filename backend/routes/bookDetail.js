// Kirjan yksityiskohtainen näkymä (BookDetail, ks. PAATOKSET.md): yhdistää
// yhden TIETYN painoksen omat tiedot ja koko RYHMÄN (kaikkien painosten/
// kieliversioiden, ks. Painosten ja kieliversioiden niputus) yli lasketun
// julkisen tilastodatan (lukijamäärä, kommentit). Käyttäjän oma muokkaus
// (status/vuosi/kommentti) haetaan erikseen routes/userBooks.js:n
// GET /api/user-books?bookId=-reitillä, ei tästä tiedostosta.
import express from "express";
import { requireAuth } from "@clerk/express";
import pool from "../db.js";

const router = express.Router();

router.get("/:bookId", requireAuth(), async (req, res) => {
  const { bookId } = req.params;

  try {
    // 1. Sen TIETYN painoksen tiedot jota käyttäjä katsoo juuri nyt -
    // näytetään sellaisenaan yläosassa, ei ryhmän edustajan tietoja
    const bookResult = await pool.query(
      `SELECT id, open_library_id, google_books_id, title, author, cover_url, year_published, api_subjects, work_group_id
       FROM books WHERE id = $1`,
      [bookId],
    );

    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: "Kirjaa ei löytynyt" });
    }
    const book = bookResult.rows[0];
    // Sama sääntö kuin utils/workGroup.js:n resolveRoot: jos work_group_id
    // on NULL, kirja on itsenäinen tai jo ryhmänsä root - silloin se ON itse rootId.
    const rootId = book.work_group_id ?? book.id;

    // 2. Julkinen tilastodata KOKO RYHMÄN yli - kaikki painokset/kieliversiot
    // joiden work_group_id osoittaa samaan rootiin, PLUS root itse
    const entriesResult = await pool.query(
      `SELECT ub.status, ub.comment, u.display_name
       FROM user_books ub
       JOIN books b ON ub.book_id = b.id
       LEFT JOIN users u ON ub.clerk_user_id = u.clerk_user_id
       WHERE (b.id = $1 OR b.work_group_id = $1) AND ub.status IN ('read', 'abandoned')`,
      [rootId],
    );

    let readerCount = 0;
    let abandonedCount = 0;
    const comments = [];

    for (const row of entriesResult.rows) {
      if (row.status === "read") readerCount += 1;
      else abandonedCount += 1;

      if (row.comment && row.comment.trim() && row.display_name) {
        comments.push({
          displayName: row.display_name,
          comment: row.comment,
          status: row.status,
        });
      }
    }

    res.json({
      bookId: book.id,
      rootId, // frontend tarvitsee tämän mm. painosten yhdistämiseen ja navigointiin ryhmän muihin painoksiin
      openLibraryId: book.open_library_id,
      googleBooksId: book.google_books_id,
      title: book.title,
      author: book.author,
      coverUrl: book.cover_url,
      yearPublished: book.year_published,
      subjects: book.api_subjects,
      readerCount,
      abandonedCount,
      comments,
    });
  } catch (error) {
    console.error("Kirjan tiedon haku epäonnistui:", error);
    res.status(500).json({ error: "Kirjan tiedon haku epäonnistui" });
  }
});

export default router;
