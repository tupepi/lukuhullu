// "Selaa"-välilehti: julkinen selailunäkymä kaikkien käyttäjien luetuista/
// kesken jättämistä kirjoista, kommentteineen (ks. PAATOKSET.md: Julkinen
// selailu ja kommentit). Kaikki tässä näytettävä data on jo aggregoitu ja
// yksityisyysrajattu backendissä (routes/discover.js) - tämä komponentti ei
// tee mitään omaa suodatusta yksityinen/julkinen-rajan suhteen, se vain
// renderöi mitä API palauttaa.
//
// Huom (pieni poikkeama PAATOKSET.md:stä): dokumentti kuvaa että
// kommentittomalle kirjalle näytetään "N anonyymiä lukijaa" -teksti, mutta
// toteutuksessa näytetään yksinkertaisesti "Ei kommentteja vielä." eikä
// laskettua anonyymien lukijoiden määrää. Lukijamäärä (readerCount) NÄKYY
// kylläkin aina ylempänä riippumatta kommenttien määrästä.
import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import type { DiscoverBook } from "../types";
import { getDiscoverFeed } from "../api/discover";
import Spinner from "./ui/Spinner";

interface Props {
  onSelectBook: (bookId: number) => void;
}

export default function Discover({ onSelectBook }: Props) {
  const { getToken } = useAuth();
  const [books, setBooks] = useState<DiscoverBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function hae() {
      setLoading(true);
      try {
        const data = await getDiscoverFeed(getToken);
        setBooks(data);
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
        Ladataan...
      </p>
    );
  }
  if (books.length === 0) {
    return (
      <p className="py-8 text-center font-body text-sm text-paper/50">
        Kukaan ei ole vielä merkinnyt kirjoja luetuiksi.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
      {books.map((book) => (
        <div
          key={book.bookId}
          onClick={() => onSelectBook(book.bookId)}
          className="cursor-pointer rounded-lg bg-paper p-4 shadow-sm transition hover:shadow-md"
        >
          <div className="flex gap-3">
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                loading="lazy"
                className="aspect-[2/3] w-2/5 shrink-0 rounded-sm object-cover shadow sm:w-20"
              />
            ) : (
              <div className="flex aspect-[2/3] w-2/5 shrink-0 items-center justify-center rounded-sm bg-ink/10 text-center font-body text-xs text-ink/40 sm:w-20">
                Ei kuvaa
              </div>
            )}
            <div className="flex flex-1 flex-col justify-between">
              <div>
                <p className="font-display text-base leading-snug text-ink">
                  {book.title}
                </p>
                <p className="mt-0.5 font-mono text-xs text-ink/50">
                  {book.author ?? "Tuntematon kirjailija"}
                  {book.yearPublished ? ` · ${book.yearPublished}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                {book.readerCount > 0 && (
                  <span className="rounded-full bg-sage/15 px-2 py-0.5 text-sage">
                    {book.readerCount} luk.
                  </span>
                )}
                {book.abandonedCount > 0 && (
                  <span className="rounded-full bg-wine/15 px-2 py-0.5 text-wine">
                    {book.abandonedCount} kesken
                  </span>
                )}
              </div>
            </div>
          </div>

          {book.comments.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-1.5 border-t border-ink/10 pt-3">
              {book.comments.map((c, i) => (
                <li key={i} className="font-body text-sm text-ink/80">
                  <span className="font-semibold text-ink">
                    {c.displayName}
                  </span>
                  {c.status === "abandoned" && (
                    <span className="ml-1 font-mono text-[10px] text-wine">
                      (jätti kesken)
                    </span>
                  )}
                  <span className="text-ink/70">: {c.comment}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 border-t border-ink/10 pt-3 font-body text-xs italic text-ink/40">
              Ei kommentteja — kaikki lukijat toistaiseksi anonyymejä.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
