import type { ReactNode } from "react";
import type { BookSearchResult } from "../types";

// Jaettu "hakutulosrivi" (kansi + nimi/kirjailija/vuosi(/lähde) + valinta-
// painike) - sama rakenne toistui aiemmin sanasta sanaan kolmessa paikassa
// (EditionManagement.tsx:n yhdistämishaku, OwnEntryForm.tsx:n "Vaihda
// painos" -haku, ImportRow.tsx:n ehdotukset+uudelleenhaku). BookSearch.tsx:n
// päähaku EI käytä tätä - se on tarkoituksella eri interaktiomalli (koko
// rivi klikattava navigointiin, ei erillistä valintapainiketta, ks.
// PAATOKSET.md: Navigaatio), joten sen pakottaminen samaan komponenttiin
// ei olisi luonnollista.
export default function BookResultsList({
  results,
  onSelect,
  selectLabel = "Valitse",
  selectIcon,
  selectButtonClassName = "flex items-center gap-1 rounded-full bg-brass px-2.5 py-1 font-body text-[11px] font-semibold text-forest hover:brightness-110 disabled:opacity-50",
  showSource = true,
  compact = false,
  disabled = false,
}: {
  results: BookSearchResult[];
  onSelect: (result: BookSearchResult) => void;
  selectLabel?: string;
  selectIcon?: ReactNode;
  selectButtonClassName?: string;
  showSource?: boolean;
  compact?: boolean;
  disabled?: boolean;
}) {
  const coverSize = compact ? "h-8 w-6" : "h-10 w-7";

  return (
    <ul className="mt-3 flex flex-col gap-2">
      {results.map((result, i) => (
        <li key={i} className="flex items-center gap-3">
          {result.coverUrl && (
            <img
              src={result.coverUrl}
              alt={result.title}
              loading="lazy"
              className={`${coverSize} shrink-0 rounded-sm object-cover`}
            />
          )}
          <div className="flex-1">
            <p className="font-body text-sm text-ink">{result.title}</p>
            <p className="font-mono text-[10px] text-ink/50">
              {result.author ?? "Tuntematon"}
              {result.yearPublished ? ` · ${result.yearPublished}` : ""}
              {showSource && (
                <span className="ml-1 text-ink/30">
                  {SOURCE_LABEL[result.source] ?? result.source}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => onSelect(result)}
            disabled={disabled}
            className={selectButtonClassName}
          >
            {selectIcon}
            {selectLabel}
          </button>
        </li>
      ))}
    </ul>
  );
}

const SOURCE_LABEL: Record<string, string> = {
  openlibrary: "Open Library",
  googlebooks: "Google Books",
  database: "Lukuhullu",
};
