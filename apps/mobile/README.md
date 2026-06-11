# Integrasi PowerSync — Mobile (React Native / Expo)

File di folder ini siap dipakai di project Expo:
- `AppSchema.ts` — schema lokal SQLite (cocok dengan Sync Streams `agro`).
- `SupabaseConnector.ts` — auth + upload perubahan ke Supabase (schema agro).
- `system.ts` — inisialisasi `db` PowerSync + `setupPowerSync()`.
- `../supabaseClient.ts` — client Supabase (schema agro).
- `../.env.example` — berisi Supabase URL/anon key + `EXPO_PUBLIC_POWERSYNC_URL`.

## 1. Install dependensi
```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage \
  react-native-url-polyfill uuid

# PowerSync core + driver SQLite
npx expo install @powersync/react-native @journeyapps/react-native-quick-sqlite
```
> PowerSync RN butuh beberapa **polyfill** (fetch/streams/encoding). Daftar pasti & urutannya ikuti panduan resmi: https://docs.powersync.com/client-sdk-references/react-native-and-expo . Project ini juga butuh **dev build** Expo (bukan Expo Go), karena ada native module SQLite.

## 2. Konfigurasi WAJIB di PowerSync Dashboard — Client Auth
Token yang dikirim app adalah JWT Supabase. PowerSync harus bisa memvalidasinya,
kalau tidak semua koneksi ditolak (401).

Supabase kini memakai **asymmetric JWT signing keys (JWKS)** — PowerSync sudah
**menghapus** dukungan legacy "JWT Secret" (HS256). Jadi:

Di dashboard PowerSync → **Client Auth**:
- Pilih **Supabase Auth**. Karena database CGA di-host Supabase, PowerSync
  biasanya **auto-detect** dan mengisi sendiri JWKS URI
  (`https://mgxdvnnvruoyhnzgrtur.supabase.co/auth/v1/.well-known/jwks.json`)
  + audience `authenticated`. Tidak perlu memilih key manual.
- Jika harus isi JWKS manual: pakai URL di atas dan **set audience = `authenticated`**
  (kalau audience kosong, validasi gagal).
- JWKS sudah mencakup **Current + Standby + Previously-used** key, jadi rotasi
  key tidak memutus auth. (Token aktif ditandatangani oleh **Current key**;
  jangan andalkan Standby saja.)

## 3. Alur pakai di app
```ts
// setelah login berhasil:
import { setupPowerSync } from './powersync/system';
await setupPowerSync();   // mulai sinkron

// baca data (selalu dari DB lokal -> jalan walau offline):
import { db } from './powersync/system';
const list = await db.getAll('SELECT * FROM activities ORDER BY activity_date DESC');

// tulis data (offline-aman): tulis lokal, PowerSync upload saat online.
// gunakan uuid() untuk id & client_uuid.

// saat logout:
import { disconnectPowerSync } from './powersync/system';
await disconnectPowerSync();
```

## 4. Penting diingat
- **Baca lewat `db` PowerSync (SQLite lokal)**, bukan `supabase.from()`, agar
  tetap jalan offline. `supabase` hanya untuk **auth** & dipakai connector untuk **upload**.
- Tulis selalu sertakan kolom wajib (`organization_id`, `estate_id`,
  `division_id`, `created_by`, `client_uuid`) agar lolos RLS saat di-upload.
- Hanya data divisi yang boleh diakses user yang tersinkron (sesuai Sync Streams).
- Data yang ditolak RLS saat upload akan dibuang dari antrian (lihat log) —
  pastikan field benar agar tidak hilang diam-diam.
```
