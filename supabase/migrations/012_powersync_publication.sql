-- =====================================================================
-- Monitoring Agro — 012 Publication untuk PowerSync (hanya tabel agro)
-- Nama sementara 'powersync_agro' -> di-rename ke 'powersync' di 014.
-- =====================================================================
drop publication if exists powersync_agro;
create publication powersync_agro for table
  agro.organizations, agro.estates, agro.divisions, agro.blocks, agro.tph,
  agro.profiles, agro.user_scopes, agro.employees,
  agro.activities, agro.attendance_lines, agro.attachments,
  agro.harvest_records, agro.delivery_records, agro.delivery_reconciliation,
  agro.materials, agro.pruning_records, agro.fertilizing_records, agro.maintenance_records;
