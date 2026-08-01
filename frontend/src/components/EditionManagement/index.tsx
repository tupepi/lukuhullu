import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { BookGroupEntry, BookSearchResult, Edition } from "../../types";
import {
  getEditions,
  mergeBooks,
  unmergeBook,
  deleteBook,
  getBooks,
} from "../../api/bookGroups";
import {
  groupByWorkRoot,
  pickRepresentative,
} from "../../utils/libraryGrouping";
import Modal from "../ui/Modal";
import Spinner from "../ui/Spinner";
import ManualBookForm from "../ManualBookForm";
import CurrentEditionsPanel from "./CurrentEditionsPanel";
import MergeSearchPanel from "./MergeSearchPanel";
import { inputClass, secondaryButtonClass } from "../../styles/buttons";

interface Props {
  onBack: () => void;
}

// Sivuvalikosta tavoitettava, itsenäinen painosten hallintasivu (ks.
// PAATOKSET.md). Erillään BookDetailista tarkoituksella: tämä on
// "ylläpidollinen" toiminto (harvemmin tarvittu) eikä siksi kuulu
// jokaisen kirjan sivun perusnäkymään.
//
// Kulku: 1) listataan käyttäjän omat ryhmät (Kirjastoni-näkymän kanssa
// samalla groupByWorkRoot/pickRepresentative-logiikalla), 2) käyttäjä
// valitsee ryhmän, 3) hakee ja yhdistää siihen uuden painoksen (sama
// mergeBooks-reitti jota myös OwnEntryForm.tsx:n "Vaihda painos" käyttää).
//
// Jaettu kolmeen tiedostoon (tämä + CurrentEditionsPanel + MergeSearchPanel)
// koska yhdistettynä tämä olisi kasvanut yli 400 riviin kolmea eri
// alavastuuta (nykyiset painokset/irrotus, haku/yhdistäminen, manuaalinen
// lisäys) yhdessä komponentissa - ks. PAATOKSET.md muutoshistoria.
export default function EditionManagement({ onBack }: Props) {
  const { getToken } = useAuth();
  const [books, setBooks] = useState<BookGroupEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedRoot, setSelectedRoot] = useState<{
    rootId: number;
    representative: BookGroupEntry;
  } | null>(null);
  const [currentEditions, setCurrentEditions] = useState<Edition[] | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Yksinkertainen asiakaspuolen suodatus ryhmälistaukseen (nimi/kirjailija),
  // ei erillistä backend-hakureittiä - lista on jo kokonaan ladattu tänne
  // (getBooks) samoin kuin Kirjastoni-näkymässä, joten suodatus tehdään
  // suoraan ladatusta datasta samaan tapaan kuin Kirjastonin vuosisuodatin.
  const [searchQuery, setSearchQuery] = useState("");

  // Manuaalisen painoksen lisäys (ManualBookForm, jaettu App.tsx:n
  // sivuvalikkovaihtoehdon kanssa). Tässä käytössä uusi painos yhdistetään
  // heti valittuun ryhmään (handleManualSaved) - eri asia kuin App.tsx:n
  // sivuvalikkovaihtoehto, jossa uusi kirja jää oman ryhmänsä ensimmäiseksi
  // jäseneksi.
  const [addingManual, setAddingManual] = useState(false);

  // Manuaalisesti lisätyn painoksen muokkaus (ks. CurrentEditionsPanel.tsx:n
  // "Muokkaa"-painike/rivi klikkaus). Sama ManualBookForm kuin lisäyksessä,
  // mutta editBookId-propilla ohjattuna päivitystilaan - ks. handleManualEdited.
  const [editingEdition, setEditingEdition] = useState<Edition | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getBooks(getToken);
        setBooks(data.results);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const groups = groupByWorkRoot(books).map((group) => ({
    rootId: group[0].work_group_root_id,
    representative: pickRepresentative(group),
    count: group.length,
  }));
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredGroups = normalizedQuery
    ? groups.filter(({ representative }) => {
        return (
          representative.title.toLowerCase().includes(normalizedQuery) ||
          (representative.author ?? "").toLowerCase().includes(normalizedQuery)
        );
      })
    : groups;

  async function handleSelectGroup(
    rootId: number,
    representative: BookGroupEntry,
  ) {
    setSelectedRoot({ rootId, representative });
    setMessage(null);
    setAddingManual(false);
    // Nollataan heti (ei vasta haun jälkeen), jotta CurrentEditionsPanel
    // näyttää oman "Ladataan..." -tilansa sen sijaan että se hetkellisesti
    // näyttäisi EDELLISEN valitun ryhmän painoksia väärän ryhmän otsikon alla.
    setCurrentEditions(null);
    try {
      const data = await getEditions(representative.id, getToken);
      setCurrentEditions(data.editions);
    } catch (err) {
      console.error(err);
      setCurrentEditions(null);
    }
  }

  async function handleMerge(result: BookSearchResult): Promise<boolean> {
    if (!selectedRoot) return false;
    setBusy(true);
    setMessage(null);
    try {
      await mergeBooks(
        selectedRoot.representative.id,
        {
          targetExternal: {
            localBookId: result.localBookId,
            openLibraryId: result.openLibraryId,
            googleBooksId: result.googleBooksId,
            title: result.title,
            author: result.author,
            coverUrl: result.coverUrl,
            yearPublished: result.yearPublished,
            subjects: result.subjects,
          },
        },
        getToken,
      );
      setMessage(`"${result.title}" yhdistetty ryhmään.`);
      const data = await getEditions(selectedRoot.representative.id, getToken);
      setCurrentEditions(data.editions);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleUnmerge(editionBookId: number) {
    if (!selectedRoot) return;
    const vahvistettu = window.confirm("Irrotetaanko tämä painos ryhmästä?");
    if (!vahvistettu) return;

    setBusy(true);
    try {
      await unmergeBook(editionBookId, getToken);
      const data = await getEditions(selectedRoot.representative.id, getToken);
      setCurrentEditions(data.editions);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  // Poistaa manuaalisesti lisätyn painoksen pysyvästi (ks. PAATOKSET.md).
  // Kolme tapausta poiston jälkeen sen mukaan mikä painos poistettiin:
  //  - poistettu painos oli ryhmän AINOA jäsen -> koko ryhmä katosi,
  //    palataan ryhmälistaukseen (setSelectedRoot(null))
  //  - poistettu painos oli TÄMÄN paneelin representative (jonka id:llä
  //    editions haettiin) -> vaihdetaan representative johonkin jäljellä
  //    olevaan jäseneen ja haetaan editions sen id:llä uudelleen
  //    (getEditions toimii millä tahansa ryhmän jäsenen id:llä, joten tämä
  //    toimii oikein myös jos backend valitsi ryhmälle uuden rootin)
  //  - poistettu painos oli JOKU MUU jäsen -> representative pysyy samana,
  //    haetaan vain tuore editions-lista
  async function handleDelete(editionBookId: number, editionTitle: string) {
    if (!selectedRoot) return;
    const vahvistettu = window.confirm(
      `Poistetaanko "${editionTitle}" pysyvästi? Tämä poistaa myös kaikkien käyttäjien lukumerkinnät tästä painoksesta eikä toimintoa voi perua.`,
    );
    if (!vahvistettu) return;

    setBusy(true);
    try {
      await deleteBook(editionBookId, getToken);
      const remaining = (currentEditions ?? []).filter(
        (ed) => ed.bookId !== editionBookId,
      );

      if (remaining.length === 0) {
        setSelectedRoot(null);
        setCurrentEditions(null);
      } else {
        const data = await getEditions(remaining[0].bookId, getToken);
        setCurrentEditions(data.editions);
        if (editionBookId === selectedRoot.representative.id) {
          setSelectedRoot({
            rootId: data.rootId,
            representative: {
              ...selectedRoot.representative,
              id: remaining[0].bookId,
              title: remaining[0].title,
              author: remaining[0].author,
              cover_url: remaining[0].coverUrl,
              year_published: remaining[0].yearPublished,
            },
          });
        }
        setMessage(`"${editionTitle}" poistettu.`);
      }

      // Taustalla oleva ryhmälista (nimet/määrät) saattoi muuttua poiston
      // myötä (esim. representative vaihtui) - päivitetään se samalla.
      const booksData = await getBooks(getToken);
      setBooks(booksData.results);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  function openManualAdd() {
    if (!selectedRoot) return;
    setMessage(null);
    setAddingManual(true);
  }

  function openEditManual(edition: Edition) {
    setMessage(null);
    setEditingEdition(edition);
  }

  // Yhdistää ManualBookFormin juuri luoman kirjan välittömästi valittuun
  // ryhmään mergeBooksilla - muuten uusi painos jäisi omaksi irralliseksi
  // ryhmäkseen (sama periaate kuin OwnEntryFormin "Vaihda painos", ks.
  // PAATOKSET.md: Kanoninen käsite). Jos tämä epäonnistuu, virhe näkyy
  // ManualBookFormin omassa virheilmoituksessa (se on kutsujan try/catchin
  // sisällä, ks. ManualBookForm.tsx:n handleSubmit).
  async function handleManualSaved(bookId: number, title: string) {
    if (!selectedRoot) return;
    await mergeBooks(
      selectedRoot.representative.id,
      { targetBookId: bookId },
      getToken,
    );
    setMessage(`"${title}" lisätty ryhmään.`);
    setAddingManual(false);
    const data = await getEditions(selectedRoot.representative.id, getToken);
    setCurrentEditions(data.editions);
  }

  // Päivittää olemassa olevan manuaalisen painoksen tiedot (ei mergeBooks-
  // kutsua, koska kyseessä on sama books-rivi eikä uusi painos - vain sen
  // kentät muuttuivat). Jos muokattu painos oli ryhmän representative,
  // päivitetään myös se (sama periaate kuin handleDeletessa) jotta otsikko/
  // ryhmälistaus näyttävät heti tuoreet tiedot.
  async function handleManualEdited(bookId: number, title: string) {
    if (!selectedRoot) return;
    setMessage(`"${title}" päivitetty.`);
    setEditingEdition(null);
    const data = await getEditions(selectedRoot.representative.id, getToken);
    setCurrentEditions(data.editions);

    if (bookId === selectedRoot.representative.id) {
      const edited = data.editions.find((ed) => ed.bookId === bookId);
      if (edited) {
        setSelectedRoot({
          rootId: data.rootId,
          representative: {
            ...selectedRoot.representative,
            title: edited.title,
            author: edited.author,
            cover_url: edited.coverUrl,
            year_published: edited.yearPublished,
          },
        });
      }
    }

    const booksData = await getBooks(getToken);
    setBooks(booksData.results);
  }

  if (loading) {
    return (
      <p className="flex items-center justify-center gap-2 py-8 text-center font-body text-paper/60">
        <Spinner size={16} />
        Ladataan...
      </p>
    );
  }

  return (
    <div className="px-4 pb-8 pt-2">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 font-body text-sm text-paper/70 transition hover:text-paper"
      >
        <ArrowLeft size={16} />
        Takaisin
      </button>
      <h2 className="mb-4 font-display text-xl text-paper">
        Hallitse painoksia
      </h2>

      {!selectedRoot ? (
        <div className="flex flex-col gap-2">
          {groups.length > 0 && (
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hae nimellä tai kirjailijalla..."
              className={`${inputClass} mb-1 w-full`}
            />
          )}
          {groups.length === 0 && (
            <p className="font-body text-sm text-paper/50">
              Kirjastosi on vielä tyhjä.
            </p>
          )}
          {groups.length > 0 && filteredGroups.length === 0 && (
            <p className="font-body text-sm text-paper/50">
              Ei hakutuloksia.
            </p>
          )}
          {filteredGroups.map(({ rootId, representative, count }) => (
            <button
              key={rootId}
              onClick={() => handleSelectGroup(rootId, representative)}
              className="flex items-center justify-between rounded-lg bg-paper px-4 py-3 text-left shadow-sm transition hover:shadow-md"
            >
              <span className="font-body text-sm text-ink">
                {representative.title}{" "}
                <span className="text-ink/50">
                  — {representative.author ?? "Tuntematon"}
                </span>
              </span>
              {count > 1 && (
                <span className="rounded-full bg-brass/15 px-2 py-0.5 font-mono text-[10px] text-brass">
                  {count} merkintää
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div>
          <button
            onClick={() => setSelectedRoot(null)}
            className="mb-3 font-body text-xs text-brass hover:underline"
          >
            ← Valitse toinen ryhmä
          </button>
          <div className="flex flex-col gap-4">
            <CurrentEditionsPanel
              title={selectedRoot.representative.title}
              editions={currentEditions}
              busy={busy}
              message={message}
              onUnmerge={handleUnmerge}
              onDelete={handleDelete}
              onEditManual={openEditManual}
            />
            <MergeSearchPanel
              // key: uusi komponenttiasennus per ryhmä, jotta haku nollautuu
              // automaattisesti ryhmää vaihdettaessa (ks. tiedoston tason
              // kommentti MergeSearchPanel.tsx:ssä)
              key={selectedRoot.rootId}
              currentEditions={currentEditions}
              busy={busy}
              onMerge={handleMerge}
            />
            <div className="rounded-lg bg-paper p-4 shadow-sm">
              <p className="mb-2 font-body text-xs text-ink/60">
                Ei löydy hausta? Lisää painos käsin:
              </p>
              <button onClick={openManualAdd} className={secondaryButtonClass}>
                Lisää manuaalisesti
              </button>
            </div>
          </div>
        </div>
      )}

      {addingManual && selectedRoot && (
        <Modal
          title="Lisää painos manuaalisesti"
          onClose={() => setAddingManual(false)}
        >
          <ManualBookForm
            initialTitle={selectedRoot.representative.title}
            initialAuthor={selectedRoot.representative.author ?? ""}
            initialYear={selectedRoot.representative.year_published}
            onSaved={handleManualSaved}
          />
        </Modal>
      )}

      {editingEdition && (
        <Modal title="Muokkaa painosta" onClose={() => setEditingEdition(null)}>
          <ManualBookForm
            editBookId={editingEdition.bookId}
            initialTitle={editingEdition.title}
            initialAuthor={editingEdition.author ?? ""}
            initialYear={editingEdition.yearPublished}
            initialCoverUrl={editingEdition.coverUrl ?? ""}
            onSaved={handleManualEdited}
          />
        </Modal>
      )}
    </div>
  );
}
