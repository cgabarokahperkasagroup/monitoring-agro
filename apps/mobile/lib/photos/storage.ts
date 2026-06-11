// =====================================================================
// Simpan foto lapangan secara LOKAL (offline-aman) sebelum di-upload.
// Foto dikompres (resize + JPEG) lalu disalin ke documentDirectory agar
// tahan walau cache picker dibersihkan. Path objek Storage mengikuti
// konvensi migration 016: {division_id}/{activity_id}/{photoId}.jpg
// =====================================================================
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { newId } from '../id';

export type LocalPhoto = { id: string; uri: string };

export type PersistedPhoto = {
  id: string;
  storage_path: string;
  local_uri: string;
  content_type: string;
};

const MAX_WIDTH = 1280;
const COMPRESS = 0.6;

export async function persistPhotos(
  activityId: string,
  divisionId: string,
  photos: LocalPhoto[],
): Promise<PersistedPhoto[]> {
  if (!photos.length) return [];
  const dir = `${FileSystem.documentDirectory}attachments/${activityId}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});

  const out: PersistedPhoto[] = [];
  for (const p of photos) {
    const manipulated = await ImageManipulator.manipulateAsync(
      p.uri,
      [{ resize: { width: MAX_WIDTH } }],
      { compress: COMPRESS, format: ImageManipulator.SaveFormat.JPEG },
    );
    const photoId = newId();
    const localUri = `${dir}${photoId}.jpg`;
    await FileSystem.copyAsync({ from: manipulated.uri, to: localUri });
    out.push({
      id: photoId,
      storage_path: `${divisionId}/${activityId}/${photoId}.jpg`,
      local_uri: localUri,
      content_type: 'image/jpeg',
    });
  }
  return out;
}
