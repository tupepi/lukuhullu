import { useAuth } from "@clerk/clerk-react";
import { useState } from "react";
import type { BookDetailData, BookStatus, Ownership } from "../../types";
import { addUserBook } from "../../api/books";
import { primaryButtonClass } from "../../styles/buttons";
import ReadingDetailsFields from "../ReadingDetailsFields";
import Spinner from "../ui/Spinner";

// Lomake UUDEN user_books-rivin lisäämiseen TÄLLE painokselle - näytetään
// Modal-popupissa joko kun käyttäjä painaa "Merkitse luetuksi" (ei vielä
// yhtään omaa merkintää, ks. BookDetailin ownEntries.length === 0 -haara)
// tai "+ Lisää uusi lukukerta" (merkintöjä on jo, käyttäjä haluaa
// tallentaa uuden uudelleenlukukerran). Samaa lomaketta ei käytetä sekä
// lisäykseen että muokkaukseen, koska "lisää uusi" ja "muokkaa olemassa
// olevaa" ovat käsitteellisesti eri asioita (lisäys ei tarvitse esim.
// poisto-nappia eikä valmiiksi täytettyjä kenttiä).
export default function AddEntryForm({
  detail,
  onAdded,
}: {
  detail: BookDetailData;
  onAdded: () => void;
}) {
  const { getToken } = useAuth();
  const [status, setStatus] = useState<BookStatus>("read");
  const [readYear, setReadYear] = useState("");
  const [readMonth, setReadMonth] = useState("");
  const [readDay, setReadDay] = useState("");
  const [ownership, setOwnership] = useState<Ownership | "">("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sama sääntö kuin backendin utils/bookHelpers.js:n validateReadingDate -
  // tarkistetaan tässä ETUKÄTEEN, jotta käyttäjä näkee virheen heti eikä
  // vasta epäonnistuneen verkkopyynnön jälkeen. Backend tarkistaa tämän
  // silti uudelleen (ei koskaan luoteta pelkkään frontend-validointiin).
  function validateBeforeSubmit(): string | null {
    if ((status === "read" || status === "abandoned") && !readYear) {
      return "Lukuvuosi vaaditaan kun status on Luettu tai Jäi kesken";
    }
    if (readDay && !readMonth) {
      return "Kuukausi vaaditaan jos päivä on annettu";
    }
    return null;
  }

  async function handleAdd() {
    const validationError = validateBeforeSubmit();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await addUserBook(
        {
          openLibraryId: detail.openLibraryId,
          googleBooksId: detail.googleBooksId,
          title: detail.title,
          author: detail.author,
          coverUrl: detail.coverUrl,
          yearPublished: detail.yearPublished,
          subjects: detail.subjects ?? [],
          status,
          readYear: readYear ? Number(readYear) : undefined,
          readMonth: readMonth ? Number(readMonth) : undefined,
          readDay: readDay ? Number(readDay) : undefined,
          ownership: ownership || undefined,
          comment: comment || undefined,
        },
        getToken,
      );
      onAdded();
    } catch (err) {
      // err on nyt oikea Error-olio jossa on backendin viesti (ks. api/books.ts:n muutos)
      setError(
        err instanceof Error ? err.message : "Kirjan lisäys epäonnistui",
      );
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <ReadingDetailsFields
        status={status}
        onStatusChange={setStatus}
        allowAbandoned={false}
        readYear={readYear}
        onReadYearChange={setReadYear}
        readMonth={readMonth}
        onReadMonthChange={setReadMonth}
        readDay={readDay}
        onReadDayChange={setReadDay}
        ownership={ownership}
        onOwnershipChange={setOwnership}
        comment={comment}
        onCommentChange={setComment}
      />

      <button
        onClick={handleAdd}
        disabled={saving}
        className={`${primaryButtonClass} mt-4 inline-flex items-center gap-1.5`}
      >
        {saving && <Spinner />}
        {saving ? "Tallennetaan..." : "Tallenna"}
      </button>
      {error && <p className="mt-2 font-body text-xs text-wine">{error}</p>}
    </div>
  );
}
