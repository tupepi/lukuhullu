// "Kirjastoni"-välilehti: käyttäjän omat merkinnät jaoteltuna "Meneillään ja
// tulossa" (reading + to_read) ja "Luetut" (read, vuosisuodattimella) -osioihin.
// Ei näytä "abandoned" (jäi kesken) -tilan kirjoja omana osionaan tässä
// näkymässä (ne näkyvät Selaa-näkymässä, ks. Discover.tsx).
//
// Keskeinen erityispiirre tässä komponentissa on painosten/kieliversioiden
// ryhmittely (ks. PAATOKSET.md: Painosten ja kieliversioiden niputus):
// jos käyttäjällä on merkintöjä useasta samaan teokseen yhdistetystä
// painoksesta, ne näytetään yhtenä rivinä (groupByWorkRoot + pickRepresentative)
// eikä erillisinä kirjoina.
import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import type { UserBook } from "../../types";
import { getUserBooks } from "../../api/books";
import { groupByWorkRoot, pickRepresentative } from "../../utils/libraryGrouping";
import BookCover from "./BookCover";
import Shelf from "./Shelf";
import Spinner from "../ui/Spinner";

interface Props {
  onSelectBook: (bookId: number) => void;
}

export default function Library({ onSelectBook }: Props) {
  const { getToken } = useAuth();
  const [books, setBooks] = useState<UserBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState<string>("kaikki");

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
      <p className="flex items-center justify-center gap-2 py-8 text-center font-body text-paper/60">
        <Spinner size={16} />
        Ladataan kirjastoa...
      </p>
    );
  }

  const reading = books.filter((b) => b.status === "reading");
  const toRead = books.filter((b) => b.status === "to_read");
  const read = books.filter((b) => b.status === "read");

  // Vuosisuodattimen vaihtoehdot lasketaan RYHMITTELEMÄTTÖMÄSTÄ read-
  // listasta (ei groupedRead:istä), jotta jokainen vuosi jolloin JOKIN
  // painos on merkitty luetuksi näkyy valittavana, vaikka se ei olisi
  // minkään ryhmän edustava rivi
  const years = Array.from(
    new Set(
      read.map((b) => b.read_year).filter((y): y is number => y !== null),
    ),
  ).sort((a, b) => b - a);

  const filteredRead =
    yearFilter === "kaikki"
      ? read
      : read.filter((b) => b.read_year === Number(yearFilter));

  // Ryhmittely tehdään vasta suodatuksen JÄLKEEN - jos ryhmässä on
  // painoksia luettuna eri vuosina, vuosisuodatin näyttää vain ne rivit
  // jotka osuvat valittuun vuoteen, muut ryhmän jäsenet piilotetaan
  const groupedActive = groupByWorkRoot([...reading, ...toRead]);
  const groupedRead = groupByWorkRoot(filteredRead);

  return (
    <div className="pt-2">
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

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl text-paper">Luetut</h2>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="rounded-md bg-paper px-2 py-1 font-mono text-xs text-ink"
          >
            <option value="kaikki">Kaikki vuodet</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {groupedRead.length === 0 ? (
          <p className="font-body text-sm text-paper/50">
            Ei luettuja kirjoja tällä suodattimella.
          </p>
        ) : (
          <Shelf>
            {groupedRead.map((group) => {
              const rep = pickRepresentative(group);
              return (
                <BookCover
                  key={rep.work_group_root_id}
                  title={rep.title}
                  author={rep.author}
                  coverUrl={rep.cover_url}
                  hasMultipleEditions={group.length > 1}
                  onClick={() => onSelectBook(rep.book_id)}
                />
              );
            })}
          </Shelf>
        )}
      </section>
    </div>
  );
}
