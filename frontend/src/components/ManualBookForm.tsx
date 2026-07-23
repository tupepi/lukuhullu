import { useAuth } from "@clerk/clerk-react";
import { useState } from "react";
import { ensureBook } from "../api/books";
import { inputClass, primaryButtonClass } from "../styles/buttons";
import CoverUrlInput from "./CoverUrlInput";
import Spinner from "./ui/Spinner";

// Jaettu lomake manuaaliselle kirjan lisäykselle (ei API-osumaa, ks.
// PAATOKSET.md: Manuaalinen kirjan lisäys). Käytetään kahdessa eri
// tarkoituksessa jotka jakavat saman kentät+tallennuslogiikan mutta
// eroavat siinä MITÄ TAPAHTUU luonnin jälkeen (onSaved-callback):
//  - EditionManagement.tsx: uusi painos yhdistetään heti valittuun ryhmään
//  - App.tsx (sivuvalikko "Lisää manuaalisesti"): uusi kirja jää oman
//    ryhmänsä ensimmäiseksi/ainoaksi jäseneksi (ei mergeBooks-kutsua),
//    ja käyttäjä navigoidaan sen BookDetail-sivulle
export default function ManualBookForm({
  initialTitle = "",
  initialAuthor = "",
  initialYear = null,
  onSaved,
}: {
  initialTitle?: string;
  initialAuthor?: string;
  initialYear?: number | null;
  onSaved: (bookId: number, title: string) => void | Promise<void>;
}) {
  const { getToken } = useAuth();
  const [title, setTitle] = useState(initialTitle);
  const [author, setAuthor] = useState(initialAuthor);
  const [year, setYear] = useState(
    initialYear != null ? String(initialYear) : "",
  );
  const [isbn, setIsbn] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!title.trim()) {
      setError("Nimi on pakollinen");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // openLibraryId/googleBooksId: null -> findOrCreateBook luo AINA uuden
      // books-rivin (ei koskaan löydä väärää osumaa "null = null" -kyselyllä,
      // ks. backend/utils/bookHelpers.js:n kommentti)
      const { bookId } = await ensureBook(
        {
          openLibraryId: null,
          googleBooksId: null,
          title: title.trim(),
          author: author.trim() || null,
          coverUrl: coverUrl.trim() || null,
          yearPublished: year ? Number(year) : null,
          subjects: [],
          isbn: isbn.trim() || null,
        },
        getToken,
      );
      await onSaved(bookId, title.trim());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Kirjan lisäys epäonnistui",
      );
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <label className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-wide text-ink/50">
          Nimi *
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`${inputClass} w-full`}
        />
      </label>
      <label className="mt-3 flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-wide text-ink/50">
          Kirjailija
        </span>
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className={`${inputClass} w-full`}
        />
      </label>
      <div className="mt-3 flex gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wide text-ink/50">
            Julkaisuvuosi
          </span>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2024"
            className={`${inputClass} w-24`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wide text-ink/50">
            ISBN
          </span>
          <input
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            className={`${inputClass} flex-1`}
          />
        </label>
      </div>
      <div className="mt-3">
        <CoverUrlInput value={coverUrl} onChange={setCoverUrl} />
      </div>

      <button
        onClick={handleSubmit}
        disabled={saving}
        className={`${primaryButtonClass} mt-4 inline-flex items-center gap-1.5`}
      >
        {saving && <Spinner />}
        {saving ? "Tallennetaan..." : "Tallenna"}
      </button>
      {error && <p className="mt-2 font-body text-xs text-wine">{error}</p>}
    </div>
  );
}
