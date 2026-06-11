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
