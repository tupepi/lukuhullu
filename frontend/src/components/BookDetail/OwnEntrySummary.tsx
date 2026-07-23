import { Pencil } from "lucide-react";
import type { UserBook, BookStatus } from "../../types";

// Ihmisluettava teksti kullekin statukselle - käytetään OwnEntrySummaryn
// badgessa, jotta yhteenvetorivi on ymmärrettävä ilman että lomake on auki.
const STATUS_LABEL: Record<BookStatus, string> = {
  to_read: "Aion lukea",
  reading: "Lukemassa",
  read: "Luettu",
  abandoned: "Jäi kesken",
};

// Tiivis yhteenvetorivi yhdestä omasta merkinnästä - korvaa aiemman aina
// näkyvän lomakkeen "Omat merkintäsi" -listassa. Näyttää vain status-
// badgen ja mahdollisen vuoden, ei koko lomaketta - klikkaus avaa täyden
// OwnEntryForm:n Modal-popupissa (ks. BookDetailin setEditingEntry).
export default function OwnEntrySummary({
  entry,
  onClick,
}: {
  entry: UserBook;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-lg bg-paper px-4 py-3 text-left shadow-sm transition hover:shadow-md"
    >
      <div>
        <span
          className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
            entry.status === "read"
              ? "bg-sage/20 text-sage"
              : entry.status === "abandoned"
                ? "bg-wine/20 text-wine"
                : "bg-brass/20 text-brass"
          }`}
        >
          {STATUS_LABEL[entry.status]}
        </span>
        {entry.read_year && (
          <span className="ml-2 font-mono text-xs text-ink/50">
            {entry.read_year}
          </span>
        )}
      </div>
      <Pencil size={16} className="text-ink/40" />
    </button>
  );
}
