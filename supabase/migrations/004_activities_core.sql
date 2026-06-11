-- =====================================================================
-- Monitoring Agro — 004 Activities (inti pencatatan kegiatan)
-- activities      : tabel induk semua kegiatan lapangan
-- attendance_lines: kehadiran + output per karyawan dalam 1 kegiatan
-- attachments     : foto bukti (opsional)
-- audit_logs      : jejak audit aksi sensitif
--
-- Catatan offline-first / PowerSync:
--  * PK 'id' uuid bisa di-generate di klien (offline) -> tanpa round-trip.
--  * 'client_uuid' menjamin idempotensi saat retry sinkron.
--  * 'updated_at' dipakai PowerSync untuk konflik (last-write-wins per row).
--  * 'deleted_at' = soft delete (lebih aman untuk sinkronisasi).
-- =====================================================================
set search_path = agro, public;

create table if not exists agro.activities (
  id              uuid primary key default gen_random_uuid(),
  activity_type   activity_type not null,
  activity_date   date not null,

  -- lokasi (denormalisasi untuk RLS & sync rules)
  organization_id uuid not null references organizations(id) on delete restrict,
  estate_id       uuid not null references estates(id) on delete restrict,
  division_id     uuid not null references divisions(id) on delete restrict,
  block_id        uuid references blocks(id) on delete set null,
  tph_id          uuid references tph(id) on delete set null,

  -- status & verifikasi
  status          activity_status not null default 'draft',
  created_by      uuid not null references profiles(id) on delete restrict,
  verified_by     uuid references profiles(id) on delete set null,
  verified_at     timestamptz,

  -- meta lapangan
  gps_lat         numeric(9,6),
  gps_lng         numeric(9,6),
  notes           text,

  -- meta sinkronisasi
  client_uuid     text unique,        -- idempotensi (di-set klien)
  source_device   text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index if not exists idx_activities_division on activities(division_id);
create index if not exists idx_activities_estate on activities(estate_id);
create index if not exists idx_activities_date on activities(activity_date);
create index if not exists idx_activities_type on activities(activity_type);
create index if not exists idx_activities_status on activities(status);
create index if not exists idx_activities_created_by on activities(created_by);

-- Kehadiran + output per karyawan ------------------------------------
-- output_qty: serbaguna per jenis kegiatan (mis. janjang utk panen,
--             pokok utk prunning/pemupukan). Satuan disimpan di output_unit.
create table if not exists attendance_lines (
  id            uuid primary key default gen_random_uuid(),
  activity_id   uuid not null references activities(id) on delete cascade,
  employee_id   uuid not null references employees(id) on delete restrict,
  present       boolean not null default true,
  hk            numeric(5,2) default 1,    -- hari kerja
  output_qty    numeric(12,2),
  output_unit   text,                      -- 'janjang','pokok','kg', dst
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (activity_id, employee_id)
);
create index if not exists idx_attendance_activity on attendance_lines(activity_id);
create index if not exists idx_attendance_employee on attendance_lines(employee_id);

-- Foto bukti (opsional) ----------------------------------------------
create table if not exists attachments (
  id            uuid primary key default gen_random_uuid(),
  activity_id   uuid not null references activities(id) on delete cascade,
  storage_path  text not null,             -- path di Supabase Storage
  kind          text default 'photo',
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists idx_attachments_activity on attachments(activity_id);

-- Audit log ----------------------------------------------------------
create table if not exists audit_logs (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid references profiles(id) on delete set null,
  action        text not null,             -- 'create','update','approve','reject','delete'
  entity_table  text not null,
  entity_id     uuid,
  before        jsonb,
  after         jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists idx_audit_entity on audit_logs(entity_table, entity_id);
create index if not exists idx_audit_actor on audit_logs(actor_id);

-- Trigger updated_at -------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['activities','attendance_lines']
  loop
    execute format('drop trigger if exists trg_%1$s_updated on agro.%1$s;', t);
    execute format(
      'create trigger trg_%1$s_updated before update on agro.%1$s
       for each row execute function agro.set_updated_at();', t);
  end loop;
end $$;
