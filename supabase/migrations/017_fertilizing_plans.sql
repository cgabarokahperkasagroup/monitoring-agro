-- =====================================================================
-- Monitoring Agro — 017 Rencana Pemupukan (fertilizing_plans)
-- =====================================================================
-- Menyimpan RENCANA pemupukan per divisi/material/bulan, untuk dibandingkan
-- dengan REALISASI (agro.fertilizing_records). Dikelola dari dashboard web
-- (admin grup / manajer kebun); TIDAK disinkron ke mobile (bukan data lapangan).
--
-- Idempoten / aman diulang.
-- =====================================================================
set search_path = agro, public;

create table if not exists agro.fertilizing_plans (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references agro.organizations(id) on delete cascade,
  estate_id        uuid not null references agro.estates(id)        on delete cascade,
  division_id      uuid not null references agro.divisions(id)      on delete cascade,
  material_id      uuid not null references agro.materials(id)      on delete cascade,
  period           date not null,                  -- bulan rencana (YYYY-MM-01)
  planned_kg       numeric(12,2) not null default 0,
  note             text,
  created_by       uuid references agro.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (division_id, material_id, period)
);

create index if not exists idx_fplans_division on agro.fertilizing_plans(division_id);
create index if not exists idx_fplans_period   on agro.fertilizing_plans(period);

-- Stempel updated_at (fungsi util sama seperti tabel lain).
drop trigger if exists trg_fertilizing_plans_updated on agro.fertilizing_plans;
create trigger trg_fertilizing_plans_updated
  before update on agro.fertilizing_plans
  for each row execute function agro.set_updated_at();

-- RLS: baca sesuai akses divisi; tulis admin grup / manajer kebun di estate-nya
-- (pola sama seperti blocks/tph/employees di migration 008).
alter table agro.fertilizing_plans enable row level security;

drop policy if exists fplan_select on agro.fertilizing_plans;
create policy fplan_select on agro.fertilizing_plans for select to authenticated
  using (agro.has_division_access(division_id));

drop policy if exists fplan_write on agro.fertilizing_plans;
create policy fplan_write on agro.fertilizing_plans for all to authenticated
  using (agro.is_admin() or (agro.my_role() = 'manager_kebun' and agro.has_estate_access(estate_id)))
  with check (agro.is_admin() or (agro.my_role() = 'manager_kebun' and agro.has_estate_access(estate_id)));
