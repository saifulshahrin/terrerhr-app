import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type AppRole = 'recruiter' | 'bd' | 'admin';

export interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole | null;
  is_active: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

type AccessState = 'loading' | 'unauthenticated' | 'blocked' | 'authenticated';

interface AuthContextValue {
  access: AccessState;
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  role: AppRole | null;
  authLoading: boolean;
  profileLoading: boolean;
  error: string | null;
  blockedReason: string | null;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<{ profile: ProfileRow | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,role,is_active,created_at,updated_at')
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

  const role = profile?.role ?? null;

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

    const { profile: nextProfile, error: profileError } = await fetchProfile(activeUser.id);

    if (profileError) {
      setProfile(null);
      setBlockedReason('Your account profile could not be loaded. Please contact an administrator.');
      setError(profileError);
      setProfileLoading(false);
      return;
    }

    if (!nextProfile) {
      setProfile(null);
      setBlockedReason('No profile was found for your account. Please contact an administrator to enable access.');
      setProfileLoading(false);
      return;
    }

    if (nextProfile.is_active === false) {
      setProfile(nextProfile);
      setBlockedReason('Your account is disabled. Please contact an administrator.');
      setProfileLoading(false);
      return;
    }

    if (!nextProfile.role || (nextProfile.role !== 'admin' && nextProfile.role !== 'recruiter' && nextProfile.role !== 'bd')) {
      setProfile(nextProfile);
      setBlockedReason('Your account role is not configured. Please contact an administrator.');
      setProfileLoading(false);
      return;
    }

    setProfile(nextProfile);
    setBlockedReason(null);
    setProfileLoading(false);
  };

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

  const access: AccessState = useMemo(() => {
    if (authLoading) return 'loading';
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
    access,
    session,
    user,
    profile,
    role,
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
