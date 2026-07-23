import { useAuth } from "@clerk/clerk-react";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { UserBook, BookStatus, Ownership } from "../../types";
import { updateUserBook, deleteUserBook } from "../../api/books";
import {
  primaryButtonClass,
  dangerButtonClass,
} from "../../styles/buttons";
import ReadingDetailsFields from "../ReadingDetailsFields";
import EditionSwitcher from "./EditionSwitcher";
import Spinner from "../ui/Spinner";

// Muokkauslomake YHDELLE olemassa olevalle user_books-riville (yhdelle
// lukukerralle). Renderöidään nyt AINA Modalin sisällä (ei enää suoraan
// sivulla kiinteästi näkyvänä) - BookDetail avaa tämän kun käyttäjä
// klikkaa joko OwnEntrySummary-riviä tai oman kommenttinsa kynä-ikonia.
// Jos käyttäjä on lukenut saman painoksen useaan kertaan, jokaiselle
// lukukerralle on oma erillinen popup (avataan yksi kerrallaan, ei kaikkia
// samaan aikaan) - ks. PAATOKSET.md: Duplikaatit / Useat lukukerrat.
export default function OwnEntryForm({
  entry,
  onSaved,
  onDeleted,
}: {
  entry: UserBook;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const { getToken } = useAuth();
  const [status, setStatus] = useState<BookStatus>(entry.status);
  // Vuosi/kuukausi/päivä pidetään paikallisessa tilassa MERKKIJONOINA
  // (input[type=number]:n value on aina string), vaikka tietokannassa ne
  // ovat kokonaislukuja - muunnos Number()-funktiolla tehdään vasta
  // tallennushetkellä (handleSave). Tyhjä merkkijono tarkoittaa "ei
  // täytetty" ja muuttuu tallennuksessa undefined:ksi (ei nollaksi).
  const [readYear, setReadYear] = useState(entry.read_year?.toString() ?? "");
  const [readMonth, setReadMonth] = useState(
    entry.read_month?.toString() ?? "",
  );
  const [readDay, setReadDay] = useState(entry.read_day?.toString() ?? "");
  const [ownership, setOwnership] = useState<Ownership | "">(
    entry.ownership ?? "",
  );
  const [comment, setComment] = useState(entry.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "Vaihda painos" -osio (ks. PAATOKSET.md: Kanoninen käsite / "Uusi
  // ominaisuus tilalle"): käyttäjä voi huomata jälkikäteen että tarkempi
  // painos löytyy ja vaihtaa TÄMÄN yhden rivin kohdekirjan suoraan. Eri
  // asia kuin EditionsManagerin ryhmien yhdistäminen - tämä ei koske
  // work_group_id:tä, vain tämän user_books-rivin book_id:tä. Haku/valinta
  // itsessään on eriytetty EditionSwitcher-komponenttiin - tämä vain
  // muistaa VALITUN kirjan, koska handleSave tarvitsee sen bookId:n.
  const [selectedNewBook, setSelectedNewBook] = useState<{
    bookId: number;
    title: string;
  } | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      // Huom: backendin PUT /api/user-books/:id käyttää COALESCE:a (ks.
      // routes/userBooks.js) - undefined-kentät (esim. ownership: undefined
      // jos "Ei valittu" on yhä valittuna) EIVÄT tyhjennä olemassa olevaa
      // arvoa tietokannassa, koska undefined serialisoituu JSON:issa pois
      // kokonaan eikä siis välity SQL:n NULL:ksi asti. Tämä tarkoittaa myös
      // ettei kenttää voi tällä lomakkeella tyhjentää takaisin "ei
      // valittu" -tilaan tallennuksen jälkeen, vain vaihtaa toiseen arvoon.
      await updateUserBook(
        entry.id,
        {
          status,
          readYear: readYear ? Number(readYear) : undefined,
          readMonth: readMonth ? Number(readMonth) : undefined,
          readDay: readDay ? Number(readDay) : undefined,
          ownership: ownership || undefined,
          comment: comment || undefined,
          newBookId: selectedNewBook?.bookId,
        },
        getToken,
      );
      onSaved(); // sulkee popupin ja hakee tuoreen datan (ks. BookDetailin closeModalsAndReload)
    } catch (err) {
      // Jos backend palauttaa 412 DISPLAY_NAME_REQUIRED (ks. routes/
      // userBooks.js) koska kommentti annettiin ilman asetettua
      // näyttönimeä, se päätyy tänne yleisenä virheenä - App.tsx:n
      // pakotettu näyttönimikehote (ks. PAATOKSET.md) tekee tämän
      // tilanteen kuitenkin käytännössä mahdottomaksi, koska koko
      // sovellus lukittuu ennen sitä.
      setError("Tallennus epäonnistui");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    // window.confirm riittää tähän - poisto on harvinainen, ei-kriittinen
    // toiminto eikä tarvitse omaa modal-komponenttia. Ei "kumoa"-toimintoa,
    // koska tämä poistaa suoraan tietokannasta (ks. routes/userBooks.js
    // DELETE), joten vahvistus on tarkoituksella eksplisiittinen tekstissä.
    const vahvistettu = window.confirm(
      "Poistetaanko tämä lukukerta pysyvästi? Tätä ei voi perua.",
    );
    if (!vahvistettu) return;

    setDeleting(true);
    try {
      await deleteUserBook(entry.id, getToken);
      onDeleted(); // sulkee popupin ja hakee tuoreen datan (rivi on nyt poissa)
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  }

  return (
    <div>
      <ReadingDetailsFields
        status={status}
        onStatusChange={setStatus}
        // OLEMASSA OLEVAN merkinnän muokkaus - lukeminen voidaan jättää
        // kesken vasta sen jälkeen kun sitä on aloitettu, joten "abandoned"
        // on valittavissa täällä (AddEntryForm, uuden merkinnän lisäys,
        // EI tarjoa tätä vaihtoehtoa samasta syystä).
        allowAbandoned={true}
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

      <EditionSwitcher
        selectedTitle={selectedNewBook?.title ?? null}
        onSelect={(bookId, title) => setSelectedNewBook({ bookId, title })}
      />

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`${primaryButtonClass} inline-flex items-center gap-1.5`}
        >
          {saving && <Spinner />}
          {saving ? "Tallennetaan..." : "Tallenna"}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className={dangerButtonClass}
        >
          {deleting ? <Spinner /> : <Trash2 size={14} />}
          {deleting ? "Poistetaan..." : "Poista"}
        </button>
      </div>
      {error && <p className="mt-2 font-body text-xs text-wine">{error}</p>}
    </div>
  );
}
