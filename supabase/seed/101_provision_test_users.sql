-- =====================================================================
-- Monitoring Agro — Provisioning USER UJI (role + scope)
-- JALANKAN SETELAH membuat akun di Supabase Dashboard:
--   Authentication -> Users -> Add user  (centang "Auto Confirm User")
--
-- Buat 4 akun ini (email bebas, sesuaikan; password pilih sendiri):
--   mandor1@barokah.test   -> mandor,  Divisi 1 (KSA)
--   asisten1@barokah.test  -> asisten, Divisi 1 & 2 (KSA)
--   manager1@barokah.test  -> manager_kebun, Estate KSA (semua divisi)
--   admin1@barokah.test    -> admin_grup, seluruh grup
--
-- Saat user dibuat, trigger otomatis membuat baris agro.profiles (role
-- default 'mandor'). Skrip ini meng-update role + menambah scope.
-- Idempoten. GANTI email bila berbeda.
-- =====================================================================
set search_path = agro, public;

-- ---- MANDOR 1 : scope Divisi 1 (KSA) -------------------------------
update agro.profiles set role='mandor', full_name='Mandor Satu'
where id = (select id from auth.users where email='mandor1@barokah.test');

insert into agro.user_scopes (user_id, scope_type, scope_id)
select u.id, 'division', '33333333-3333-3333-3333-333333333331'
from auth.users u where u.email='mandor1@barokah.test'
on conflict (user_id, scope_type, scope_id) do nothing;

-- ---- ASISTEN 1 : scope Divisi 1 & 2 (KSA) --------------------------
update agro.profiles set role='asisten', full_name='Asisten Satu'
where id = (select id from auth.users where email='asisten1@barokah.test');

insert into agro.user_scopes (user_id, scope_type, scope_id)
select u.id, 'division', d.scope_id
from auth.users u
cross join (values
  ('33333333-3333-3333-3333-333333333331'::uuid),
  ('33333333-3333-3333-3333-333333333332'::uuid)
) as d(scope_id)
where u.email='asisten1@barokah.test'
on conflict (user_id, scope_type, scope_id) do nothing;

-- ---- MANAGER 1 : scope Estate KSA (otomatis semua divisi KSA) ------
update agro.profiles set role='manager_kebun', full_name='Manager Kebun A'
where id = (select id from auth.users where email='manager1@barokah.test');

insert into agro.user_scopes (user_id, scope_type, scope_id)
select u.id, 'estate', '22222222-2222-2222-2222-222222222221'
from auth.users u where u.email='manager1@barokah.test'
on conflict (user_id, scope_type, scope_id) do nothing;

-- ---- ADMIN GRUP : scope org (seluruh grup) -------------------------
update agro.profiles set role='admin_grup', full_name='Admin Grup'
where id = (select id from auth.users where email='admin1@barokah.test');

insert into agro.user_scopes (user_id, scope_type, scope_id)
select u.id, 'org', '11111111-1111-1111-1111-111111111111'
from auth.users u where u.email='admin1@barokah.test'
on conflict (user_id, scope_type, scope_id) do nothing;

-- ---- Verifikasi hasil ----------------------------------------------
select p.full_name, p.role, us.scope_type, us.scope_id
from agro.profiles p
left join agro.user_scopes us on us.user_id = p.id
order by p.role;
