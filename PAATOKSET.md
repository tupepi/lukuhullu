# Lukuhullu – Arkkitehtuuripäätökset

Tämä dokumentti kerää projektin lukkoon lyödyt päätökset. Päivitetään sitä mukaa
kun keskustelussa sovitaan asioista. Jos chat resetoituu, liitä tämä tiedosto
uuteen keskusteluun kontekstiksi.

## Ohje uudelle keskustelulle (lue tämä ensin)

Jos sinut (Claude) on juuri liitetty tähän projektiin tämän dokumentin kautta:

1. **Lue koko dokumentti ennen kuin teet mitään** — se sisältää sekä päätökset että perustelut niille ("miksi tehtiin näin"), ei vain lopputuloksen.
2. **Tämä dokumentti kuvaa päätökset, ei sisällä koodia.** Jos käyttäjän pyyntö vaatii koodin näkemistä/muokkaamista, pyydä käyttäjää liittämään tuore zip-paketti projektikansiosta (ilman `node_modules`- ja `.git`-kansioita) — älä oleta tietäväsi tarkkaa koodin sisältöä pelkän tämän dokumentin perusteella.
3. **Tarkista "Muutoshistoria"-osion loppupää** — sieltä löytyvät tuoreimmat tiedossa olevat puutteet/tekninen velka (esim. keskeneräiset ominaisuudet, korjaamattomat pienet bugit) joita ei välttämättä ole vielä nostettu esiin päärungon muihin osioihin.
4. **Noudata "Työskentelytapa Claudea hyödyntäen" -osiota** — käyttäjä haluaa selittäen enemmän ja varmistellen etenevää työskentelyä, ei nopeinta mahdollista toteutusta.
5. Jos jokin päärungon kuvaus ja muutoshistorian uusin tieto tuntuvat olevan ristiriidassa keskenään, **luota tuoreimpaan muutoshistorian merkintään** — päärunko pyritään pitämään ajan tasalla mutta se voi jäädä hetkeksi jälkeen nopeiden muutosten aikana.

## Projektin nimi

- **Lukuhullu**

## Projektin tarkoitus

- Oppimismielessä toteutettu projekti, hyödyntäen Claudea apuna
- Tavoitteena myös näyttää tekeminen portfoliossa
- Tästä seuraa käytännön painotuksia:
  - Koodi kannattaa käydä läpi ja ymmärtää, ei vain kopioida sellaisenaan — oppimisarvo tärkeämpi kuin nopein mahdollinen valmistuminen
  - Kannattaa pitää repo siistinä ja hyvin kommentoituna/dokumentoituna alusta asti (README, selkeät commit-viestit), koska se näkyy portfoliossa
  - Kannattaa harkita lyhyttä README:tä joka kertoo mitä sovellus tekee, mitä opit tehdessä, ja mitä teknologioita käytettiin — tämä on portfolion kannalta usein yhtä tärkeä kuin itse koodi
  - Aikataulu (ks. alempaa) todennäköisesti pidempi kuin nopeimman toteutuksen arvio, koska ymmärtäminen vie aikaa nopeuden kustannuksella — tämä on ok ja odotettua

## Työskentelytapa Claudea hyödyntäen

- Koodausvaiheessa edetään selittäen enemmän ja varmistellen, ei vain toteuttaen nopeimmalla tavalla
- Ratkaisujen perusteluja ("miksi tehdään näin") avataan, ei vain kirjoiteta koodia
- Etenemistä varmistellaan käyttäjältä säännöllisesti sen sijaan että oletetaan ja jatketaan suoraan — sopii yhteen oppimis- ja portfoliotarkoituksen kanssa

## Tech stack

- **Frontend:** React + Vite + Tailwind (TypeScript)
- **Backend:** Node + Express
- **Tietokanta:** Neon (Postgres)
- **Auth:** Clerk (@clerk/clerk-react + @clerk/express)
- **Kirjadata:** Open Library API (ensisijainen, ei API-avainta), Google Books API (fallback)
  - Open Library tukee kielisuodatusta (`language:fin` / ISO 639-2 -koodit), mutta suomenkielisten kirjojen/editioiden kattavuus on ohuempi kuin englanninkielisten (data painottuu amerikkalais-/brittiläisiin kirjastolähteisiin)
  - Google Books -fallback on odotettavasti tärkeämmässä roolissa kuin alun perin ajateltiin, koska se indeksoi suomenkielistä kirjallisuutta todennäköisesti laajemmin
  - Hakustrategia lopullisessa muodossaan (yksinkertaistettu monivaiheisesta kokeilusta): ks. "Haku- ja tuontilogiikan lopullinen arkkitehtuuri" -osio

## Ominaisuudet (scope)

- Käyttäjä kirjaa lukemansa kirjat
- Lukemisajankohta: vähintään vuoden tarkkuudella
- Lista kirjoista joita aikoo lukea (`to_read`-tila), lisäksi `reading`- ja `abandoned`-tilat ("jäi kesken")
- Vapaamuotoinen kommentti luetusta kirjasta — **julkinen** kaikille kirjautuneille käyttäjille, nimellä varustettuna (ks. "Julkinen selailu ja kommentit" -osio)
- Omistustyyppi: fyysinen / e-kirja / ei omista
- Useita tapoja kategorisoida ja näyttää kirjoja (kansikuvahylly Kirjastonissa, kortit Selaa-näkymässä)
- Massatuonti olemassa olevalle lukuhistorialle (oma CSV-formaatti tai Goodreads-vienti, ks. "Haku- ja tuontilogiikan lopullinen arkkitehtuuri" -osio)
- Eri painosten/kieliversioiden manuaalinen niputus samaksi teokseksi (ks. "Painosten ja kieliversioiden niputus" -osio)
- Kansikuvan manuaalinen korjaus jos API:sta löytyvä on puuttuva/väärä (ks. "Kansikuvien tallennus/välimuisti" -osio)

## Auth-ratkaisu

- Clerk hoitaa käyttäjähallinnan kokonaan (email, salasanat, profiilit)
- Ei omaa `users`-taulua Neonissa
- `user_books`-taulussa viitataan suoraan `clerk_user_id`-kenttään
- Backend validoi tokenin `@clerk/express`-middlewarella (`requireAuth()`)
- **Huom:** `@clerk/express` vaatii ympäristömuuttujista sekä `CLERK_SECRET_KEY` että `CLERK_PUBLISHABLE_KEY`, vaikka backend käyttää varsinaisesti vain secret keytä — puuttuva publishable key aiheuttaa virheen "Publishable key is missing". Muista tämä myös Render-deployssa (molemmat env-muuttujat sinne).

## Tietokantaskeema (lopullinen, ajettu Neonin SQL-editorissa)

```sql
CREATE TABLE books (
  id SERIAL PRIMARY KEY,
  open_library_id TEXT,
  google_books_id TEXT,
  title TEXT NOT NULL,
  author TEXT,
  cover_url TEXT,
  year_published INT,
  api_subjects TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_books (
  id SERIAL PRIMARY KEY,
  clerk_user_id TEXT NOT NULL,
  book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('to_read', 'reading', 'read', 'abandoned')),
  read_year INT,
  read_month INT CHECK (read_month BETWEEN 1 AND 12),
  read_day INT CHECK (read_day BETWEEN 1 AND 31),
  ownership TEXT CHECK (ownership IN ('physical', 'ebook', 'none')),
  comment TEXT,
  user_tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_books_clerk_user_id ON user_books(clerk_user_id);
CREATE INDEX idx_user_books_status ON user_books(status);
```

Huomioita:

- `read_year` ei ole `NOT NULL` tietokantatasolla, koska `to_read`-tilan rivillä ei vielä ole lukuvuotta — sääntö "read_year pakollinen kun status='read'/'abandoned'" varmistetaan sovelluslogiikassa, ei tietokannan CHECK-lausekkeella (vältetään turha monimutkaisuus)
- `status`-arvot ovat `to_read` / `reading` / `read` / `abandoned` (ks. myös "Uusi status: jäi kesken" -osio)
- Erillistä `categories`/`book_categories`-taulua ei tarvita — kategorisointi hoituu `api_subjects`- ja `user_tags`-taulukkokentillä (ks. Kategorisointi-osio)
- Myöhemmin lisätty `users`-taulu (clerk_user_id, display_name) julkista selailua varten — ks. "Julkinen selailu ja kommentit" -osio

## Lukemisajankohdan tarkkuus

- `read_year` pakollinen, `read_month` ja `read_day` valinnaisia — käyttäjä täyttää niin tarkasti kuin tietää
- Looginen sääntö (validoidaan sovelluslogiikassa): jos `read_day` on täytetty, myös `read_month` täytyy olla täytetty
- Ei erillistä precision-kenttää — tarkkuus pääteltävissä siitä mitkä kentät on täytetty
- UI: päivämäärän syöttö vaiheittain (vuosi → kuukausi valinnainen → päivä valinnainen)

## Kategorisointi

- **API:sta ehdotettuja genrejä/tageja** tallennetaan kirjalle automaattisesti kun kirja haetaan/lisätään:
  - Open Library: `subject` / `subject_key` -kenttä (runsas, epäyhtenäinen sanasto)
  - Google Books: `categories`-kenttä (suppeampi, BISAC-tyylinen)
  - Tallennetaan `books`-tauluun esim. `api_subjects text[]`
- **Käyttäjä voi lisätä omia vapaita avainsanoja/tageja** kirjalle (oma kategorisointi, ei riipu API-datasta)
- **API:n ehdottamat genret eivät ole pakollisia näyttää/käyttää** — ne toimivat lähinnä ehdotuksena/pohjana, käyttäjä valitsee haluaako ottaa ne käyttöön vai kategorisoida täysin itse
- Kaksi tasoa siis: `api_subjects` (automaattinen, taustatieto) + `user_tags` (käyttäjän oma, ensisijainen näytössä/suodatuksessa)

## UI-periaatteet

Kaksi erillistä käyttötilannetta, eri UI-polut:

**Massatuonti (kertaluontoinen historiadata)**

- Käyttäjällä on satoja jo luettuja kirjoja tekstimuotoisena listana (vähintään vuositarkkuudella)
- Käyttäjä järjestää datan itse valmiiksi CSV- tai JSON-muotoon ennen tuontia — ei tarvita regex- tai LLM-pohjaista vapaamuotoisen tekstin parsintaa
- Odotettu formaatti (CSV):
  ```
  title,year,author,ownership,comment
  Puhdistus,2019,Sofi Oksanen,physical,Vaikuttava kirja
  ```
  `title` ja `year` pakollisia, `author`/`ownership`/`comment` valinnaisia
- Sama rakenne JSON-muodossa hyväksytään myös
- **Goodreads-tuki:** tuetaan myös suoraan Goodreadsin oman CSV-viennin formaattia (`goodreads.com/review/import` → "Export Library") omana vaihtoehtona
  - Käyttäjä valitsee etukäteen kumpi formaatti on kyseessä ("Oma CSV" vs "Goodreads-vienti") — ei automaattista tunnistusta
  - Sarakekartoitus: `Title`→title, `Author`→author, `Exclusive Shelf`(read/currently-reading/to-read)→status, `Date Read`→read_year/month/day, `My Review`→comment, `ISBN`→käytetään tarkempaan API-hakuun
  - `My Rating` -saraketta ei käytetä mihinkään (ei rating-ominaisuutta, ks. "Ominaisuudet joita EI oteta mukaan")
- **ISBN-pohjainen haku:** jos rivillä on ISBN (Goodreads-formaatissa usein saatavilla), käytetään sitä ensisijaisena hakuna (`isbn:{ISBN}`-kyselynä samaan Open Library/Google Books -hakulogiikkaan kuin normaali haku), koska se on tarkempi kuin title+author-teksihaku. Jos ISBN puuttuu tai ei löydä osumaa, käytetään title+author-hakua fallbackina
- Backend-reitit: `POST /api/import/preview` (jäsentää CSV:n, hakee ehdotetut osumat, EI tallenna mitään) ja `POST /api/import/confirm` (tallentaa käyttäjän hyväksymät/muokkaamat rivit)
- Esikatselunäkymä ennen tallennusta: rivi + tunnistettu kirja (kansikuva, kirjailija, vuosi) tarkistettavaksi/korjattavaksi
- Vasta esikatselun hyväksynnän jälkeen tallennetaan pysyvästi
- Tarkka hakulogiikka (moni iteraatio, lopullinen yksinkertaistettu muoto): ks. "Haku- ja tuontilogiikan lopullinen arkkitehtuuri" -osio

## Haku- ja tuontilogiikan lopullinen arkkitehtuuri

Hakulogiikka kävi läpi useita iteraatioita (kolmivaiheinen kieli-/kirjailijahaku,
sitten yksinkertaistettu) käytännön testauksen perusteella. Tämä osio kuvaa
**lopullisen** toteutuksen.

**Yleinen haku (Hae-välilehti, "Hae uudelleen", Hallitse painoksia -sivu, ISBN-haku):**
`searchBooksByQuery` (`routes/booksSearch.js`) tarkistaa järjestyksessä:

1. **Oma tietokanta ensin** (`searchOwnDatabase`): yksinkertainen `ILIKE`-tekstihaku
   `books`-taulusta (title tai author sisältää hakusanan). Ei ulkoista kutsua jos
   tämä löytää ≥5 tulosta. Merkitään `source: 'database'`.
2. **Open Library** täydentää jos alle 5 tulosta
3. **Google Books** täydentää jos edelleen alle 5 tulosta
4. Tulokset **poistetaan duplikaateista** (`deduplicateResults`) — sama kirja voi
   löytyä sekä omasta tietokannasta että ulkoisesta hausta; avain on
   `openLibraryId`/`googleBooksId`/`title+author`, oman tietokannan versio
   säilyy duplikaatin sattuessa

**Massatuonnin haku (`routes/import.js`, `findBestMatch`) — yksinkertaistettu yhteen vaiheeseen:**

1. Oma tietokanta (koko `books`-taulu haettu kertaalleen ennen koko CSV:n
   käsittelyä, ei per rivi) — tiukka kynnys (`MATCH_OPTIONS`: title-samankaltaisuus
   ≥0.75, kokonaispisteet ≥60, title 70% + author 30% painotus)
2. Jos ei osu: Open Library + Google Books **rinnakkain** (`Promise.all`), ei
   kielirajausta (kokeiltiin aiemmin 3-vaiheista kieli-/kirjailijahakua, mutta
   yksinkertaistettiin havaittujen rate limit- ja monimutkaisuusongelmien takia)
3. Jos kumpikaan lähde ei löydä riittävän hyvää osumaa: **kolme erillistä
   lopputulostilaa** (ei enää pelkkä "osuma/ei osumaa"):
   - `matched`: riittävän hyvä osuma löytyi
   - `suggestions`: ehdokkaita löytyi muttei riittävän hyviä osumia — näytetään
     top 5 ehdotuksena. **Oman tietokannan ehdotukset** suodatetaan samalla
     tiukalla kynnyksellä kuin varsinainen osuma (muuten oma tietokanta —
     kaikki sovelluksen kirjat — ehdottaa helposti täysin epärelevantteja
     kirjoja). **Ulkoiset ehdotukset EIVÄT käytä pisteytystä ollenkaan** —
     otetaan suoraan API:n ensimmäiset tulokset, koska haku oli jo kohdistettu
     oikeaan nimeen/kirjailijaan ja tekstivertailu ei toimi kieltenvälisesti
     (esim. "Tummiin vesiin" vs. englanninkielinen "Into the Water" -käännös)
   - `no_results`: haku(ja) onnistui teknisesti, ei ehdokkaita/ehdotuksia yhtään
   - `connection_error`: KAIKKI ulkoiset haut epäonnistuivat teknisesti
     (yhteysvirhe uudelleenyritystenkin jälkeen) — eri asia kuin `no_results`,
     koska emme tiedä olisiko kirjaa oikeasti löytynyt

**Virheenkäsittely ja uudelleenyritys (`fetchWithRetry`, `routes/booksSearch.js`):**

- Yritetään uudelleen **vain** jos HTTP-status ei ole 2xx — **ei koskaan** jos
  vastaus on kelvollinen mutta tyhjä (`numFound`/`totalItems: 0`), koska nämä on
  käytännössä todistettu kahdeksi rakenteellisesti eri tilanteeksi (validoitu
  suoraan Open Libraryn ja Google Booksin omista vastauksista)
- Eksponentiaalinen viive + jitter tavalliselle palvelinvirheelle (esim. 503):
  `baseDelayMs=1500`, tuplaantuu joka yrityksellä, katto `maxDelayMs=10000`
- **429 (kiintiö ylittyi) käsitellään erikseen**: huomattavasti pidempi viive
  (~35-40s, Googlen oman suosituksen mukaisesti ≥30s) ja **oma pienempi
  yritysraja** (`maxRetriesFor429=1`) — pitkä viive + monta yritystä yhdessä
  venyttäisi yhden rivin käsittelyn minuutteihin ja riskeeraisi koko
  `/api/import/preview`-pyynnön aikakatkaisun
- `maxRetries=5` yleisesti (ei 429:lle)
- Funktiot palauttavat `null`:n (ei `[]`) jos kaikki yritykset epäonnistuivat
  teknisesti — tämä `null` vs. tyhjä-taulukko-ero mahdollistaa `connection_error`
  vs. `no_results` -erottelun yllä

**Rinnakkaisuus massatuonnissa (`utils/concurrency.js`, `mapWithConcurrencyLimit`):**

- Rinnakkaisten "työläisten" määrä laskettu 5:stä **2:een** — havaittu että
  korkeampi rinnakkaisuus pahentaa Google Booksin rate limit -herkkyyttä
  (purskeinen kuorma), vaikka osa epävakaudesta on myös Googlen omaa yleistä
  epävakautta (todistettu: `503 backendFailed` esiintyy myös ilman meidän
  kuormaamme)
- **1000ms viive** jokaisen työläisen peräkkäisten rivien välissä (ei koko CSV:n
  kokonaisviive — vain yhden työläisen sisäinen tahti)

**Lähdemerkinnät UI:ssa:** `source`-kenttä (`'openlibrary'` / `'googlebooks'` /
`'database'`) näytetään käyttäjälle vaimealla tekstillä sekä hakutuloksissa että
tuonnin ehdotuksissa. `'database'` näytetään tekstillä **"Lukuhullu"** (ei "Oma
kirjasto", koska data on jaettu kaikkien käyttäjien kesken, ei vain yhden oma).

**Opittua Google Books -kiintiöistä (ei enää avointa, mutta hyvä muistaa):**

- "Queries per minute per user" ja "Queries per day" ovat **eri** kiintiöitä,
  molemmat oletuksena rajallisia (100/min, 1000/päivä)
- Kiintiö lasketaan **pyyntöjen määrän mukaan, ei tulosten (`maxResults`) mukaan**
  — yksi iso pyyntö on aina halvempi kuin monta pientä
- API:n pois/päälle-kytkeminen **ei** nollaa kiintiötä — vain aikaikkunan
  vaihtuminen (päiväkiintiö keskiyöllä Tyynenmeren ajassa) nollaa sen
- "Apply for higher quota" -linkki Google Books -kiintiösivulla on laajalti
  raportoitu toimimattomaksi/umpikujaksi kehittäjäyhteisössä; laskutuksen
  käyttöönotto saattaa auttaa mutta ei taattu
- 503-virheet **todennäköisesti** lasketaan silti kiintiöön muiden Google-
  rajapintojen käytännön perusteella (ei virallista vahvistusta juuri Books
  API:lle) — tämä puoltaa 429:n erillistä, säästeliäämpää käsittelyä yllä

**Jatkuva käyttö (uudet kirjat eteenpäin)**

- Mobiili ja työpöytä: haku + lisää-lomake, yksi kirja kerrallaan (ei tarvetta massalisäykselle enää tuonnin jälkeen)

**Selailu (alkuperäinen suunnitelma, ei toteutunut sellaisenaan — ks. tarkka lopullinen kuvaus "Julkinen selailu ja kommentit" -osiosta)**

- Kirjastoni: kansikuvahylly (CSS Grid, ks. UI-tyylittelyn muutoshistoria) toteutui suunnitelman mukaisesti
- Selaa: päätyi kortteihin (kansikuva + tiedot rinnakkain, kommentit alla, responsiivinen 1–2 sarakkeen ruudukko) ilman suodatinchippejä — "vuosi/status/omistustyyppi/tagi"-suodattimia ei koskaan toteutettu, koska Selaa on julkinen aikajana kaikkien käyttäjien lukukerroista, ei henkilökohtainen suodatettava lista (Kirjastonissa on oma vuosisuodatin sen sijaan, dropdown-valikkona ei chippeinä)

## Kansikuvien tallennus/välimuisti

- Aloitetaan hotlinkkauksella: ei omaa tallennusta, `cover_url` tallennetaan `books`-tauluun sellaisenaan (Open Libraryn/Google Booksin antama URL)
- Luotetaan selaimen HTTP-välimuistiin + `loading="lazy"` kuvien latauksessa
- Ei omaa CDN/tallennusratkaisua (esim. S3/R2) toistaiseksi — perusteltua vain henkilökohtaiseen käyttöön, ei kriittistä saatavuusvaatimusta
- Siirrytään omaan tallennukseen myöhemmin jos: kansikuvat katoavat/rikkoutuvat usein, halutaan offline-tuki, tai käyttäjämäärä kasvaa merkittävästi
- **Toteutunut kevyt väliratkaisu ilman omaa tallennusta:** kun kansi puuttuu tai on väärä (Open Libraryn/Google Booksin datan laatuongelma, ei korjattavissa haulla), kuka tahansa kirjautunut käyttäjä voi liittää oikean kuvan URL-osoitteen käsin BookDetail-sivulla (`PUT /api/books/:bookId/cover-url`) — ei tiedostolatausta, ei omaa CDN:ää, pysyy linjassa alkuperäisen hotlinkkaus-päätöksen kanssa. Vaikutus on jaettu kaikille käyttäjille koska `cover_url` on `books`-taulussa

## Deployment

- **Backend:** Render.com
- **Frontend:** GitHub Pages
- `frontend/src/api/client.ts`: `API_BASE` luetaan `VITE_API_BASE_URL`-ympäristömuuttujasta (fallback `http://localhost:3001` kehitykseen). Tuotantoarvo (Renderin antama backend-URL) täytetään kun backend on deployattu — asetetaan joko GitHub Actionsin build-ympäristöön tai `.env.production`-tiedostoon
- Mobiilitestaus lähiverkossa: `frontend/.env.local` (Viten oletuksena gitignoroitu) voi ylikirjoittaa `VITE_API_BASE_URL`:n paikallisella lähiverkko-IP:llä ilman että koskee pääasetuksiin
- Huomioita toteutukseen myöhemmin:
  - Render.comin ilmaistaso "nukkuu" käyttämättömänä → ensimmäinen pyyntö pitkän tauon jälkeen voi olla hidas (kylmäkäynnistys)
  - GitHub Pages tarjoilee staattisia tiedostoja → Vite-buildin `base`-polku pitää asettaa oikein, ja reititys (jos käytetään react-router) tarvitsee joko HashRouter-tyylin tai 404-fallback-tempun
  - CORS: backendin pitää sallia pyynnöt GitHub Pages -domainista

## Ominaisuudet, joita EI oteta mukaan

- Ei arvostelu-/rating-toiminnallisuutta (poistetaan `rating`-kenttä skeemasta)

## To_read → luettu -siirtymä

- Sama `user_books`-rivi pysyy, vain `status` vaihtuu `to_read` → `read` (tai `reading` väliaikaisesti)
- Kun status vaihtuu luetuksi, käyttäjä täyttää tässä yhteydessä `read_year` (ja halutessaan kuukausi/päivä)

## Manuaalinen kirjan lisäys (ei API-osumaa)

- Jos kirjaa ei löydy Open Librarystä eikä Google Booksista, käyttäjä voi lisätä kirjan manuaalisesti täyttämällä tiedot itse (title, author) ilman `open_library_id`/`google_books_id`-viittausta
- `cover_url` jää tällöin tyhjäksi (näytetään esim. placeholder-kansikuva UI:ssa)
- **Toteutunut 23.7.2026 (ks. muutoshistoria):** jaettu `ManualBookForm`-komponentti (Nimi/Kirjailija/Julkaisuvuosi/ISBN/kansikuvan URL) kahdessa käyttöpaikassa, jotka eroavat vain siinä MITÄ TAPAHTUU luonnin jälkeen:
  - **Sivuvalikko → "Lisää manuaalisesti"** ("Hallitse painoksia" -kohdan alla): luo täysin uuden, ryhmättömän kirjan (`work_group_id` jää `NULL`:ksi eli se on oman ryhmänsä ainoa jäsen/root) ja navigoi käyttäjän suoraan sen `BookDetail`-sivulle jatkamaan (sama periaate kuin Hae-välilehden hakutuloksen avaaminen)
  - **"Hallitse painoksia" → valitun ryhmän "Lisää manuaalisesti":** luo uuden kirjan samalla lomakkeella (esitäytetty ryhmän edustajan tiedoilla) mutta yhdistää sen välittömästi `mergeBooks`:illa valittuun ryhmään sen sijaan että jättäisi sen omaksi ryhmäkseen

## Duplikaatit / saman kirjan uudelleenlukeminen

- Sama kirja saa esiintyä käyttäjällä useaan kertaan — uudelleenlukeminen on sallittu ja tarkoituksella tuettu ominaisuus
- Käytännössä: **ei uniikkiusrajoitetta** `(clerk_user_id, book_id)` -parille `user_books`-taulussa — sama `book_id` voi esiintyä useilla riveillä eri `read_year`/`status`-arvoilla
- Jokainen lukukerta on oma `user_books`-rivinsä (oma kommentti, oma lukuvuosi, oma status)
- Massatuonnissa/lisäyksessä ei siis estetä samaa kirjaa — mahdollinen "tämä kirja on jo kirjastossasi, lisätäänkö silti uutena lukukertana?" -ilmoitus on kosmeettinen lisäys myöhemmin, ei tekninen esto
- UI:ssa kirjan kohdalla voidaan tarvittaessa näyttää "luettu 2x" tai lista kaikista lukukerroista samaa kirjaa klikattaessa

**Navigaatio**

- Alapalkki (bottom tab bar) välilehtien vaihtoon, somealusta-tyyliin — sopii mobiili-first-periaatteeseen
- Ei React Routeria tässä vaiheessa — yksinkertainen React-tila (useState) riittää koska välilehtiä on vähän eikä tarvita jaettavia URL-osoitteita per näkymä
- Välilehdet: "Kirjastoni", "Hae", "Selaa"
- **Sivuvalikko (hampurilaisvalikko):** toiminnot jotka eivät ole päivittäistä selailua (massatuonti, myöhemmin esim. asetukset) eivät mene alapalkkiin — ne asuvat erillisessä sivuvalikossa, jotta alapalkki pysyy yksinkertaisena ydinkäytölle
- **Hae-välilehti navigoi BookDetail-sivulle** (ei enää suoria pikalisäyspainikkeita "Aion lukea"/"Luettu"): koko hakutulosrivi on klikattava, kutsuu `POST /api/books/ensure` (varmistaa/luo kirjan `books`-tauluun `findOrCreateBook`:illa, palauttaa `bookId`) ja navigoi sitten `BookDetail`:iin samalla `viewingBookId`-mekanismilla kuin Kirjastoni/Selaa. Muutoksen syy: pikapainikkeet eivät koskaan kysyneet `read_year`:ia, mikä rikkoi `validateReadingDate`-tarkistuksen (400-virhe) kun status oli `read` — BookDetail:n `AddEntryForm` kysyy vuoden oikein ja validoi sen etukäteen frontendissä

## Julkinen selailu ja kommentit (arkkitehtuurimuutos)

Kommentit ovat julkisia kaikille kirjautuneille käyttäjille, nimellä varustettuna.
Muu data (lukuvuosi, omistustyyppi, tagit) pysyy yksityisenä.

**Tietokantamuutos — uusi `users`-taulu:**

```sql
CREATE TABLE users (
  clerk_user_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

- Tämä kumoaa osittain aiemman "ei omaa users-taulua" -päätöksen, koska julkinen näyttönimi vaatii oman tallennuksen (Clerkin API-kutsu joka näyttökerta olisi liian raskas)
- `display_name` haetaan/tallennetaan käyttäjän toimesta erikseen, ei suoraan Clerkin profiilista automaattisesti

**Pakotettu näyttönimi ennen kommentointia:**

- Kommentin tallennus (`PUT /api/user-books/:id` jossa `comment` ei tyhjä) tarkistaa onko käyttäjällä jo `users`-rivi
- Jos ei ole, palautetaan virhe joka ohjaa asettamaan näyttönimen ensin (kertaluontoinen UI-kehote)

**Uudet API-reitit:**

- `PUT /api/profile` — asettaa/päivittää oman näyttönimen (`requireAuth`)
- `GET /api/profile` — hakee oman profiilin (jotta frontend tietää onko nimi jo asetettu)
- `GET /api/discover` — julkinen selailusyöte (`requireAuth`, mutta data ei riipu kirjautuneesta käyttäjästä): kaikki kirjat jotka joku on merkinnyt `read` TAI `abandoned`, uusin lukukerta ensin, lukijamäärä + kommentit nimineen niiltä jotka kommentoivat, muuten "N anonyymiä lukijaa"

**Yksityisyysraja:**

- Julkista: kirjan nimi/kirjailija/kansikuva, lukijamäärä, kommentti + kommentoijan `display_name`, status (luettu vs. jäi kesken -tieto näkyy badge:na)
- Yksityistä: `read_year`, `read_month`, `read_day`, `ownership`, `user_tags`

**UI:**

- Kolmas välilehti "Selaa" alapalkkiin: Kirjastoni / Hae / Selaa
- Selaa-näkymässä lista kirjoista, uusin lukukerta ensin, kunkin kirjan alla kommentit nimineen (jos joku kommentoinut) tai "N anonyymiä lukijaa"

## Uusi status: "jäi kesken" (abandoned)

Statussarja laajenee: `to_read` / `reading` / `read` / `abandoned`

- `abandoned` = kirjan lukeminen aloitettu mutta jätetty kesken, ei aiota jatkaa
- Käyttää samoja `read_year`/`read_month`/`read_day`-kenttiä kuin `read`-tila (merkitsee milloin lukeminen lopetettiin kesken)
- Näkyy myös julkisessa Selaa-näkymässä (badge kertoo onko kirja luettu loppuun vai jäänyt kesken)

## Kirjan yksityiskohtainen näkymä (BookDetail)

Yhdistetty näkymä yhdelle kirjalle: julkinen tieto (muiden kommentit, lukijamäärä)

- oma muokkaus (status, lukuvuosi, kommentti, jäi kesken -merkintä) samasta paikasta.

**Navigointi:**

- Ei React Routeria / URL-osoitetta — React-tila (`viewingBookId`) App-tasolla
- Pääsy: klikkaamalla kirjaa Kirjastoni- tai Selaa-välilehdellä
- Hae-välilehti navigoi myös BookDetail:iin (`POST /api/books/ensure` + `onSelectBook`, ks. Navigaatio-osio)
- Painosten/kieliversioiden välillä voi navigoida suoraan BookDetail-sivun sisällä "Painokset ja kieliversiot" -listauksesta klikkaamalla (`onNavigateToBook`-propi) — nykyinen painos on merkitty "(tämä sivu)" eikä klikattavissa
- "Takaisin"-painike palauttaa edelliseen välilehteen

**Useat lukukerrat:**

- Käyttäjän omat `user_books`-rivit samalle kirjalle näkyvät omana listana ("Omat merkintäsi"), jokainen erikseen muokattavissa (koska uudelleenlukeminen on sallittu, ks. Duplikaatit-osio)

**Uudet/laajennetut API-reitit:**

- `GET /api/books/detail/:bookId` — julkinen kirjan tieto + aggregoitu julkinen data (sama logiikka kuin /api/discover, mutta yhdelle kirjalle)
- `GET /api/user-books?bookId=X` — yhden tietyn painoksen omat merkinnät
- `GET /api/user-books?groupRootId=X` — KAIKKI käyttäjän omat merkinnät koko ryhmästä (kaikki painokset/kielet), ei vain yhdestä painoksesta. Käytetään BookDetail:n "Omat merkintäsi" -osiossa, jotta se näyttää oikein myös lukukerrat jotka koskevat ryhmän muita painoksia (merkitään painoksen nimellä jos eri kuin nykyinen sivu)

## Painosten ja kieliversioiden niputus (work grouping)

Eri painokset/kieliversiot samasta teoksesta voidaan niputtaa yhteen, koska
automaattinen niputus API-datan perusteella ei ole luotettavasti mahdollista
(Open Libraryn "work"-käsite ei kata kieliversioita, Google Booksilla ei ole
work-käsitettä ollenkaan). Ratkaisu: **manuaalinen yhdistäminen käyttäjän
toimesta**, ei automaattista/heuristista ehdotusta.

**Kanoninen käsite (yksinkertaistettu — ks. muutoshistoria "user_primary_editions poistettu"):**

Alun perin suunniteltiin KAKSI erillistä kanonista käsitettä: globaali (Selaa-näkymää
varten) + käyttäjän oma valittava ensisijainen painos (`user_primary_editions`-taulu,
erillinen "Aseta ensisijaiseksi" -toiminto). Tämä osoittautui käytännössä ongelmalliseksi:
käyttäjä saattoi asettaa ensisijaiseksi painoksen jota ei ollut itse lisännyt omaan
kirjastoonsa lainkaan, jolloin Kirjastoni-näkymä ei voinut näyttää sitä (koska se
näyttää vain käyttäjän OMIA `user_books`-rivejä) — valinta näytti "toimivalta"
(tallentui, näytti onnistumisviestin) mutta ei koskaan vaikuttanut mihinkään.

**Päätetty ratkaisu:**

- **`user_primary_editions`-taulu ja koko "aseta ensisijaiseksi" -mekanismi
  POISTETTU kokonaan** (myös `PUT /api/books/:bookId/primary-edition` -reitti,
  `EditionsManager`:n Star-painike, `Library.tsx`:n `primaryEditions`-parametri)
- **Globaali kanoninen** (Selaa-näkymää varten) pysyy ennallaan: varhaisin
  lisätty kirja koko ryhmässä
- **Kirjastoni-näkymän edustajan valinta on nyt täysin automaattinen, ei
  käyttäjän valittavissa erillisen mekanismin kautta:** valitaan käyttäjän
  OMISTA merkinnöistä ensin ne joilla on `cover_url` (ei null), niistä
  varhaisin `created_at`:n mukaan; jos yhdelläkään ei ole kansikuvaa,
  valitaan yksinkertaisesti varhaisin riippumatta kansikuvasta
- **Uusi ominaisuus tilalle: painoksen vaihto olemassa olevalle omalle
  merkinnälle.** Jos käyttäjä huomaa jälkikäteen että jokin toinen painos
  vastaisi paremmin hänen lukemaansa kirjaa, hän voi suoraan vaihtaa YHDEN
  jo olemassa olevan `user_books`-rivinsä `book_id`:n toiseksi (haku +
  valinta `OwnEntryForm`:ssa, `PUT /api/user-books/:id` hyväksyy valinnaisen
  `newBookId`-kentän). Tämä on eri asia kuin ryhmien yhdistäminen
  (`EditionManagement`-sivu, ks. alla) — tässä muutetaan suoraan yhden rivin kohdetta, ei
  koko ryhmän rakennetta.

**Tietokantamalli:**

```sql
ALTER TABLE books ADD COLUMN work_group_id INT REFERENCES books(id);
```

- **`user_primary_editions`-taulu on POISTETTU** (`DROP TABLE`) — ks. yllä oleva
  "Kanoninen käsite" -osio. Ei enää osa skeemaa.
- `work_group_id IS NULL` = kirja on itsenäinen TAI ryhmänsä kanoninen (root)
- Yhdistäminen tapahtuu aina suoraan roottiin (ei ketjuja) — jos ryhmiä
  yhdistetään, kaikki jäsenet uudelleenosoitetaan suoraan uuteen roottiin
  jottei tarvita rekursiivisia kyselyitä myöhemmin (riittää yksi
  `COALESCE(work_group_id, id)`)
- Uudeksi rootiksi tulee aina se kirja jolla on varhaisin `created_at`

**API-reitit:**

- `POST /api/books/:bookId/merge` — yhdistää kirjan ryhmän toisen kirjan ryhmään (globaali)
- `POST /api/books/:bookId/unmerge` — irrottaa kirjan ryhmästä (turvaverkko)
- `GET /api/books/:bookId/editions` — listaa ryhmän kaikki painokset (sisältää myös `openLibraryId`/`googleBooksId` per painos, jotta `EditionManagement`-sivu voi suodattaa jo-ryhmässä-olevat pois hakutuloksista, ks. alla)
- `POST /api/books/ensure` — varmistaa/luo kirjan `books`-tauluun ulkoisen hakutuloksen tiedoilla, palauttaa `bookId` (käytetään Hae-välilehdellä navigointiin, ks. Navigaatio-osio)
- `GET /api/books` — listaa koko `books`-taulun ilman `user_books`-liitosta, käytetään "Hallitse painoksia" -sivulla (ks. alla). Ei paljasta yksityistä dataa koska ei liity `user_books`-tauluun, mutta ks. tunnettu `created_at`-puute alla
- ~~`PUT /api/books/:bookId/primary-edition`~~ — **poistettu**, ks. "Kanoninen käsite" -osio
- `routes/discover.js` ja `routes/bookDetail.js`: lukijamäärä/kommentit lasketaan koko ryhmän yli (globaali root), ei vain yhden kirjan
- `routes/userBooks.js` `GET /`: palauttaa `work_group_root_id`-kentän jokaiselle riville ryhmittelyä varten frontendissä (ei enää `primaryEditions`-kenttää vastauksessa)
- `routes/userBooks.js` `PUT /:id`: hyväksyy valinnaisen `newBookId`-kentän jolla vaihdetaan olemassa olevan merkinnän kohdekirja (ks. "Kanoninen käsite" -osio)

**UI-muutokset:**

- **BookDetail:n `EditionsManager`-komponentti on yksinkertaistettu pelkäksi navigointilistaksi:** näyttää ryhmän painokset klikattavina riveinä (`onNavigateToBook`-propi vie suoraan sen painoksen BookDetail-sivulle), tai "Ei muita versioita." jos ryhmässä on vain nykyinen kirja. Ei enää hakua, yhdistämistä eikä irrotusta — nämä siirrettiin omalle sivulle (ks. seuraava kohta), koska ne olivat harvemmin tarvittuja "ylläpidollisia" toimintoja jotka eivät sopineet jokaisen kirjan sivun perusnäkymään
- **Uusi sivu `components/EditionManagement/` ("Hallitse painoksia"), tavoitettavissa sivuvalikosta** ("Tuo kirjoja" -kohdan vierestä; 23.7.2026 jaettu kansioksi `index.tsx`+`CurrentEditionsPanel.tsx`+`MergeSearchPanel.tsx`, ks. muutoshistoria): listaa **KAIKKI Lukuhullun kirjat/ryhmät** — ei enää rajattu kirjautuneen käyttäjän omiin, koska ryhmät (`work_group_id`) ovat joka tapauksessa jaettua dataa, ei henkilökohtaista. Käyttäjä valitsee ryhmän, hakee ja yhdistää siihen uuden painoksen (sama `mergeBooks`-reitti, samat `isAlreadyInGroup`-suodatus ja "Ei muita versioita." -viesti kuin aiemmin oli BookDetail:ssa), ja voi irrottaa minkä tahansa ryhmän jäsenen (`unmergeBook`)
  - Uusi backend-reitti: `GET /api/books` (`routes/bookGroups.js`) — listaa koko `books`-taulun (`requireAuth`, mutta ei liity `user_books`-tauluun, joten ei paljasta kenenkään yksityistä dataa: `read_year`/`comment`/`ownership`/`clerk_user_id` eivät koskaan ole mukana vastauksessa)
  - **Korjattu 22.7.2026:** aiemmin frontend tyypitti tämän vastauksen virheellisesti `UserBook`/`UserBooksResponse`-tyypeillä (henkilökohtaista lukukertaa varten suunniteltu tyyppi), vaikka backend ei palauttanut kaikkia niiden vaatimia kenttiä — erityisesti `created_at` puuttui kyselystä kokonaan, mikä rikkoi `pickRepresentative`-funktion (`utils/libraryGrouping.ts`) `created_at`-pohjaisen lajittelun hiljaisesti (`NaN`-vertailuja). Ratkaisu: (a) `created_at` lisätty `routes/bookGroups.js`:n `SELECT`-lauseeseen, (b) uusi oma tyyppi `BookGroupEntry`/`BookGroupsResponse` (`types.ts`) korvaamaan `UserBook`/`UserBooksResponse`:n väärinkäytön — korjaa myös sen että `id`-kenttä tarkoitti eri asiaa (`books.id` vs. `UserBook.id` = `user_books.id`) vaikka tyyppi väitti samaa, (c) `groupByWorkRoot`/`pickRepresentative` yleistetty geneerisiksi (`Groupable`-rajapinta: `work_group_root_id`/`cover_url`/`created_at`) jotta ne toimivat sekä `UserBook`- että `BookGroupEntry`-riveillä ilman tyyppien väärinkäyttöä. Ks. muutoshistoria.
  - **Manuaalisen painoksen lisäys toteutettu 23.7.2026** (ks. muutoshistoria): "Lisää manuaalisesti" -painike avaa Modal-lomakkeen (Nimi/Kirjailija/Julkaisuvuosi/ISBN/kansikuvan URL, esitäytetty ryhmän edustajan tiedoilla). Tallennus luo uuden `books`-rivin `ensureBook`:illa (ei `openLibraryId`/`googleBooksId`, samaan tapaan kuin muukin manuaalinen kirjan lisäys) ja yhdistää sen välittömästi valittuun ryhmään `mergeBooks`:illa, jottei se jää irralliseksi omaksi ryhmäkseen
- **`OwnEntryForm`:** "Vaihda painos" -osio jokaisen oman merkinnän muokkauslomakkeessa (haku + valinta, päivittää kyseisen rivin `book_id`:n `newBookId`-kentällä, yhdistää automaattisesti vanhan ja uuden kirjan samaan ryhmään `mergeBooks`:illa jos ne eivät jo olleet samassa ryhmässä)
- **Kirjastoni:** saman ryhmän omat merkinnät ryhmitellään yhdeksi riviksi (automaattinen edustajan valinta, ks. "Kanoninen käsite" -osio), alla alalista eri painoksista/kielistä ja niiden omista tiedoista (status, vuosi)
- **Selaa:** ennallaan — käyttää aina globaalia kanonista, ei riipu käyttäjäkohtaisesta valinnasta

## Avoimet kysymykset / ei vielä päätetty

- Tarkka tietokantaskeema (yllä oleva on luonnos)
- API-reittien tarkka rakenne (runko hahmoteltu, tarkentuu koodatessa)
- UI:n näkymät ja navigaatio (periaatteet päätetty, tarkka toteutus auki)
- Kategorioiden toteutustapa: vapaat tagit vs. valmiit kategoriat vs. molemmat

## Muutoshistoria

### 12.7.2026

- 2026-07-12: Alustava stack ja scope sovittu, Clerk valittu authiksi
- 2026-07-12: Tarkennettu kirjadata-strategiaa: Open Libraryn suomenkielinen kattavuus ohuempi, Google Books -fallback oletettua tärkeämpi
- 2026-07-12: Lukemisajankohtaan päivän tarkkuus mahdollistava rakenne (read_year/read_month/read_day, erilliset nullable-kentät)
- 2026-07-12: Kategorisointi: API-genret (api_subjects) automaattisena ei-pakollisena ehdotuksena, käyttäjän omat vapaat avainsanat (user_tags) ensisijaisena
- 2026-07-12: UI-periaatteet sovittu: erillinen massatuontityökalu tekstimuotoiselle historiadatalle (esikatselu + korjaus ennen tallennusta), tavallinen haku+lomake uusille kirjoille, kansikuvaruudukko + suodatinchipit selailuun (mobiili-first)
- 2026-07-12: Massatuonnin parsinta: käyttäjä järjestää datan itse CSV/JSON-muotoon etukäteen, ei tarvita regex/LLM-parsintaa vapaamuotoiselle tekstille
- 2026-07-12: Kansikuvat: hotlinkkaus + selaimen välimuisti aloitukseen, ei omaa CDN/tallennusratkaisua tässä vaiheessa
- 2026-07-12: Deployment: backend Render.com, frontend GitHub Pages. Ei rating-ominaisuutta. Wishlist→luettu on saman rivin statusmuutos. Manuaalinen kirjan lisäys sallittu jos API-osumaa ei löydy

### 13.7.2026

- 2026-07-13: Saman kirjan uudelleenlukeminen sallittu — ei uniikkiusrajoitetta, jokainen lukukerta oma user_books-rivi
- 2026-07-13: Projektin tarkoitus kirjattu: oppimismielessä + portfoliokäyttöön, painottaa ymmärtämistä ja dokumentaatiota nopeuden sijaan
- 2026-07-13: Työskentelytapa kirjattu: koodausvaiheessa selitetään enemmän ja varmistellaan käyttäjältä säännöllisesti, ei edetä suoraan oletuksilla
- 2026-07-13: Projektin nimi valittu: Lukuhullu
- 2026-07-13: Tietokantaskeema viimeistelty ja ajettu Neoniin. Status-arvo "wishlist" nimetty uudelleen "to_read":ksi kuvaavamman to_read/reading/read-sarjan vuoksi. read_year ei NOT NULL tietokantatasolla, varmistetaan sovelluslogiikassa
- 2026-07-13: Backend-runko + Clerk-auth pystyssä ja testattu toimivaksi (health + auth middleware). Huomattu että CLERK_PUBLISHABLE_KEY vaaditaan env-muuttujista vaikka backend käyttää vain secret keytä
- 2026-07-13: Google Books API -avain hankittu (Public data -tyyppinen, rajoitettu Books API:iin). GET /api/books/search toteutettu: hakee ensin Open Librarystä, täydentää Google Booksilla jos tuloksia <5, molemmat muunnetaan yhtenäiseen muotoon (source, openLibraryId/googleBooksId, title, author, coverUrl, yearPublished, subjects)
- 2026-07-13: Neon-tietokantayhteys pystyssä (pg-paketti, Pool). CRUD-reitit toteutettu (POST/GET/PUT/DELETE /api/user-books). Backend refaktoroitu: index.js (vain alustus+reittien kytkentä), db.js (Pool-yhteys), routes/booksSearch.js, routes/userBooks.js — kattavasti kommentoitu oppimistarkoitusta varten
- 2026-07-13: Frontend tehdään TypeScriptillä (react-ts), ei plain JavaScriptillä — perusteluna portfolion ammattimaisuus, virheiden nappaaminen kirjoitusvaiheessa, ja oppimisarvo
- 2026-07-13: Frontend-runko pystyssä (Vite+React+TS+Tailwind v4). Clerk-kirjautuminen (ClerkProvider, SignIn/SignedIn/SignedOut) toteutettu ja testattu koko ketju läpi: kirjautuminen -> token -> backend requireAuth() -> Neon-kysely, toimii onnistuneesti
- 2026-07-13: Periaate: ei käytetä valmiita komponenttikirjastoja (esim. shadcn/ui) lähtökohtaisesti — omat komponentit puhtaalla Tailwindilla
- 2026-07-13: Iso arkkitehtuurilaajennus: kommentit julkisiksi (nimellä, muu data yksityinen), uusi users-taulu (display_name), uudet reitit /api/profile ja /api/discover, uusi status "abandoned" (jäi kesken), kolmas välilehti "Selaa"
- 2026-07-13: Tietokantamuutokset ajettu Neoniin (abandoned-status, users-taulu). Backend: routes/profile.js (GET/PUT), kommentin julkisuustarkistus (412 DISPLAY_NAME_REQUIRED) lisätty userBooks.js:n POST/PUT-reitteihin
- 2026-07-13: Frontend: näyttönimen asetuslomake (DisplayNamePrompt) toteutettu ja pakotettu ennen sovelluksen käyttöä. Kansiorakenne uudistettu: api/ (client.ts, books.ts, profile.ts) ja components/ (BookSearch.tsx, Library.tsx, DisplayNamePrompt.tsx) erilleen App.tsx/main.tsx-rungosta
- 2026-07-13: /api/discover toteutettu (JS-ryhmittely SQL:n sijaan, tietoinen luettavuus>tehokkuus-valinta pienelle datamäärälle). Kolmas välilehti "Selaa" frontendissä (components/Discover.tsx). Koko ketju testattu toimivaksi: haku -> lisäys -> kirjasto -> julkinen selailu
- 2026-07-13: BookDetail-näkymä toteutettu: yhdistää julkisen tiedon (muiden kommentit, lukijamäärä) ja oman muokkauksen (status/vuosi/kommentti/poisto) samalle sivulle. Navigointi React-tilalla (viewingBookId), ei URL-reititystä. GET /api/books/detail/:bookId ja GET /api/user-books?bookId= toteutettu. Kirjan poisto (DELETE) kytketty käyttöliittymään, toimii
- 2026-07-13: Massatuonti laajennettu tukemaan myös Goodreads-CSV-vientiä oman formaatin lisäksi (käyttäjä valitsee formaatin manuaalisesti). ISBN-pohjainen haku käyttöön kun saatavilla (tarkempi kuin title+author), fallback title+author-hakuun
- 2026-07-13: Massatuonti toteutettu kokonaan ja testattu: sivuvalikko (hampurilaisvalikko) navigointiin, POST /api/import/preview + /api/import/confirm, jaettu searchBooksByQuery-funktio ja findOrCreateBook-apufunktio (ei duplikaattikoodia normaalin lisäyksen kanssa), esikatselutaulukko jossa rivit muokattavissa, manuaalinen uudelleenhaku riveille joilta ei löytynyt osumaa (käyttää samaa hakua kuin Hae-välilehti)
- 2026-07-13: Päätetty tukea painosten/kieliversioiden manuaalista niputusta (ei automaattista). Kaksi kanonista käsitettä: globaali ryhmän kanoninen (Selaa, varhaisin lisätty) + käyttäjän oma valittava ensisijainen painos (Kirjastoni, per käyttäjä). Uusi work_group_id-sarake books-tauluun + user_primary_editions-taulu. Ei vielä toteutettu koodissa — vain suunniteltu ja kirjattu
- 2026-07-13: Painosten niputus toteutettu kokonaan ja testattu: utils/workGroup.js (resolveRoot/mergeBooks/unmergeBook, litistetty rakenne ei ketjuja), routes/bookGroups.js (merge/unmerge/editions/primary-edition), discover.js ja bookDetail.js päivitetty laskemaan tilastot koko ryhmän yli, userBooks.js palauttaa work_group_root_id + primaryEditions. Frontend: BookDetail.tsx:n EditionsManager (haku+yhdistä+irrota+aseta ensisijaiseksi), Library.tsx ryhmittelee saman ryhmän omat merkinnät yhdeksi riviksi + alalistaksi
- 2026-07-13: Claude Code kävi koko koodikannan läpi rivikommentoiden. Löydökset korjattu: userBooks.js käyttämään jaettua findOrCreateBook:ia (oli duplikoitu inline), BookStatus-tyyppiin lisätty puuttunut "abandoned", vanhan api.ts:n jäänteet siivottu (BookSearch/DisplayNamePrompt osoittamaan api/-kansioon), Library.tsx:n tuplaantunut group.length>1-lohko korjattu, puuttuva sovellustason validointi (read_year pakollinen read/abandoned-tilassa, read_day vaatii read_month:in) toteutettu utils/bookHelpers.js:n validateReadingDate-funktiolla ja käytetty POST/PUT userBooks.js:ssä + import.js:n confirm-reitillä. bookDetail.js:n "käyttämätön resolveRoot-importti" jätettiin tarkoituksella pois käytöstä (manuaalinen laskenta on tehokkaampi, vältetään turha tietokantakysely) - poistettiin vain kuollut importti

### 21.7.2026

- 2026-07-21: UI-tyylittely aloitettu: design-tokenit (forest/paper/brass/wine/sage/ink + shelf-värit) Tailwind v4 @theme-lohkoon, fontit (Fraunces/Public Sans/IBM Plex Mono) ladattu index.html:ään. Navigointikuori tyylitelty (header, alapalkki ikoneineen, sivuvalikko). Kirjastoni-näkymän "Luetut"-osio toteutettu signature-elementtinä: kirjahylly jossa kansikuvat pystyssä, CSS Grid (auto-fill/minmax) tasakokoisina riveinä myös vajailla viimeisillä riveillä, placeholder-kansi kirjoille joilla ei kansikuvaa. Lisätty VITE_API_BASE_URL-ympäristömuuttuja (mobiilitestaus .env.local:lla, tuotantoarvo täytetään deployssa)
- 2026-07-21: BookDetail tyylitelty (Hae/Selaa-välilehdet myös), ja UX-parannus: "Omat merkintäsi" näyttää yhteenvetorivin/painikkeen lomakkeen sijaan, muokkaus avautuu Modal-popupissa. Oma kommentti tunnistetaan "Muiden lukijoiden kokemuksia" -listasta (myDisplayName-propi) ja sen viereen muokkauspainike. AddEntryForm laajennettu kaikilla kentillä (vuosi/kk/pv/omistus/kommentti) kerralla + sovelluslogiikan validointi peilattu frontendiin (näyttää virheen ennen lähetystä, ei vain backendin 400:n jälkeen). Claude Code pilkkoi BookDetail.tsx:n omaksi kansiokseen (components/BookDetail/: index.tsx + OwnEntryForm/AddEntryForm/OwnEntrySummary/EditionsManager), Modal siirretty components/ui/:hun, painike-/inputtyylit styles/buttons.ts:ään jaettuna BookSearch.tsx:n kanssa. tsc --noEmit puhdas
- 2026-07-21: Claude Code pilkkoi kolme lisää kokonaisuutta: components/Import.tsx -> components/Import/ (index.tsx, ImportRow.tsx, types.ts), components/Library.tsx -> components/Library/ (index.tsx, BookCover.tsx, Shelf.tsx) + utils/libraryGrouping.ts (groupByWorkRoot/pickRepresentative/hashString), backend routes/import.js -> utils/csvParsers.js (parseOwnRow/parseGoodreadsRow/stripIsbn/parseGoodreadsDate/SHELF_TO_STATUS) + utils/concurrency.js (mapWithConcurrencyLimit). tsc --noEmit puhdas, backend-importit varmistettu latautuviksi
- 2026-07-21: DisplayNamePrompt ja Import-näkymät tyylitelty viimeisenä kahtena tyylittelemättömänä osana — koko UI:n visuaalinen ensimmäinen kierros valmis

### 22.7.2026 (tänään)

- 2026-07-22: Massatuonnin hakulogiikka käytiin läpi useita iteraatioita todellisella datalla (Läckberg-testitapaukset paljastivat useita ongelmia): kokeiltiin ensin kolmivaiheista kieli-/kirjailijahakua (OL fin+eng, kirjailijan koko tuotanto author:/inauthor:-kentillä, laaja fallback) — yksinkertaistettiin lopulta yhteen laajaan rinnakkaishakuun (Open Library + Google Books, ei kielirajausta) havaittujen rate limit- ja monimutkaisuusongelmien takia. Ks. "Haku- ja tuontilogiikan lopullinen arkkitehtuuri" -osio kattavaa kuvausta varten
- 2026-07-22: Havaittu ja korjattu: Open Libraryn/Google Booksin numFound:0/totalItems:0 on aito "ei löydy" -vastaus, EI naamioitu rate limit (vahvistettu OL:n omasta GitHub-issue-seurannasta ja Googlen 503-vastauksen rakenne-erosta). fetchWithRetry uudistettu: uudelleenyritys vain HTTP-virheille, ei tyhjille mutta kelvollisille vastauksille. Eksponentiaalinen viive+jitter (Google/IAM:n oman ohjeen mukaisesti), erillinen pidempi viive+pienempi yritysraja 429:lle
- 2026-07-22: Google Books -kiintiöongelmia selvitetty käytännössä: Queries per minute (100) ja per day (1000) ovat erilliset kiintiöt, kiintiö lasketaan pyyntömäärän eikä maxResults:in mukaan, API:n pois/päälle-kytkentä ei nollaa kiintiötä, "apply for higher quota" -linkki laajalti raportoitu toimimattomaksi, laskutus otettu käyttöön kokeeksi. mapWithConcurrencyLimit: rinnakkaisuus 5->2 + 1000ms viive rivien välissä rate limit -herkkyyden vähentämiseksi
- 2026-07-22: Tuonnin käyttöliittymä laajennettu kolmeen selkeään tilaan (matched/suggestions/no_results/connection_error) pelkän osuma/ei-osuma-jaon sijaan, jotta käyttäjä tietää kannattaako hakea uudelleen (yhteysvirhe), muuttaa hakusanaa (ei löydy) vai valita ehdotuksista. Ehdotusten pisteytys eriytetty: oma tietokanta tiukalla kynnyksellä (muuten ehdottaa epärelevantteja kirjoja), ulkoiset lähteet ilman pisteytystä (kieltenvälinen tekstivertailu ei toimi, esim. käännösnimet)
- 2026-07-22: Yleiseen hakuun (Hae-välilehti ym.) lisätty oman tietokannan tarkistus ensin (searchOwnDatabase, ILIKE-haku) ennen ulkoisia API-kutsuja + tulosten deduplikointi. Lähdemerkintä 'database' näytetään tekstillä "Lukuhullu" (ei "Oma kirjasto", koska data on jaettu kaikkien käyttäjien kesken)
- 2026-07-22: Bugikorjaus: BookSearch.tsx:n hakukenttä oli lukukelvoton (jaettu inputClass on suunniteltu paperikorttien sisälle, ei suoraan tumman sivutaustan päälle) — korjattu omalla bg-paper-tyylillä juuri tässä kohtaa
- 2026-07-22: Bugikorjaus + arkkitehtuurimuutos: BookSearch.tsx:n pikalisäyspainikkeet ("Aion lukea"/"Luettu") rikkoivat read_year-validoinnin (eivät koskaan kysyneet vuotta). Korjattu poistamalla pikapainikkeet kokonaan — koko hakutulosrivi on nyt klikattava, kutsuu uuden POST /api/books/ensure -reitin (findOrCreateBook, palauttaa bookId) ja navigoi BookDetail-sivulle, jossa AddEntryForm kysyy vuoden oikein ja validoi sen etukäteen
- 2026-07-22: EditionsManager: hakutulokset suodattavat pois jo ryhmän jäseninä olevat painokset (isAlreadyInGroup-tarkistus), näyttää "Ei muita versioita." jos kaikki suodattuu pois. GET /api/books/:bookId/editions palauttaa nyt myös openLibraryId/googleBooksId per painos tätä suodatusta varten
- 2026-07-22: user_primary_editions-mekanismi (globaali kanoninen + oma valittava ensisijainen painos) osoittautui virheelliseksi käytännössä: käyttäjä saattoi asettaa ensisijaiseksi painoksen jota ei ollut itse lisännyt kirjastoonsa, jolloin valinta ei koskaan näkynyt Kirjastoni-näkymässä vaikka tallennus onnistui. PÄÄTETTY ja TOTEUTETTU Claude Coden toimesta: koko mekanismi (taulu, reitti, UI-painike) poistettu, korvattu (a) automaattisella edustajan valinnalla Kirjastoni-näkymässä (utils/libraryGrouping.ts:n pickRepresentative: varhaisin oma merkintä jolla cover_url, muuten varhaisin) ja (b) uudella "vaihda painos" -ominaisuudella OwnEntryForm.tsx:ssä (haku + ensureBook + PUT /api/user-books/:id newBookId-kentällä, backend tarkistaa kohdekirjan olemassaolon ennen päivitystä). tsc --noEmit ja backendin käynnistys puhtaat, ei jäänteitä koko projektissa
- 2026-07-22: Painoksen vaihdon (newBookId) huomattiin luovan vahingossa uuden erillisen ryhmän sen sijaan että liittyisi olemassa olevaan ryhmään. Korjattu: PUT /api/user-books/:id kutsuu nyt mergeBooks:ia (utils/workGroup.js) automaattisesti kun newBookId eroaa rivin nykyisestä book_id:stä - vanha ja uusi kirja yhdistetään samaan ryhmään ennen book_id:n vaihtoa
- 2026-07-22: BookDetail laajennettu: painosten välinen navigointi listauksen kautta (onNavigateToBook-propi, klikattavat rivit paitsi nykyinen painos). "Omat merkintäsi" laajennettu koko ryhmän tasolle (uusi GET /api/user-books?groupRootId=, frontend getUserBooksForGroup) - näkyy nyt myös merkinnät jotka koskevat muita ryhmän painoksia, merkittynä painoksen nimellä jos eri kuin nykyinen sivu
- 2026-07-22: EditionsManager yksinkertaistettu BookDetail-sivulla: haku/yhdistäminen/irrotus-toiminnot poistettu kokonaan, jäljellä vain klikattava painoslistaus + "Ei muita versioita" -viesti. Nämä "ylläpidolliset" toiminnot siirretty omalle sivulle
- 2026-07-22: Uusi sivu components/EditionManagement.tsx ("Hallitse painoksia" sivuvalikossa Tuo kirjoja -kohdan vieressä): listaa käyttäjän omat ryhmät (sama groupByWorkRoot/pickRepresentative-logiikka kuin Kirjastoni), valitse ryhmä, hae ja yhdistä siihen uusi painos (sama mergeBooks-reitti), irrota-painike jokaiselle ryhmän jäsenelle
- 2026-07-22: Massatuontiin lisätty "Lisää valitut ja hae uudestaan ei-valitut" -painike: tuo heti valitut rivit, ja käynnistää automaattisesti uuden haun (peräkkäin, ei rinnakkain) jäljelle jääville ei-valituille riveille sen sijaan että ne pitäisi käsitellä yksi kerrallaan tai hylätä kokonaan
- 2026-07-22: AIEMMIN AVOIN BUGI, NYT VAHVISTETTU RATKAISTUKSI (koodikatselmuksessa 22.7. myöhemmin): tuonnin esikatselun "Valitse"-painikkeen checkbox-ongelma. Tarkistettu ImportRow.tsx + Import/index.tsx suoraan: handleSelectMatch asettaa include: true oikein, checkbox on sidottu row.include:en oikein, updateRow-funktio päivittää tilan oikein immutable-tyylillä. Syytä alkuperäiseen havaintoon ei jälkikäteen tunnistettu (todennäköisesti korjaantui jonkin välissä tehdyn muun muutoksen sivuvaikutuksena, tai kyse oli hetkellisestä selaimen välimuistiin jääneestä vanhasta koodista)
- 2026-07-22: Kansikuvien manuaalinen korjaus toteutettu: PUT /api/books/:bookId/cover-url (kuka tahansa kirjautunut käyttäjä saa muokata, koska books-taulu on jaettu - korjaa yhteisen Open Library/Google Books -datan laatuongelman kaikille kerralla), BookDetail-sivulla pieni kynä-ikoni kansikuvan yhteydessä avaa URL-syöttölomakkeen esikatselulla. Tietoinen rajaus: vain URL-liittäminen (ei tiedostolatausta/omaa CDN:ää) - päätös pysyy linjassa aiemman "ei omaa kansikuvatallennusta" -ratkaisun kanssa
- 2026-07-22: Selaa-näkymän kortit uudistettu: kansikuva (2:3-kuvasuhde) + tiedot rinnakkain jokaisella kortilla, responsiivinen ruudukko (1 sarake alle 640px, 2 saraketta siitä ylöspäin) jossa kannen leveys lukittu kiinteäksi (ei enää kasva kortin mukana) isommilla näytöillä - varmistaa että ruudulla on aina vähintään kaksi korttia rinnakkain
- 2026-07-22: Käyttäjä laajensi itse "Hallitse painoksia" -sivun listaamaan KAIKKI Lukuhullun kirjat/ryhmät (ei enää rajattu omiin) - uusi GET /api/books -reitti (ei liity user_books-tauluun, ei paljasta yksityistä dataa). Koodikatselmus koko projektikansiosta (zip, 84 tiedostoa) paljasti: (a) manuaalisen painoksen lisäyksen UI on tarkoituksella vasta hahmotelma, ei toiminnallinen (esitäytetyt kentät, ei tilaa/tallennusta) - odottaa täydennystä, (b) tekninen velka: GET /api/books tyypitetään UserBook/UserBooksResponse-tyypeillä mutta ei palauta created_at:ia, mikä rikkoo pickRepresentative:n lajittelun hiljaisesti (NaN-vertailuja) - ei vielä korjattu, (c) aiemmin avoimeksi kirjattu tuonnin checkbox-bugi vahvistettu ratkaistuksi suoralla koodintarkastuksella. Reittien rekisteröintijärjestys index.js:ssä tarkistettu oikeaksi (ei polkuristiriitoja /api/books/search, /api/books/detail ja /api/books:n välillä)
- 2026-07-22: Korjattu edellisessä kohdassa kirjattu created_at-tekninen velka. Käyttäjän valinnalla ("oma kevyempi tyyppi") tehty perusteellisempi korjaus pelkän SELECT-lisäyksen sijaan: uusi `BookGroupEntry`/`BookGroupsResponse`-tyyppipari (`frontend/src/types.ts`) korvaa `UserBook`/`UserBooksResponse`:n virheellisen käytön GET /api/books -reitillä - korjaa samalla myös sen ettei `id`-kenttä enää väitä tarkoittavansa `user_books.id`:tä vaikka se todellisuudessa on `books.id`. `groupByWorkRoot`/`pickRepresentative` (`utils/libraryGrouping.ts`) yleistetty geneerisiksi minimirajapinnan (`Groupable`: work_group_root_id/cover_url/created_at) yli, jotta ne toimivat sekä `UserBook`- että `BookGroupEntry`-riveillä. Backend: `created_at` lisätty `routes/bookGroups.js`:n SELECT-lauseeseen. `frontend/src/api/bookGroups.ts` ja `EditionManagement.tsx` päivitetty käyttämään uutta tyyppiä. `tsc --noEmit` puhdas.

### 23.7.2026

- 2026-07-23: ISBN-pohjatyö tehty (rajattu tehtävä, ei vielä UI:ta eikä Open Libraryn tarkkaa ISBN-tukea). Tietokanta: `ALTER TABLE books ADD COLUMN isbn TEXT` ajettu Neoniin (nullable, ei muita rajoitteita). `utils/bookHelpers.js`:n `findOrCreateBook` ottaa nyt vastaan ja tallentaa `isbn`-kentän. `routes/booksSearch.js`: `mapGoogleBooksResult` poimii ISBN:n Google Booksin `industryIdentifiers`-listasta (ISBN_13 ensisijaisena, ISBN_10 fallbackina), `mapOpenLibraryResult` palauttaa tarkoituksella `isbn: null` (Open Libraryn `search.json` on työtasoinen rajapinta eikä anna luotettavaa painoskohtaista ISBN:ää - tietoinen rajaus, ei poimintaa tässä vaiheessa), `searchOwnDatabase` palauttaa jo tallennetun ISBN:n. `routes/bookGroups.js` (`/ensure`) ja `routes/userBooks.js` (`POST /`) välittävät `isbn`:n `findOrCreateBook`:lle. Frontend: `BookSearchResult`-tyyppiin ja `ensureBook`-funktion parametrityyppiin lisätty `isbn: string | null`, `BookSearch.tsx` välittää sen `ensure`-kutsussa. `tsc --noEmit` puhdas.
- **Tarkoituksella jätetty myöhemmäksi:** ei UI-kenttää ISBN:n näyttämiseen/syöttämiseen missään näkymässä, ei ISBN-hakutilaa (`isbn:{ISBN}`-kysely, ks. massatuonnin suunniteltu ISBN-haku PAATOKSET.md:ssä), ei Open Libraryn tarkempaa edition-tason ISBN-rajapintaa (esim. `/api/books?bibkeys=ISBN:...`), `routes/import.js`/massatuonti koskematta, `EditionManagement.tsx`:n manuaalisen lisäyksen hahmotelma koskematta, `bookGroups.js`:n `/merge`- ja `GET /`-reitit koskematta (ei tarvetta lisätä isbn:ää näihin tässä vaiheessa, koska tehtävä oli rajattu pohjatyöhön).
- 2026-07-23: **Manuaalisen painoksen lisäys "Hallitse painoksia" -sivulle toteutettu** (edellinen hahmotelma korvattu toimivalla toiminnolla, ks. myös "Painosten ja kieliversioiden niputus" -osion UI-muutokset -kohta). `EditionManagement.tsx`: aiemmin toimimaton lomakerunko (esitäytetyt kentät, rikkinäinen `onChange`, ei tallennusta) korvattu **"Lisää manuaalisesti"** -painikkeella, joka avaa `Modal`-popupin — sama popup-komponentti kuin BookDetail-sivun lukukertalomakkeissa. Lomakkeen kentät: Nimi (pakollinen), Kirjailija, Julkaisuvuosi, ISBN, sekä kansikuvan URL-osoite elävällä esikatselukuvalla (sama UX kuin BookDetail-sivun olemassa olevassa kansikuvan käsin muokkauksessa). Nimi/Kirjailija/Julkaisuvuosi esitäytetään valitun ryhmän edustajan (`representative`) tiedoilla lomakkeen avautuessa (käyttäjän valinta: nopeuttaa täyttöä kun uusi painos on esim. sama nimi/kirjailija eri ISBN:llä tai käännösversio). Tallennuslogiikka: `ensureBook`-kutsu `openLibraryId`/`googleBooksId: null` -arvoilla luo aina uuden `books`-rivin (sama periaate kuin muualla manuaalisessa lisäyksessä, ks. "Manuaalinen kirjan lisäys" -osio), minkä jälkeen `mergeBooks(representative.id, { targetBookId: uusiBookId })` yhdistää sen välittömästi valittuun ryhmään — ilman tätä uusi painos jäisi irralliseksi omaksi yhden kirjan ryhmäkseen. `tsc --noEmit` puhdas. **Testauksen rajaus:** koska devympäristö osoittaa oikeaan Neon-tuotantokantaan ja "Hallitse painoksia" käsittelee kaikkea jaettua dataa (ei erillistä testikantaa), täyttä kirjautunutta selaintestiä ei tehty käyttäjän toiveesta — varmistettiin sen sijaan että devpalvelimet käynnistyvät virheettä ja että Vite kääntää `EditionManagement.tsx`:n ilman virheitä. Käyttäjä testaa varsinaisen kirjautuneen käyttöpolun itse.
- 2026-07-23: **Uusi sivuvalikkokohta "Lisää manuaalisesti"** ("Hallitse painoksia" -kohdan alla, hieman sisennettynä sen alilinkkinä). Edellisen kohdan lomake (Nimi/Kirjailija/Julkaisuvuosi/ISBN/kansikuvan URL) eriytettiin omaksi jaetuksi komponentiksi `frontend/src/components/ManualBookForm.tsx`, jottei samaa kenttäjoukkoa+tallennuslogiikkaa (`ensureBook`-kutsu) toistettaisi kahdessa paikassa — komponentti ottaa `onSaved(bookId, title)`-callbackin, joka päättää MITÄ TAPAHTUU luonnin jälkeen (ainoa asia joka eroaa kahden käyttöpaikan välillä). Sivuvalikon uusi kohta avaa tämän lomakkeen `Modal`-popupissa suoraan `App.tsx`:n tasolla (ilman esitäyttöä, koska kyseessä ei ole olemassa olevaan ryhmään liittyvä painos) — tallennuksen jälkeen `onSaved` vain navigoi käyttäjän suoraan uuden kirjan `BookDetail`-sivulle (`setViewingBookId`), EI kutsu `mergeBooks`:ia, joten kirjasta tulee oman ryhmänsä ensimmäinen/ainoa jäsen (`work_group_id` jää `NULL`:ksi). `EditionManagement.tsx` refaktoroitu käyttämään samaa `ManualBookForm`:ia (esitäytettynä ryhmän edustajan tiedoilla, `onSaved` kutsuu `mergeBooks`:ia kuten ennenkin) — toiminnallisuus ei muuttunut, vain toteutus siistiytyi. `SideMenu.tsx`:n `onNavigate`-propin rinnalle uusi erillinen `onManualAdd`-callback (eri asia kuin `onNavigate`: ei vaihda koko sivun näkymää `currentView`-tilalla, vaan avaa popupin nykyisen näkymän päälle). `tsc --noEmit` puhdas, Vite kääntää kaikki muutetut/uudet tiedostot (`App.tsx`, `SideMenu.tsx`, `ManualBookForm.tsx`, `EditionManagement.tsx`) virheettä — täyttä kirjautunutta selaintestiä ei tehty samasta syystä kuin edellisessä kohdassa (oikea tuotantokanta).
- 2026-07-23: **Koko projektin läpikäynti pyydettiin ja kaikki löydökset korjattiin** (vanhentuneet kommentit, kömpelö/duplikoitu koodi, liian isot komponentit, teoriassa hitaat kohdat, latausanimaatioiden puutteet). Koottu tänne yhteen koska muutoksia oli paljon eri tiedostoissa - yksityiskohdat alla kategorioittain.
  - **Vanhentuneet kommentit korjattu:** `routes/bookDetail.js`:n ja `BookDetail/index.tsx`:n kommentit jotka viittasivat poistettuun "aseta ensisijaiseksi" -mekanismiin (ks. 22.7.2026: "Kanoninen käsite"), `routes/bookGroups.js`:n tiedostotason kommentti joka listasi vain osan reiteistä.
  - **Kuollut koodi poistettu:** `backend/utils/retry.js` (kokonaan käyttämätön `retryOnEmpty`, jonka perusoletus - API palauttaa toisinaan tyhjän tuloksen kelvolliselle haulle - on suoraan sitä vastaan mitä myöhemmin todistettiin ja toteutettiin `fetchWithRetry`:ssä, ks. 22.7.2026), `utils/matching.js`:n käyttämätön `pickBestMatchByTitle` (jäänne poistetusta kolmivaiheisesta kieli-/kirjailijahausta).
  - **Backend-korjaukset:** `POST /api/import/preview` käärittiin try/catchiin (oli ainoa reitti jonka runko ei ollut suojattu - tekninen virhe olisi jäänyt ilman siistiä 500-vastausta). `GET /api/books` (`routes/bookGroups.js`) sai `ORDER BY created_at DESC`:n (ei ollut aiemmin taattua järjestystä). `mapWithConcurrencyLimit` (`utils/concurrency.js`) ei enää odota turhaa 1s:a työläisen viimeisen alkion jälkeen. `levenshteinDistance` (`utils/matching.js`) kirjoitettu uudelleen täydestä (n+1)x(m+1)-matriisista rullaavaan 1D-riviin (O(min(n,m)) muistia O(n*m):n sijaan) - testattu käsin (`pickBestMatch`/`rankCandidates` käyttäytyvät identtisesti, ks. myös PAATOKSET.md:n aiempi kuvaus pisteytyslogiikasta).
  - **Frontendin type-korjaus:** `BookSearchResult.source`-tyyppi (`types.ts`) sisälsi vain `"openlibrary" | "googlebooks"` vaikka backend palauttaa myös `"database"` (`searchOwnDatabase`) - lisätty puuttuva literaali.
  - **Duplikoitu koodi poistettu neljällä uudella jaetulla komponentilla:**
    - `ReadingDetailsFields.tsx` (status/vuosi/kk/pv/omistus/kommentti-kentät) - käytössä `AddEntryForm`:ssa ja `OwnEntryForm`:ssa, jotka olivat sanasta sanaan identtiset. `ImportRow.tsx`:n oma tiivis versio (ei label-otsikoita, placeholder-tekstit) jätettiin TARKOITUKSELLA ennalleen - sen pakottaminen samaan komponenttiin olisi vaatinut compact/normal-haaroja jokaiselle kentälle, mikä olisi tehnyt komponentista monimutkaisemman kuin mitä se olisi säästänyt.
    - `BookResultsList.tsx` (kansi+nimi/kirjailija/vuosi/lähde+valintapainike-rivi) - käytössä `EditionManagement`:n yhdistämishaussa, `OwnEntryForm`:n (nyk. `EditionSwitcher`:n) "Vaihda painos" -haussa, ja `ImportRow`:n ehdotus- ja uudelleenhakulistoissa. `BookSearch.tsx`:n päähaku jätettiin TARKOITUKSELLA ulkopuolelle - sen koko rivi on klikattava ilman erillistä valintapainiketta (eri interaktiomalli, dokumentoitu jo Navigaatio-osiossa).
    - `CoverUrlInput.tsx` (kansikuvan URL + elävä esikatselu) - käytössä `BookDetail`:n kansikuvan käsin muokkauksessa ja `ManualBookForm`:ssa.
    - `ui/Spinner.tsx` (pieni `Loader2`-pohjainen pyörivä ikoni) - ks. latausanimaatiot alla.
  - **Liian isot komponentit pilkottu:**
    - `EditionManagement.tsx` (404 riviä) muutettu kansioksi `components/EditionManagement/`: `index.tsx` (ryhmälista + tilanhallinta), `CurrentEditionsPanel.tsx` (nykyiset painokset + irrotus, puhtaasti esittävä), `MergeSearchPanel.tsx` (haku + yhdistäminen, oma sisäinen hakutila jonka `key={rootId}` nollaa automaattisesti ryhmää vaihdettaessa React:n normaalin remount-käytöksen kautta sen sijaan että vanhempi nollaisi tilan käsin).
    - `BookDetail/OwnEntryForm.tsx` (344 → 168 riviä): "Vaihda painos" -osio (oma hakutila + `ensureBook`-logiikka) eriytetty `EditionSwitcher.tsx`:ksi, joka ilmoittaa valinnan vanhemmalle `onSelect(bookId, title)`-callbackilla.
  - **Latausanimaatiot:**
    - Kaikkiin `<img>`-tageihin lisätty `loading="lazy"` PAATOKSET.md:n "Kansikuvien tallennus/välimuisti" -päätöksen mukaisesti (aiemmin ei ollut yhdessäkään) - **paitsi** `BookDetail/index.tsx`:n yläosan pääkansikuva, joka jätettiin tarkoituksella ilman: se on sivun ensimmäinen/tärkein aina-näkyvä kuva (LCP-ehdokas), ja `loading="lazy"` sille olisi web-suorituskykykäytäntöjen vastaista.
    - Uusi `ui/Spinner.tsx` (`Loader2` + `animate-spin`) lisätty kaikkien merkittävien tallennus-/haku-/latauspainikkeiden yhteyteen pelkän tekstinvaihdon ("Tallennetaan...", "Haetaan...") rinnalle: `AddEntryForm`, `OwnEntryForm`, `EditionSwitcher`, `ManualBookForm`, `DisplayNamePrompt`, `MergeSearchPanel`, `Import`-näkymän Esikatsele/Tuo/Lisää-painikkeet, `ImportRow`:n "Hae uudelleen", `BookSearch`:n rivikohtainen "Avataan...", sekä koko sovelluksen ja jokaisen sivun ("Kirjastoni", "Selaa", `BookDetail`, "Hallitse painoksia") ylätason "Ladataan..."-tilat.
    - Aiemmin puuttuneet latausilmaisimet lisätty kahteen aitoon aukkoon: `BookDetail/EditionsManager.tsx` näytti tyhjän kortin kun `editions` oli vielä `null` (ensimmäinen haku kesken) - näyttää nyt "Ladataan...". `EditionManagement`:n ryhmänvaihto (`handleSelectGroup`) ei nollannut `currentEditions`:ia ennen uutta hakua, jolloin EDELLISEN ryhmän painokset saattoivat välähtää hetkeksi UUDEN ryhmän otsikon alla - nollataan nyt `null`:ksi heti, ja `CurrentEditionsPanel` näyttää oman latausviestinsä sen ajan.
    - Massatuonnin esikatselu (`Import/index.tsx`): koska yksi `/api/import/preview`-pyyntö voi teoriassa kestää useita minuutteja isolla CSV:llä (rajoitettu rinnakkaisuus + per-rivi ulkoiset API-kutsut mahdollisine 429-uudelleenyrityksineen, ks. PAATOKSET.md:n hakulogiikka-osio), pelkkä napin tekstinvaihto ei riittänyt kertomaan käyttäjälle mitä on meneillään. Ei rakennettu tarkkaa edistymispalkkia (vaatisi striimauksen/SSE:n nykyisen yhden kertaluontoisen pyynnön sijaan - liian iso muutos tähän korjaukseen), vaan lisättiin spinner + selittävä teksti arvioidulla rivimäärällä ("Käsitellään ~N riviä ulkoisista tietolähteistä - tämä voi kestää useita minuutteja isommilla tiedostoilla").
  - **Ei vielä tehty, vaativat käyttäjän ajamana Neonin SQL-editorissa** (samaa periaatetta kuin kaikki aiemmatkin skeemamuutokset tässä projektissa - ks. esim. ISBN-sarakkeen lisäys): indeksi `books.work_group_id`-sarakkeelle (ryhmähaut tekevät nyt sekvenssiskannauksen) ja `pg_trgm`-laajennus + GIN-indeksit `books.title`/`author`-sarakkeille (`searchOwnDatabase`:n `ILIKE '%...%'` ei voi käyttää tavallista B-tree-indeksiä etuliite-jokerimerkin takia). Molemmat ovat puhtaasti suorituskykyoptimointeja pienelle nykyiselle datamäärälle merkityksettömiä, mutta hidastuisivat datan kasvaessa - SQL-lauseet annettu käyttäjälle erikseen.
  - Kaikki muutokset varmistettu: `tsc --noEmit` puhdas, backendin kaikki `.js`-tiedostot `node --check`-puhtaita, devpalvelimet (backend+frontend) käynnistyvät virheettä ja Vite kääntää jokaisen muutetun/uuden tiedoston onnistuneesti.
- 2026-07-23: **ISBN-taustatäyttöskripti** `backend/scripts/backfillIsbn.js`: kertakäyttöinen, käsin ajettava (`node scripts/backfillIsbn.js`) skripti joka hakee kaikille `books`-riveille joilla on `google_books_id` mutta ei `isbn`:ää (271 riviä taulussa, 183:lla `google_books_id`, ajohetkellä 0:lla `isbn`) puuttuvan ISBN:n Google Booksin `/volumes/{id}`-rajapinnasta samalla `industryIdentifiers`-poiminnalla kuin `mapGoogleBooksResult`. Kolme erillistä, toisistaan selvästi erotettua lopputulosta per rivi (käyttäjän itse pyytämä korjaus alkuperäiseen versioon, jossa HTTP-virhe ja "Google vastasi mutta ei ISBN:ää" menivät saman laskurin/viestin alle): **päivitetty** (ISBN tallennettu), **vahvistetusti ei ISBN:ää** (Google vastasi onnistuneesti, `industryIdentifiers` puuttui/ei sisältänyt ISBN:ää - rivi jää `NULL`:ksi tarkoituksella), **epäonnistui** (verkkovirhe/HTTP-virhe/virheellinen JSON - rivi jää `NULL`:ksi JOTTA seuraava ajokerta yrittää sen uudelleen, ei siis tulkita "ei ISBN:ää":ksi). 200ms viive pyyntöjen välissä (ei rinnakkaisuutta, joten ei tarvita `utils/concurrency.js`:n jitter/backoff-logiikkaa).
- 2026-07-23: **ISBN-haku toteutettu kaikkiin sovelluksen hakuihin** (`routes/booksSearch.js`), täydentäen 22.7.2026 kirjatun "ISBN-pohjatyön" tarkoituksella jätetyt aukot. `searchBooksByQuery` tunnistaa nyt ISBN-muotoisen syötteen (`normalizeIsbn` poistaa väliviivat/välilyönnit, `isIsbn` tarkistaa 10 tai 13 merkin muodon - ei tarkistusmerkin laskennallista validointia, riittää ohjaamaan oikeaan hakupolkuun) ja ohjaa sen `searchBooksByIsbn`:lle pelkän ILIKE-tekstihaun sijaan. Uusi haku etenee samalla "oma tietokanta voittaa" -periaatteella kuin yleinen haku, mutta pysähtyy ensimmäiseen osuman löytävään lähteeseen (ei tarvetta 22.7.2026:n "≥5 tulosta" -kynnykselle, koska ISBN-osuma on aina täsmällinen): (1) **oma tietokanta** tarkalla `WHERE isbn = $1` -haulla (uusi `searchOwnDatabaseByIsbn`, jakaa rivinmuunnoksen `searchOwnDatabase`:n kanssa uudella `mapDbRow`-apufunktiolla), (2) **Open Libraryn dedikoitu ISBN-rajapinta** `api/books?bibkeys=ISBN:{isbn}&jscmd=data` (uusi `searchOpenLibraryByIsbn`) - EI `search.json`, koska sen työtasoiset tulokset eivät luotettavasti sisällä painoskohtaista ISBN:ää (ks. 22.7.2026-merkintä); tämä oli 22.7. tarkoituksella jätetty toteuttamatta, nyt tehty, (3) **Google Books** `q=isbn:{isbn}` (olemassa oleva `searchGoogleBooks`, ei muutoksia - qualifier toimi jo entuudestaan). `routes/import.js`:n ISBN-haara (`buildPreviewRow`) päivitetty kutsumaan `searchBooksByQuery(parsed.isbn)` suoraan aiemman `` `isbn:${parsed.isbn}` `` -tekstiliitoksen sijaan, koska ISBN-tunnistus tapahtuu nyt keskitetysti `searchBooksByQuery`:n sisällä eikä hakusanan etuliitteestä. Frontend: kolmen hakukentän (`BookSearch.tsx`, `EditionSwitcher.tsx`, `MergeSearchPanel.tsx` - kaikki kutsuvat samaa `searchBooks`-funktiota) placeholder-tekstit päivitetty mainitsemaan ISBN, muuta ei tarvinnut muuttaa koska ne käyttävät jo samaa jaettua `/api/books/search?q=`-reittiä. Testattu käynnissä olevaa devpalvelinta vasten oikeilla verkkokutsuilla (ei vain `tsc`/`node --check`): haku ISBN-13:lla (väliviivoin ja ilman) ja ISBN-10:llä löysi saman kirjan Open Libraryn kautta oikealla kannella/vuodella/kirjailijalla (oma tietokanta palautti tyhjän, koska taustatäyttöskriptiä ei ollut vielä ajettu ajohetkellä); tavallinen tekstihaku (`q=harry potter`) toimi ennallaan. `tsc --noEmit` puhdas.
