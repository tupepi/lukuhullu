import { Trash2, Unlink } from "lucide-react";
import type { Edition } from "../../types";
import Spinner from "../ui/Spinner";

// Manuaalisesti lisätty painos tunnistetaan samalla säännöllä kuin muualla
// sovelluksessa: ei open_library_id:tä eikä google_books_id:tä (ks.
// PAATOKSET.md: Manuaalinen kirjan lisäys). Vain nämä saa poistaa pysyvästi
// - API-lähteistä löytyviä kirjoja ei koska ne ovat jaettua dataa ulkoisesta
// lähteestä, ei kenenkään "omaa" lisäystä.
function isManualEdition(ed: Edition) {
  return ed.openLibraryId === null && ed.googleBooksId === null;
}

// Näyttää valitun ryhmän nykyiset painokset (jos useampi kuin yksi) ja
// mahdollistaa minkä tahansa jäsenen irrottamisen. Puhtaasti esittävä osa
// EditionManagementista - kaikki tila (currentEditions/busy/message) tulee
// propseina, ei omaa datanhakua.
export default function CurrentEditionsPanel({
  title,
  editions,
  busy,
  message,
  onUnmerge,
  onDelete,
}: {
  title: string;
  editions: Edition[] | null;
  busy: boolean;
  message: string | null;
  onUnmerge: (bookId: number) => void;
  onDelete: (bookId: number, title: string) => void;
}) {
  return (
    <div className="rounded-lg bg-paper p-4 shadow-sm">
      <p className="mb-3 font-body text-sm text-ink">
        <span className="font-semibold">{title}</span>
      </p>

      {editions === null && (
        <p className="mb-4 flex items-center gap-2 font-body text-sm text-ink/50">
          <Spinner size={14} />
          Ladataan...
        </p>
      )}
      {editions && editions.length > 1 && (
        <ul className="mb-4 flex flex-col gap-2">
          {editions.map((ed) => (
            <li
              key={ed.bookId}
              className="flex items-center gap-3 border-b border-ink/10 pb-2 last:border-0"
            >
              {ed.coverUrl && (
                <img
                  src={ed.coverUrl}
                  alt={ed.title}
                  loading="lazy"
                  className="h-10 w-7 rounded-sm object-cover"
                />
              )}
              <div className="flex-1">
                <p className="font-body text-sm text-ink">{ed.title}</p>
                <p className="font-mono text-[10px] text-ink/50">
                  {ed.author ?? "Tuntematon"}
                </p>
              </div>
              <button
                onClick={() => onUnmerge(ed.bookId)}
                disabled={busy}
                title="Irrota ryhmästä"
                className="rounded-full p-1.5 text-wine transition hover:bg-wine/10 disabled:opacity-50"
              >
                <Unlink size={16} />
              </button>
              {isManualEdition(ed) && (
                <button
                  onClick={() => onDelete(ed.bookId, ed.title)}
                  disabled={busy}
                  title="Poista painos pysyvästi"
                  className="rounded-full p-1.5 text-wine transition hover:bg-wine/10 disabled:opacity-50"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editions && editions.length === 1 && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="font-body text-sm text-ink/50">Ei muita versioita.</p>
          {isManualEdition(editions[0]) && (
            <button
              onClick={() => onDelete(editions[0].bookId, editions[0].title)}
              disabled={busy}
              title="Poista painos pysyvästi"
              className="rounded-full p-1.5 text-wine transition hover:bg-wine/10 disabled:opacity-50"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )}

      {message && (
        <p className="mb-3 font-body text-xs text-sage">{message}</p>
      )}
    </div>
  );
}
