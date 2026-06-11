// UUID v4 untuk id & client_uuid (offline-aman, tak perlu server).
import * as Crypto from 'expo-crypto';

export function newId(): string {
  return Crypto.randomUUID();
}

// Stempel waktu ISO untuk created_at/updated_at.
export function nowIso(): string {
  return new Date().toISOString();
}

// Tanggal hari ini (YYYY-MM-DD) untuk activity_date default.
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
