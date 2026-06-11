-- =====================================================================
-- Monitoring Agro — 009 Business Triggers (schema agro)
-- =====================================================================
set search_path = agro, public;

-- 1) Cegah pengguna non-admin mengubah ROLE / is_active dirinya sendiri.
create or replace function agro.guard_profile_role()
returns trigger
language plpgsql
security definer set search_path = agro, public
as $$
begin
  -- Backend / SQL Editor / service_role tidak punya auth.uid() -> dibolehkan.
  if auth.uid() is null then
    return new;
  end if;
  if agro.is_admin() then
    return new;  -- admin bebas
  end if;
  if new.role is distinct from old.role
     or new.is_active is distinct from old.is_active then
    raise exception 'Tidak boleh mengubah role/status sendiri';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_role on agro.profiles;
create trigger trg_guard_profile_role
  before update on agro.profiles
  for each row execute function agro.guard_profile_role();

-- 2) Stempel verifikator otomatis saat status -> approved / rejected.
create or replace function agro.stamp_verification()
returns trigger
language plpgsql
security definer set search_path = agro, public
as $$
begin
  if new.status in ('approved','rejected')
     and new.status is distinct from old.status then
    new.verified_by := auth.uid();
    new.verified_at := now();
  end if;
  if new.status = 'draft' and old.status is distinct from 'draft' then
    new.verified_by := null;
    new.verified_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stamp_verification on agro.activities;
create trigger trg_stamp_verification
  before update on agro.activities
  for each row execute function agro.stamp_verification();

-- 3) Audit otomatis untuk perubahan status activities.
create or replace function agro.audit_activity_status()
returns trigger
language plpgsql
security definer set search_path = agro, public
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into agro.audit_logs(actor_id, action, entity_table, entity_id, before, after)
    values (
      auth.uid(),
      new.status::text,
      'activities',
      new.id,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_activity_status on agro.activities;
create trigger trg_audit_activity_status
  after update on agro.activities
  for each row execute function agro.audit_activity_status();
