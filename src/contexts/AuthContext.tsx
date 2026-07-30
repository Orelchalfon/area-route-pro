import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'employee';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  technicianId: string | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // Whether the initial session lookup has finished. Distinguishes "not known yet"
  // from "known to be signed out" — without it the guards would bounce to /login.
  const [sessionResolved, setSessionResolved] = useState(false);
  const [role, setRole] = useState<AppRole | null>(null);
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  // The user id whose profile is currently loaded. Used to ignore background token
  // refreshes (which fire on tab/window focus): those keep the same user, so we must
  // NOT reload the profile or flip `loading` — otherwise RequireAuth briefly swaps to
  // its spinner and remounts the whole app, wiping page state.
  const [loadedProfileUserId, setLoadedProfileUserId] = useState<string | null>(null);

  const userId = session?.user?.id ?? null;

  // The auth listener must stay SYNCHRONOUS. supabase-js holds an internal auth lock
  // while it dispatches these callbacks, so awaiting any Supabase call from inside one
  // deadlocks: the query waits for the lock the callback still holds. That is exactly
  // what left the app stuck on the spinner right after sign-in (a reload "fixed" it
  // because getSession() then resolved outside the lock). Profile loading therefore
  // lives in its own effect below, keyed on the user id.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSessionResolved(true);
    });

    // Covers the case where no auth event fires (e.g. no stored session at all).
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionResolved(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load the caller's profile (role + technician) whenever the signed-in user changes.
  useEffect(() => {
    if (!sessionResolved) return;

    if (!userId) {
      setRole(null);
      setTechnicianId(null);
      setLoadedProfileUserId(null);
      return;
    }
    // Same user as the loaded profile — a token refresh, nothing to do.
    if (loadedProfileUserId === userId) return;

    let active = true;
    void (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('role, technician_id')
        .eq('id', userId)
        .single();
      if (!active) return;
      setRole((data?.role as AppRole) ?? null);
      setTechnicianId(data?.technician_id ?? null);
      // Set even when the query failed, so `loading` can never latch on forever.
      setLoadedProfileUserId(userId);
    })();

    return () => {
      active = false;
    };
  }, [sessionResolved, userId, loadedProfileUserId]);

  // Keep the guards on their spinner until the session and (when signed in) the profile
  // have both resolved, so they never flash the wrong view.
  const loading = !sessionResolved || (userId !== null && loadedProfileUserId !== userId);

  const signIn: AuthContextType['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        role,
        technicianId,
        isAdmin: role === 'admin',
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
