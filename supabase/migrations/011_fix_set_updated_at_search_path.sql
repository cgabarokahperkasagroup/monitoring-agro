-- =====================================================================
-- Monitoring Agro — 011 Kunci search_path untuk agro.set_updated_at
-- (menutup peringatan "function search path mutable").
-- =====================================================================
alter function agro.set_updated_at() set search_path = pg_catalog;
