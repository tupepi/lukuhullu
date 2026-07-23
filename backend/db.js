// Tämä tiedosto vastaa yhdestä asiasta: PostgreSQL-tietokantayhteyden luonnista.
// "Single responsibility" -periaate - kaikki muut tiedostot importtaavat tämän
// saman yhteyden sen sijaan että jokainen loisi oman yhteytensä.

import pg from "pg";

const { Pool } = pg;

// Pool ylläpitää useita valmiiksi avattuja tietokantayhteyksiä ja jakaa niitä
// pyyntöjen kesken automaattisesti. Ilman Pool:ia jokainen kysely joutuisi
// avaamaan ja sulkemaan yhteyden erikseen, mikä on hidasta ja tuhlaa resursseja
// kun sovelluksella on useita samanaikaisia käyttäjiä.
const pool = new Pool({
  // connectionString sisältää kaiken tarvittavan (host, portti, käyttäjätunnus,
  // salasana, tietokannan nimi) yhtenä URL-muotoisena merkkijonona.
  // Löytyy Neon-konsolista, tallennettu .env-tiedostoon DATABASE_URL-nimellä.
  connectionString: process.env.DATABASE_URL,

  // Neon vaatii SSL-salatun yhteyden. rejectUnauthorized: false tarkoittaa
  // että emme validoi Neonin SSL-sertifikaattia täysin tiukasti - tämä on
  // yleisesti hyväksytty tapa pilvitietokantojen (kuten Neon) kanssa, koska
  // liikenne on silti salattua, vaikka emme tee sertifikaattiketjun tarkistusta.
  ssl: { rejectUnauthorized: false },
});

// Viedään pool ulos, jotta muut tiedostot (esim. routes/userBooks.js) voivat
// tehdä tietokantakyselyitä samaa yhteyttä käyttäen.
export default pool;
