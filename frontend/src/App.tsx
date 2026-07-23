// Sovelluksen juuri: Clerk-kirjautuminen, näyttönimen pakotus, ja koko
// navigaation tila (ks. PAATOKSET.md: Navigaatio). Ei React Routeria - kaikki
// näkymänvaihto on tavallista React-tilaa (useState), koska välilehtiä on
// vähän eikä sovellus tarvitse jaettavia URL-osoitteita per näkymä. Tässä
// tiedostossa on siis myös se logiikka joka MUUALLA sovelluksissa asuisi
// reitittimessä: mikä näkymä on aktiivinen ja missä järjestyksessä eri
// koko-sivun tilat (auth / näyttönimi / kirjan detaljinäkymä / sivuvalikon
// näkymät / normaali tabs-näkymä) ohittavat toisensa.
import {
  SignedIn,
  SignedOut,
  SignIn,
  UserButton,
  useAuth,
} from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { Menu, BookMarked, Search, Compass } from "lucide-react";
import BookSearch from "./components/BookSearch";
import Library from "./components/Library";
import Discover from "./components/Discover";
import BookDetail from "./components/BookDetail";
import DisplayNamePrompt from "./components/DisplayNamePrompt";
import SideMenu from "./components/SideMenu";
import { getProfile } from "./api/profile";
import Import from "./components/Import";
import EditionManagement from "./components/EditionManagement";
import Modal from "./components/ui/Modal";
import Spinner from "./components/ui/Spinner";
import ManualBookForm from "./components/ManualBookForm";

type Tab = "kirjasto" | "haku" | "selaa";
// 'tabs' = normaali alapalkki+välilehdet -näkymä, muut ovat sivuvalikosta
// avattavia erillisiä näkymiä jotka korvaavat koko sisällön väliaikaisesti
type View = "tabs" | "import" | "editions";

const TABS: { id: Tab; label: string; icon: typeof BookMarked }[] = [
  { id: "kirjasto", label: "Kirjastoni", icon: BookMarked },
  { id: "haku", label: "Hae", icon: Search },
  { id: "selaa", label: "Selaa", icon: Compass },
];

function AuthenticatedApp() {
  const { getToken } = useAuth();
  const [displayName, setDisplayNameState] = useState<
    string | null | undefined
  >(undefined);
  const [activeTab, setActiveTab] = useState<Tab>("kirjasto");
  const [viewingBookId, setViewingBookId] = useState<number | null>(null);
  const [currentView, setCurrentView] = useState<View>("tabs");
  const [menuOpen, setMenuOpen] = useState(false);
  // Sivuvalikon "Lisää manuaalisesti" (ks. PAATOKSET.md): eri asia kuin
  // EditionManagementin manuaalinen lisäys, joka yhdistää uuden painoksen
  // valittuun ryhmään - tämä luo täysin uuden, ryhmättömän kirjan (oman
  // ryhmänsä ensimmäinen/ainoa jäsen), ja navigoi sen jälkeen suoraan sen
  // BookDetail-sivulle (sama periaate kuin BookSearch.tsx:n hakutuloksen
  // avaaminen: ensureBook + siirtyminen BookDetailiin).
  const [manualAddOpen, setManualAddOpen] = useState(false);

  useEffect(() => {
    async function tarkistaProfiili() {
      const profile = await getProfile(getToken);
      setDisplayNameState(profile.displayName);
    }
    tarkistaProfiili();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (displayName === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 font-body text-paper/70">
        <Spinner size={16} />
        Ladataan...
      </div>
    );
  }

  if (displayName === null) {
    return <DisplayNamePrompt onSaved={(name) => setDisplayNameState(name)} />;
  }

  // Yhteinen header, näytetään joka näkymässä (kirjan sivu, tuonti, tabit)
  const header = (
    <header className="flex items-center justify-between px-4 py-3">
      {currentView === "tabs" && viewingBookId === null ? (
        <button
          onClick={() => setMenuOpen(true)}
          className="rounded-full p-2 text-brass transition hover:bg-paper/10"
          aria-label="Valikko"
        >
          <Menu size={24} />
        </button>
      ) : (
        <span className="w-10" /> // pitää headerin tasapainossa kun hampurilaispainike ei näy
      )}
      <span className="font-display text-lg tracking-wide text-paper">
        Lukuhullu
      </span>
      <div className="rounded-full bg-paper p-0.5">
        <UserButton />
      </div>
    </header>
  );

  // Kirjan yksityiskohtainen näkymä korvaa kaiken riippumatta muusta tilasta
  if (viewingBookId !== null) {
    return (
      <div className="min-h-screen bg-forest">
        {header}
        <BookDetail
          bookId={viewingBookId}
          myDisplayName={displayName}
          onNavigateToBook={setViewingBookId}
          onBack={() => setViewingBookId(null)}
        />
      </div>
    );
  }

  if (currentView === "editions") {
    return (
      <div className="min-h-screen bg-forest">
        {header}
        <EditionManagement onBack={() => setCurrentView("tabs")} />
      </div>
    );
  }

  // Sivuvalikosta avattu erillinen näkymä (esim. tuonti) korvaa myös kaiken,
  // mutta säilyttää activeTab-tilan ennallaan taustalla - "takaisin" palaa
  // samaan välilehteen jossa oltiin ennen sivuvalikon avaamista
  if (currentView === "import") {
    return (
      <div className="min-h-screen bg-forest">
        {header}
        <Import onBack={() => setCurrentView("tabs")} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-forest pb-20">
      {header}

      <SideMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={(view) => {
          setCurrentView(view);
          setMenuOpen(false);
        }}
        onManualAdd={() => {
          setManualAddOpen(true);
          setMenuOpen(false);
        }}
      />

      {manualAddOpen && (
        <Modal
          title="Lisää kirja manuaalisesti"
          onClose={() => setManualAddOpen(false)}
        >
          <ManualBookForm
            onSaved={(bookId) => {
              setManualAddOpen(false);
              setViewingBookId(bookId);
            }}
          />
        </Modal>
      )}

      <main className="px-4">
        {activeTab === "kirjasto" && (
          <Library onSelectBook={setViewingBookId} />
        )}
        {activeTab === "haku" && <BookSearch onSelectBook={setViewingBookId} />}
        {activeTab === "selaa" && <Discover onSelectBook={setViewingBookId} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 flex border-t border-paper/10 bg-forest/95 backdrop-blur">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-1 flex-col items-center gap-1 py-3 font-body text-xs transition ${
                isActive ? "text-brass" : "text-paper/50"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              {label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-forest">
      <SignedOut>
        <div className="flex min-h-screen items-center justify-center">
          <SignIn />
        </div>
      </SignedOut>
      <SignedIn>
        <AuthenticatedApp />
      </SignedIn>
    </div>
  );
}
