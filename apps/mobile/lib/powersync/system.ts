// =====================================================================
// Monitoring Agro — Inisialisasi PowerSync database (mobile)
// Panggil setupPowerSync() setelah user login (agar fetchCredentials
// punya sesi). db dipakai untuk baca/tulis lokal (offline-first).
// =====================================================================
import { PowerSyncDatabase } from '@powersync/react-native';
import { AppSchema } from './AppSchema';
import { SupabaseConnector } from './SupabaseConnector';

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: { dbFilename: 'monitoring-agro.db' },
});

let connected = false;

export async function setupPowerSync() {
  if (connected) return db;
  await db.connect(new SupabaseConnector());
  connected = true;
  return db;
}

export async function disconnectPowerSync() {
  await db.disconnect();
  connected = false;
}

// Saat logout: putus koneksi DAN hapus data lokal, supaya data divisi user
// sebelumnya tidak terbawa ke user berikutnya di perangkat yang sama.
export async function clearPowerSync() {
  await db.disconnectAndClear();
  connected = false;
}

// Contoh baca data (reactive) di komponen:
//   import { db } from '@/powersync/system';
//   const rows = await db.getAll('SELECT * FROM activities ORDER BY activity_date DESC');
//
// Contoh tulis (offline-aman): tulis ke DB lokal, PowerSync upload otomatis.
//   import { v4 as uuid } from 'uuid';
//   await db.execute(
//     `INSERT INTO activities
//        (id, activity_type, activity_date, organization_id, estate_id,
//         division_id, status, created_by, client_uuid, created_at, updated_at)
//      VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
//     [uuid(), 'panen', '2026-06-11', orgId, estateId, divId, 'draft',
//      userId, uuid(), new Date().toISOString(), new Date().toISOString()]
//   );
