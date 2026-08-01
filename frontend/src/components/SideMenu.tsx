// Hampurilaisvalikko (ks. PAATOKSET.md: Navigaatio / Sivuvalikko): kotipesä
// toiminnoille jotka eivät ole päivittäistä ydinkäyttöä (toistaiseksi vain
// massatuonti) - alapalkki (App.tsx) pysyy näin yksinkertaisena pelkälle
// arkikäytölle (Kirjastoni/Hae/Selaa).
import { X, Upload, GitMerge, Plus } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: "import" | "editions") => void;
  // Eri asia kuin onNavigate: ei vaihda koko sivun näkymää, vaan avaa
  // ManualBookForm-popupin suoraan nykyisen näkymän päälle (ks. App.tsx).
  onManualAdd: () => void;
}

export default function SideMenu({
  isOpen,
  onClose,
  onNavigate,
  onManualAdd,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose}>
      <div
        className="flex h-full w-72 flex-col bg-paper px-5 py-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] pl-[calc(1.25rem+env(safe-area-inset-left))] text-ink shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="-mr-2.5 mb-6 flex h-11 w-11 items-center justify-center self-end rounded-full text-ink/60 hover:bg-ink/5"
          aria-label="Sulje valikko"
        >
          <X size={20} />
        </button>

        <nav className="flex flex-col gap-1">
          <button
            onClick={() => onNavigate("import")}
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-left font-body text-sm font-medium text-ink transition hover:bg-brass/10"
          >
            <Upload size={18} className="text-brass" />
            Tuo kirjoja
          </button>
          <button
            onClick={() => onNavigate("editions")}
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-left font-body text-sm font-medium text-ink transition hover:bg-brass/10"
          >
            <GitMerge size={18} className="text-brass" />
            Hallitse painoksia
          </button>
          <button
            onClick={onManualAdd}
            className="flex items-center gap-3 rounded-lg px-3 py-3 pl-9 text-left font-body text-sm font-medium text-ink transition hover:bg-brass/10"
          >
            <Plus size={16} className="text-brass" />
            Lisää manuaalisesti
          </button>
        </nav>
      </div>
    </div>
  );
}
