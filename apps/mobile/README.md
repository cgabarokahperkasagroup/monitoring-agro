# App Mobile (Expo) — Monitoring Agro

App Expo (React Native + TypeScript) **sudah di-scaffold** di folder ini.
Alur Fase 1: **login → daftar kegiatan → input Panen → Pengiriman**, offline-first
lewat PowerSync (baca/tulis ke SQLite lokal, sinkron otomatis saat online).

## Cara menjalankan (cepat)
```bash
cd apps/mobile
cp .env.example .env          # kredensial Supabase + PowerSync (anon key publik)
npm install                   # atau: npx expo install --fix untuk samakan versi SDK
npx expo prebuild             # butuh dev build (ada native module SQLite — bukan Expo Go)
npm run android               # atau: npm run ios
```
> Login pakai user uji, mis. `mandor1@barokah.test` (password lihat seed
> `supabase/seed/101_provision_test_users.sql`).

## Struktur
```
app/
  _layout.tsx           providers (Auth + PowerSync) + gerbang redirect
  index.tsx             splash saat memulihkan sesi
  login.tsx             login Supabase (email/password)
  (app)/
    _layout.tsx         stack terproteksi
    index.tsx           Daftar Kegiatan + status sinkron + aksi cepat
    panen.tsx           form Input Panen (+ kehadiran/output per karyawan)
    pengiriman.tsx      form Pengiriman TBS ke PKS
lib/
  auth/AuthProvider.tsx siklus hidup auth + setup/clear PowerSync
  db/hooks.ts           query reaktif (useQuery) dari DB lokal
  db/write.ts           tulis Panen/Pengiriman dalam satu transaksi lokal
  polyfills.ts          polyfill wajib PowerSync (dimuat di index.js)
  ui.tsx, theme.ts, FormScaffold.tsx, SyncBanner.tsx   komponen & desain
  powersync/, supabaseClient.ts                        wiring (lihat di bawah)
```
> **Catat:** versi di `package.json` dipatok ke **Expo SDK 52** (set stabil &
> kompatibel PowerSync). Untuk naik SDK: `npx expo install expo@latest` lalu
> `npx expo install --fix`.

## Foto bukti (attachments) — offline-aman
Foto opsional pada form Panen/Pengiriman (`lib/PhotoField.tsx`, kamera/galeri).
Alur saat simpan kegiatan:
1. Foto dikompres (resize 1280px, JPEG ~0.6) & disalin ke `documentDirectory`
   (`lib/photos/storage.ts`).
2. Dalam satu transaksi lokal: insert baris `attachments` (disinkron, berisi
   `storage_path`) **+** baris `pending_uploads` (tabel **local-only**, antrian biner).
3. `lib/photos/uploader.ts` meng-upload file ke Supabase Storage bucket
   `attachments` saat online (dipicu `useAttachmentSync` di `(app)/_layout`
   ketika konek, dan setelah simpan). Sukses → baris antrian & file lokal dihapus.

Konvensi path objek (cocok dengan policy migration **016**):
`{division_id}/{activity_id}/{photoId}.jpg` — akses Storage dibatasi per divisi.
Deps: `expo-image-picker`, `expo-image-manipulator`, `expo-file-system`,
`base64-arraybuffer`. Izin kamera/galeri dikonfigurasi di `app.json` (plugin).

---

## Wiring PowerSync ↔ Supabase (referensi)
- `AppSchema.ts` — schema lokal SQLite (cocok dengan Sync Streams `agro`).
- `SupabaseConnector.ts` — auth + upload perubahan ke Supabase (schema agro).
- `system.ts` — inisialisasi `db` PowerSync + `setupPowerSync()` / `clearPowerSync()`.
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
