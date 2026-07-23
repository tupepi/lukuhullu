import { useAuth } from "@clerk/clerk-react";
import { useState } from "react";
import type { BookSearchResult } from "../types";
import { searchBooks, ensureBook } from "../api/books";
import Spinner from "./ui/Spinner";

interface Props {
  onSelectBook: (bookId: number) => void;
}

const SOURCE_LABEL: Record<string, string> = {
  openlibrary: "Open Library",
  googlebooks: "Google Books",
  database: "Lukuhullu",
};

export default function BookSearch({ onSelectBook }: Props) {
  const { getToken } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const found = await searchBooks(query);
      setResults(found);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpen(book: BookSearchResult) {
    const id = book.openLibraryId ?? book.googleBooksId ?? book.title;
    setOpeningId(id);
    try {
      const { bookId } = await ensureBook(
        {
          openLibraryId: book.openLibraryId,
          googleBooksId: book.googleBooksId,
          title: book.title,
          author: book.author,
          coverUrl: book.coverUrl,
          yearPublished: book.yearPublished,
          subjects: book.subjects,
          isbn: book.isbn,
        },
        getToken,
      );
      onSelectBook(bookId);
    } catch (err) {
      console.error(err);
      setOpeningId(null);
    }
  }

  return (
    <div className="pt-2">
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Hae kirjan nimellä tai ISBN:llä..."
          className="flex-1 rounded-full bg-paper px-4 py-2 font-body text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-brass"
        />
        <button
          type="submit"
          className="rounded-full bg-brass px-5 py-2 font-body text-sm font-semibold text-forest transition hover:brightness-110"
        >
          Hae
        </button>
      </form>

      {loading && (
        <p className="font-body text-sm italic text-paper/60">Haetaan...</p>
      )}

      <div className="flex flex-col gap-3">
        {results.map((book) => {
          const id = book.openLibraryId ?? book.googleBooksId ?? book.title;
          const isOpening = openingId === id;
          return (
            <button
              key={id}
              onClick={() => handleOpen(book)}
              disabled={isOpening}
              className="flex gap-3 rounded-lg bg-paper p-3 text-left shadow-sm transition hover:shadow-md disabled:opacity-60"
            >
              {book.coverUrl ? (
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  loading="lazy"
                  className="h-24 w-16 shrink-0 rounded-sm object-cover shadow"
                />
              ) : (
                <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-sm bg-ink/10 text-center font-body text-[10px] text-ink/40">
                  Ei kuvaa
                </div>
              )}
              <div className="flex-1">
                <p className="font-display text-base leading-snug text-ink">
                  {book.title}
                </p>
                <p className="mt-0.5 font-mono text-xs text-ink/50">
                  {book.author ?? "Tuntematon kirjailija"}
                  {book.yearPublished ? ` · ${book.yearPublished}` : ""}
                  <span className="ml-1 text-ink/30">
                    {SOURCE_LABEL[book.source] ?? book.source}
                  </span>
                </p>
                {isOpening && (
                  <p className="mt-1 flex items-center gap-1 font-body text-xs text-brass">
                    <Spinner size={12} />
                    Avataan...
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
