# CLAUDE.md — Monitoring Agro

Konteks proyek untuk Claude Code. Baca file ini lebih dulu sebelum mengerjakan tugas.

## Ringkasan Produk
Aplikasi pencatatan kegiatan karyawan kebun sawit (prunning, panen, pemupukan, pemeliharaan, pengiriman TBS ke pabrik). **Offline-first** (lapangan minim sinyal), dengan **role-based access** multi-estate.

- **Mobile** (pencatatan lapangan): React Native + Expo + PowerSync + Supabase.
- **Web** (dashboard admin): React + Vite + Supabase.
- **Desain**: modern, clean, dominan putih.

## Keputusan Kunci (sudah final)
- Engine offline: **PowerSync + Supabase**.
- Modul MVP (Fase 1): **Panen + Pengiriman**. Fase 2: prunning, pemupukan, pemeliharaan + iOS + face recognition.
- Foto bukti: opsional. Login karyawan: tidak ada (dicatat mandor).
- Akses lintas estate: hanya manager_kebun & admin/manajemen.
- Platform: Android dulu, iOS menyusul (manajemen).
- Istilah baku: janjang, divisi, basis.
- Face recognition: Fase 2, on-device + liveness (lihat PRD §9). Patuhi UU PDP (consent).

## Status Backend (SUDAH JADI & terverifikasi)
Supabase project **CGA**, ref `mgxdvnnvruoyhnzgrtur`, region ap-southeast-1, Postgres 15.

- Semua objek di schema **`agro`** (terisolasi dari `public` aplikasi lain).
- Migration 001–015 sudah diterapkan: skema, RLS lengkap, helper functions (SECURITY DEFINER, anti-rekursi), trigger (guard role, stempel verifikasi, audit status), view pendukung sync.
- **RLS terverifikasi** end-to-end (simulasi JWT per role → scoping benar).
- Replikasi: publication **`powersync`** (hanya tabel agro).
- Role DB khusus PowerSync: `powersync_role` (REPLICATION + BYPASSRLS).
- PowerSync instance: `https://6a294c79deeddd0df603af19.powersync.journeyapps.com`
  - Sync Streams (edition 3) ter-deploy: `agro_field_data`, `agro_me`.
  - Client Auth: Supabase Auth via JWKS URI.
- **Schema agro sudah di-expose** di Supabase API (Exposed schemas).
- Seed data master + 4 user uji (mandor1/asisten1/manager1/admin1 @barokah.test) sudah ada.

### Catatan: API schema
Client Supabase HARUS pakai schema `agro`: `createClient(url, key, { db: { schema: 'agro' } })`
atau `supabase.schema('agro')`.

## Lokasi File (di repo ini)
- `supabase/migrations/001..015_*.sql` — migration (sudah diterapkan; untuk referensi/re-deploy).
- `supabase/seed/100_seed_master.sql`, `101_provision_test_users.sql` — seed & user uji.
- `supabase/powersync/sync_streams.yaml` — sync streams (terpasang di dashboard).
- `supabase/powersync/role.sql` — role DB khusus PowerSync (jalankan manual, set password).
- `supabase/README-DESAIN-DATABASE.md` — penjelasan skema, ERD, RBAC, RLS.
- `apps/web/src/lib/supabaseClient.ts` + `apps/web/.env.example` — web.
- `apps/mobile/lib/supabaseClient.ts`, `apps/mobile/lib/powersync/` (AppSchema, SupabaseConnector, system), `apps/mobile/.env.example`, `apps/mobile/README.md` — mobile.
- `docs/PRD-Monitoring-Agro.md` — PRD lengkap.

Catatan: migration 013 (role PowerSync) sengaja TIDAK di folder migrations (ada di `supabase/powersync/role.sql`) karena membuat role berpassword — jalankan manual. Itu sebabnya ada gap nomor 013.

## Langkah Berikutnya (belum dikerjakan)
1. **Scaffold app Expo** (`apps/mobile`): pasang file dari `apps/mobile/lib/`, install deps PowerSync (lihat `apps/mobile/README.md`), buat alur: login → daftar kegiatan → input Panen offline → Pengiriman.
2. **Scaffold web dashboard** (`apps/web`, React+Vite): login + tabel/dashboard data master & kegiatan, rekonsiliasi pengiriman, manajemen user/scope.
3. Wireframe/UI (clean, putih) bila perlu sebelum implementasi layar.
4. Storage bucket + policy untuk foto `attachments`.

## Aturan Kerja
- Jangan ubah schema `public` di CGA (milik aplikasi lain). Semua di `agro`.
- Selalu sertakan kolom `organization_id`, `estate_id`, `division_id`, `created_by`, `client_uuid` saat insert kegiatan (agar lolos RLS & sync).
- Baca data di mobile lewat DB lokal PowerSync (offline-aman); `supabase` hanya untuk auth & dipakai connector untuk upload.
- Jangan commit file `.env` (anon key publik tidak apa, tapi tetap rapikan). Jangan pernah taruh service_role key di app klien.
- Verifikasi perubahan DB dengan `get_advisors` setelah DDL.

## Identitas
- Supabase URL: `https://mgxdvnnvruoyhnzgrtur.supabase.co`
- Anon key: lihat `app-config/*/.env.example`.
