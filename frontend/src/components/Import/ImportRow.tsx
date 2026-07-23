import { useState } from "react";
import { Check, RotateCcw, Pencil, X, WifiOff, SearchX } from "lucide-react";
import type { BookStatus, Ownership } from "../../types";
import { searchBooks } from "../../api/books";
import { inputClass } from "../../styles/buttons";
import type { EditableRow } from "./types";
import BookResultsList from "../BookResultsList";
import Spinner from "../ui/Spinner";

interface Props {
  row: EditableRow;
  updateRow: (rowIndex: number, changes: Partial<EditableRow>) => void;
}

const SOURCE_LABEL: Record<string, string> = {
  openlibrary: "Open Library",
  googlebooks: "Google Books",
  database: "Lukuhullu",
};

export default function ImportRow({ row, updateRow }: Props) {
  const [editingMatch, setEditingMatch] = useState(false);

  async function handleSearch() {
    if (!row.searchQuery.trim()) return;
    updateRow(row.rowIndex, { searching: true, searchResults: null });
    try {
      const results = await searchBooks(row.searchQuery);
      updateRow(row.rowIndex, { searching: false, searchResults: results });
    } catch (err) {
      console.error(err);
      updateRow(row.rowIndex, { searching: false });
    }
  }

  function handleSelectMatch(result: EditableRow["match"]) {
    // Valinta (joko ehdotuksista tai manuaalisesta hausta) siirtää rivin
    // 'matched'-tilaan ja merkitsee sen automaattisesti mukaan tuontiin -
    // käyttäjä on juuri vahvistanut tämän oikeaksi valinnalla
    updateRow(row.rowIndex, {
      match: result,
      matchStatus: "matched",
      include: true,
      suggestions: [],
      searchResults: null,
    });
    setEditingMatch(false);
  }

  return (
    <li className="rounded-lg bg-paper p-4 shadow-sm">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={row.include}
          onChange={(e) =>
            updateRow(row.rowIndex, { include: e.target.checked })
          }
          className="mt-1 h-4 w-4 accent-brass"
        />

        {row.match && !editingMatch ? (
          <div className="flex flex-1 items-start justify-between gap-3">
            <div className="flex gap-3">
              {row.match.coverUrl && (
                <img
                  src={row.match.coverUrl}
                  alt={row.match.title}
                  loading="lazy"
                  className="h-16 w-11 shrink-0 rounded-sm object-cover shadow"
                />
              )}
              <div>
                <p className="font-display text-sm leading-snug text-ink">
                  {row.match.title}
                </p>
                <p className="font-mono text-xs text-ink/50">
                  {row.match.author ?? "Tuntematon"}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-ink/30">
                  Lähde: {SOURCE_LABEL[row.match.source] ?? row.match.source}
                </p>
              </div>
            </div>
            <button
              onClick={() => setEditingMatch(true)}
              title="Muokkaa osumaa"
              className="shrink-0 rounded-full p-1.5 text-ink/40 transition hover:bg-ink/5 hover:text-ink"
            >
              <Pencil size={14} />
            </button>
          </div>
        ) : (
          <div className="flex-1">
            <p className="font-body text-sm text-ink">
              <span className="font-medium">
                {row.parsedTitle ?? "Nimetön"}
              </span>{" "}
              — {row.parsedAuthor ?? "Tuntematon"}
            </p>

            {/* Kolme erillistä tilaviestiä - kertovat kannattaako yrittää
              samaa hakua uudelleen (connection_error), muuttaa hakusanaa
              (no_results/suggestions), vai valita jokin ehdotuksista */}
            {editingMatch === false &&
              row.matchStatus === "connection_error" && (
                <p className="mt-1 flex items-center gap-1.5 font-body text-xs text-wine">
                  <WifiOff size={13} />
                  Yritä hakea uudelleen.
                </p>
              )}
            {editingMatch === false && row.matchStatus === "no_results" && (
              <p className="mt-1 flex items-center gap-1.5 font-body text-xs text-ink/50">
                <SearchX size={13} />
                Ei hakutuloksia. Kirjaa ei ehkä ole tietokannoissa.
              </p>
            )}
            {editingMatch === false &&
              row.matchStatus === "suggestions" &&
              row.suggestions.length > 0 && (
                <div className="mt-2">
                  <p className="font-body text-xs text-ink/60">
                    Tarkkaa osumaa ei löytynyt:
                  </p>
                  <BookResultsList
                    results={row.suggestions}
                    onSelect={handleSelectMatch}
                    compact
                    selectIcon={<Check size={12} />}
                  />
                </div>
              )}

            {editingMatch && (
              <div className="mb-2 flex items-center justify-between">
                <p className="font-body text-xs text-ink/60">
                  Nykyinen:{" "}
                  <span className="font-medium">{row.match?.title}</span>
                </p>
                <button
                  onClick={() => setEditingMatch(false)}
                  className="flex items-center gap-1 font-mono text-[10px] text-ink/40 hover:text-ink"
                >
                  <X size={12} />
                  Peruuta
                </button>
              </div>
            )}

            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={row.searchQuery}
                onChange={(e) =>
                  updateRow(row.rowIndex, { searchQuery: e.target.value })
                }
                placeholder="Muokkaa hakusanaa..."
                className={`${inputClass} flex-1`}
              />
              <button
                onClick={handleSearch}
                disabled={row.searching}
                className="flex items-center gap-1 rounded-full border border-brass px-3 py-1.5 font-body text-xs font-medium text-brass transition hover:bg-brass/10 disabled:opacity-50"
              >
                {row.searching ? <Spinner size={13} /> : <RotateCcw size={13} />}
                {row.searching ? "Haetaan..." : "Hae uudelleen"}
              </button>
            </div>

            {row.searchResults && row.searchResults.length === 0 && (
              <p className="mt-2 font-body text-xs text-ink/50">
                Ei tuloksia tällä haulla.
              </p>
            )}

            {row.searchResults && row.searchResults.length > 0 && (
              <BookResultsList
                results={row.searchResults}
                onSelect={handleSelectMatch}
                compact
                selectIcon={<Check size={12} />}
              />
            )}

            {!row.match && (
              <p className="mt-2 font-body text-[11px] text-ink/40">
                Jos mikään ei osu, rivi tuodaan silti manuaalisena yllä olevilla
                tiedoilla.
              </p>
            )}
          </div>
        )}
      </label>

      <div className="mt-3 flex flex-wrap gap-2 pl-7">
        <select
          value={row.status}
          onChange={(e) =>
            updateRow(row.rowIndex, { status: e.target.value as BookStatus })
          }
          className={inputClass}
        >
          <option value="to_read">Aion lukea</option>
          <option value="reading">Lukemassa</option>
          <option value="read">Luettu</option>
          <option value="abandoned">Jäi kesken</option>
        </select>
        <input
          type="number"
          placeholder="Vuosi"
          value={row.readYear}
          onChange={(e) =>
            updateRow(row.rowIndex, { readYear: e.target.value })
          }
          className={`${inputClass} w-20`}
        />
        <input
          type="number"
          placeholder="Kk"
          min={1}
          max={12}
          value={row.readMonth}
          onChange={(e) =>
            updateRow(row.rowIndex, { readMonth: e.target.value })
          }
          className={`${inputClass} w-14`}
        />
        <input
          type="number"
          placeholder="Pv"
          min={1}
          max={31}
          value={row.readDay}
          onChange={(e) => updateRow(row.rowIndex, { readDay: e.target.value })}
          className={`${inputClass} w-14`}
        />
        <select
          value={row.ownership}
          onChange={(e) =>
            updateRow(row.rowIndex, {
              ownership: e.target.value as Ownership | "",
            })
          }
          className={inputClass}
        >
          <option value="">Ei valittu</option>
          <option value="physical">Fyysinen</option>
          <option value="ebook">E-kirja</option>
          <option value="none">Ei omista</option>
        </select>
      </div>
      <textarea
        value={row.comment}
        onChange={(e) => updateRow(row.rowIndex, { comment: e.target.value })}
        placeholder="Kommentti (näkyy julkisesti)"
        rows={2}
        className={`${inputClass} mt-2 ml-7 w-[calc(100%-1.75rem)] resize-none`}
      />
    </li>
  );
}
