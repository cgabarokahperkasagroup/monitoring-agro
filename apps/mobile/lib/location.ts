// =====================================================================
// Ambil koordinat GPS perangkat (best-effort, opsional) untuk distempel
// pada kegiatan. Tidak memblokir alur input bila izin ditolak / gagal.
// =====================================================================
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export type Coords = { lat: number; lng: number };
export type GpsStatus = 'loading' | 'ok' | 'denied' | 'error';

export function useDeviceCoords() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<GpsStatus>('loading');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) {
          if (active) setStatus('denied');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!active) return;
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus('ok');
      } catch {
        if (active) setStatus('error');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return { coords, status };
}
