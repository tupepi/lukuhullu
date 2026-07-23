// Painosten/kieliversioiden niputuslogiikka (ks. PAATOKSET.md: Painosten ja
// kieliversioiden niputus). Koska automaattinen niputus API-datan perusteella
// ei ole luotettavaa, ryhmät muodostetaan manuaalisesti käyttäjän toimesta
// (routes/bookGroups.js kutsuu näitä funktioita). Rakenne pidetään aina
// LITISTETTYNÄ (ei ketjuja): jokainen ei-root-kirja osoittaa work_group_id:llä
// suoraan ryhmän rootiin, ei koskaan toiseen ei-root-kirjaan. Tämä on
// tietoinen valinta yksinkertaisuuden vuoksi - ilman sitä root pitäisi
// selvittää rekursiivisella kyselyllä joka kerta kun ryhmän tietoa tarvitaan
// (esim. discover.js/bookDetail.js:n tilastolaskennassa).
import pool from "../db.js";

// Selvittää kirjan ryhmän "rootin" (kanonisen kirjan). Koska yhdistäminen
// tehdään aina suoraan rootiin (ei ketjuja, ks. mergeBooks alempana),
// riittää yksi haku - work_group_id osoittaa aina suoraan rootiin, ei
// koskaan toiseen ei-root-kirjaan.
export async function resolveRoot(bookId) {
  const result = await pool.query(
    `SELECT work_group_id FROM books WHERE id = $1`,
    [bookId],
  );
  if (result.rows.length === 0) {
    throw new Error(`Kirjaa ${bookId} ei löytynyt`);
  }
  return result.rows[0].work_group_id ?? bookId;
}

// Palauttaa kaikki ryhmän jäsenet (mukaan lukien root itse)
export async function getGroupMembers(rootId) {
  const result = await pool.query(
    `SELECT id, open_library_id, google_books_id, title, author, cover_url, year_published, created_at
     FROM books WHERE id = $1 OR work_group_id = $1
     ORDER BY created_at ASC`,
    [rootId],
  );
  return result.rows;
}

// Yhdistää kahden kirjan ryhmät yhdeksi. Uudeksi rootiksi tulee se kirja
// (kummankin ryhmän rooteista) jolla on varhaisin created_at - tämä toteuttaa
// päätöksen "globaali kanoninen = varhaisin lisätty koko ryhmässä".
export async function mergeBooks(bookIdA, bookIdB) {
  const rootA = await resolveRoot(bookIdA);
  const rootB = await resolveRoot(bookIdB);

  if (rootA === rootB) {
    return { rootId: rootA, alreadyMerged: true };
  }

  const rootsResult = await pool.query(
    `SELECT id, created_at FROM books WHERE id = $1 OR id = $2`,
    [rootA, rootB],
  );
  const [first, second] = rootsResult.rows.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const newRoot = first.id;
  const oldRoot = second.id;

  // Yksi UPDATE riittää: se osoittaa sekä vanhan rootin itsensä että KAIKKI
  // sen olemassa olevat jäsenet suoraan uuteen rootiin - tämä on se
  // "litistys" joka estää ketjujen syntymisen (ks. tiedoston yläosan kommentti)
  await pool.query(
    `UPDATE books SET work_group_id = $1 WHERE id = $2 OR work_group_id = $2`,
    [newRoot, oldRoot],
  );

  return { rootId: newRoot, alreadyMerged: false };
}

// Irrottaa yhden kirjan ryhmästään. Kolme tapausta, järjestyksessä
// yksinkertaisimmasta monimutkaisimpaan:
export async function unmergeBook(bookId) {
  const bookResult = await pool.query(
    `SELECT work_group_id FROM books WHERE id = $1`,
    [bookId],
  );
  if (bookResult.rows.length === 0) {
    throw new Error(`Kirjaa ${bookId} ei löytynyt`);
  }
  const currentGroupId = bookResult.rows[0].work_group_id;

  // Tapaus 1: kirja on ryhmän JÄSEN (ei root) - yksinkertaisin tapaus,
  // irrotetaan se vain asettamalla oma viittaus nulliksi
  if (currentGroupId !== null) {
    await pool.query(`UPDATE books SET work_group_id = NULL WHERE id = $1`, [
      bookId,
    ]);
    return;
  }

  // Kirja on joko itsenäinen (ei jäseniä) tai koko ryhmän ROOT.
  // Tarkistetaan onko sillä jäseniä.
  const membersResult = await pool.query(
    `SELECT id, created_at FROM books WHERE work_group_id = $1 ORDER BY created_at ASC`,
    [bookId],
  );

  // Tapaus 2: ei jäseniä - kirja oli jo itsenäinen, ei tehtävää
  if (membersResult.rows.length === 0) {
    return;
  }

  // Tapaus 3: kirja on ROOT jolla on jäseniä. Koska tätä rootia poistetaan
  // ryhmästä, ryhmä tarvitsee uuden rootin - valitaan jäljelle jäävistä
  // jäsenistä varhaisin (sama sääntö kuin mergeBooks:issa).
  const newRoot = membersResult.rows[0].id;

  // Uusi root irtoaa ensin omasta (vanhasta) viittauksestaan
  await pool.query(`UPDATE books SET work_group_id = NULL WHERE id = $1`, [
    newRoot,
  ]);
  // Kaikki MUUT jäljelle jäävät jäsenet (paitsi juuri irrotettu alkuperäinen
  // root, joka ei enää kuulu ryhmään, ja paitsi uusi root joka on jo NULL)
  // osoitetaan uuteen rootiin
  await pool.query(
    `UPDATE books SET work_group_id = $1 WHERE work_group_id = $2 AND id != $1`,
    [newRoot, bookId],
  );
  // bookId itse pysyy NULL:na (se oli jo NULL koska oli root) - se on nyt itsenäinen
}
