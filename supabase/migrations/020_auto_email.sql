-- =====================================================================
-- Monitoring Agro — 020 Auto-email setelah cron membuat laporan
-- =====================================================================
-- Saat pg_cron menjalankan run_scheduled_reports(), tiap laporan dari jadwal
-- yang punya penerima langsung dikirim ke Edge Function `agro-email-report`
-- (async via pg_net). Otentikasi internal pakai 'cron_secret' rahasia yang
-- disimpan di agro.app_config (RLS deny-all; hanya fungsi definer/service yang baca).
-- Idempoten / aman diulang.
-- =====================================================================
set search_path = agro, public;

create extension if not exists pg_net;

-- Konfigurasi internal (rahasia). RLS aktif tanpa policy => authenticated TIDAK bisa baca.
create table if not exists agro.app_config (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
alter table agro.app_config enable row level security;

insert into agro.app_config(key, value)
values ('cron_secret', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;

insert into agro.app_config(key, value)
values ('functions_url', 'https://mgxdvnnvruoyhnzgrtur.supabase.co/functions/v1')
on conflict (key) do update set value = excluded.value, updated_at = now();

-- Kirim satu laporan ke Edge Function (async; tidak memblokir cron).
create or replace function agro.email_run(p_run_id uuid) returns void
language plpgsql security definer set search_path = agro, public
as $$
declare
  v_url text;
  v_secret text;
begin
  select value into v_url from agro.app_config where key = 'functions_url';
  select value into v_secret from agro.app_config where key = 'cron_secret';
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := v_url || '/agro-email-report',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body := jsonb_build_object('run_id', p_run_id)
  );
end;
$$;

-- run_scheduled_reports: generate + auto-email bila jadwal punya penerima.
create or replace function agro.run_scheduled_reports() returns int
language plpgsql security definer set search_path = agro, public
as $$
declare
  s record;
  v_from date;
  v_to date;
  v_n int := 0;
  v_run uuid;
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
    else
      v_from := current_date - 7;
      v_to := current_date - 1;
    end if;

    v_run := agro.generate_report(s.report_type, s.estate_id, s.division_id, v_from, v_to, s.id);
    if s.email_recipients is not null and array_length(s.email_recipients, 1) > 0 then
      perform agro.email_run(v_run);
    end if;
    update agro.report_schedules set last_run_at = now() where id = s.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;
