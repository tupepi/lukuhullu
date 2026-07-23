// Kertaluontoinen pakotettu näyttönimikehote (ks. PAATOKSET.md: Pakotettu
// näyttönimi ennen kommentointia). App.tsx näyttää tämän KOKO sovelluksen
// sijaan (ei vain kommentointikohdassa) heti kun profiili on ladattu ja
// displayName puuttuu - varmistaa ettei käyttäjä pääse mihinkään tilaan
// jossa kommentin tallennus voisi epäonnistua 412 DISPLAY_NAME_REQUIRED
// -virheeseen jälkikäteen (ks. routes/userBooks.js).
import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { PenLine } from "lucide-react";
import { setDisplayName } from "../api/profile";
import { inputClass, primaryButtonClass } from "../styles/buttons";
import Spinner from "./ui/Spinner";

interface Props {
  onSaved: (name: string) => void;
}

export default function DisplayNamePrompt({ onSaved }: Props) {
  const { getToken } = useAuth();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const result = await setDisplayName(name.trim(), getToken);
      onSaved(result.displayName);
    } catch (err) {
      setError("Tallennus epäonnistui, yritä uudelleen");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-forest px-4">
      <div className="w-full max-w-sm rounded-xl bg-paper p-6 shadow-xl">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-brass/15 p-3 text-brass">
            <PenLine size={24} />
          </div>
        </div>

        <h2 className="text-center font-display text-xl text-ink">
          Aseta näyttönimesi
        </h2>
        <p className="mt-2 text-center font-body text-sm text-ink/60">
          Kommenttisi kirjoista näkyvät muille käyttäjille tällä nimellä. Muu
          tietosi (lukuvuodet, omistustyyppi) pysyy yksityisenä.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="esim. Kirjatoukka92"
            autoFocus
            className={`${inputClass} w-full`}
          />
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className={`${primaryButtonClass} w-full inline-flex items-center justify-center gap-1.5`}
          >
            {saving && <Spinner />}
            {saving ? "Tallennetaan..." : "Tallenna"}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-center font-body text-xs text-wine">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
