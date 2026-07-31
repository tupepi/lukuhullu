// Fetch-kutsu julkiseen Selaa-syötteeseen (routes/discover.js). Vaatii
// tokenin (requireAuth backendissä), mutta itse palautettu data ei riipu
// siitä kuka on kirjautunut - kyse on siis pääsyn rajaamisesta
// kirjautuneisiin käyttäjiin, ei käyttäjäkohtaisesta sisällöstä
// (ks. PAATOKSET.md: Julkinen selailu ja kommentit).
import type { DiscoverBook } from "../types";
import { API_BASE } from "./client";

export interface DiscoverPage {
  results: DiscoverBook[];
  hasMore: boolean;
}

export async function getDiscoverFeed(
  getToken: () => Promise<string | null>,
  offset: number,
  limit: number,
): Promise<DiscoverPage> {
  const token = await getToken();
  const res = await fetch(
    `${API_BASE}/api/discover?offset=${offset}&limit=${limit}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) {
    throw new Error("Selailun haku epäonnistui");
  }
  const data = await res.json();
  return { results: data.results, hasMore: data.hasMore };
}
