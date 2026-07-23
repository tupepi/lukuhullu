// Kaikki fetch-kutsut kirjahakuun ja käyttäjän omaan kirjastoon (user_books).
// Jokainen funktio vastaa yhtä backendin reittiä (routes/booksSearch.js,
// routes/userBooks.js, routes/bookDetail.js) - tässä on vain kutsulogiikka
// (fetch + otsikot + virheenkäsittely), ei UI:ta tai tilaa.
// getToken tulee Clerkiltä (useAuth().getToken) jokaiselle autentikoidulle
// kutsulle erikseen parametrina sen sijaan että se haettaisiin täällä
// suoraan - tämä pitää api/-tiedostot riippumattomina Reactin hookeista.
import type {
  BookSearchResult,
  BookStatus,
  Ownership,
  UserBook,
} from "../types";
import { API_BASE } from "./client";
import type { BookDetailData, UserBooksResponse } from "../types";

export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  const res = await fetch(
    `${API_BASE}/api/books/search?q=${encodeURIComponent(query)}`,
  );
  if (!res.ok) {
    throw new Error("Haku epäonnistui");
  }
  const data = await res.json();
  return data.results;
}

export interface AddBookInput {
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
}

export async function addUserBook(
  input: AddBookInput,
  getToken: () => Promise<string | null>,
) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api/user-books`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    // Luetaan backendin oikea virheviesti sen sijaan että käytetään
    // aina samaa geneeristä tekstiä - näin käyttäjä (ja sinä debugatessa)
    // näkee mikä täsmälleen meni pieleen
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Kirjan lisäys epäonnistui");
  }
  return res.json();
}

export async function getBookDetail(
  bookId: number,
  getToken: () => Promise<string | null>,
): Promise<BookDetailData> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api/books/detail/${bookId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("Kirjan tiedon haku epäonnistui");
  }
  return res.json();
}

// Hakee käyttäjän omat lukukerrat yhdelle tietylle kirjalle (voi olla
// useampi rivi jos kirja on luettu useaan kertaan)
export async function getUserBooksForBook(
  bookId: number,
  getToken: () => Promise<string | null>,
): Promise<UserBook[]> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api/user-books?bookId=${bookId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("Omien merkintöjen haku epäonnistui");
  }
  const data = await res.json();
  return data.results;
}

export interface UpdateUserBookInput {
  status?: BookStatus;
  readYear?: number;
  readMonth?: number;
  readDay?: number;
  ownership?: Ownership;
  comment?: string;
  newBookId?: number;
}

export async function getUserBooks(
  getToken: () => Promise<string | null>,
): Promise<UserBooksResponse> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api/user-books`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("Kirjaston haku epäonnistui");
  }
  return res.json();
}

export async function updateUserBook(
  id: number,
  input: UpdateUserBookInput,
  getToken: () => Promise<string | null>,
) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api/user-books/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error("Päivitys epäonnistui");
  }
  return res.json();
}

export async function deleteUserBook(
  id: number,
  getToken: () => Promise<string | null>,
): Promise<void> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api/user-books/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("Poisto epäonnistui");
  }
  // DELETE-reitti palauttaa 204 No Content, ei JSON-bodyä - ei siis
  // res.json()-kutsua tässä, se aiheuttaisi virheen tyhjän vastauksen
  // parsimisyrityksestä
}

export async function ensureBook(
  book: {
    openLibraryId: string | null;
    googleBooksId: string | null;
    title: string;
    author: string | null;
    coverUrl: string | null;
    yearPublished: number | null;
    subjects: string[];
    isbn: string | null;
  },
  getToken: () => Promise<string | null>,
): Promise<{ bookId: number }> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api/books/ensure`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(book),
  });
  if (!res.ok) throw new Error("Kirjan varmistus epäonnistui");
  return res.json();
}

// Hakee käyttäjän omat lukukerrat KOKO RYHMÄSTÄ (kaikki painokset/kielet),
// ei vain yhdestä tietystä painoksesta. Käytetään BookDetailissa - ks.
// getUserBooksForBook, joka hakee vain yhden tietyn painoksen omat rivit
// ja on edelleen olemassa eri tarkoitukseen (ei käytössä enää BookDetailin
// pääkomponentissa, mutta jätetty tiedostoon jos tarvitaan jatkossa).
export async function getUserBooksForGroup(
  groupRootId: number,
  getToken: () => Promise<string | null>,
): Promise<UserBook[]> {
  const token = await getToken();
  const res = await fetch(
    `${API_BASE}/api/user-books?groupRootId=${groupRootId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) {
    throw new Error("Omien merkintöjen haku epäonnistui");
  }
  const data = await res.json();
  return data.results;
}
