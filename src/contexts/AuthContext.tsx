import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
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
  const [role, setRole] = useState<AppRole | null>(null);
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // The user id whose profile is currently loaded. Used to ignore background
  // token refreshes (which fire on tab/window focus): those keep the same user,
  // so we must NOT flip `loading` or reload the profile — otherwise RequireAuth
  // briefly swaps to its spinner and remounts the whole app, wiping page state.
  const loadedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    // Load the caller's profile (role + technician). Keeps `loading` true until
    // both the session and (when logged in) the profile have resolved, so route
    // guards never flash the wrong view.
    const loadProfile = async (nextSession: Session | null) => {
      if (!nextSession?.user) {
        if (!active) return;
        setRole(null);
        setTechnicianId(null);
        loadedUserIdRef.current = null;
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('role, technician_id')
        .eq('id', nextSession.user.id)
        .single();
      if (!active) return;
      setRole((data?.role as AppRole) ?? null);
      setTechnicianId(data?.technician_id ?? null);
      loadedUserIdRef.current = nextSession.user.id;
      setLoading(false);
    };

    // Subscribe first so we don't miss auth events that fire during init.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Always keep the session fresh (a re-render is fine — it does not remount).
      setSession(nextSession);
      // Only (re)load the profile + show the loading gate when the *user* actually
      // changes (sign in / out / different user). Same-user token refreshes on tab
      // focus become no-ops for the React tree, so page state survives.
      const nextUserId = nextSession?.user?.id ?? null;
      if (nextUserId !== loadedUserIdRef.current) {
        setLoading(true);
        void loadProfile(nextSession);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      void loadProfile(data.session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

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
