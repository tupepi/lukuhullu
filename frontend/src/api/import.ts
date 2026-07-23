// Fetch-kutsut massatuontiin, vastaa routes/import.js:ää. Kaksi vaihetta
// (ks. PAATOKSET.md: UI-periaatteet / Massatuonti): previewImport hakee
// vain ehdotukset (ei tallenna mitään), confirmImport tallentaa käyttäjän
// hyväksymät/korjaamat rivit vasta esikatselun jälkeen.
import type { ImportPreviewRow, BookStatus, Ownership } from "../types";
import { API_BASE } from "./client";

export async function previewImport(
  format: "own" | "goodreads",
  csv: string,
  getToken: () => Promise<string | null>,
): Promise<ImportPreviewRow[]> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api/import/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ format, csv }),
  });
  if (!res.ok) throw new Error("Esikatselu epäonnistui");
  const data = await res.json();
  return data.rows;
}

export interface ImportConfirmItem {
  openLibraryId: string | null;
  googleBooksId: string | null;
  title: string;
  author: string | null;
  coverUrl: string | null;
  yearPublished: number | null;
  subjects: string[];
  status: BookStatus;
  readYear?: number;
  readMonth?: number;
  readDay?: number;
  ownership?: Ownership;
  comment?: string;
  existingBookId?: number;
}

export async function confirmImport(
  items: ImportConfirmItem[],
  getToken: () => Promise<string | null>,
): Promise<{
  inserted: number;
  failed: { title: string | null; error: string }[];
}> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api/import/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error("Tuonti epäonnistui");
  return res.json();
}
