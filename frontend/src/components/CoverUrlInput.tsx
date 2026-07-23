import { inputClass } from "../styles/buttons";

// Jaettu "kansikuvan URL + elävä esikatselu" -kenttä. Sama pari (label+input,
// sitten esikatselukuva joka piilottaa itsensä onError:illa jos URL ei
// kelpaa) oli aiemmin kirjoitettu erikseen sekä BookDetail:n kansikuvan
// käsin muokkauksessa että ManualBookForm:ssa. Ei ota kantaa ulkoiseen
// marginaaliin (esim. mt-3) - kutsuja kääriköön tarvittaessa omaan
// tilaansa sopivalla välillä, koska konteksti (kortin ensimmäinen kenttä
// vs. lomakkeen keskellä) vaihtelee kutsupaikan mukaan.
export default function CoverUrlInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-wide text-ink/50">
          Kansikuvan URL-osoite
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className={`${inputClass} w-full`}
        />
      </label>
      {value.trim() && (
        <img
          src={value.trim()}
          alt="Esikatselu"
          loading="lazy"
          className="mt-2 h-24 w-16 rounded-sm object-cover shadow"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}
    </>
  );
}
