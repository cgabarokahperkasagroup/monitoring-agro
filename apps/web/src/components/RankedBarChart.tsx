// Bar chart horizontal berperingkat (div/CSS, tanpa dependensi).
// Cocok untuk kategori dengan label panjang (nama divisi/karyawan).
import { n } from '@/lib/format';

export type RankedItem = { label: string; sub?: string; value: number };

export function RankedBarChart({
  items,
  color = '#15803d',
  unit,
}: {
  items: RankedItem[];
  color?: string;
  unit?: string;
}) {
  if (items.length === 0) return null;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="rbar-list">
      {items.map((it, idx) => {
        const pct = (it.value / max) * 100;
        return (
          <div className="rbar-row" key={`${it.label}-${idx}`}>
            <div className="rbar-label" title={it.label}>
              <span className="rbar-rank">{idx + 1}.</span> {it.label}
              {it.sub ? <span className="rbar-sub"> · {it.sub}</span> : null}
            </div>
            <div className="rbar-track">
              <div className="rbar-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
            <div className="rbar-value">
              {n(it.value)}
              {unit ? <span className="muted"> {unit}</span> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
