# Lukuhullu

Henkilökohtainen lukupäiväkirja, jossa oma lukuhistoria kohtaa muiden käyttäjien
lukukertoja julkisessa selailunäkymässä — ei arvosanoja, vaan vapaamuotoisia
kommentteja ja lukijamääriä.

**[lukuhullu.tuukkap.com](https://lukuhullu.tuukkap.com)**

## Mikä sovellus on

Kirjaa lukemasi, kesken jättämäsi ja lukulistalla odottavat kirjat — vähintään
vuoden tarkkuudella, halutessasi kuukauden ja päivän tarkkuudella. Sama kirja
saa esiintyä useaan kertaan, koska uudelleenlukeminen on sallittua ja
tarkoituksella tuettu ominaisuus.

Kirjatiedot haetaan automaattisesti Open Librarystä ja Google Booksista, tai
kirjan saa lisätä käsin jos API ei löydä osumaa. Olemassa oleva lukuhistoria
(esim. Goodreadsista) voidaan tuoda massana CSV:nä, esikatselu- ja
korjausvaiheen kautta ennen tallennusta.

Jokainen luettu tai kesken jäänyt kirja näkyy myös **Selaa**-välilehdellä
kaikille käyttäjille: lukijamäärä, mahdolliset nimelliset kommentit, ja
uusimmat kirjat + eniten lukukertoja/kommentteja keränneet kirjat nousevat
kärkeen. Muu data — lukuvuosi, omistustyyppi, omat tagit — pysyy yksityisenä.

## Ominaisuudet

- Kirjasto neljällä statuksella: aion lukea / luen parhaillaan / luettu / jäi kesken
- Julkinen, nimellinen kommentointi + suosituimmuusjärjestykseen (lukukerrat + kommentit) perustuva, sivutettu Selaa-feed
- Haku omasta tietokannasta, Open Librarystä ja Google Booksista — myös ISBN:llä
- Massatuonti omalla CSV-formaatilla tai suoraan Goodreadsin vientitiedostolla, esikatselu ennen tallennusta
- Eri painosten ja kieliversioiden manuaalinen niputus samaksi teokseksi
- Kansikuvan käsin korjaus, jos API:n tarjoama on puuttuva tai väärä
- Vapaat omat tagit + API:n ehdottamat genret kategorisointiin

## Tech stack

| | |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4 |
| Backend | Node.js, Express |
| Tietokanta | PostgreSQL (Neon) |
| Autentikointi | Clerk |
| Kirjadata | Open Library API, Google Books API (fallback) |
| Hosting | GitHub Pages (frontend), Hetzner + Coolify (backend) |

## Mitä opin tehdessä

- Ulkoisten API:en rajoitteiden kanssa eläminen: rate limit -kiintiöt,
  eksponentiaalinen viive + jitter, ja miksi "tyhjä mutta validi vastaus" ja
  "tekninen virhe" pitää käsitellä eri tavalla
- Tietomallin suunnittelu jaetulle/yksityiselle datalle samassa taulussa
  (julkiset kommentit + yksityinen lukuvuosi samalla rivillä)
- Ryhmärakenteen (painokset/kieliversiot) pitäminen yksinkertaisena litistämällä
  aina suoraan roottiin sen sijaan että sallisi ketjuja
- Iteratiivinen kehitys: moni ominaisuus (haku, sivutus, niputus) rakennettiin
  ensin yksinkertaisena ja tarkennettiin vasta todellisen käytön paljastamien
  ongelmien perusteella

Tarkempi kuvaus arkkitehtuuripäätöksistä ja niiden perusteluista:
[PAATOKSET.md](./PAATOKSET.md).

## Ajaminen paikallisesti

```bash
# Backend
cd backend
npm install
npm run dev   # http://localhost:3001

# Frontend (uudessa terminaalissa)
cd frontend
npm install
npm run dev   # http://localhost:5173
```

Backend tarvitsee `.env`-tiedoston (`backend/.env`) seuraavilla muuttujilla:
`CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `DATABASE_URL`,
`GOOGLE_BOOKS_API_KEY`, `CORS_ALLOWED_ORIGIN`, valinnaisesti `PORT`.

Frontend tarvitsee `.env`-tiedoston (`frontend/.env` tai `.env.local`):
`VITE_API_BASE_URL`, `VITE_CLERK_PUBLISHABLE_KEY`.
