// Compatibility shim: existing pages and components import `useRole` and `AppRole`.
// Terrer now uses Supabase Auth + `public.profiles` as the source of truth.
import { useAuth, type AppRole, type AuthMode, type ProfileRow } from './AuthContext';

interface UseRoleValue {
  authMode: AuthMode;
  isDemoMode: boolean;
  canonicalRole: AppRole | null;
  role: AppRole | null;
  profile: ProfileRow | null;
  setRole: (role: AppRole) => void;
  logout: () => Promise<void>;
}

export type { AppRole };

export function useRole(): UseRoleValue {
  const { authMode, isDemoMode, canonicalRole, role, profile, setRole, signOut } = useAuth();
  return { authMode, isDemoMode, canonicalRole, role, profile, setRole, logout: signOut };
}
