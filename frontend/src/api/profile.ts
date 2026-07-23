// Fetch-kutsut käyttäjän omaan profiiliin (näyttönimi), vastaa
// routes/profile.js:ää. Käytetään mm. App.tsx:ssä ratkaisemaan pitääkö
// DisplayNamePrompt näyttää (ks. PAATOKSET.md: Pakotettu näyttönimi
// ennen kommentointia).
import { API_BASE } from "./client";

export async function getProfile(
  getToken: () => Promise<string | null>,
): Promise<{ displayName: string | null }> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("Profiilin haku epäonnistui");
  }
  return res.json();
}

export async function setDisplayName(
  displayName: string,
  getToken: () => Promise<string | null>,
): Promise<{ displayName: string }> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ displayName }),
  });
  if (!res.ok) {
    throw new Error("Näyttönimen tallennus epäonnistui");
  }
  return res.json();
}
