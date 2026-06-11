-- =====================================================================
-- Monitoring Agro — 010 Views pendukung PowerSync (schema agro)
-- Memetakan pengguna -> estate/divisi yang boleh disinkronkan ke device.
-- Dipakai PowerSync sebagai PARAMETER QUERY (lihat powersync_sync_rules.yaml).
-- PowerSync membaca via koneksi service-nya (bypass RLS), jadi aman.
-- =====================================================================
set search_path = agro, public;

-- Estate yang dapat diakses tiap user (admin = semua estate) ---------
create or replace view agro.v_user_estate_access as
  select p.id as user_id, e.id as estate_id
    from agro.profiles p cross join agro.estates e
   where p.role in ('super_admin','admin_grup')
  union
  select us.user_id, e.id
    from agro.user_scopes us join agro.estates e on e.organization_id = us.scope_id
   where us.scope_type = 'org'
  union
  select us.user_id, us.scope_id as estate_id
    from agro.user_scopes us
   where us.scope_type = 'estate'
  union
  select us.user_id, d.estate_id
    from agro.user_scopes us join agro.divisions d on d.id = us.scope_id
   where us.scope_type = 'division';

-- Divisi yang dapat diakses tiap user (admin = semua divisi) ---------
create or replace view agro.v_user_division_access as
  select p.id as user_id, d.id as division_id
    from agro.profiles p cross join agro.divisions d
   where p.role in ('super_admin','admin_grup')
  union
  select us.user_id, d.id
    from agro.user_scopes us join agro.divisions d on d.organization_id = us.scope_id
   where us.scope_type = 'org'
  union
  select us.user_id, d.id
    from agro.user_scopes us join agro.divisions d on d.estate_id = us.scope_id
   where us.scope_type = 'estate'
  union
  select us.user_id, us.scope_id as division_id
    from agro.user_scopes us
   where us.scope_type = 'division';
