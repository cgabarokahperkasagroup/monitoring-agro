-- =====================================================================
-- Monitoring Agro — 015 Izinkan backend/SQL Editor/service_role
-- mengelola role (tidak punya auth.uid()). End-user tetap dibatasi.
-- =====================================================================
set search_path = agro, public;

create or replace function agro.guard_profile_role()
returns trigger
language plpgsql
security definer set search_path = agro, public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if agro.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.is_active is distinct from old.is_active then
    raise exception 'Tidak boleh mengubah role/status sendiri';
  end if;
  return new;
end;
$$;
