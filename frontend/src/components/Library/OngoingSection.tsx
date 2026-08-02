// "Meneillään ja tulossa" -listaus (reading + to_read), näytetään nykyisin
// "Kirjaa"-välilehden (ent. Hae) yläosassa BookSearchin yhteydessä, ei enää
// Kirjastoni-välilehdellä. Ks. PAATOKSET.md: Painosten ja kieliversioiden
// niputus - sama ryhmittelylogiikka kuin Library/index.tsx:n Luetut-osiossa.
import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import type { UserBook } from "../../types";
import { getUserBooks } from "../../api/books";
import { groupByWorkRoot, pickRepresentative } from "../../utils/libraryGrouping";
import Spinner from "../ui/Spinner";

interface Props {
  onSelectBook: (bookId: number) => void;
}

export default function OngoingSection({ onSelectBook }: Props) {
  const { getToken } = useAuth();
  const [books, setBooks] = useState<UserBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function hae() {
      setLoading(true);
      try {
        const data = await getUserBooks(getToken);
        setBooks(data.results);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    hae();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <p className="flex items-center justify-center gap-2 py-4 text-center font-body text-paper/60">
        <Spinner size={16} />
        Ladataan...
      </p>
    );
  }

  const groupedActive = groupByWorkRoot(
    books.filter((b) => b.status === "reading" || b.status === "to_read"),
  );

  return (
    <section className="mb-8">
      <h2 className="mb-3 font-display text-xl text-paper">
        Meneillään ja tulossa
      </h2>
      {groupedActive.length === 0 && (
        <p className="font-body text-sm text-paper/50">
          Ei kirjoja tässä vielä.
        </p>
      )}
      <div className="flex flex-col gap-2">
        {groupedActive.map((group) => {
          const rep = pickRepresentative(group);
          return (
            <div key={rep.work_group_root_id}>
              <button
                onClick={() => onSelectBook(rep.book_id)}
                className="flex w-full items-center justify-between rounded-lg bg-paper px-4 py-3 text-left shadow-sm"
              >
                <span className="font-body text-sm font-medium text-ink">
                  {rep.title}{" "}
                  <span className="text-ink/50">
                    — {rep.author ?? "Tuntematon"}
                  </span>
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                    rep.status === "reading"
                      ? "bg-sage/20 text-sage"
                      : "bg-brass/20 text-brass"
                  }`}
                >
                  {rep.status === "reading" ? "Lukemassa" : "Aion lukea"}
                </span>
              </button>
              {group.length > 1 && (
                <div className="ml-4 mt-1 flex flex-col gap-1">
                  {group
                    .filter((e) => e.id !== rep.id)
                    .map((e) => (
                      <button
                        key={e.id}
                        onClick={() => onSelectBook(e.book_id)}
                        className="text-left font-body text-xs text-paper/50 hover:text-paper/80"
                      >
                        {e.title} — {e.author ?? "Tuntematon"}
                      </button>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
