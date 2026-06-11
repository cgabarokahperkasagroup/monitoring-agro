// =====================================================================
// Proses antrian upload foto -> Supabase Storage (bucket 'attachments').
// Dipanggil saat online (lihat useAttachmentSync) & setelah simpan kegiatan.
// Idempoten: aman dipanggil berkali-kali; satu proses berjalan dalam satu waktu.
// =====================================================================
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { db } from '../powersync/system';
import { supabase } from '../supabaseClient';

type PendingRow = {
  id: string;
  activity_id: string;
  storage_path: string;
  local_uri: string;
  content_type: string | null;
};

let running = false;

export async function processPendingUploads(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const rows = await db.getAll<PendingRow>(
      `SELECT id, activity_id, storage_path, local_uri, content_type
         FROM pending_uploads ORDER BY created_at`,
    );

    for (const r of rows) {
      try {
        const info = await FileSystem.getInfoAsync(r.local_uri);
        if (!info.exists) {
          // File lokal hilang -> buang dari antrian agar tak macet.
          await db.execute('DELETE FROM pending_uploads WHERE id = ?', [r.id]);
          continue;
        }

        const base64 = await FileSystem.readAsStringAsync(r.local_uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const { error } = await supabase.storage
          .from('attachments')
          .upload(r.storage_path, decode(base64), {
            contentType: r.content_type ?? 'image/jpeg',
            upsert: true,
          });
        if (error) throw error;

        // Sukses: hapus antrian + file lokal (metadata tetap di tabel attachments).
        await db.execute('DELETE FROM pending_uploads WHERE id = ?', [r.id]);
        await FileSystem.deleteAsync(r.local_uri, { idempotent: true }).catch(() => {});
      } catch (e) {
        // Gagal (mis. offline / 5xx) -> catat percobaan, coba lagi siklus berikut.
        await db.execute('UPDATE pending_uploads SET attempts = attempts + 1 WHERE id = ?', [r.id]);
        console.warn('Upload foto tertunda:', r.storage_path, e);
        // Hentikan batch bila kemungkinan jaringan bermasalah (hemat baterai).
        break;
      }
    }
  } finally {
    running = false;
  }
}

// Jumlah foto yang masih menunggu upload (untuk indikator UI).
export async function pendingUploadCount(): Promise<number> {
  const r = await db.get<{ c: number }>('SELECT COUNT(*) AS c FROM pending_uploads');
  return r?.c ?? 0;
}
