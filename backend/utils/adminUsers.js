// Väliaikainen kovakoodattu admin-rajaus: niputus (merge/unmerge),
// kansikuvan vaihto ja manuaalisten painosten muokkaus/poisto vaikuttavat
// jaettuun books-tauluun eli kaikkiin käyttäjiin kerralla (ks. bookGroups.js:n
// reittikommentit). Kunnes sovelluksella on oikea rooli-/permissiomalli,
// nämä toiminnot rajataan ADMIN_USER_IDS-ympäristömuuttujassa listatuille
// Clerk-käyttäjä-id:ille.
import { getAuth } from "@clerk/express";

const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

export function requireAdmin(req, res, next) {
  const { userId } = getAuth(req);
  if (!ADMIN_USER_IDS.includes(userId)) {
    return res.status(403).json({ error: "Vain ylläpitäjä voi tehdä tämän" });
  }
  next();
}
