// =====================================================================
// Penulisan kegiatan (offline-aman): tulis ke DB lokal dalam SATU transaksi.
// PowerSync meng-upload otomatis saat online (kena RLS agro).
// WAJIB sertakan organization_id, estate_id, division_id, created_by,
// client_uuid (lihat CLAUDE.md) agar lolos RLS & sinkron.
// =====================================================================
import { db } from '../powersync/system';
import { newId, nowIso } from '../id';
import { persistPhotos, type LocalPhoto, type PersistedPhoto } from '../photos/storage';
import type { Coords } from '../location';
import type { Block, Tph } from './types';

const SOURCE = 'mobile';

// Kirim kegiatan untuk verifikasi (draft/rejected -> submitted). Tulis lokal,
// PowerSync upload; RLS hanya mengizinkan pemilik saat status draft/rejected.
export async function submitActivity(activityId: string): Promise<void> {
  await db.execute(
    "UPDATE activities SET status = 'submitted', updated_at = ? WHERE id = ?",
    [nowIso(), activityId],
  );
}

// Sisipkan metadata foto (tabel attachments, disinkron) + antrian upload biner
// (pending_uploads, local-only) dalam transaksi yang sama dengan kegiatan.
function insertAttachments(
  tx: { execute: (sql: string, params: unknown[]) => Promise<unknown> },
  activityId: string,
  userId: string,
  persisted: PersistedPhoto[],
  ts: string,
) {
  return Promise.all(
    persisted.flatMap((ph) => [
      tx.execute(
        `INSERT INTO attachments
           (id, activity_id, storage_path, kind, created_by, created_at)
         VALUES (?,?,?,?,?,?)`,
        [newId(), activityId, ph.storage_path, 'photo', userId, ts],
      ),
      tx.execute(
        `INSERT INTO pending_uploads
           (id, activity_id, storage_path, local_uri, content_type, attempts, created_at)
         VALUES (?,?,?,?,?,?,?)`,
        [ph.id, activityId, ph.storage_path, ph.local_uri, ph.content_type, 0, ts],
      ),
    ]),
  );
}

// Konversi input teks -> number | null (kosong = null, koma -> titik).
export function num(v: string): number | null {
  const t = (v ?? '').trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export type HarvestInput = {
  userId: string;
  block: Block;
  tphId?: string | null;
  date: string;
  notes?: string;
  harvest: {
    total_janjang: number | null;
    est_tonase: number | null;
    brondolan_kg: number | null;
    buah_mentah: number | null;
    buah_busuk: number | null;
    basis: number | null;
    premi: number | null;
  };
  attendance: { employee_id: string; output_qty: number | null }[];
  photos: LocalPhoto[];
  gps?: Coords | null;
};

export async function saveHarvest(input: HarvestInput): Promise<string> {
  const { block, userId } = input;
  const activityId = newId();
  const ts = nowIso();

  // Kompres & simpan foto ke penyimpanan lokal SEBELUM transaksi DB (IO async).
  const persisted = await persistPhotos(activityId, block.division_id, input.photos);

  await db.writeTransaction(async (tx) => {
    await tx.execute(
      `INSERT INTO activities
         (id, activity_type, activity_date, organization_id, estate_id,
          division_id, block_id, tph_id, status, created_by, notes,
          gps_lat, gps_lng, client_uuid, source_device, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        activityId,
        'panen',
        input.date,
        block.organization_id,
        block.estate_id,
        block.division_id,
        block.id,
        input.tphId ?? null,
        'draft',
        userId,
        input.notes?.trim() || null,
        input.gps?.lat ?? null,
        input.gps?.lng ?? null,
        newId(),
        SOURCE,
        ts,
        ts,
      ],
    );

    const h = input.harvest;
    await tx.execute(
      `INSERT INTO harvest_records
         (id, activity_id, total_janjang, est_tonase, brondolan_kg,
          buah_mentah, buah_busuk, basis, premi, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        newId(),
        activityId,
        h.total_janjang,
        h.est_tonase,
        h.brondolan_kg,
        h.buah_mentah,
        h.buah_busuk,
        h.basis,
        h.premi,
        ts,
        ts,
      ],
    );

    for (const line of input.attendance) {
      await tx.execute(
        `INSERT INTO attendance_lines
           (id, activity_id, employee_id, present, output_qty, output_unit,
            created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?)`,
        [newId(), activityId, line.employee_id, 1, line.output_qty, 'janjang', ts, ts],
      );
    }

    await insertAttachments(tx, activityId, userId, persisted, ts);
  });

  return activityId;
}

export type DeliveryInput = {
  userId: string;
  tph: Tph;
  date: string;
  notes?: string;
  delivery: {
    spb_number: string | null;
    vehicle_plate: string | null;
    driver_name: string | null;
    destination_pks: string | null;
    total_janjang: number | null;
    est_tonase_muat: number | null;
    depart_time: string | null;
  };
  photos: LocalPhoto[];
  gps?: Coords | null;
};

export async function saveDelivery(input: DeliveryInput): Promise<string> {
  const { tph, userId } = input;
  const activityId = newId();
  const ts = nowIso();

  const persisted = await persistPhotos(activityId, tph.division_id, input.photos);

  await db.writeTransaction(async (tx) => {
    await tx.execute(
      `INSERT INTO activities
         (id, activity_type, activity_date, organization_id, estate_id,
          division_id, tph_id, status, created_by, notes,
          gps_lat, gps_lng, client_uuid, source_device, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        activityId,
        'pengiriman',
        input.date,
        tph.organization_id,
        tph.estate_id,
        tph.division_id,
        tph.id,
        'draft',
        userId,
        input.notes?.trim() || null,
        input.gps?.lat ?? null,
        input.gps?.lng ?? null,
        newId(),
        SOURCE,
        ts,
        ts,
      ],
    );

    const d = input.delivery;
    await tx.execute(
      `INSERT INTO delivery_records
         (id, activity_id, spb_number, vehicle_plate, driver_name,
          origin_tph_id, destination_pks, total_janjang, est_tonase_muat,
          depart_time, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        newId(),
        activityId,
        d.spb_number,
        d.vehicle_plate,
        d.driver_name,
        tph.id,
        d.destination_pks,
        d.total_janjang,
        d.est_tonase_muat,
        d.depart_time,
        ts,
        ts,
      ],
    );

    await insertAttachments(tx, activityId, userId, persisted, ts);
  });

  return activityId;
}
