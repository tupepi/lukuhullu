// Fetch-kutsut painosten/kieliversioiden niputukseen, vastaa
// routes/bookGroups.js:ää (ks. PAATOKSET.md: Painosten ja kieliversioiden
// niputus). Käytetään BookDetailin EditionsManager-alikomponentista.
import type { Edition, BookGroupsResponse } from "../types";
import { API_BASE } from "./client";

// targetBookId JOS kohde on jo tietokannassa, targetExternal JOS kohde
// tulee suoraan ulkoisesta hausta (kirja luodaan/etsitään backendissä
// ennen yhdistämistä) - täsmää routes/bookGroups.js:n merge-reitin logiikkaa.
export interface MergeTarget {
  targetBookId?: number;
  targetExternal?: {
    openLibraryId: string | null;
    googleBooksId: string | null;
    title: string;
    author: string | null;
    coverUrl: string | null;
    yearPublished: number | null;
    subjects: string[];
  };
}

export async function mergeBooks(
  bookId: number,
  target: MergeTarget,
  getToken: () => Promise<string | null>,
): Promise<{ rootId: number; alreadyMerged: boolean }> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api/books/${bookId}/merge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(target),
  });
  if (!res.ok) throw new Error("Yhdistäminen epäonnistui");
  return res.json();
}

export async function unmergeBook(
  bookId: number,
  getToken: () => Promise<string | null>,
): Promise<void> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api/books/${bookId}/unmerge`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Irrottaminen epäonnistui");
}

export async function getEditions(
  bookId: number,
  getToken: () => Promise<string | null>,
): Promise<{ rootId: number; editions: Edition[] }> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api/books/${bookId}/editions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Painosten haku epäonnistui");
  return res.json();
}

export async function updateCoverUrl(
  bookId: number,
  coverUrl: string,
  getToken: () => Promise<string | null>,
): Promise<{ bookId: number; coverUrl: string }> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api/books/${bookId}/cover-url`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ coverUrl }),
  });
  if (!res.ok) throw new Error("Kansikuvan päivitys epäonnistui");
  return res.json();
}

export async function getBooks(
  getToken: () => Promise<string | null>,
): Promise<BookGroupsResponse> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api/books`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("Kirjaston haku epäonnistui");
  }
  return res.json();
}
