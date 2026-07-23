// Kirjan yksityiskohtainen näkymä (ks. PAATOKSET.md: Kirjan yksityiskohtainen
// näkymä / BookDetail). Yhdistää samalle sivulle kolme eri asiaa yhden
// TIETYN painoksen (bookId-propin) ympärille:
//  1. Julkinen tieto KOKO RYHMÄN yli (muiden lukijoiden määrä/kommentit) -
//     haetaan GET /api/books/detail/:bookId, joka laskee tilastot ryhmän
//     roolin mukaan riippumatta siitä mitä painosta juuri katsotaan
//  2. Oma muokkaus TÄLLE YHDELLE PAINOKSELLE (status/vuosi/kommentti/poisto),
//     ei koko ryhmälle - "Omat merkintäsi" näyttää vain tämän bookId:n rivit
//  3. Painosten/kieliversioiden navigointilista (EditionsManager): pelkkä
//     klikattava listaus ryhmän muihin painoksiin siirtymiseen - itse
//     yhdistäminen/irrottaminen tehdään omalla "Hallitse painoksia"
//     -sivulla (components/EditionManagement.tsx)
// Ei React Routeria - App.tsx hallitsee näkyvyyttä omalla viewingBookId-
// tilallaan, tämä komponentti saa bookId:n propina ja onBack-callbackin
// paluuseen edelliselle välilehdelle.
//
// UI-päivitys: "Omat merkintäsi" ei enää näytä lomaketta suoraan auki koko
// ajan - sen sijaan yhteenvetorivi (OwnEntrySummary) tai "Merkitse luetuksi"
// -painike, jotka avaavat varsinaisen lomakkeen (OwnEntryForm/AddEntryForm)
// Modal-popupissa. Tämä pitää sivun kevyenä silloin kun muokkausta ei
// tarvita. Lisäksi "Muiden lukijoiden kokemuksia" -listassa oma kommentti
// tunnistetaan myDisplayName-propin avulla ja sen viereen ilmestyy
// kynä-ikoni, joka avaa saman muokkauspopupin - ei tarvitse selata "Omat
// merkintäsi" -osioon erikseen muokatakseen kommenttia.
import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, BookCheck } from "lucide-react";
import type { UserBook, BookDetailData } from "../../types";
import { updateCoverUrl } from "../../api/bookGroups";
import Modal from "../ui/Modal";
import Spinner from "../ui/Spinner";
import CoverUrlInput from "../CoverUrlInput";
import OwnEntryForm from "./OwnEntryForm";
import AddEntryForm from "./AddEntryForm";
import OwnEntrySummary from "./OwnEntrySummary";
import EditionsManager from "./EditionsManager";
import {
  primaryButtonClass,
  secondaryButtonClass,
} from "../../styles/buttons";
import {
  getBookDetail,
  getUserBooksForGroup,
  updateUserBook,
  deleteUserBook,
  addUserBook,
  searchBooks,
} from "../../api/books";

interface Props {
  bookId: number;
  // Käyttäjän oma näyttönimi (App.tsx:n tila, asetettu DisplayNamePromptissa).
  // Tarvitaan tunnistamaan "Muiden lukijoiden kokemuksia" -listasta MIKÄ
  // kommentti on käyttäjän oma, jotta sen viereen voidaan näyttää
  // muokkauspainike. Huom: tunnistus nimen perusteella ei ole 100%
  // luotettava jos kaksi käyttäjää valitsisi saman näyttönimen - ei
  // tietokantatason uniikkiusrajoitetta tälle (ks. PAATOKSET.md), mutta
  // riski on olematon pienessä käyttäjäryhmässä.
  myDisplayName: string | null;
  onNavigateToBook: (bookId: number) => void;
  onBack: () => void;
}

export default function BookDetail({
  bookId,
  myDisplayName,
  onNavigateToBook,
  onBack,
}: Props) {
  const { getToken } = useAuth();
  const [detail, setDetail] = useState<BookDetailData | null>(null);
  const [ownEntries, setOwnEntries] = useState<UserBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCover, setEditingCover] = useState(false);
  const [coverUrlInput, setCoverUrlInput] = useState("");
  const [savingCover, setSavingCover] = useState(false);
  // Kumpi popup on auki (jos kumpikaan): muokataanko olemassa olevaa
  // merkintää (editingEntry sisältää sen UserBook-rivin), vai lisätäänkö
  // uusi (addingNew). Vain yksi voi olla auki kerrallaan - ei tarvita
  // erillistä "kumpikin kiinni" -tilaa koska molemmat lähtevät false/null-
  // oletusarvosta eivätkä avaudu koskaan samaan aikaan käyttöliittymän
  // toimesta.
  const [editingEntry, setEditingEntry] = useState<UserBook | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  // Kaksi erillistä hakua rinnakkain (Promise.all): getBookDetail hakee
  // RYHMÄTASON julkisen tiedon (lukijamäärä/kommentit koko ryhmän yli),
  // getUserBooksForBook hakee vain TÄMÄN yhden painoksen (bookId) omat
  // merkinnät. Nämä ovat eri tietolähteitä eri tarkoituksiin (ks. tiedoston
  // alun kommentti) eikä niitä voi yhdistää yhdeksi API-kutsuksi ilman
  // että jompikumpi vastuu hämärtyisi.
  async function loadAll() {
    setLoading(true);
    try {
      const detailData = await getBookDetail(bookId, getToken);
      // UUSI: haetaan omat merkinnät detailData.rootId:n perusteella (koko
      // ryhmä), ei enää bookId:n perusteella (vain tämä yksi painos) -
      // detailData pitää hakea ENSIN koska tarvitsemme sen rootId:n
      const ownData = await getUserBooksForGroup(detailData.rootId, getToken);
      setDetail(detailData);
      setOwnEntries(ownData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveCover() {
    if (!coverUrlInput.trim() || !detail) return;
    setSavingCover(true);
    try {
      await updateCoverUrl(detail.bookId, coverUrlInput.trim(), getToken);
      setEditingCover(false);
      setCoverUrlInput("");
      await loadAll();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingCover(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  // Sulkee kummankin mahdollisen popupin ja hakee tuoreen datan kerralla -
  // käytetään sekä OwnEntryForm:n (onSaved/onDeleted) että AddEntryForm:n
  // (onAdded) callbackina, jotta popupin sulkeminen ja datan päivitys eivät
  // unohdu kummastakaan tapauksesta erikseen.
  function closeModalsAndReload() {
    setEditingEntry(null);
    setAddingNew(false);
    loadAll();
  }

  if (loading || !detail)
    return (
      <p className="flex items-center justify-center gap-2 py-8 text-center font-body text-paper/60">
        <Spinner size={16} />
        Ladataan...
      </p>
    );

  return (
    <div className="px-4 pb-8 pt-2">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 font-body text-sm text-paper/70 transition hover:text-paper"
      >
        <ArrowLeft size={16} />
        Takaisin
      </button>

      <div className="flex gap-4">
        <div className="relative w-28 shrink-0">
          {detail.coverUrl ? (
            <img
              src={detail.coverUrl}
              alt={detail.title}
              className="w-full rounded-sm object-cover shadow-md"
            />
          ) : (
            <div className="flex w-full items-center justify-center rounded-sm bg-paper/10 py-16 font-body text-xs text-paper/40">
              Ei kuvaa
            </div>
          )}
          <button
            onClick={() => {
              setCoverUrlInput(detail.coverUrl ?? "");
              setEditingCover(true);
            }}
            title="Muokkaa kansikuvaa"
            className="absolute -right-1.5 -top-1.5 rounded-full bg-paper p-1.5 text-ink/60 shadow-md transition hover:text-ink"
          >
            <Pencil size={12} />
          </button>
        </div>
        <div>
          <h2 className="font-display text-xl leading-snug text-paper">
            {detail.title}
          </h2>
          <p className="mt-1 font-mono text-sm text-paper/60">
            {detail.author ?? "Tuntematon kirjailija"}
            {detail.yearPublished ? ` · ${detail.yearPublished}` : ""}
          </p>
        </div>
      </div>

      {editingCover && (
        <div className="mt-3 rounded-lg bg-paper p-3 shadow-sm">
          <CoverUrlInput value={coverUrlInput} onChange={setCoverUrlInput} />
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleSaveCover}
              disabled={savingCover || !coverUrlInput.trim()}
              className={primaryButtonClass}
            >
              {savingCover ? "Tallennetaan..." : "Tallenna"}
            </button>
            <button
              onClick={() => setEditingCover(false)}
              className={secondaryButtonClass}
            >
              Peruuta
            </button>
          </div>
        </div>
      )}

      {/* Omat merkintäsi: TÄSTÄ PAINOKSESTA (bookId), ei koko ryhmästä -
        sama rajaus kuin aiemmin, vain esitystapa muuttui lomakkeesta
        yhteenvetoriveiksi + popup-muokkaukseen */}
      <section className="mt-6">
        <h3 className="mb-3 font-display text-lg text-paper">
          Omat merkintäsi
        </h3>
        {ownEntries.length === 0 ? (
          <button onClick={() => setAddingNew(true)} className="...">
            <BookCheck size={16} />
            Merkitse luetuksi
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            {ownEntries.map((entry) => (
              <div key={entry.id}>
                {entry.book_id !== bookId && (
                  <p className="mb-1 font-mono text-[10px] text-paper/40">
                    Painos: {entry.title}
                  </p>
                )}
                <OwnEntrySummary
                  entry={entry}
                  onClick={() => setEditingEntry(entry)}
                />
              </div>
            ))}
            <button onClick={() => setAddingNew(true)} className="...">
              + Lisää uusi merkintä
            </button>
          </div>
        )}
      </section>

      <section className="mt-6">
        <h3 className="mb-3 font-display text-lg text-paper">
          Muiden lukijoiden kokemuksia
        </h3>
        <div className="rounded-lg bg-paper p-4 shadow-sm">
          <div className="mb-3 flex gap-2 font-mono text-xs">
            <span className="rounded-full bg-sage/15 px-2.5 py-1 text-sage">
              {detail.readerCount} lukenut
            </span>
            {detail.abandonedCount > 0 && (
              <span className="rounded-full bg-wine/15 px-2.5 py-1 text-wine">
                {detail.abandonedCount} jättänyt kesken
              </span>
            )}
            <span className="self-center text-ink/40">koko ryhmä yhteensä</span>
          </div>

          {detail.comments.length === 0 ? (
            <p className="font-body text-xs italic text-ink/40">
              Ei kommentteja — kaikki lukijat toistaiseksi anonyymejä.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {detail.comments.map((c, i) => {
                // Tunnistetaan oma kommentti myDisplayName-propin perusteella
                // (ks. Props-interfacen kommentti epätarkkuuden riskistä).
                // matchingEntry etsitään lisäksi kommenttitekstin täsmäävyy-
                // dellä ownEntries-listasta, jotta muokkauspainike osaa avata
                // OIKEAN popupin - jos on useita lukukertoja joissa on
                // SAMA kommenttiteksti sanasta sanaan, tämä voisi teoriassa
                // löytää väärän niistä, mutta tämä on hyvin epätodennäköinen
                // reunatapaus eikä kriittinen henkilökohtaisessa projektissa.
                const isMine =
                  myDisplayName !== null && c.displayName === myDisplayName;
                const matchingEntry = isMine
                  ? ownEntries.find((e) => e.comment === c.comment)
                  : undefined;

                return (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-2 font-body text-sm text-ink/80"
                  >
                    <span>
                      <span className="font-semibold text-ink">
                        {isMine ? "Sinä" : c.displayName}
                      </span>
                      {c.status === "abandoned" && (
                        <span className="ml-1 font-mono text-[10px] text-wine">
                          (jätti kesken)
                        </span>
                      )}
                      <span>: {c.comment}</span>
                    </span>
                    {matchingEntry && (
                      <button
                        onClick={() => setEditingEntry(matchingEntry)}
                        title="Muokkaa kommenttia"
                        className="shrink-0 rounded-full p-1 text-ink/40 hover:bg-ink/5 hover:text-ink"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
      <EditionsManager
        bookId={detail.bookId}
        onSelectEdition={onNavigateToBook}
        currentBookId={detail.bookId}
      />

      {/* Popupit renderöidään aivan komponentin lopussa, ehdollisesti -
        vain yksi näistä kahdesta voi olla auki kerrallaan käytännössä,
        koska mikään käyttöliittymän toiminto ei avaa molempia yhtä aikaa */}
      {editingEntry && (
        <Modal title="Muokkaa merkintää" onClose={() => setEditingEntry(null)}>
          <OwnEntryForm
            entry={editingEntry}
            onSaved={closeModalsAndReload}
            onDeleted={closeModalsAndReload}
          />
        </Modal>
      )}
      {addingNew && (
        <Modal
          title={
            ownEntries.length === 0
              ? "Lisää kirja kirjastoosi"
              : "Lisää uusi merkintä"
          }
          onClose={() => setAddingNew(false)}
        >
          <AddEntryForm detail={detail} onAdded={closeModalsAndReload} />
        </Modal>
      )}
    </div>
  );
}
