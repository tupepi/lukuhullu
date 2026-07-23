// Fetch-kutsu julkiseen Selaa-syötteeseen (routes/discover.js). Vaatii
// tokenin (requireAuth backendissä), mutta itse palautettu data ei riipu
// siitä kuka on kirjautunut - kyse on siis pääsyn rajaamisesta
// kirjautuneisiin käyttäjiin, ei käyttäjäkohtaisesta sisällöstä
// (ks. PAATOKSET.md: Julkinen selailu ja kommentit).
import type { DiscoverBook } from "../types";
import { API_BASE } from "./client";

export async function getDiscoverFeed(
  getToken: () => Promise<string | null>,
): Promise<DiscoverBook[]> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api/discover`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("Selailun haku epäonnistui");
  }
  const data = await res.json();
  return data.results;
}
