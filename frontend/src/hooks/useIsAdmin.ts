// Väliaikainen kovakoodattu admin-tarkistus samoille käyttäjä-id:ille kuin
// backendin ADMIN_USER_IDS (ks. backend/utils/adminUsers.js). Piilottaa vain
// UI:n - varsinainen rajaus tehdään backendissä, joka palauttaa 403:n jos
// tätä yritetään ohittaa.
import { useAuth } from "@clerk/clerk-react";

const ADMIN_USER_IDS = (import.meta.env.VITE_ADMIN_USER_IDS ?? "")
  .split(",")
  .map((id: string) => id.trim())
  .filter(Boolean);

export function useIsAdmin(): boolean {
  const { userId } = useAuth();
  return !!userId && ADMIN_USER_IDS.includes(userId);
}
