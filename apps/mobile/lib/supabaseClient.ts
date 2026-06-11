// =====================================================================
// Monitoring Agro — Supabase client untuk MOBILE (React Native / Expo)
// Semua query default ke schema "agro".
// Taruh file ini di: lib/supabaseClient.ts
//
// Dependensi:
//   npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
// =====================================================================
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY belum di-set (.env)');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'agro' },          // <-- penting: default schema = agro
  auth: {
    storage: AsyncStorage,         // simpan sesi di device
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,     // wajib false di React Native
  },
});

// Catatan offline-first:
//  - Client ini dipakai untuk AUTH dan untuk UPLOAD perubahan (PowerSync
//    mengirim balik perubahan lokal via Supabase client -> kena RLS agro).
//  - BACA data lapangan sebaiknya lewat database lokal PowerSync (SQLite),
//    bukan langsung supabase.from(...), agar tetap jalan saat offline.
