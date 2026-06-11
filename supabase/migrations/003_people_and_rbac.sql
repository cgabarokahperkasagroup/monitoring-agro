-- =====================================================================
-- Monitoring Agro — 003 People & RBAC
-- profiles  : pengguna aplikasi (terhubung ke auth.users) + role
-- user_scopes: cakupan akses pengguna (org/estate/division)
-- employees : karyawan lapangan (OBJEK pencatatan, TIDAK login)
-- =====================================================================
set search_path = agro, public;

-- Profil pengguna aplikasi (1:1 dengan auth.users) -------------------
create table if not exists agro.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  role        agro.user_role not null default 'mandor',
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Cakupan akses: 1 pengguna bisa punya >1 cakupan (mis. manager multi-estate)
-- scope_type='org'      -> scope_id = organizations.id  (admin grup)
-- scope_type='estate'   -> scope_id = estates.id        (manager kebun)
-- scope_type='division' -> scope_id = divisions.id      (asisten / mandor)
create table if not exists agro.user_scopes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references agro.profiles(id) on delete cascade,
  scope_type  agro.scope_type not null,
  scope_id    uuid not null,
  created_at  timestamptz not null default now(),
  unique (user_id, scope_type, scope_id)
);
create index if not exists idx_user_scopes_user on agro.user_scopes(user_id);
create index if not exists idx_user_scopes_lookup on agro.user_scopes(scope_type, scope_id);

-- Karyawan lapangan ---------------------------------------------------
create table if not exists agro.employees (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references agro.organizations(id) on delete restrict,
  estate_id       uuid not null references agro.estates(id) on delete restrict,
  division_id     uuid not null references agro.divisions(id) on delete restrict,
  nik             text not null,                 -- NIK internal perusahaan
  name            text not null,
  position        text,                          -- jabatan/posisi
  status          agro.employee_status not null default 'aktif',
  join_date       date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, nik)
);
create index if not exists idx_employees_division on agro.employees(division_id);
create index if not exists idx_employees_estate on agro.employees(estate_id);
create index if not exists idx_employees_status on agro.employees(status);

-- Trigger updated_at -------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['profiles','employees']
  loop
    execute format('drop trigger if exists trg_%1$s_updated on agro.%1$s;', t);
    execute format(
      'create trigger trg_%1$s_updated before update on agro.%1$s
       for each row execute function agro.set_updated_at();', t);
  end loop;
end $$;

-- Auto-buat profil saat user auth baru mendaftar ---------------------
-- Role default 'mandor'; admin mengubah role & menetapkan scope kemudian.
-- NB: trigger DINAMAI UNIK ('..._agro') agar tidak menimpa trigger milik
--     aplikasi lain yang mungkin sudah ada di auth.users (project CGA).
create or replace function agro.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = agro, public
as $$
begin
  insert into agro.profiles (id, full_name, role, is_active)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), 'mandor', true)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists agro_on_auth_user_created on auth.users;
create trigger agro_on_auth_user_created
  after insert on auth.users
  for each row execute function agro.handle_new_user();
