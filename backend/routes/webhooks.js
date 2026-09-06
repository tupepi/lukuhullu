// Clerkin webhookit. Toistaiseksi vain user.updated, jota käytetään
// testikäyttäjän suojaamiseen (ks. keskustelu ja PAATOKSET.md): Clerk ei voi
// perua jo tapahtunutta tietojen muutosta webhookin vastauksen perusteella,
// joten tämä toimii jälkikäteisenä automaattisena korjausmekanismina - jos
// testikäyttäjä (public_metadata.isTestUser) vaihtaa käyttäjänimen,
// sähköpostin tai salasanan (esim. Clerkin oman UserButton-tilinhallinnan
// kautta, jota sovelluksen oma /api/profile-reitti ei näe ollenkaan), tämä
// pakottaa ne takaisin lukittuihin arvoihin.
import express from "express";
import { Webhook } from "svix";
import { clerkClient } from "@clerk/express";

const router = express.Router();

// POST /api/webhooks/clerk - Clerkin kutsuma, EI requireAuth():ia, koska
// Clerk ei lähetä käyttäjäsessiota - ainoa todennus on Svix-allekirjoitus.
// Reitti mountataan index.js:ssä ENNEN app.use(express.json())-riviä ja
// käyttää tässä omaa express.raw()-middlewarea, koska Svix tarvitsee pyynnön
// raa'an tavusisällön allekirjoituksen tarkistukseen - jo JSON:ksi jäsennetty
// body ei enää täsmäisi allekirjoitukseen.
router.post(
  "/clerk",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    if (!signingSecret) {
      console.error("CLERK_WEBHOOK_SIGNING_SECRET puuttuu ympäristöstä");
      return res.status(500).json({ error: "Webhook ei ole konfiguroitu" });
    }

    let event;
    try {
      const wh = new Webhook(signingSecret);
      // HUOM: asennetun svix-version (2.3.0) Webhook.verify() vain
      // validoi allekirjoituksen (heittää jos väärä) - se EI palauta
      // jäsenneltyä sisältöä, toisin kuin dokumentaatio/vanhemmat versiot
      // antaisivat olettaa (todettu käytännön testillä). Body pitää siis
      // jäsentää itse validoinnin jälkeen.
      wh.verify(req.body, {
        "svix-id": req.header("svix-id"),
        "svix-timestamp": req.header("svix-timestamp"),
        "svix-signature": req.header("svix-signature"),
      });
      event = JSON.parse(req.body.toString("utf8"));
    } catch (err) {
      console.error("Webhookin allekirjoitus ei täsmännyt:", err.message);
      return res.status(400).json({ error: "Virheellinen allekirjoitus" });
    }

    // Vastataan heti - Clerk kirjaa vain onnistuiko toimitus, ei odota
    // korjauslogiikan valmistumista. Korjaus on joka tapauksessa
    // asynkroninen jälkikäteistoimenpide, ei osa tätä HTTP-vastausta.
    res.status(200).json({ received: true });

    if (event.type === "user.updated") {
      restoreTestUserIfNeeded(event.data).catch((err) => {
        console.error("Testikäyttäjän tietojen palautus epäonnistui:", err);
      });
    }
  },
);

// Käyttäjänimi/sähköposti/salasana pakotetaan AINA takaisin lukittuihin
// arvoihin, ei vain jos ne "muuttuivat" - salasanaa ei voi lukea webhook-
// datasta eikä Backend APIsta ollenkaan (Clerk ei koskaan paljasta sen
// arvoa), joten sille ei voi tehdä vertailua, vain ehdotonta uudelleenasetusta.
// Ehdoton asetus on turvallista tehdä käyttäjänimelle/sähköpostillekin,
// koska se on idempotenttia (sama lopputulos vaikka mikään ei olisi
// muuttunut) ja tapahtumamäärä yhdelle testikäyttäjälle on olematon.
async function restoreTestUserIfNeeded(user) {
  if (!user?.public_metadata?.isTestUser) return;

  const lockedUsername = process.env.TEST_USER_LOCKED_USERNAME;
  const lockedEmail = process.env.TEST_USER_LOCKED_EMAIL;
  const lockedPassword = process.env.TEST_USER_LOCKED_PASSWORD;

  if (!lockedUsername || !lockedEmail || !lockedPassword) {
    console.error(
      "TEST_USER_LOCKED_* -ympäristömuuttujat puuttuvat - testikäyttäjää ei korjattu",
    );
    return;
  }

  await clerkClient.users.updateUser(user.id, {
    username: lockedUsername,
    password: lockedPassword,
    skipPasswordChecks: true,
  });

  await restoreLockedEmail(user, lockedEmail);
}

// Sähköposti ei ole yksittäinen kenttä updateUserissa - käyttäjällä on
// email_addresses-taulukko (id + osoite + verifiointitila). Varmistetaan
// että lukittu osoite on olemassa ja primary, ja poistetaan kaikki muut
// (esim. käyttäjän itse lisäämät uudet osoitteet).
async function restoreLockedEmail(user, lockedEmail) {
  const emailAddresses = user.email_addresses ?? [];
  const existing = emailAddresses.find(
    (e) => e.email_address === lockedEmail,
  );

  let lockedId = existing?.id;
  if (!lockedId) {
    const created = await clerkClient.emailAddresses.createEmailAddress({
      userId: user.id,
      emailAddress: lockedEmail,
      verified: true,
      primary: true,
    });
    lockedId = created.id;
  } else if (existing.id !== user.primary_email_address_id) {
    await clerkClient.emailAddresses.updateEmailAddress(lockedId, {
      verified: true,
      primary: true,
    });
  }

  for (const e of emailAddresses) {
    if (e.id !== lockedId) {
      await clerkClient.emailAddresses.deleteEmailAddress(e.id);
    }
  }
}

export default router;
