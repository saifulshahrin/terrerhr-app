import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type AppRole = 'recruiter' | 'bd' | 'admin';
export type AuthMode = 'demo' | 'strict';

export interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole | null;
  is_active: boolean | null;
}

type AccessState = 'loading' | 'unauthenticated' | 'blocked' | 'authenticated';

interface AuthContextValue {
  authMode: AuthMode;
  isDemoMode: boolean;
  access: AccessState;
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  role: AppRole | null;
  setRole: (role: AppRole) => void;
  authLoading: boolean;
  profileLoading: boolean;
  error: string | null;
  blockedReason: string | null;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const DEFAULT_PUBLIC_ROLE: AppRole = 'recruiter';
const ROLE_STORAGE_KEY = 'terrer_public_role';
// Auth mode switch:
// - VITE_AUTH_MODE=demo  => no login required, local role switcher enabled
// - VITE_AUTH_MODE=strict => Supabase session + public.profiles enforcement
const AUTH_MODE = import.meta.env.VITE_AUTH_MODE === 'strict' ? 'strict' : 'demo';
const IS_DEMO_MODE = AUTH_MODE === 'demo';

function isAppRole(value: string | null): value is AppRole {
  return value === 'recruiter' || value === 'bd' || value === 'admin';
}

async function fetchProfile(userId: string): Promise<{ profile: ProfileRow | null; error: string | null }> {
  try {
    // Keep this projection limited to fields required by strict access checks.
    // Avoid selecting optional columns that may not exist across environments.
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,role,is_active')
      .eq('id', userId)
      .maybeSingle();

    if (error) return { profile: null, error: error.message };
    return { profile: (data as ProfileRow | null) ?? null, error: null };
  } catch (err) {
    return { profile: null, error: err instanceof Error ? err.message : 'Unable to fetch profile' };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [publicRole, setPublicRole] = useState<AppRole>(() => {
    if (typeof window === 'undefined') return DEFAULT_PUBLIC_ROLE;
    const storedRole = window.localStorage.getItem(ROLE_STORAGE_KEY);
    return isAppRole(storedRole) ? storedRole : DEFAULT_PUBLIC_ROLE;
  });

  const role = IS_DEMO_MODE ? publicRole : profile?.role ?? null;

  const setRole = (nextRole: AppRole) => {
    if (!IS_DEMO_MODE) {
      console.warn('[auth] Ignored setRole in strict mode.');
      return;
    }
    setPublicRole(nextRole);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ROLE_STORAGE_KEY, nextRole);
    }
  };

  const refreshProfile = async () => {
    const activeUser = user;
    if (!activeUser) {
      setProfile(null);
      setBlockedReason(null);
      return;
    }

    setProfileLoading(true);
    setError(null);
    setBlockedReason(null);

    if (!IS_DEMO_MODE) {
      console.info('[auth] Strict profile refresh start', {
        userId: activeUser.id,
        email: activeUser.email ?? null,
      });
    }

    const { profile: nextProfile, error: profileError } = await fetchProfile(activeUser.id);

    if (profileError) {
      if (!IS_DEMO_MODE) {
        console.error('[auth] Profile fetch failed in strict mode', {
          userId: activeUser.id,
          email: activeUser.email ?? null,
          message: profileError,
        });
      }
      setProfile(null);
      setBlockedReason('Your account profile could not be loaded. Please contact an administrator.');
      setError(profileError);
      setProfileLoading(false);
      return;
    }

    if (!nextProfile) {
      if (!IS_DEMO_MODE) {
        console.warn('[auth] Missing profile row in strict mode', {
          userId: activeUser.id,
          email: activeUser.email ?? null,
          missingProfileRow: true,
        });
      }
      setProfile(null);
      setBlockedReason('No profile was found for your account. Please contact an administrator to enable access.');
      setProfileLoading(false);
      return;
    }

    if (!IS_DEMO_MODE) {
      console.info('[auth] Strict profile query success', {
        userId: nextProfile.id,
        email: nextProfile.email ?? null,
        role: nextProfile.role ?? null,
        is_active: nextProfile.is_active ?? null,
      });
    }

    const normalizedRole = typeof nextProfile.role === 'string' ? nextProfile.role.trim().toLowerCase() : null;
    const resolvedRole: AppRole | null =
      normalizedRole === 'admin' || normalizedRole === 'recruiter' || normalizedRole === 'bd'
        ? normalizedRole
        : null;

    if (nextProfile.is_active === false) {
      setProfile(nextProfile);
      setBlockedReason('Your account is disabled. Please contact an administrator.');
      setProfileLoading(false);
      return;
    }

    if (!resolvedRole) {
      setProfile({
        ...nextProfile,
        role: null,
      });
      setBlockedReason('Your account role is not configured. Please contact an administrator.');
      setProfileLoading(false);
      return;
    }

    setProfile({
      ...nextProfile,
      role: resolvedRole,
    });
    setBlockedReason(null);
    setProfileLoading(false);
  };

  useEffect(() => {
    if (IS_DEMO_MODE) {
      console.warn('[auth] Terrer running in DEMO auth mode.');
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      setAuthLoading(true);
      setError(null);

      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (!mounted) return;

        if (sessionError) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setBlockedReason(null);
          setError(sessionError.message);
        } else {
          setSession(data.session);
          setUser(data.session?.user ?? null);
        }
      } catch (err) {
        if (!mounted) return;
        setSession(null);
        setUser(null);
        setProfile(null);
        setBlockedReason(null);
        setError(err instanceof Error ? err.message : 'Unable to restore session');
      } finally {
        if (!mounted) return;
        setAuthLoading(false);
      }
    }

    void bootstrap();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setProfile(null);
      setBlockedReason(null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProfile(null);
      setBlockedReason(null);
      return;
    }
    void refreshProfile();
  }, [authLoading, user?.id]);

  useEffect(() => {
    if (IS_DEMO_MODE || authLoading) return;
    console.info('[auth] Strict access state', {
      accessCandidate: {
        hasSession: Boolean(session),
        hasUser: Boolean(user),
        profileLoading,
        hasProfile: Boolean(profile),
        blockedReason: blockedReason ?? null,
      },
    });
  }, [authLoading, blockedReason, profile, profileLoading, session, user]);

  const access: AccessState = useMemo(() => {
    if (authLoading) return 'loading';
    if (IS_DEMO_MODE) return 'authenticated';
    if (!session || !user) return 'unauthenticated';
    if (profileLoading) return 'loading';
    if (!profile && !blockedReason) return 'loading';
    if (blockedReason) return 'blocked';
    if (!profile) return 'blocked';
    return 'authenticated';
  }, [authLoading, blockedReason, profile, profileLoading, session, user]);

  const signInWithPassword = async (email: string, password: string) => {
    setError(null);
    setBlockedReason(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password;

    if (!trimmedEmail || !trimmedPassword) {
      return { error: 'Email and password are required.' };
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: trimmedPassword,
    });

    return { error: signInError ? signInError.message : null };
  };

  const signOut = async () => {
    setError(null);
    setBlockedReason(null);
    setProfile(null);
    setSession(null);
    setUser(null);
    await supabase.auth.signOut();
  };

  const value: AuthContextValue = {
    authMode: AUTH_MODE,
    isDemoMode: IS_DEMO_MODE,
    access,
    session,
    user,
    profile,
    role,
    setRole,
    authLoading,
    profileLoading,
    error,
    blockedReason,
    signInWithPassword,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
