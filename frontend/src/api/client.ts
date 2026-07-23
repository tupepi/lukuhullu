// Tuotannossa (GitHub Pages) tämä tulee build-aikaisesta VITE_API_BASE_URL
// -ympäristömuuttujasta, joka asetetaan kun sovellus deployataan (ks.
// PAATOKSET.md: Deployment). Kehityksessä käytetään .env-tiedoston arvoa,
// tai jos sitäkään ei ole, oletetaan paikallinen backend.
export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
