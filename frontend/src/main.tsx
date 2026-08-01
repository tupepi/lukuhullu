import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App.tsx";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("VITE_CLERK_PUBLISHABLE_KEY puuttuu .env-tiedostosta");
}

// Mobiilikäytettävyys: kun mikä tahansa input/textarea/select fokusoituu
// (esim. lomake Modal-popupissa), virtuaalinäppäimistö voi nousta juuri
// sen kentän päälle ja peittää sen kokonaan. Yksi globaali kuuntelija tässä
// (document-tasolla, ei jokaisessa lomakekomponentissa erikseen) kattaa
// kaikki nykyiset JA tulevat lomakkeet automaattisesti. setTimeout-viive
// odottaa näppäimistön avautumisanimaation (iOS/Android ~300ms) ennen
// vierittämistä, jotta scrollIntoView laskee kohteen sijainnin oikein
// suhteessa jo kutistuneeseen näkyvään viewporttiin.
document.addEventListener("focusin", (e) => {
  const target = e.target;
  if (
    target instanceof HTMLElement &&
    (target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement)
  ) {
    setTimeout(() => {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 300);
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </StrictMode>,
);
