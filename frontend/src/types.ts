// Nämä tyypit vastaavat backendin eri reittien (booksSearch, userBooks,
// discover, bookDetail, bookGroups, import) palauttamaa dataa. Pitämällä ne
// yhdessä paikassa vältämme saman muodon toistamista jokaisessa
// komponentissa erikseen. Tyyppien kentät on nimetty samoin kuin backendin
// JSON-vastauksissa (camelCase, paitsi UserBook joka heijastaa suoraan
// tietokannan sarakenimiä snake_case-muodossa, ks. alla).

// Yksi tulos kirjahausta (Open Library tai Google Books, yhtenäistetty
// backendissä - ks. routes/booksSearch.js)
export interface BookSearchResult {
  source: "openlibrary" | "googlebooks" | "database";
  openLibraryId: string | null;
  googleBooksId: string | null;
  title: string;
  author: string | null;
  coverUrl: string | null;
  yearPublished: number | null;
  subjects: string[];
  isbn: string | null;
  localBookId?: number;
}

// Kirjan tila käyttäjän kirjastossa - vastaa tietokannan CHECK-rajoitusta.
// HUOM (mahdollinen bugi): tietokannan CHECK-rajoitus ja PAATOKSET.md
// (ks. "Uusi status: jäi kesken") sisältävät myös arvon "abandoned", mutta
// se puuttuu tästä unionista - tämä tyyppi ei siis kata kaikkia backendin
// todella palauttamia status-arvoja.
export type BookStatus = "to_read" | "reading" | "read" | "abandoned";

export type Ownership = "physical" | "ebook" | "none";

// Yksi rivi käyttäjän kirjastosta (user_books JOIN books backendissä)
export interface UserBook {
  id: number;
  clerk_user_id: string;
  book_id: number;
  status: BookStatus;
  read_year: number | null;
  read_month: number | null;
  read_day: number | null;
  ownership: Ownership | null;
  comment: string | null;
  user_tags: string[] | null;
  created_at: string;
  // JOIN-kentät books-taulusta:
  title: string;
  author: string | null;
  cover_url: string | null;
  year_published: number | null;
  api_subjects: string[] | null;
  work_group_root_id: number;
}

// GET /api/user-books -reitin koko vastaus (ei enää pelkkä taulukko)
export interface UserBooksResponse {
  results: UserBook[];
}

// GET /api/books -reitin (routes/bookGroups.js) yksi rivi. Eri asia kuin
// UserBook: tämä on suoraan books-taulun rivi, EI user_books JOIN books -
// ei siis clerk_user_id/status/read_year-kenttiä ollenkaan, ja `id` viittaa
// tässä books.id:hen (kun taas UserBook.id on user_books.id). Näitä kahta
// käytettiin aiemmin vahingossa samalla UserBook-tyypillä, mikä piilotti
// puuttuvan created_at-kentän TypeScriptiltä (ks. PAATOKSET.md muutoshistoria
// 22.7.2026: "tekninen velka" -kohta).
export interface BookGroupEntry {
  id: number;
  title: string;
  author: string | null;
  cover_url: string | null;
  year_published: number | null;
  api_subjects: string[] | null;
  created_at: string;
  work_group_root_id: number;
}

// GET /api/books -reitin koko vastaus
export interface BookGroupsResponse {
  results: BookGroupEntry[];
}

// GET /api/books/:bookId/editions -reitin yksi painos
export interface Edition {
  bookId: number;
  openLibraryId: string | null;
  googleBooksId: string | null;
  title: string;
  author: string | null;
  coverUrl: string | null;
  yearPublished: number | null;
  isRoot: boolean;
}

// Vastaa GET /api/discover -reitin palauttamaa muotoa (routes/discover.js)
export interface DiscoverComment {
  displayName: string;
  comment: string;
  status: "read" | "abandoned";
}

export interface DiscoverBook {
  bookId: number;
  title: string;
  author: string | null;
  coverUrl: string | null;
  yearPublished: number | null;
  latestActivity: string;
  readerCount: number;
  abandonedCount: number;
  comments: DiscoverComment[];
}

// GET /api/books/detail/:bookId -reitin vastaus
export interface BookDetailData {
  bookId: number;
  rootId: number;
  openLibraryId: string | null;
  googleBooksId: string | null;
  title: string;
  author: string | null;
  coverUrl: string | null;
  yearPublished: number | null;
  subjects: string[] | null;
  readerCount: number;
  abandonedCount: number;
  comments: DiscoverComment[];
}

// Vastaa POST /api/import/preview -reitin yhden rivin muotoa
export interface ImportParsedRow {
  title: string | null;
  author: string | null;
  isbn: string | null;
  status: BookStatus;
  readYear: number | null;
  readMonth: number | null;
  readDay: number | null;
  ownership: Ownership | undefined;
  comment: string | undefined;
}

export type ImportRowStatus =
  | "matched"
  | "suggestions"
  | "no_results"
  | "connection_error";

export interface ImportPreviewRow {
  rowIndex: number;
  parsed: ImportParsedRow;
  status: ImportRowStatus;
  match: BookSearchResult | null;
  suggestions: BookSearchResult[];
  error: string | null;
}
