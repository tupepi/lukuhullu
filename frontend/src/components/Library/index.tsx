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

  const hasUnknownYear = read.some((b) => b.read_year === null);

  return (
    <div className="pt-2">
      <section>
        <h2 className="mb-3 font-display text-xl text-paper">Luetut</h2>

        {read.length === 0 ? (
          <p className="font-body text-sm text-paper/50">
            Ei luettuja kirjoja vielä.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {years.map((year) => (
              <div key={year}>
                <h3 className="mb-2 font-display text-base text-paper/70">
                  {year}
                </h3>
                <Shelf>
                  {groupByWorkRoot(
                    read.filter((b) => b.read_year === year),
                  ).map((group) => {
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
              </div>
            ))}

            {hasUnknownYear && (
              <div>
                <h3 className="mb-2 font-display text-base text-paper/70">
                  Tuntematon vuosi
                </h3>
                <Shelf>
                  {groupByWorkRoot(
                    read.filter((b) => b.read_year === null),
                  ).map((group) => {
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
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
