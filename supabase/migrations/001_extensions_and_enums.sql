-- =====================================================================
-- Monitoring Agro — 001 Schema, Extensions & Enums
-- Target: Supabase (PostgreSQL) project CGA
-- SEMUA objek aplikasi ditempatkan di schema "agro" (terisolasi dari
-- schema public milik aplikasi lain di database yang sama).
-- Idempoten (aman dijalankan ulang).
-- =====================================================================

-- Schema aplikasi -----------------------------------------------------
create schema if not exists agro;

-- Hak akses agar PostgREST/Supabase client bisa memakai schema agro.
-- (RLS tetap menjaga baris; grant hanya mengizinkan role mencoba akses.)
grant usage on schema agro to anon, authenticated, service_role;
alter default privileges in schema agro grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema agro grant all on routines  to anon, authenticated, service_role;
alter default privileges in schema agro grant all on sequences to anon, authenticated, service_role;

-- Extensions ----------------------------------------------------------
create extension if not exists "pgcrypto";          -- gen_random_uuid()

-- Semua perintah berikut menempatkan objek di schema agro -------------
set search_path = agro, public;

-- Enums ---------------------------------------------------------------
do $$ begin
  create type agro.user_role as enum
    ('super_admin','admin_grup','manager_kebun','asisten','mandor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type agro.scope_type as enum ('org','estate','division');
exception when duplicate_object then null; end $$;

do $$ begin
  create type agro.activity_type as enum
    ('panen','pengiriman','prunning','pemupukan','pemeliharaan');
exception when duplicate_object then null; end $$;

-- draft / submitted / approved / rejected
do $$ begin
  create type agro.activity_status as enum ('draft','submitted','approved','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type agro.employee_status as enum ('aktif','nonaktif');
exception when duplicate_object then null; end $$;

-- Fungsi util: set updated_at otomatis -------------------------------
create or replace function agro.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
