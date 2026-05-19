// Compatibility shim: existing pages and components import `useRole` and `AppRole`.
// Terrer now uses Supabase Auth + `public.profiles` as the source of truth.
import { useAuth, type AppRole, type ProfileRow } from './AuthContext';

interface UseRoleValue {
  role: AppRole | null;
  profile: ProfileRow | null;
  logout: () => Promise<void>;
}

export type { AppRole };

export function useRole(): UseRoleValue {
  const { role, profile, signOut } = useAuth();
  return { role, profile, logout: signOut };
}

