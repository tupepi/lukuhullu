import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { Trash2 } from "lucide-react";
import type { Edition } from "../../types";
import { getEditions, deleteBook } from "../../api/bookGroups";
import Spinner from "../ui/Spinner";

interface Props {
  bookId: number;
  onSelectEdition: (bookId: number) => void;
  currentBookId: number;
  // Kutsutaan kun käyttäjä poistaa painoksen jota PARHAILLAAN katsotaan
  // tällä sivulla - tälle bookId:lle ei ole enää mitään näytettävää, joten
  // vanhempi (BookDetail/index.tsx) navigoi takaisin edelliseen näkymään.
  onDeletedCurrent: () => void;
}

function isManualEdition(ed: Edition) {
  return ed.openLibraryId === null && ed.googleBooksId === null;
}

// Näyttää ryhmän jäsenten listauksen (klikattava navigointi painosten
// välillä, ks. onSelectEdition) sekä poisto-painikkeen manuaalisesti
// lisätyille painoksille. Ei hakua/yhdistämistä/irrottamista - nämä
// toiminnot asuvat omalla "Hallitse painoksia" -sivulla (components/
// EditionManagement/, tavoitettavissa sivuvalikosta), koska ne olivat
// käytännössä harvinaisempia, "ylläpidollisia" toimintoja jotka eivät
// kuulu jokaisen kirjan sivun perusnäkymään (ks. PAATOKSET.md). Poisto on
// tästä säännöstä tietoinen poikkeus: se on hyödyllinen suoraan sen
// painoksen sivulla jota ollaan poistamassa, eikä vaadi ensin siirtymistä
// toiseen näkymään.
export default function EditionsManager({
  bookId,
  onSelectEdition,
  currentBookId,
  onDeletedCurrent,
}: Props) {
  const { getToken } = useAuth();
  const [editions, setEditions] = useState<Edition[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadEditions() {
    try {
      const data = await getEditions(bookId, getToken);
      setEditions(data.editions);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadEditions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  async function handleDelete(ed: Edition, e: MouseEvent) {
    // Rivin oma onClick navigoi kyseiseen painokseen - ilman tätä poisto-
    // painikkeen klikkaus laukaisisi myös sen (bubbling)
    e.stopPropagation();
    const vahvistettu = window.confirm(
      `Poistetaanko "${ed.title}" pysyvästi? Tämä poistaa myös kaikkien käyttäjien lukumerkinnät tästä painoksesta eikä toimintoa voi perua.`,
    );
    if (!vahvistettu) return;

    setBusy(true);
    try {
      await deleteBook(ed.bookId, getToken);
      if (ed.bookId === currentBookId) {
        onDeletedCurrent();
        return;
      }
      await loadEditions();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

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
                  {isManualEdition(ed) && (
                    <button
                      onClick={(e) => handleDelete(ed, e)}
                      disabled={busy}
                      title="Poista painos pysyvästi"
                      className="-my-2 -mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-wine transition hover:bg-wine/10 disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {editions && editions.length === 1 && (
          <div className="flex items-center justify-between gap-2">
            <p className="font-body text-sm text-ink/50">
              Ei muita versioita.
            </p>
            {isManualEdition(editions[0]) && (
              <button
                onClick={(e) => handleDelete(editions[0], e)}
                disabled={busy}
                title="Poista painos pysyvästi"
                className="-my-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-wine transition hover:bg-wine/10 disabled:opacity-50"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
