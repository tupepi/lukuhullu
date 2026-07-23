import { useAuth } from "@clerk/clerk-react";
import { useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import type { BookSearchResult } from "../../types";
import { searchBooks, ensureBook } from "../../api/books";
import BookResultsList from "../BookResultsList";
import { inputClass, secondaryButtonClass } from "../../styles/buttons";
import Spinner from "../ui/Spinner";

// "Vaihda painos" -osio OwnEntryForm.tsx:ssä (ks. PAATOKSET.md: Kanoninen
// käsite / "Uusi ominaisuus tilalle") eriytettynä omaksi komponentiksi -
// oma itsenäinen kokonaisuus (haku + ensureBook-varmistus) jolla ei ole
// mitään tekemistä lomakkeen muiden kenttien kanssa. Hakutila (query/
// tulokset/searching) pidetään tässä sisäisenä - vanhempi (OwnEntryForm)
// tarvitsee vain lopullisen valinnan (onSelect), koska se on ainoa asia
// jota tallennus (handleSave) todella käyttää.
export default function EditionSwitcher({
  selectedTitle,
  onSelect,
}: {
  selectedTitle: string | null;
  onSelect: (bookId: number, title: string) => void;
}) {
  const { getToken } = useAuth();
  const [editionQuery, setEditionQuery] = useState("");
  const [editionResults, setEditionResults] = useState<
    BookSearchResult[] | null
  >(null);
  const [editionSearching, setEditionSearching] = useState(false);

  async function handleEditionSearch() {
    if (!editionQuery.trim()) return;
    setEditionSearching(true);
    try {
      const results = await searchBooks(editionQuery);
      setEditionResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setEditionSearching(false);
    }
  }

  // Haku voi osua ulkoiseen tulokseen (Open Library/Google Books) jolla ei
  // vielä ole omaa books-rivin id:tä - varmistetaan/luodaan se ensureBook:
  // illa ennen kuin valinta ilmoitetaan vanhemmalle, jotta onSelect saa
  // aina käyttökelpoisen books.id:n.
  async function handleSelectEdition(result: BookSearchResult) {
    try {
      const { bookId } = await ensureBook(
        {
          openLibraryId: result.openLibraryId,
          googleBooksId: result.googleBooksId,
          title: result.title,
          author: result.author,
          coverUrl: result.coverUrl,
          yearPublished: result.yearPublished,
          subjects: result.subjects,
          isbn: result.isbn,
        },
        getToken,
      );
      onSelect(bookId, result.title);
      setEditionResults(null);
      setEditionQuery("");
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="mt-4 border-t border-ink/10 pt-3">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-ink/50">
        Vaihda painos
      </p>

      {selectedTitle && (
        <p className="mb-2 font-body text-xs text-sage">
          Vaihdetaan painokseksi: {selectedTitle}
        </p>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={editionQuery}
          onChange={(e) => setEditionQuery(e.target.value)}
          placeholder="Hae oikea painos nimellä tai ISBN:llä..."
          className={`${inputClass} flex-1 font-body`}
        />
        <button
          onClick={handleEditionSearch}
          disabled={editionSearching}
          className={secondaryButtonClass}
        >
          {editionSearching ? (
            <Spinner className="inline mr-1" />
          ) : (
            <SearchIcon size={14} className="inline -mt-0.5 mr-1" />
          )}
          {editionSearching ? "Haetaan..." : "Hae"}
        </button>
      </div>

      {editionResults && editionResults.length === 0 && (
        <p className="mt-2 font-body text-xs text-ink/50">Ei tuloksia.</p>
      )}

      {editionResults && editionResults.length > 0 && (
        <BookResultsList
          results={editionResults}
          onSelect={handleSelectEdition}
          showSource={false}
          selectButtonClassName={secondaryButtonClass}
        />
      )}
    </div>
  );
}
