// Sovelluksen käynnistyspiste. Vastuu on tarkoituksella minimaalinen:
// - lataa ympäristömuuttujat
// - alustaa Express-sovelluksen ja globaalit middlewaret
// - kytkee reittikokonaisuudet (routes/) oikeisiin polkuihin
// - käynnistää palvelimen
// Kaikki varsinainen liiketoimintalogiikka (SQL-kyselyt, ulkoiset API-kutsut)
// asuu routes/-kansion tiedostoissa, ei täällä.

// Tämän PITÄÄ olla ensimmäinen rivi - lukee .env-tiedoston sisällön
// process.env-muuttujiin ENNEN kuin mitään muuta koodia (esim. db.js:n
// pool-alustus, joka lukee DATABASE_URL:n) ajetaan.
import "dotenv/config";

import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";

import booksSearchRouter from "./routes/booksSearch.js";
import userBooksRouter from "./routes/userBooks.js";
import profileRouter from "./routes/profile.js";
import discoverRouter from "./routes/discover.js";
import bookDetailRouter from "./routes/bookDetail.js";
import importRouter from "./routes/import.js";
import bookGroupsRouter from "./routes/bookGroups.js";
import webhooksRouter from "./routes/webhooks.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Sallii selaimen tekemät pyynnöt eri origin-osoitteesta (CORS).
// Tämä on tarpeen, koska frontend ja backend
// ajetaan eri osoitteissa (esim. localhost:3000 vs localhost:3001). CORS-ongelma ilmenee
// selaimen konsolissa "Access-Control-Allow-Origin" -virheilmoituksena, jos tätä ei ole.
app.use(cors({ origin: process.env.CORS_ALLOWED_ORIGIN }));

// Kytketään ENNEN app.use(express.json())-riviä: Clerkin webhookit
// tarkistetaan Svix-allekirjoituksella raa'asta bodysta (ks. routes/
// webhooks.js), joka ei enää täsmäisi jos globaali JSON-parseri olisi
// jo muuttanut sen JS-objektiksi. Reitti tekee itse oman
// express.raw()-käsittelynsä vain tälle polulle.
app.use("/api/webhooks", webhooksRouter);

// Muuttaa saapuvien POST/PUT-pyyntöjen JSON-bodyn automaattisesti
// tavalliseksi JS-objektiksi (req.body). Ilman tätä req.body olisi undefined.
app.use(express.json());

// Lukee jokaisesta pyynnöstä Authorization-headerin (jos sellainen on) ja
// validoi siinä olevan Clerk-tokenin. Liittää tuloksen req.auth-objektiin,
// jota getAuth(req) sitten lukee reittien sisällä. Tämä middleware itsessään
// EI estä pääsyä mihinkään - se vain "tunnistaa" käyttäjän. Varsinainen
// pakottaminen tapahtuu requireAuth():lla yksittäisillä reiteillä
// (ks. routes/userBooks.js).
app.use(clerkMiddleware());

// Yksinkertainen julkinen reitti palvelimen elossaolon tarkistukseen -
// hyödyllinen myös myöhemmin Renderin/monitoroinnin "health check" -tarpeisiin.
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Kytketään reittikokonaisuudet oikeisiin polkuihin. Jokainen router-tiedosto
// määrittelee itse vain suhteellisia polkuja (esim. '/' tai '/:id') - tässä
// päätetään mihin URL-etuliitteeseen ne kiinnittyvät kokonaisuutena.
app.use("/api/books/search", booksSearchRouter);
app.use("/api/user-books", userBooksRouter);
// Profiili (näyttönimen asetus/haku) - oma polkunsa koska ei liity
// suoraan mihinkään yksittäiseen kirjaan tai hakuun
app.use("/api/profile", profileRouter);
app.use("/api/discover", discoverRouter);
app.use("/api/books/detail", bookDetailRouter);
app.use("/api/import", importRouter);
app.use("/api/books", bookGroupsRouter);

app.listen(PORT, () => {
  console.log(`Lukuhullu-backend käynnissä portissa ${PORT}`);
});
