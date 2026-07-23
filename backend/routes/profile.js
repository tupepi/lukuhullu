// Käyttäjän oma julkinen profiili (toistaiseksi vain näyttönimi).
// Erillään userBooks.js:stä, koska tämä ei liity kirjoihin vaan
// käyttäjän omaan identiteettiin sovelluksessa.
// Liittyy PAATOKSET.md:n "Julkinen selailu ja kommentit" -päätökseen: koska
// kommentit näytetään julkisesti nimellä varustettuna, tarvitaan erillinen
// users-taulu (clerk_user_id, display_name) - Clerkin profiilia ei kutsuta
// suoraan joka näyttökerralla, koska se olisi liian raskasta.

import express from "express";
import { requireAuth, getAuth } from "@clerk/express";
import pool from "../db.js";

const router = express.Router();

// GET /api/profile - hakee oman profiilin. Frontend käyttää tätä
// tarkistaakseen onko display_name jo asetettu (jos ei, näytetään
// kertaluontoinen "aseta näyttönimesi" -kehote).
router.get("/", requireAuth(), async (req, res) => {
  const { userId } = getAuth(req);

  try {
    const result = await pool.query(
      `SELECT clerk_user_id, display_name FROM users WHERE clerk_user_id = $1`,
      [userId],
    );

    // Rivi voi hyvin puuttua (uusi käyttäjä ei ole vielä asettanut nimeä) -
    // tämä ei ole virhe, palautetaan vain null jotta frontend osaa näyttää
    // asetuslomakkeen sen sijaan että kaadutaan 404:ään
    if (result.rows.length === 0) {
      return res.json({ displayName: null });
    }
    res.json({ displayName: result.rows[0].display_name });
  } catch (error) {
    console.error("Profiilin haku epäonnistui:", error);
    res.status(500).json({ error: "Profiilin haku epäonnistui" });
  }
});

// PUT /api/profile - asettaa tai päivittää oman näyttönimen.
// Body: { displayName: string }
router.put("/", requireAuth(), async (req, res) => {
  const { userId } = getAuth(req);
  const { displayName } = req.body;

  if (!displayName || !displayName.trim()) {
    return res.status(400).json({ error: "displayName ei voi olla tyhjä" });
  }

  try {
    // "Upsert": jos rivi on jo olemassa (ON CONFLICT), päivitetään se sen
    // sijaan että yritettäisiin luoda duplikaatti clerk_user_id:lle
    // (joka on PRIMARY KEY, joten pelkkä INSERT epäonnistuisi toisella kerralla)
    const result = await pool.query(
      `INSERT INTO users (clerk_user_id, display_name)
       VALUES ($1, $2)
       ON CONFLICT (clerk_user_id) DO UPDATE SET display_name = $2
       RETURNING clerk_user_id, display_name`,
      [userId, displayName.trim()],
    );
    res.json({ displayName: result.rows[0].display_name });
  } catch (error) {
    console.error("Profiilin päivitys epäonnistui:", error);
    res.status(500).json({ error: "Profiilin päivitys epäonnistui" });
  }
});

export default router;
