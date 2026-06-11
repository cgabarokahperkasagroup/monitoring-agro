-- =====================================================================
-- Monitoring Agro — 005 Modul MVP (Fase 1): PANEN & PENGIRIMAN
-- Tiap tabel 1:1 dengan activities (detail spesifik per jenis kegiatan).
-- Output per karyawan (janjang) dicatat di attendance_lines.
-- Tabel ini menyimpan agregat blok + data mutu/logistik.
-- =====================================================================
set search_path = agro, public;

-- PANEN --------------------------------------------------------------
create table if not exists harvest_records (
  id              uuid primary key default gen_random_uuid(),
  activity_id     uuid not null unique references activities(id) on delete cascade,
  total_janjang   int,                      -- total janjang (TBS) di kegiatan ini
  est_tonase      numeric(12,2),            -- estimasi tonase
  brondolan_kg    numeric(12,2),
  buah_mentah     int,                      -- mutu: jumlah TBS mentah
  buah_busuk      int,                      -- mutu: jumlah TBS busuk
  basis           numeric(10,2),            -- basis (target) per HK
  premi           numeric(14,2),            -- premi (opsional)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- PENGIRIMAN (TBS ke PKS) --------------------------------------------
create table if not exists delivery_records (
  id                uuid primary key default gen_random_uuid(),
  activity_id       uuid not null unique references activities(id) on delete cascade,
  spb_number        text,                   -- nomor SPB / surat jalan
  vehicle_plate     text,
  driver_name       text,
  origin_tph_id     uuid references tph(id) on delete set null,
  destination_pks   text,                   -- nama/kode PKS tujuan
  total_janjang     int,
  est_tonase_muat   numeric(12,2),          -- estimasi tonase saat muat
  depart_time       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_delivery_spb on delivery_records(spb_number);

-- REKONSILIASI PENGIRIMAN -------------------------------------------
-- Diisi belakangan (kantor) saat tonase final dari timbangan PKS tersedia.
create table if not exists delivery_reconciliation (
  id                  uuid primary key default gen_random_uuid(),
  delivery_id         uuid not null unique references delivery_records(id) on delete cascade,
  net_tonase_pks      numeric(12,2),        -- tonase final timbangan pabrik
  received_time       timestamptz,
  variance_pct        numeric(6,2),         -- selisih estimasi vs final (%)
  status              text default 'pending', -- pending / matched / discrepancy
  note                text,
  reconciled_by       uuid references profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Trigger updated_at -------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['harvest_records','delivery_records','delivery_reconciliation']
  loop
    execute format('drop trigger if exists trg_%1$s_updated on agro.%1$s;', t);
    execute format(
      'create trigger trg_%1$s_updated before update on agro.%1$s
       for each row execute function agro.set_updated_at();', t);
  end loop;
end $$;
