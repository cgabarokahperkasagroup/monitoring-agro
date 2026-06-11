-- =====================================================================
-- Monitoring Agro — 002 Hirarki Organisasi (Master Data Lokasi)
-- organizations (grup) -> estates (kebun/PT) -> divisions -> blocks -> tph
-- Kolom organization_id / estate_id DIDENORMALISASI ke tabel turunan
-- untuk mempermudah RLS & PowerSync sync rules (partisi per estate).
-- =====================================================================
set search_path = agro, public;

-- Grup / holding -----------------------------------------------------
create table if not exists organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Kebun / Estate / PT ------------------------------------------------
create table if not exists estates (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete restrict,
  name            text not null,
  code            text,
  location        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, code)
);
create index if not exists idx_estates_org on estates(organization_id);

-- Divisi -------------------------------------------------------------
create table if not exists divisions (
  id              uuid primary key default gen_random_uuid(),
  estate_id       uuid not null references estates(id) on delete restrict,
  organization_id uuid not null references organizations(id) on delete restrict,
  name            text not null,
  code            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (estate_id, code)
);
create index if not exists idx_divisions_estate on divisions(estate_id);
create index if not exists idx_divisions_org on divisions(organization_id);

-- Blok ---------------------------------------------------------------
create table if not exists blocks (
  id              uuid primary key default gen_random_uuid(),
  division_id     uuid not null references divisions(id) on delete restrict,
  estate_id       uuid not null references estates(id) on delete restrict,
  organization_id uuid not null references organizations(id) on delete restrict,
  code            text not null,
  name            text,
  luas_ha         numeric(10,2),
  tahun_tanam     int,
  jumlah_pokok    int,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (division_id, code)
);
create index if not exists idx_blocks_division on blocks(division_id);
create index if not exists idx_blocks_estate on blocks(estate_id);

-- TPH (Tempat Pengumpulan Hasil) -------------------------------------
create table if not exists tph (
  id              uuid primary key default gen_random_uuid(),
  block_id        uuid references blocks(id) on delete set null,
  division_id     uuid not null references divisions(id) on delete restrict,
  estate_id       uuid not null references estates(id) on delete restrict,
  organization_id uuid not null references organizations(id) on delete restrict,
  code            text not null,
  name            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_tph_division on tph(division_id);
create index if not exists idx_tph_block on tph(block_id);

-- Trigger updated_at -------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['organizations','estates','divisions','blocks','tph']
  loop
    execute format('drop trigger if exists trg_%1$s_updated on %1$s;', t);
    execute format(
      'create trigger trg_%1$s_updated before update on %1$s
       for each row execute function agro.set_updated_at();', t);
  end loop;
end $$;
