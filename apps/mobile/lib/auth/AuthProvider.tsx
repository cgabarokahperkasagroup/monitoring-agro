// =====================================================================
// AuthProvider — bungkus Supabase Auth + siklus hidup PowerSync.
//  - Login: simpan sesi, lalu setupPowerSync() (mulai sinkron).
//  - Logout: clearPowerSync() (hapus data lokal) + supabase.signOut().
// Sesi dipersist di AsyncStorage (lihat supabaseClient).
// =====================================================================
import type { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { clearPowerSync, setupPowerSync } from '../powersync/system';

type AuthState = {
  session: Session | null;
  user: User | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Sesi tersimpan -> langsung mulai sinkron tanpa minta login lagi.
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) {
        setupPowerSync().catch((e) => console.warn('setupPowerSync gagal:', e));
      }
      setInitializing(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) {
        setupPowerSync().catch((e) => console.warn('setupPowerSync gagal:', e));
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signOut() {
    // Hapus data lokal dulu agar tak terbawa ke user berikutnya.
    await clearPowerSync().catch((e) => console.warn('clearPowerSync gagal:', e));
    await supabase.auth.signOut();
    setSession(null);
  }

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, initializing, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>');
  return ctx;
}
