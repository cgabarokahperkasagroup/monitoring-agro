# Web Dashboard (Vite + React) — Monitoring Agro

Dashboard admin **online** (manajer kebun & admin grup). Membaca data lewat
Supabase (schema `agro`); RLS membatasi sesuai role & cakupan user.

## Cara menjalankan
```bash
cd apps/web
cp .env.example .env     # Supabase URL + anon key (publik)
npm install
npm run dev              # http://localhost:5173
```
Build produksi: `npm run build` lalu `npm run preview`.

> Login pakai user uji, mis. `manager1@barokah.test` / `admin1@barokah.test`
> (password lihat `supabase/seed/101_provision_test_users.sql`).
> Mandor mencatat lewat aplikasi mobile, bukan di sini.

## Struktur
```
src/
  main.tsx              QueryClient + Router + AuthProvider
  App.tsx               rute + gerbang Protected
  index.css             design system (putih/clean)
  lib/
    supabaseClient.ts   client Supabase (schema agro)
    auth.tsx            AuthProvider/useAuth + profil(role)
    queries.ts          hooks React Query (master, kegiatan, rekonsiliasi, pengguna)
    format.ts           format angka/tanggal (id-ID)
  components/
    Layout.tsx          sidebar + topbar
    ui.tsx              Card, Kpi, Badge, QueryState, Field, Spinner
  pages/
    Login.tsx
    Ringkasan.tsx       KPI produksi & pengiriman + kegiatan terbaru
    Kegiatan.tsx        tabel kegiatan + filter (jenis/estate/divisi/tanggal)
    Rekonsiliasi.tsx    pengiriman vs tonase final PKS (catat + status cocok/selisih)
    Master.tsx          estate, divisi, blok, karyawan (read-only)
    Pengguna.tsx        profil + role + cakupan akses (read-only)
```

## Catatan
- **Baca via `supabase.from(...)`** (otomatis schema `agro`). Relasi di-embed
  PostgREST (mis. `activities → harvest_records/delivery_records/divisions`).
- **Rekonsiliasi** menulis ke `delivery_reconciliation` (upsert per `delivery_id`);
  variance < 2% → `matched`, selebihnya `discrepancy`.
- Pengelolaan role/scope & master data CRUD penuh menyusul (butuh hak admin);
  scaffold ini fokus pemantauan + rekonsiliasi sesuai MVP.
