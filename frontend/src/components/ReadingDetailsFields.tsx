import type { BookStatus, Ownership } from "../types";
import { inputClass } from "../styles/buttons";

// Jaettu kenttäjoukko lukukerran tiedoille (status/vuosi/kk/pv/omistus/
// kommentti) - AddEntryForm ja OwnEntryForm käyttivät aiemmin sanasta
// sanaan samaa JSX:ää eri tilamuuttujiin sidottuna. ImportRow.tsx:ssä on
// TARKOITUKSELLA oma tiivis versio näistä kentistä (ei label-otsikoita,
// placeholder-teksti suoraan inputissa) koska se näyttää monta riviä
// listassa kerralla - sen pakottaminen samaan komponenttiin vaatisi
// compact/normal-haaroja jokaiselle kentälle, mikä tekisi tästä
// komponentista monimutkaisemman kuin mitä se säästäisi.
export default function ReadingDetailsFields({
  status,
  onStatusChange,
  allowAbandoned,
  readYear,
  onReadYearChange,
  readMonth,
  onReadMonthChange,
  readDay,
  onReadDayChange,
  ownership,
  onOwnershipChange,
  comment,
  onCommentChange,
}: {
  status: BookStatus;
  onStatusChange: (status: BookStatus) => void;
  // AddEntryForm (uusi merkintä) ei tarjoa "Jäi kesken" -vaihtoehtoa, koska
  // lukeminen voidaan jättää kesken vasta sen jälkeen kun sitä on aloitettu
  // - OwnEntryForm (olemassa olevan merkinnän muokkaus) tarjoaa.
  allowAbandoned: boolean;
  readYear: string;
  onReadYearChange: (value: string) => void;
  readMonth: string;
  onReadMonthChange: (value: string) => void;
  readDay: string;
  onReadDayChange: (value: string) => void;
  ownership: Ownership | "";
  onOwnershipChange: (value: Ownership | "") => void;
  comment: string;
  onCommentChange: (value: string) => void;
}) {
  // Sama sääntö kuin backendin validateReadingDate: vuosi pakollinen kun
  // status on read/abandoned - lasketaan tässä aina statuksen perusteella
  // (ei enää vain AddEntryFormissa), jotta myös OwnEntryForm näyttää saman
  // visuaalisen vihjeen.
  const yearRequired = status === "read" || status === "abandoned";

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wide text-ink/50">
            Status
          </span>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value as BookStatus)}
            className={inputClass}
          >
            <option value="to_read">Aion lukea</option>
            <option value="reading">Lukemassa</option>
            <option value="read">Luettu</option>
            {allowAbandoned && <option value="abandoned">Jäi kesken</option>}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wide text-ink/50">
            Vuosi{yearRequired && " *"}
          </span>
          <input
            type="number"
            value={readYear}
            onChange={(e) => onReadYearChange(e.target.value)}
            placeholder="2024"
            className={`${inputClass} w-20`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wide text-ink/50">
            Kk
          </span>
          <input
            type="number"
            min={1}
            max={12}
            value={readMonth}
            onChange={(e) => onReadMonthChange(e.target.value)}
            className={`${inputClass} w-14`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wide text-ink/50">
            Pv
          </span>
          <input
            type="number"
            min={1}
            max={31}
            value={readDay}
            onChange={(e) => onReadDayChange(e.target.value)}
            className={`${inputClass} w-14`}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wide text-ink/50">
            Omistus
          </span>
          <select
            value={ownership}
            onChange={(e) => onOwnershipChange(e.target.value as Ownership | "")}
            className={inputClass}
          >
            <option value="">Ei valittu</option>
            <option value="physical">Fyysinen</option>
            <option value="ebook">E-kirja</option>
            <option value="none">Ei omista</option>
          </select>
        </label>
      </div>

      <label className="mt-3 flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-wide text-ink/50">
          Kommentti (näkyy julkisesti nimelläsi)
        </span>
        <textarea
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          rows={2}
          className={`${inputClass} w-full resize-none`}
        />
      </label>
    </div>
  );
}
