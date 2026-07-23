import { X } from "lucide-react";

// Yhteinen popup-kehys OwnEntryForm:lle ja AddEntryForm:lle. Tumma
// läpinäkyvä tausta sulkee popupin klikattaessa (stopPropagation sisemmässä
// divissä estää sisällön klikkauksia kuplimasta sulkemaan popupin vahingossa)
// - sama periaate kuin SideMenu.tsx:ssä. items-end mobiilissa (popup nousee
// näytön alareunasta ylös, tutumpi mobiiliyleiskuva) vs items-center
// isommilla näytöillä (sm-breakpoint).
export default function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-xl bg-paper p-5 shadow-xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg text-ink">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-ink/50 hover:bg-ink/5"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
