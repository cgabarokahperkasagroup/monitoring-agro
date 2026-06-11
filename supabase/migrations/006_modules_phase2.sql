-- =====================================================================
-- Monitoring Agro — 006 Modul Fase 2: PRUNNING, PEMUPUKAN, PEMELIHARAAN
-- Disertakan sekarang agar skema lengkap & stabil, tapi modul ini
-- diaktifkan di Fase 2 (UI menyusul). Boleh ditunda penerapannya.
-- =====================================================================
set search_path = agro, public;

-- Master jenis bahan (pupuk / herbisida) -----------------------------
create table if not exists materials (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete restrict,
  name            text not null,
  category        text,                     -- 'pupuk' / 'herbisida' / dst
  unit            text default 'kg',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_materials_org on materials(organization_id);

-- PRUNNING (Tunas) ---------------------------------------------------
create table if not exists pruning_records (
  id              uuid primary key default gen_random_uuid(),
  activity_id     uuid not null unique references activities(id) on delete cascade,
  total_pokok     int,
  pelepah_dibuang int,
  quality         text,                     -- catatan kualitas (songgo dll)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- PEMUPUKAN ----------------------------------------------------------
create table if not exists fertilizing_records (
  id              uuid primary key default gen_random_uuid(),
  activity_id     uuid not null unique references activities(id) on delete cascade,
  material_id     uuid references materials(id) on delete set null,
  dosis_per_pokok numeric(10,3),            -- mis. kg/pokok
  total_pokok     int,
  total_kg        numeric(12,2),
  method          text,                     -- 'manual' / 'mekanis'
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- PEMELIHARAAN -------------------------------------------------------
create table if not exists maintenance_records (
  id                uuid primary key default gen_random_uuid(),
  activity_id       uuid not null unique references activities(id) on delete cascade,
  maintenance_type  text,                   -- semprot / piringan / jalan / dst
  area_ha           numeric(10,2),
  total_pokok       int,
  material_id       uuid references materials(id) on delete set null,
  material_qty      numeric(12,2),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Trigger updated_at -------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['materials','pruning_records','fertilizing_records','maintenance_records']
  loop
    execute format('drop trigger if exists trg_%1$s_updated on agro.%1$s;', t);
    execute format(
      'create trigger trg_%1$s_updated before update on agro.%1$s
       for each row execute function agro.set_updated_at();', t);
  end loop;
end $$;
