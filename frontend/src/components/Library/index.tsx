// "Kirjastoni"-välilehti: käyttäjän jo luetut kirjat (status "read"),
// vuosisuodattimella. "Meneillään ja tulossa" -listaus on siirretty
// "Kirjaa"-välilehdelle (ent. Hae, ks. OngoingSection.tsx).
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

function kirjaMaara(n: number): string {
  return `${n} ${n === 1 ? "kirja" : "kirjaa"}`;
}

export default function Library({ onSelectBook }: Props) {
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
      <p className="flex items-center justify-center gap-2 py-8 text-center font-body text-paper/60">
        <Spinner size={16} />
        Ladataan kirjastoa...
      </p>
    );
  }

  const read = books.filter((b) => b.status === "read");

  // Vuodet uusimmasta vanhimpaan, kukin omana otsikollisena osionaan.
  // Ryhmittely (groupByWorkRoot) tehdään VUOSITTAIN erikseen, jotta
  // saman teoksen eri painokset jotka on luettu eri vuosina näkyvät
  // kumpikin oikean vuoden alla, vaikka ne muuten niputettaisiin yhteen.
  const years = Array.from(
    new Set(
      read.map((b) => b.read_year).filter((y): y is number => y !== null),
    ),
  ).sort((a, b) => b - a);

  // Ryhmät lasketaan tähän kertaalleen (per vuosi + tuntematon vuosi),
  // jotta sama ryhmittely käy sekä otsikoiden lukumäärille että kansikuville
  // eikä groupByWorkRoot pyöri turhaan kahteen kertaan samalle datalle.
  const readByYear = years.map((year) => ({
    year,
    groups: groupByWorkRoot(read.filter((b) => b.read_year === year)),
  }));
  const unknownYearGroups = groupByWorkRoot(
    read.filter((b) => b.read_year === null),
  );
  const totalCount =
    readByYear.reduce((sum, y) => sum + y.groups.length, 0) +
    unknownYearGroups.length;

  return (
    <div className="pt-2">
      <section>
        <div className="mb-3 flex items-baseline gap-2">
          <h2 className="font-display text-xl text-paper">Luetut</h2>
          {read.length > 0 && (
            <span className="font-mono text-xs text-paper/50">
              {kirjaMaara(totalCount)}
            </span>
          )}
        </div>

        {read.length === 0 ? (
          <p className="font-body text-sm text-paper/50">
            Ei luettuja kirjoja vielä.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {readByYear.map(({ year, groups }) => (
              <details key={year} open className="group">
                <summary className="mb-2 flex cursor-pointer list-none items-baseline [&::-webkit-details-marker]:hidden gap-2 font-display text-base text-paper/70">
                  <svg
                    viewBox="0 0 20 20"
                    className="h-3 w-3 shrink-0 -rotate-90 fill-paper/50 transition-transform group-open:rotate-0"
                  >
                    <path d="M6 4l8 6-8 6V4z" />
                  </svg>
                  {year}
                  <span className="font-mono text-xs text-paper/40">
                    {kirjaMaara(groups.length)}
                  </span>
                </summary>
                <Shelf>
                  {groups.map((group) => {
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
              </details>
            ))}

            {unknownYearGroups.length > 0 && (
              <details open className="group">
                <summary className="mb-2 flex cursor-pointer list-none items-baseline [&::-webkit-details-marker]:hidden gap-2 font-display text-base text-paper/70">
                  <svg
                    viewBox="0 0 20 20"
                    className="h-3 w-3 shrink-0 -rotate-90 fill-paper/50 transition-transform group-open:rotate-0"
                  >
                    <path d="M6 4l8 6-8 6V4z" />
                  </svg>
                  Tuntematon vuosi
                  <span className="font-mono text-xs text-paper/40">
                    {kirjaMaara(unknownYearGroups.length)}
                  </span>
                </summary>
                <Shelf>
                  {unknownYearGroups.map((group) => {
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
              </details>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
