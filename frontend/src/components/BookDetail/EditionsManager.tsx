import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import type { Edition } from "../../types";
import { getEditions } from "../../api/bookGroups";
import Spinner from "../ui/Spinner";

interface Props {
  bookId: number;
  onSelectEdition: (bookId: number) => void;
  currentBookId: number;
}

// Näyttää nyt vain ryhmän jäsenten listauksen (klikattava navigointi
// painosten välillä, ks. onSelectEdition) - ei enää hakua/yhdistämistä/
// irrottamista. Nämä toiminnot siirtyivät omalle "Hallitse painoksia"
// -sivulle (components/EditionManagement.tsx, tavoitettavissa sivu-
// valikosta), koska ne olivat käytännössä harvinaisempia, "ylläpidollisia"
// toimintoja jotka eivät kuulu jokaisen kirjan sivun perusnäkymään.
export default function EditionsManager({
  bookId,
  onSelectEdition,
  currentBookId,
}: Props) {
  const { getToken } = useAuth();
  const [editions, setEditions] = useState<Edition[] | null>(null);

  useEffect(() => {
    async function loadEditions() {
      try {
        const data = await getEditions(bookId, getToken);
        setEditions(data.editions);
      } catch (err) {
        console.error(err);
      }
    }
    loadEditions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  return (
    <section className="mt-6">
      <h3 className="mb-3 font-display text-lg text-paper">
        Painokset ja kieliversiot
      </h3>
      <div className="rounded-lg bg-paper p-4 shadow-sm">
        {editions === null && (
          <p className="flex items-center gap-2 font-body text-sm text-ink/50">
            <Spinner size={14} />
            Ladataan...
          </p>
        )}
        {editions && editions.length > 1 && (
          <ul className="flex flex-col gap-2">
            {editions.map((ed) => {
              const isCurrent = ed.bookId === currentBookId;
              return (
                <li
                  key={ed.bookId}
                  onClick={() => !isCurrent && onSelectEdition(ed.bookId)}
                  className={`flex items-center gap-3 border-b border-ink/10 pb-2 last:border-0 ${
                    isCurrent
                      ? ""
                      : "cursor-pointer rounded-md transition hover:bg-brass/5"
                  }`}
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
                    <p className="font-body text-sm text-ink">
                      {ed.title}
                      {isCurrent && (
                        <span className="ml-1.5 font-mono text-[10px] text-brass">
                          (tämä sivu)
                        </span>
                      )}
                    </p>
                    <p className="font-mono text-[10px] text-ink/50">
                      {ed.author ?? "Tuntematon"}
                      {ed.isRoot && " · ryhmän edustaja Selaa-näkymässä"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {editions && editions.length === 1 && (
          <p className="font-body text-sm text-ink/50">Ei muita versioita.</p>
        )}
      </div>
    </section>
  );
}
