-- =====================================================================
-- Monitoring Agro — 013 Role khusus PowerSync (JALANKAN MANUAL)
-- Jalankan di SQL Editor Supabase. GANTI password dengan yang kuat & rahasia.
-- Jangan commit file ini setelah diisi password.
-- =====================================================================

create role powersync_role with replication bypassrls login
  password 'GANTI_DENGAN_PASSWORD_KUAT_DAN_RAHASIA';

-- Hak baca ke schema agro (untuk parameter/data query sync rules)
grant usage on schema agro to powersync_role;
grant select on all tables in schema agro to powersync_role;
alter default privileges in schema agro grant select on tables to powersync_role;

-- (Opsional) jika ingin role ini hanya untuk replikasi, cukup di atas.
-- Publication bernama 'powersync' (hanya tabel agro) sudah dibuat di DB.
