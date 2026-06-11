-- =====================================================================
-- Monitoring Agro — 019 Email laporan (Resend)
-- =====================================================================
-- Tambahkan penerima email pada jadwal & penanda waktu kirim pada hasil.
-- Pengiriman email dilakukan Edge Function `agro-email-report` (Resend);
-- butuh secret RESEND_API_KEY (+ opsional REPORT_FROM_EMAIL) di Supabase.
-- Idempoten / aman diulang.
-- =====================================================================
set search_path = agro, public;

alter table agro.report_schedules add column if not exists email_recipients text[];
alter table agro.report_runs      add column if not exists emailed_at timestamptz;
