-- =====================================================================
-- Monitoring Agro — 008 RLS Policies (schema agro)
-- Aktifkan RLS + kebijakan per tabel sesuai matriks RBAC PRD.
-- Default: tanpa policy = DENY. service_role (PowerSync read / backend)
-- bypass RLS; web & mobile-upload memakai role 'authenticated'.
-- =====================================================================
set search_path = agro, public;

-- Aktifkan RLS pada semua tabel --------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'organizations','estates','divisions','blocks','tph',
    'profiles','user_scopes','employees',
    'activities','attendance_lines','attachments','audit_logs',
    'harvest_records','delivery_records','delivery_reconciliation',
    'materials','pruning_records','fertilizing_records','maintenance_records'
  ]
  loop
    execute format('alter table agro.%I enable row level security;', t);
  end loop;
end $$;
-- Catatan: 'force' SENGAJA tidak dipakai. RLS aktif untuk role anon/
-- authenticated; service_role & koneksi PowerSync (BYPASSRLS) tetap bisa
-- membaca penuh untuk keperluan sinkronisasi.

-- ============================ MASTER LOKASI ==========================

drop policy if exists org_select on agro.organizations;
create policy org_select on agro.organizations for select to authenticated
  using (agro.has_org_access(id));
drop policy if exists org_write on agro.organizations;
create policy org_write on agro.organizations for all to authenticated
  using (agro.is_admin()) with check (agro.is_admin());

drop policy if exists estate_select on agro.estates;
create policy estate_select on agro.estates for select to authenticated
  using (agro.has_estate_access(id));
drop policy if exists estate_write on agro.estates;
create policy estate_write on agro.estates for all to authenticated
  using (agro.is_admin()) with check (agro.is_admin());

drop policy if exists division_select on agro.divisions;
create policy division_select on agro.divisions for select to authenticated
  using (agro.has_division_access(id));
drop policy if exists division_write on agro.divisions;
create policy division_write on agro.divisions for all to authenticated
  using (agro.is_admin()) with check (agro.is_admin());

-- blocks (admin penuh; manager kebun boleh kelola di estate-nya)
drop policy if exists block_select on agro.blocks;
create policy block_select on agro.blocks for select to authenticated
  using (agro.has_division_access(division_id));
drop policy if exists block_write on agro.blocks;
create policy block_write on agro.blocks for all to authenticated
  using (agro.is_admin() or (agro.my_role() = 'manager_kebun' and agro.has_estate_access(estate_id)))
  with check (agro.is_admin() or (agro.my_role() = 'manager_kebun' and agro.has_estate_access(estate_id)));

drop policy if exists tph_select on agro.tph;
create policy tph_select on agro.tph for select to authenticated
  using (agro.has_division_access(division_id));
drop policy if exists tph_write on agro.tph;
create policy tph_write on agro.tph for all to authenticated
  using (agro.is_admin() or (agro.my_role() = 'manager_kebun' and agro.has_estate_access(estate_id)))
  with check (agro.is_admin() or (agro.my_role() = 'manager_kebun' and agro.has_estate_access(estate_id)));

-- ============================ PEOPLE & RBAC =========================

-- profiles: semua pengguna login boleh BACA (untuk join nama);
-- ubah hanya milik sendiri atau admin (perubahan role dijaga trigger 009).
drop policy if exists profile_select on agro.profiles;
create policy profile_select on agro.profiles for select to authenticated
  using (auth.uid() is not null);
drop policy if exists profile_update on agro.profiles;
create policy profile_update on agro.profiles for update to authenticated
  using (id = auth.uid() or agro.is_admin())
  with check (id = auth.uid() or agro.is_admin());
drop policy if exists profile_admin_write on agro.profiles;
create policy profile_admin_write on agro.profiles for insert to authenticated
  with check (agro.is_admin());
drop policy if exists profile_delete on agro.profiles;
create policy profile_delete on agro.profiles for delete to authenticated
  using (agro.is_super_admin());

-- user_scopes: lihat milik sendiri / admin; ubah hanya admin
drop policy if exists scope_select on agro.user_scopes;
create policy scope_select on agro.user_scopes for select to authenticated
  using (user_id = auth.uid() or agro.is_admin());
drop policy if exists scope_write on agro.user_scopes;
create policy scope_write on agro.user_scopes for all to authenticated
  using (agro.is_admin()) with check (agro.is_admin());

-- employees: baca sesuai akses divisi; tulis admin / manager estate
drop policy if exists employee_select on agro.employees;
create policy employee_select on agro.employees for select to authenticated
  using (agro.has_division_access(division_id));
drop policy if exists employee_write on agro.employees;
create policy employee_write on agro.employees for all to authenticated
  using (agro.is_admin() or (agro.my_role() = 'manager_kebun' and agro.has_estate_access(estate_id)))
  with check (agro.is_admin() or (agro.my_role() = 'manager_kebun' and agro.has_estate_access(estate_id)));

-- ============================ ACTIVITIES ============================

drop policy if exists activity_select on agro.activities;
create policy activity_select on agro.activities for select to authenticated
  using (agro.has_division_access(division_id));

drop policy if exists activity_insert on agro.activities;
create policy activity_insert on agro.activities for insert to authenticated
  with check (
    agro.can_input()
    and agro.has_division_access(division_id)
    and created_by = auth.uid()
  );

-- update: pemilik (saat draft/rejected) ATAU verifikator (asisten/manager)
drop policy if exists activity_update on agro.activities;
create policy activity_update on agro.activities for update to authenticated
  using (agro.activity_editable_by_owner(id) or agro.activity_verifiable(id) or agro.is_admin())
  with check (agro.has_division_access(division_id));

drop policy if exists activity_delete on agro.activities;
create policy activity_delete on agro.activities for delete to authenticated
  using (
    agro.is_admin()
    or (created_by = auth.uid() and status in ('draft','rejected'))
  );

-- ===================== CHILD TABLES (detail per kegiatan) ===========
-- Pola seragam: BACA = activity_readable; TULIS = editable owner / admin.
do $$
declare t text;
begin
  foreach t in array array[
    'attendance_lines','attachments',
    'harvest_records','delivery_records',
    'pruning_records','fertilizing_records','maintenance_records'
  ]
  loop
    execute format('drop policy if exists %1$s_select on agro.%1$s;', t);
    execute format($f$
      create policy %1$s_select on agro.%1$s for select to authenticated
      using (agro.activity_readable(activity_id));$f$, t);

    execute format('drop policy if exists %1$s_write on agro.%1$s;', t);
    execute format($f$
      create policy %1$s_write on agro.%1$s for all to authenticated
      using (agro.activity_editable_by_owner(activity_id) or agro.is_admin())
      with check (agro.activity_editable_by_owner(activity_id) or agro.is_admin());$f$, t);
  end loop;
end $$;

-- delivery_reconciliation: diisi office (verifikator/admin) -----------
drop policy if exists recon_select on agro.delivery_reconciliation;
create policy recon_select on agro.delivery_reconciliation for select to authenticated
  using (exists (
    select 1 from agro.delivery_records dr
    join agro.activities a on a.id = dr.activity_id
    where dr.id = delivery_reconciliation.delivery_id
      and agro.has_division_access(a.division_id)
  ));
drop policy if exists recon_write on agro.delivery_reconciliation;
create policy recon_write on agro.delivery_reconciliation for all to authenticated
  using (
    agro.is_admin() or (agro.can_verify() and exists (
      select 1 from agro.delivery_records dr
      join agro.activities a on a.id = dr.activity_id
      where dr.id = delivery_reconciliation.delivery_id
        and agro.has_division_access(a.division_id)))
  )
  with check (
    agro.is_admin() or (agro.can_verify() and exists (
      select 1 from agro.delivery_records dr
      join agro.activities a on a.id = dr.activity_id
      where dr.id = delivery_reconciliation.delivery_id
        and agro.has_division_access(a.division_id)))
  );

-- materials (master org-level) ---------------------------------------
drop policy if exists materials_select on agro.materials;
create policy materials_select on agro.materials for select to authenticated
  using (agro.has_org_access(organization_id));
drop policy if exists materials_write on agro.materials;
create policy materials_write on agro.materials for all to authenticated
  using (agro.is_admin()) with check (agro.is_admin());

-- audit_logs ---------------------------------------------------------
drop policy if exists audit_select on agro.audit_logs;
create policy audit_select on agro.audit_logs for select to authenticated
  using (agro.is_admin());
drop policy if exists audit_insert on agro.audit_logs;
create policy audit_insert on agro.audit_logs for insert to authenticated
  with check (actor_id = auth.uid());
