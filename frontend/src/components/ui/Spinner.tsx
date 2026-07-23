import { Loader2 } from "lucide-react";

// Pieni pyörivä latausikoni - korvaa/täydentää sovelluksessa aiemmin
// käytetyn pelkän tekstinvaihdon ("Tallennetaan...", "Haetaan..." jne).
// Ei omaa tekstiä, käytetään aina painikkeen/tilan olemassa olevan tekstin
// vieressä (ks. esim. AddEntryForm.tsx).
export default function Spinner({
  size = 14,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />;
}
