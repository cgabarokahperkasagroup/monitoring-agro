// Helper format angka & tanggal (locale Indonesia).
const nf = new Intl.NumberFormat('id-ID');
const nf2 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });

export function n(v: number | null | undefined): string {
  return v == null ? '—' : nf.format(v);
}
export function n2(v: number | null | undefined): string {
  return v == null ? '—' : nf2.format(v);
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  const [y, m, day] = d.slice(0, 10).split('-');
  return y ? `${day}/${m}/${y}` : d;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgoIso(days: number): string {
  const t = new Date();
  t.setDate(t.getDate() - days);
  return t.toISOString().slice(0, 10);
}

// Tanggal + jam (untuk audit log & status sinkron).
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Selisih waktu relatif ("3 jam lalu").
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso).getTime();
  if (!Number.isFinite(d)) return '—';
  const sec = Math.max(0, Math.floor((Date.now() - d) / 1000));
  if (sec < 60) return `${sec} dtk lalu`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

// Selisih jam dari sekarang (untuk menentukan badge kesegaran).
export function hoursSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso).getTime();
  if (!Number.isFinite(d)) return null;
  return (Date.now() - d) / 3_600_000;
}
