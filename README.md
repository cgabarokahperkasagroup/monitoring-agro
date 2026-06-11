# Monitoring Agro

Aplikasi pencatatan kegiatan karyawan kebun sawit — offline-first (mobile) +
dashboard admin (web), multi-estate dengan role-based access.

> Konteks lengkap untuk Claude Code ada di **CLAUDE.md** (baca itu dulu).

## Struktur
```
monitoring-agro/
├─ CLAUDE.md                      # konteks & status proyek (handoff)
├─ docs/
│  └─ PRD-Monitoring-Agro.md      # PRD lengkap
├─ supabase/
│  ├─ migrations/                 # 001–015 (SUDAH diterapkan ke project CGA)
│  ├─ seed/                       # 100 master, 101 provisioning user uji
│  ├─ powersync/
│  │  ├─ sync_streams.yaml        # Sync Streams (terpasang di dashboard)
│  │  ├─ role.sql                 # role DB khusus PowerSync (jalankan manual)
│  │  └─ _legacy/                 # format sync rules lama (arsip)
│  └─ README-DESAIN-DATABASE.md   # skema, ERD, RBAC, RLS
└─ apps/
   ├─ mobile/                     # React Native + Expo + PowerSync
   │  ├─ lib/supabaseClient.ts
   │  ├─ lib/powersync/           # AppSchema, SupabaseConnector, system
   │  ├─ .env.example
   │  └─ README.md
   └─ web/                        # React + Vite (dashboard)
      ├─ src/lib/supabaseClient.ts
      └─ .env.example
```

## Status
- **Backend SUDAH JADI** di Supabase project CGA (schema `agro`): skema, RLS
  (terverifikasi), replikasi, PowerSync Sync Streams, auth JWKS, seed + user uji.
- **Belum dikerjakan**: scaffold app Expo (mobile) & web dashboard. Lihat
  "Langkah Berikutnya" di CLAUDE.md.

## Mulai (ringkas)
1. `apps/mobile`: buat project Expo, pasang file `lib/`, install deps PowerSync
   (lihat `apps/mobile/README.md`), salin `.env.example` -> `.env`.
2. `apps/web`: buat project Vite, pasang `src/lib/supabaseClient.ts`, `.env`.
3. Migrasi & seed sudah diterapkan; file di `supabase/` untuk referensi/re-deploy.

## Catatan keamanan
- Semua objek DB di schema `agro` (jangan sentuh `public` milik aplikasi lain).
- Jangan commit `.env`. Jangan taruh service_role key di app klien.
