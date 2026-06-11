-- =====================================================================
-- Monitoring Agro — 018 Laporan terjadwal otomatis
-- =====================================================================
-- Snapshot laporan agregat dibuat berkala oleh pg_cron (tanpa layanan luar /
-- secret). Hasil disimpan di agro.report_runs (JSON) lalu diunduh dari
-- dashboard sebagai CSV. Admin mengelola jadwal di agro.report_schedules.
-- Idempoten / aman diulang.
-- =====================================================================
set search_path = agro, public;

create table if not exists agro.report_schedules (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  report_type   text not null,                 -- 'produksi_divisi' | 'produksi_harian'
  estate_id     uuid references agro.estates(id)   on delete cascade,
  division_id   uuid references agro.divisions(id) on delete cascade,
  frequency     text not null default 'weekly', -- 'daily' | 'weekly' | 'monthly'
  enabled       boolean not null default true,
  last_run_at   timestamptz,
  created_by    uuid references agro.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists agro.report_runs (
  id            uuid primary key default gen_random_uuid(),
  schedule_id   uuid references agro.report_schedules(id) on delete set null,
  report_type   text not null,
  estate_id     uuid,
  division_id   uuid,
  period_from   date not null,
  period_to     date not null,
  summary       jsonb not null default '[]',
  row_count     int not null default 0,
  generated_at  timestamptz not null default now()
);
create index if not exists idx_report_runs_generated on agro.report_runs(generated_at desc);

drop trigger if exists trg_report_schedules_updated on agro.report_schedules;
create trigger trg_report_schedules_updated
  before update on agro.report_schedules
  for each row execute function agro.set_updated_at();

-- ---- Fungsi: hasilkan 1 laporan (dipakai cron & tombol "Jalankan sekarang") ----
create or replace function agro.generate_report(
  p_type text, p_estate uuid, p_division uuid, p_from date, p_to date, p_schedule uuid default null
) returns uuid
language plpgsql security definer set search_path = agro, public
as $$
declare
  v_summary jsonb := '[]'::jsonb;
  v_count int := 0;
  v_id uuid;
begin
  -- cron: auth.uid() null -> izinkan. Via PostgREST: hanya admin.
  if auth.uid() is not null and not agro.is_admin() then
    raise exception 'Hanya admin yang dapat membuat laporan';
  end if;

  if p_type = 'produksi_divisi' then
    select coalesce(jsonb_agg(jsonb_build_object(
             'divisi', d.name, 'janjang', x.janjang, 'tonase_kg', round(x.tonase, 2)
           ) order by x.janjang desc), '[]'::jsonb), count(*)
      into v_summary, v_count
    from (
      select a.division_id,
             sum(h.total_janjang)::numeric as janjang,
             coalesce(sum(h.est_tonase), 0)::numeric as tonase
      from agro.activities a
      join agro.harvest_records h on h.activity_id = a.id
      where a.activity_type = 'panen' and a.deleted_at is null
        and a.activity_date between p_from and p_to
        and (p_estate is null or a.estate_id = p_estate)
        and (p_division is null or a.division_id = p_division)
      group by a.division_id
    ) x
    join agro.divisions d on d.id = x.division_id;

  elsif p_type = 'produksi_harian' then
    select coalesce(jsonb_agg(jsonb_build_object(
             'tanggal', x.activity_date, 'janjang', x.janjang
           ) order by x.activity_date), '[]'::jsonb), count(*)
      into v_summary, v_count
    from (
      select a.activity_date, sum(h.total_janjang)::numeric as janjang
      from agro.activities a
      join agro.harvest_records h on h.activity_id = a.id
      where a.activity_type = 'panen' and a.deleted_at is null
        and a.activity_date between p_from and p_to
        and (p_estate is null or a.estate_id = p_estate)
        and (p_division is null or a.division_id = p_division)
      group by a.activity_date
    ) x;

  else
    raise exception 'Jenis laporan tidak dikenal: %', p_type;
  end if;

  insert into agro.report_runs(
    schedule_id, report_type, estate_id, division_id, period_from, period_to, summary, row_count)
  values (p_schedule, p_type, p_estate, p_division, p_from, p_to, v_summary, v_count)
  returning id into v_id;
  return v_id;
end;
$$;

-- ---- Fungsi: jalankan semua jadwal aktif (dipanggil pg_cron) ----
create or replace function agro.run_scheduled_reports() returns int
language plpgsql security definer set search_path = agro, public
as $$
declare
  s record;
  v_from date;
  v_to date;
  v_n int := 0;
begin
  if auth.uid() is not null and not agro.is_admin() then
    raise exception 'Hanya admin';
  end if;

  for s in select * from agro.report_schedules where enabled loop
    if s.frequency = 'daily' then
      v_from := current_date - 1;
      v_to := current_date - 1;
    elsif s.frequency = 'monthly' then
      v_from := date_trunc('month', current_date - interval '1 month')::date;
      v_to := (date_trunc('month', current_date)::date - 1);
    else -- weekly (default)
      v_from := current_date - 7;
      v_to := current_date - 1;
    end if;

    perform agro.generate_report(s.report_type, s.estate_id, s.division_id, v_from, v_to, s.id);
    update agro.report_schedules set last_run_at = now() where id = s.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

grant execute on function agro.generate_report(text, uuid, uuid, date, date, uuid) to authenticated;
grant execute on function agro.run_scheduled_reports() to authenticated;

-- ---- RLS: kelola/lihat hanya admin (tulis report_runs hanya via fungsi definer) ----
alter table agro.report_schedules enable row level security;
alter table agro.report_runs enable row level security;

drop policy if exists rsched_select on agro.report_schedules;
create policy rsched_select on agro.report_schedules for select to authenticated using (agro.is_admin());
drop policy if exists rsched_write on agro.report_schedules;
create policy rsched_write on agro.report_schedules for all to authenticated
  using (agro.is_admin()) with check (agro.is_admin());

drop policy if exists rruns_select on agro.report_runs;
create policy rruns_select on agro.report_runs for select to authenticated using (agro.is_admin());

-- ---- Penjadwalan otomatis (pg_cron) ----
-- Jalan tiap hari 01:05 (UTC); hanya memproses jadwal yang enabled.
create extension if not exists pg_cron;
do $$ begin perform cron.unschedule('agro-scheduled-reports'); exception when others then null; end $$;
select cron.schedule('agro-scheduled-reports', '5 1 * * *', $cron$select agro.run_scheduled_reports();$cron$);
