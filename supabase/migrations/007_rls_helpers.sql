-- =====================================================================
-- Monitoring Agro — 007 Helper Functions untuk RLS (schema agro)
-- Semua SECURITY DEFINER + search_path terkunci => membaca profiles/
-- user_scopes TANPA memicu RLS (mencegah rekursi kebijakan).
-- =====================================================================
set search_path = agro, public;

-- Role pengguna saat ini ---------------------------------------------
create or replace function agro.my_role()
returns agro.user_role
language sql stable security definer set search_path = agro, public
as $$
  select role from agro.profiles where id = auth.uid();
$$;

-- Admin grup / super admin (akses penuh lintas estate) ---------------
create or replace function agro.is_admin()
returns boolean
language sql stable security definer set search_path = agro, public
as $$
  select coalesce(agro.my_role() in ('super_admin','admin_grup'), false);
$$;

create or replace function agro.is_super_admin()
returns boolean
language sql stable security definer set search_path = agro, public
as $$
  select coalesce(agro.my_role() = 'super_admin', false);
$$;

-- Boleh INPUT kegiatan lapangan (mandor & asisten) -------------------
create or replace function agro.can_input()
returns boolean
language sql stable security definer set search_path = agro, public
as $$
  select coalesce(agro.my_role() in ('mandor','asisten'), false);
$$;

-- Boleh VERIFIKASI / approve (asisten & manager kebun) ---------------
create or replace function agro.can_verify()
returns boolean
language sql stable security definer set search_path = agro, public
as $$
  select coalesce(agro.my_role() in ('asisten','manager_kebun'), false);
$$;

-- Akses ke sebuah ESTATE ---------------------------------------------
create or replace function agro.has_estate_access(eid uuid)
returns boolean
language sql stable security definer set search_path = agro, public
as $$
  select agro.is_admin()
    or exists (
      select 1
      from agro.estates e
      join agro.user_scopes us on us.user_id = auth.uid()
      where e.id = eid
        and (
          (us.scope_type = 'estate' and us.scope_id = e.id)
          or (us.scope_type = 'org' and us.scope_id = e.organization_id)
          or (us.scope_type = 'division'
              and us.scope_id in (select d.id from agro.divisions d where d.estate_id = e.id))
        )
    );
$$;

-- Akses ke sebuah DIVISI ---------------------------------------------
create or replace function agro.has_division_access(did uuid)
returns boolean
language sql stable security definer set search_path = agro, public
as $$
  select agro.is_admin()
    or exists (
      select 1
      from agro.divisions d
      join agro.user_scopes us on us.user_id = auth.uid()
      where d.id = did
        and (
          (us.scope_type = 'division' and us.scope_id = d.id)
          or (us.scope_type = 'estate' and us.scope_id = d.estate_id)
          or (us.scope_type = 'org' and us.scope_id = d.organization_id)
        )
    );
$$;

-- Akses ke sebuah ORGANISASI -----------------------------------------
create or replace function agro.has_org_access(oid uuid)
returns boolean
language sql stable security definer set search_path = agro, public
as $$
  select agro.is_admin()
    or exists (
      select 1 from agro.user_scopes us
      where us.user_id = auth.uid()
        and (
          (us.scope_type = 'org' and us.scope_id = oid)
          or (us.scope_type = 'estate'
              and us.scope_id in (select e.id from agro.estates e where e.organization_id = oid))
          or (us.scope_type = 'division'
              and us.scope_id in (select d.id from agro.divisions d where d.organization_id = oid))
        )
    );
$$;

-- Helper turunan untuk anak activities -------------------------------
create or replace function agro.activity_readable(aid uuid)
returns boolean
language sql stable security definer set search_path = agro, public
as $$
  select exists (
    select 1 from agro.activities a
    where a.id = aid and agro.has_division_access(a.division_id)
  );
$$;

create or replace function agro.activity_editable_by_owner(aid uuid)
returns boolean
language sql stable security definer set search_path = agro, public
as $$
  select exists (
    select 1 from agro.activities a
    where a.id = aid
      and a.created_by = auth.uid()
      and a.status in ('draft','rejected')
      and a.deleted_at is null
  );
$$;

create or replace function agro.activity_verifiable(aid uuid)
returns boolean
language sql stable security definer set search_path = agro, public
as $$
  select agro.can_verify() and exists (
    select 1 from agro.activities a
    where a.id = aid and agro.has_division_access(a.division_id)
  );
$$;

-- Izin EXECUTE untuk role yang dipakai PostgREST/Supabase ------------
grant execute on all functions in schema agro to authenticated;
