// =====================================================================
// Monitoring Agro — PowerSync local schema (SQLite di device)
// Harus cocok dengan tabel yang disinkron di Sync Streams (schema agro).
// Kolom 'id' otomatis ada sebagai PK text (tidak perlu didefinisikan).
// Tipe: column.text (uuid/teks/tanggal/timestamp), column.integer
//       (angka bulat & boolean 0/1), column.real (desimal).
// =====================================================================
import { column, Schema, Table } from '@powersync/react-native';

const estates = new Table({
  organization_id: column.text,
  name: column.text,
  code: column.text,
  location: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const divisions = new Table({
  estate_id: column.text,
  organization_id: column.text,
  name: column.text,
  code: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const blocks = new Table({
  division_id: column.text,
  estate_id: column.text,
  organization_id: column.text,
  code: column.text,
  name: column.text,
  luas_ha: column.real,
  tahun_tanam: column.integer,
  jumlah_pokok: column.integer,
  created_at: column.text,
  updated_at: column.text,
});

const tph = new Table({
  block_id: column.text,
  division_id: column.text,
  estate_id: column.text,
  organization_id: column.text,
  code: column.text,
  name: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const employees = new Table({
  organization_id: column.text,
  estate_id: column.text,
  division_id: column.text,
  nik: column.text,
  name: column.text,
  position: column.text,
  status: column.text,
  join_date: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const materials = new Table({
  organization_id: column.text,
  name: column.text,
  category: column.text,
  unit: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const activities = new Table({
  activity_type: column.text,
  activity_date: column.text,
  organization_id: column.text,
  estate_id: column.text,
  division_id: column.text,
  block_id: column.text,
  tph_id: column.text,
  status: column.text,
  created_by: column.text,
  verified_by: column.text,
  verified_at: column.text,
  gps_lat: column.real,
  gps_lng: column.real,
  notes: column.text,
  client_uuid: column.text,
  source_device: column.text,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
});

const attendance_lines = new Table({
  activity_id: column.text,
  employee_id: column.text,
  present: column.integer,   // boolean 0/1
  hk: column.real,
  output_qty: column.real,
  output_unit: column.text,
  note: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const harvest_records = new Table({
  activity_id: column.text,
  total_janjang: column.integer,
  est_tonase: column.real,
  brondolan_kg: column.real,
  buah_mentah: column.integer,
  buah_busuk: column.integer,
  basis: column.real,
  premi: column.real,
  created_at: column.text,
  updated_at: column.text,
});

const delivery_records = new Table({
  activity_id: column.text,
  spb_number: column.text,
  vehicle_plate: column.text,
  driver_name: column.text,
  origin_tph_id: column.text,
  destination_pks: column.text,
  total_janjang: column.integer,
  est_tonase_muat: column.real,
  depart_time: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const attachments = new Table({
  activity_id: column.text,
  storage_path: column.text,
  kind: column.text,
  created_by: column.text,
  created_at: column.text,
});

// LOCAL-ONLY (tidak disinkron): antrian upload biner foto ke Supabase Storage.
// Metadata foto disimpan di tabel `attachments` (disinkron). Baris di sini
// dihapus setelah file berhasil di-upload. localOnly => tidak masuk CRUD sync.
const pending_uploads = new Table(
  {
    activity_id: column.text,
    storage_path: column.text,
    local_uri: column.text,
    content_type: column.text,
    attempts: column.integer,
    created_at: column.text,
  },
  { localOnly: true },
);

const pruning_records = new Table({
  activity_id: column.text,
  total_pokok: column.integer,
  pelepah_dibuang: column.integer,
  quality: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const fertilizing_records = new Table({
  activity_id: column.text,
  material_id: column.text,
  dosis_per_pokok: column.real,
  total_pokok: column.integer,
  total_kg: column.real,
  method: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const maintenance_records = new Table({
  activity_id: column.text,
  maintenance_type: column.text,
  area_ha: column.real,
  total_pokok: column.integer,
  material_id: column.text,
  material_qty: column.real,
  created_at: column.text,
  updated_at: column.text,
});

const profiles = new Table({
  full_name: column.text,
  role: column.text,
  phone: column.text,
  is_active: column.integer,
  created_at: column.text,
  updated_at: column.text,
});

export const AppSchema = new Schema({
  estates,
  divisions,
  blocks,
  tph,
  employees,
  materials,
  activities,
  attendance_lines,
  harvest_records,
  delivery_records,
  attachments,
  pruning_records,
  fertilizing_records,
  maintenance_records,
  profiles,
  pending_uploads,
});

export type Database = (typeof AppSchema)['types'];
