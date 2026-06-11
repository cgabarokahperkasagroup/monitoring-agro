// Agregasi kegiatan menjadi deret harian (panen & pengiriman) untuk grafik.
import type { ActivityRow } from './queries';

export type DailyPoint = {
  date: string; // YYYY-MM-DD
  panenJanjang: number;
  panenTonase: number;
  kirimJanjang: number;
};

function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return out;
  // Batasi agar tidak membuat ribuan titik bila rentang aneh.
  const MAX = 400;
  for (let t = start, i = 0; t <= end && i < MAX; t += 86400000, i++) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

export function buildDailySeries(rows: ActivityRow[], from: string, to: string): DailyPoint[] {
  const map = new Map<string, DailyPoint>();
  for (const day of eachDay(from, to)) {
    map.set(day, { date: day, panenJanjang: 0, panenTonase: 0, kirimJanjang: 0 });
  }
  for (const r of rows) {
    const key = (r.activity_date ?? '').slice(0, 10);
    const p = map.get(key);
    if (!p) continue;
    if (r.activity_type === 'panen') {
      p.panenJanjang += r.total_janjang ?? 0;
      p.panenTonase += r.est_tonase ?? 0;
    } else if (r.activity_type === 'pengiriman') {
      p.kirimJanjang += r.total_janjang ?? 0;
    }
  }
  return [...map.values()];
}
