// =====================================================================
// Monitoring Agro — Supabase client untuk WEB (React + Vite)
// Semua query default ke schema "agro".
// Taruh file ini di: src/lib/supabaseClient.ts
// =====================================================================
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum di-set (.env)');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'agro' },          // <-- penting: default schema = agro
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Contoh pemakaian:
//   const { data, error } = await supabase
//     .from('activities')               // otomatis agro.activities
//     .select('*')
//     .order('activity_date', { ascending: false });
//
// Catatan: auth tetap memakai schema 'auth' bawaan Supabase secara otomatis,
// jadi supabase.auth.signInWithPassword(...) tetap berfungsi normal.
