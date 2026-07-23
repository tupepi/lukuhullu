// Molemmat kutsujat (Library/index.tsx omilla UserBook-riveillään ja
// EditionManagement.tsx bookGroups-riveillään BookGroupEntry) tarvitsevat
// vain nämä kolme kenttää - funktiot on siksi tehty geneerisiksi tämän
// minimirajapinnan yli sen sijaan että ne olisi sidottu jompaankumpaan
// konkreettiseen tyyppiin. Tämä myös pakottaa TypeScriptin valittamaan jos
// jompikumpi tyyppi joskus unohtaa jonkin näistä kentistä (kuten kävi
// aiemmin created_at:lle, ks. PAATOKSET.md).
interface Groupable {
  work_group_root_id: number;
  cover_url: string | null;
  created_at: string;
}

// Yksinkertainen merkkijonon hajautusfunktio (djb2-tyyppinen). Ei tarvitse
// kryptografista vahvuutta - vain deterministinen, tasaisesti jakautuva
// numero jota käytetään värin ja kallistuskulman valintaan, jotta sama
// kirja näyttää aina samalta eri latauskerroilla.
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

// Ryhmittelee rivit work_group_root_id:n mukaan. Palauttaa taulukon
// taulukoita - jokainen sisätaulukko on yhden ryhmän kaikki rivit
// (yleensä vain yksi, useampi vain jos painoksia on yhdistetty tai
// samaa painosta luettu useaan kertaan).
export function groupByWorkRoot<T extends Groupable>(entries: T[]): T[][] {
  const map = new Map<number, T[]>();
  for (const entry of entries) {
    const key = entry.work_group_root_id;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(entry);
  }
  return Array.from(map.values());
}

// Valitsee mikä RIVI (user_books-merkintä, ei pelkkä painos) ryhmästä
// näytetään "edustavana" Kirjastoni-listan pääriviksi (otsikko, kirjailija,
// klikkauskohde) - loput ryhmän rivit näytetään sen alla alalistana.
//
// Eri asia kuin Selaa-näkymän globaali kanoninen (joka on aina ryhmän
// varhaisin lisätty kirja koko palvelussa, riippumatta käyttäjän omista
// merkinnöistä) - tämä valinta tehdään vain käyttäjän OMISTA merkinnöistä
// (`group`), ei koko ryhmän kaikista painoksista.
//
// Valintajärjestys (ks. PAATOKSET.md: "Kanoninen käsite"):
// 1. Käyttäjän omista merkinnöistä ne joilla on cover_url (ei null),
//    niistä varhaisin created_at:n mukaan.
// 2. Jos yhdelläkään omalla merkinnällä ei ole cover_url:ia, valitaan
//    yksinkertaisesti varhaisin created_at:n mukaan riippumatta kansikuvasta.
export function pickRepresentative<T extends Groupable>(group: T[]): T {
  const withCover = group.filter((e) => e.cover_url !== null);
  const pool = withCover.length > 0 ? withCover : group;
  // [...pool] kopioi taulukon ennen sort():ia, koska Array.sort mutatoi
  // paikallaan - ilman kopiointia tämä sekoittaisi myös alkuperäisen
  // `group`-järjestyksen jota käytetään alalistan renderöintiin alempana.
  return [...pool].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )[0];
}
