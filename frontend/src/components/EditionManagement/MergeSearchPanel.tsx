import { useState } from "react";
import { Search as SearchIcon, Link2 } from "lucide-react";
import type { BookSearchResult, Edition } from "../../types";
import { searchBooks } from "../../api/books";
import BookResultsList from "../BookResultsList";
import { inputClass, secondaryButtonClass } from "../../styles/buttons";
import Spinner from "../ui/Spinner";

// Haku + yhdistäminen valittuun ryhmään. Oma hakutila (query/results/
// searching) elää tässä komponentissa - vanhemman (EditionManagement)
// tarvitsee vain antaa sille `key={rootId}` jotta ryhmän vaihto nollaa
// haun automaattisesti uuden komponenttiasennuksen myötä, sen sijaan että
// vanhempi nollaisi näitä käsin joka kerta kun ryhmä vaihtuu.
export default function MergeSearchPanel({
  currentEditions,
  busy,
  onMerge,
}: {
  currentEditions: Edition[] | null;
  busy: boolean;
  // Palauttaa true jos yhdistäminen onnistui - vain silloin haku tyhjenee,
  // jotta epäonnistuneen yrityksen jälkeen käyttäjä voi yrittää uudelleen
  // ilman että hakusana/tulokset katoavat turhaan.
  onMerge: (result: BookSearchResult) => Promise<boolean>;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    BookSearchResult[] | null
  >(null);
  const [searching, setSearching] = useState(false);

  // Sama periaate kuin aiemmin BookDetailin EditionsManagerissa: estää
  // jo-ryhmässä-olevan painoksen ehdottamisen uudelleen hakutuloksissa.
  function isAlreadyInGroup(result: BookSearchResult): boolean {
    if (!currentEditions) return false;
    return currentEditions.some((ed) => {
      if (result.openLibraryId && ed.openLibraryId === result.openLibraryId)
        return true;
      if (result.googleBooksId && ed.googleBooksId === result.googleBooksId)
        return true;
      return (
        !result.openLibraryId &&
        !result.googleBooksId &&
        ed.title === result.title &&
        ed.author === result.author
      );
    });
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchBooks(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  }

  async function handleSelect(result: BookSearchResult) {
    const merged = await onMerge(result);
    if (merged) {
      setSearchResults(null);
      setSearchQuery("");
    }
  }

  const filteredResults =
    searchResults?.filter((r) => !isAlreadyInGroup(r)) ?? null;

  return (
    <div className="rounded-lg bg-paper p-4 shadow-sm">
      <p className="mb-2 font-body text-xs text-ink/60">
        Hae yhdistettävä painos tietokannoista:
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Hae nimellä tai ISBN:llä..."
          className={`${inputClass} flex-1`}
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className={secondaryButtonClass}
        >
          {searching ? (
            <Spinner className="mr-1 inline" />
          ) : (
            <SearchIcon size={14} className="mr-1 inline -mt-0.5" />
          )}
          {searching ? "Haetaan..." : "Hae"}
        </button>
      </div>

      {filteredResults && filteredResults.length === 0 && (
        <p className="mt-2 font-body text-xs text-ink/50">
          Ei tuloksia — kaikki löytyneet ovat jo tässä ryhmässä, tai haku ei
          löytänyt mitään.
        </p>
      )}
      {filteredResults && filteredResults.length > 0 && (
        <BookResultsList
          results={filteredResults}
          onSelect={handleSelect}
          disabled={busy}
          selectLabel="Yhdistä"
          selectIcon={<Link2 size={13} />}
          selectButtonClassName="flex items-center gap-1 rounded-full bg-brass px-3 py-1 font-body text-xs font-semibold text-forest hover:brightness-110 disabled:opacity-50"
        />
      )}
    </div>
  );
}
