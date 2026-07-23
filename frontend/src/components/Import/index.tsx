// Massatuonnin näkymä (ks. PAATOKSET.md: UI-periaatteet / Massatuonti).
// Kaksivaiheinen käyttöliittymä joka peilaa backendin preview/confirm-jakoa:
//  1. Käyttäjä valitsee formaatin (oma CSV / Goodreads-vienti) ja liittää/
//     lataa CSV:n -> POST /api/import/preview jäsentää ja hakee ehdotetut
//     osumat, EI tallenna mitään
//  2. Esikatselutaulukko: jokainen rivi muokattavissa (status, päivämäärä,
//     omistus, kommentti, ja tarvittaessa uudelleenhaku jos osuma puuttuu
//     tai on väärä) ennen kuin mitään tallennetaan pysyvästi
//  3. Vasta "Tuo"-painikkeesta POST /api/import/confirm tallentaa vain ne
//     rivit joiden include-ruksi on päällä
// Tila (rows: EditableRow[]) pidetään kokonaan tässä komponentissa - ei
// jaeta muualle sovellukseen, koska tuonti on kertaluontoinen, erillinen
// työnkulku (ks. Navigaatio: tämä avataan SideMenu:sta, ei alapalkista).
import { useAuth } from "@clerk/clerk-react";
import { useState } from "react";
import { Upload, FileText } from "lucide-react";
import {
  previewImport,
  confirmImport,
  type ImportConfirmItem,
} from "../../api/import";
import {
  primaryButtonClass,
  secondaryButtonClass,
  inputClass,
} from "../../styles/buttons";
import ImportRow from "./ImportRow";
import { toEditableRow, type EditableRow } from "./types";
import { searchBooks } from "../../api/books";
import Spinner from "../ui/Spinner";

interface Props {
  onBack: () => void;
}

type Format = "own" | "goodreads";

export default function Import({ onBack }: Props) {
  const { getToken } = useAuth();
  const [format, setFormat] = useState<Format>("own");
  const [csvText, setCsvText] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [rows, setRows] = useState<EditableRow[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{
    inserted: number;
    failed: { title: string | null; error: string }[];
  } | null>(null);

  // Karkea arvio rivimäärästä (otsikkorivi pois laskettuna) esikatselun
  // latausviestiä varten - ei tarvitse olla tarkka, koska Papaparse tekee
  // varsinaisen jäsennyksen vasta backendissä (ks. handlePreview).
  const estimatedRowCount = csvText.trim()
    ? Math.max(csvText.trim().split("\n").length - 1, 0)
    : 0;

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsvText(reader.result as string);
    reader.readAsText(file);
  }

  async function handlePreview() {
    if (!csvText.trim()) return;
    setPreviewing(true);
    setResult(null);
    try {
      const previewRows = await previewImport(format, csvText, getToken);
      setRows(previewRows.map(toEditableRow));
    } catch (err) {
      console.error(err);
    } finally {
      setPreviewing(false);
    }
  }

  // Päivittää yhden rivin tilan muuttumatta muita - React-tilan
  // päivittäminen taulukossa vaatii aina koko taulukon "kopioinnin" tällä
  // tavalla, ei voi muuttaa yksittäistä alkiota suoraan (immutability)
  function updateRow(rowIndex: number, changes: Partial<EditableRow>) {
    setRows((prev) =>
      prev
        ? prev.map((r) => (r.rowIndex === rowIndex ? { ...r, ...changes } : r))
        : prev,
    );
  }

  // Muuntaa muokattavat rivit backendin odottamaan muotoon - jaettu
  // handleConfirmin ja handleImportSelectedAndRetryRestin kesken (molemmat
  // tuovat osan riveistä samalla logiikalla, eroaa vain SIINÄ MITÄ TAPAHTUU
  // jäljelle jääville riveille sen jälkeen).
  function rowsToConfirmItems(selectedRows: EditableRow[]): ImportConfirmItem[] {
    return selectedRows.map((r) => ({
      // Jos API löysi osuman, käytetään sen tietoja (kansikuva, tarkka
      // nimi, ID:t). Jos ei löytynyt, tallennetaan manuaalisena kirjana
      // (ks. PAATOKSET.md: Manuaalinen kirjan lisäys) käyttäen jäsennettyä
      // tekstiä sellaisenaan.
      openLibraryId: r.match?.openLibraryId ?? null,
      googleBooksId: r.match?.googleBooksId ?? null,
      title: r.match?.title ?? r.parsedTitle ?? "Nimetön",
      author: r.match?.author ?? r.parsedAuthor,
      coverUrl: r.match?.coverUrl ?? null,
      yearPublished: r.match?.yearPublished ?? null,
      subjects: r.match?.subjects ?? [],
      status: r.status,
      readYear: r.readYear ? Number(r.readYear) : undefined,
      readMonth: r.readMonth ? Number(r.readMonth) : undefined,
      readDay: r.readDay ? Number(r.readDay) : undefined,
      ownership: r.ownership || undefined,
      comment: r.comment || undefined,
      existingBookId: r.match?.localBookId,
    }));
  }

  async function handleConfirm() {
    if (!rows) return;
    const items = rowsToConfirmItems(rows.filter((r) => r.include));

    if (items.length === 0) return;

    setConfirming(true);
    try {
      const res = await confirmImport(items, getToken);
      setResult(res);
      setRows(null);
      setCsvText("");
    } catch (err) {
      console.error(err);
    } finally {
      setConfirming(false);
    }
  }

  // Tuo valitut rivit normaalisti, JA käynnistää samalla uuden haun
  // jäljelle jääville ei-valituille riville sen sijaan että ne
  // hylättäisiin kokonaan. Käytännöllinen kun CSV:ssä on sekaisin
  // helposti tunnistettuja ja hankalampia rivejä - ei tarvitse odottaa
  // että KAIKKI rivit on ratkaistu ennen kuin mitään tallennetaan.
  async function handleImportSelectedAndRetryRest() {
    if (!rows) return;

    const included = rows.filter((r) => r.include);
    const remaining = rows.filter((r) => !r.include);

    if (included.length > 0) {
      const items = rowsToConfirmItems(included);

      setConfirming(true);
      try {
        const res = await confirmImport(items, getToken);
        setResult(res);
      } catch (err) {
        console.error(err);
      } finally {
        setConfirming(false);
      }
    }

    if (remaining.length === 0) {
      setRows(null);
      setCsvText("");
      return;
    }

    // Näytetään jäljelle jäävät rivit heti (searching: true), ja haetaan
    // jokaiselle uudet tulokset peräkkäin - ei rinnakkain, koska tämä on
    // käyttäjän itse laukaisema pieni toiminto (todennäköisesti vain
    // muutama rivi) eikä koko CSV:n massakäsittely, joten ei tarvita
    // mapWithConcurrencyLimit-tyylistä rinnakkaisuutta - peräkkäisyys on
    // myös kohteliaampaa ulkoisille API:lle (ks. PAATOKSET.md: rate limit).
    setRows(
      remaining.map((r) => ({ ...r, searching: true, searchResults: null })),
    );

    for (const row of remaining) {
      try {
        const results = await searchBooks(row.searchQuery);
        setRows((prev) =>
          prev
            ? prev.map((r) =>
                r.rowIndex === row.rowIndex
                  ? { ...r, searching: false, searchResults: results }
                  : r,
              )
            : prev,
        );
      } catch (err) {
        console.error(err);
        setRows((prev) =>
          prev
            ? prev.map((r) =>
                r.rowIndex === row.rowIndex ? { ...r, searching: false } : r,
              )
            : prev,
        );
      }
    }
  }

  return (
    <div className="px-4 pb-8 pt-2">
      <button
        onClick={onBack}
        className="mb-4 font-body text-sm text-paper/70 transition hover:text-paper"
      >
        ← Takaisin
      </button>
      <h2 className="mb-4 font-display text-xl text-paper">Tuo kirjoja</h2>

      {result && (
        <div className="mb-4 rounded-lg bg-paper p-4 shadow-sm">
          <p className="font-body text-sm text-ink">
            Tuotu onnistuneesti:{" "}
            <span className="font-semibold text-sage">{result.inserted}</span>{" "}
            kirjaa.
            {result.failed.length > 0 && (
              <span className="text-wine">
                {" "}
                {result.failed.length} epäonnistui.
              </span>
            )}
          </p>
          {result.failed.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1 font-mono text-xs text-wine">
              {result.failed.map((f, i) => (
                <li key={i}>
                  {f.title ?? "Nimetön"}: {f.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!rows && (
        <div className="flex flex-col gap-4 rounded-lg bg-paper p-4 shadow-sm">
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-wide text-ink/50">
              Formaatti
            </span>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as Format)}
              className={inputClass}
            >
              <option value="own">
                Oma CSV (title,year,author,ownership,comment)
              </option>
              <option value="goodreads">Goodreads-vienti</option>
            </select>
          </label>

          <label className="flex items-center gap-2 font-body text-sm text-ink/70">
            <Upload size={16} className="text-brass" />
            <span>Lataa CSV-tiedosto</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="font-body text-xs"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-ink/50">
              <FileText size={12} />
              ...tai liitä CSV-sisältö tähän
            </span>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={8}
              className={`${inputClass} w-full resize-none font-mono text-xs`}
            />
          </label>

          <button
            onClick={handlePreview}
            disabled={previewing || !csvText.trim()}
            className={`${primaryButtonClass} inline-flex items-center gap-1.5 self-start`}
          >
            {previewing && <Spinner />}
            {previewing ? "Haetaan osumia..." : "Esikatsele"}
          </button>

          {/* Backend hakee jokaiselle riville osuman ulkoisista API:sta
            (Open Library/Google Books) rajoitetulla rinnakkaisuudella
            (ks. utils/concurrency.js) - isommalla CSV:llä tämä voi kestää
            useita minuutteja, joten pelkkä napin tekstinvaihto ei riitä
            kertomaan käyttäjälle mitä on meneillään. Ei tarkkaa
            edistymispalkkia (yksi kertaluontoinen pyyntö, ei striimausta),
            mutta arvioitu rivimäärä + selitys asettaa odotukset oikein. */}
          {previewing && (
            <p className="flex items-center gap-2 font-body text-xs text-ink/50">
              <Spinner size={12} />
              Käsitellään {estimatedRowCount > 0 ? `~${estimatedRowCount} ` : ""}
              riviä ulkoisista tietolähteistä - tämä voi kestää useita
              minuutteja isommilla tiedostoilla.
            </p>
          )}
        </div>
      )}

      {rows && (
        <div>
          <p className="mb-3 font-body text-sm text-paper/70">
            {rows.length} riviä löytyi. Tarkista osumat ja korjaa tarvittaessa
            ennen tuontia.
          </p>
          <ul className="flex flex-col gap-3">
            {rows.map((row) => (
              <ImportRow key={row.rowIndex} row={row} updateRow={updateRow} />
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className={`${primaryButtonClass} inline-flex items-center gap-1.5`}
            >
              {confirming && <Spinner />}
              {confirming
                ? "Tuodaan..."
                : `Tuo ${rows.filter((r) => r.include).length} kirjaa`}
            </button>

            {rows.some((r) => !r.include) && (
              <button
                onClick={handleImportSelectedAndRetryRest}
                disabled={confirming}
                className={`${secondaryButtonClass} inline-flex items-center gap-1.5`}
              >
                {confirming && <Spinner />}
                Lisää valitut ja hae uudestaan ei-valitut
              </button>
            )}

            <button
              onClick={() => setRows(null)}
              className={secondaryButtonClass}
            >
              Peruuta ja aloita alusta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
