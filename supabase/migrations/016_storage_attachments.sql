-- =====================================================================
-- Monitoring Agro — 016 Storage: bucket & policy untuk foto `attachments`
-- =====================================================================
-- Foto bukti kegiatan (opsional, lihat PRD §5.4). File disimpan di Supabase
-- Storage; baris metadata ada di `agro.attachments` (storage_path → name).
--
-- CATATAN PENTING (CGA = project bersama beberapa aplikasi):
--  - storage.objects DIPAKAI BERSAMA banyak aplikasi. SETIAP policy WAJIB
--    dibatasi `bucket_id = 'attachments'` agar tidak menyentuh bucket lain.
--  - Policy bersifat permisif (di-OR antar policy) — menambah policy bucket
--    'attachments' tidak mengubah akses bucket aplikasi lain.
--
-- KONVENSI PATH OBJEK (wajib diikuti aplikasi saat upload):
--    {division_id}/{activity_id}/{namafile}.jpg
--  Segmen pertama = division_id. Akses diberikan bila user punya akses ke
--  divisi tsb (agro.has_division_access). Selalu sertakan `division_id`
--  yang sama dengan kegiatan agar lolos policy & konsisten dengan RLS tabel.
--
-- Idempoten / aman diulang (untuk re-deploy). Sudah diterapkan di CGA.
-- =====================================================================
set search_path = agro, public;

-- Helper: cast text -> uuid yang aman (NULL bila bukan uuid valid) --------
-- Dipakai di policy storage agar segmen path yang tidak valid tidak melempar
-- error, melainkan menolak akses (has_division_access(NULL) = false).
create or replace function agro.try_uuid(t text)
returns uuid
language plpgsql immutable
as $$
begin
  return t::uuid;
exception when others then
  return null;
end;
$$;

grant execute on function agro.try_uuid(text) to authenticated;

-- Bucket privat 'attachments' --------------------------------------------
-- Privat (public=false): akses hanya lewat URL bertanda tangan / policy.
-- Batas 10 MB, hanya gambar (foto lapangan dikompres di perangkat).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  10485760,                                        -- 10 MB
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Policy pada storage.objects (HANYA bucket 'attachments') ----------------
-- Akses dibatasi per-divisi: user hanya bisa baca/tulis objek di divisi yang
-- masuk cakupannya (mandor/asisten lapangan, manager kebun, admin grup).

drop policy if exists agro_attach_select on storage.objects;
create policy agro_attach_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'attachments'
    and agro.has_division_access(agro.try_uuid(split_part(name, '/', 1)))
  );

drop policy if exists agro_attach_insert on storage.objects;
create policy agro_attach_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and agro.has_division_access(agro.try_uuid(split_part(name, '/', 1)))
  );

drop policy if exists agro_attach_update on storage.objects;
create policy agro_attach_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'attachments'
    and agro.has_division_access(agro.try_uuid(split_part(name, '/', 1)))
  )
  with check (
    bucket_id = 'attachments'
    and agro.has_division_access(agro.try_uuid(split_part(name, '/', 1)))
  );

drop policy if exists agro_attach_delete on storage.objects;
create policy agro_attach_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'attachments'
    and agro.has_division_access(agro.try_uuid(split_part(name, '/', 1)))
  );
