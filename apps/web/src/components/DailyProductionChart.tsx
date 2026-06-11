// =====================================================================
// Grafik produksi harian — SVG murni (tanpa dependensi). Bar chart dengan
// pilihan metrik. Responsif via viewBox; tooltip native lewat <title>.
// =====================================================================
import { useMemo, useState } from 'react';
import type { DailyPoint } from '@/lib/daily';
import { fmtDate, n } from '@/lib/format';

type MetricKey = 'panenJanjang' | 'panenTonase' | 'kirimJanjang';
const METRICS: { key: MetricKey; label: string; color: string }[] = [
  { key: 'panenJanjang', label: 'Janjang panen', color: '#15803d' },
  { key: 'panenTonase', label: 'Tonase panen (kg)', color: '#0e7490' },
  { key: 'kirimJanjang', label: 'Janjang dikirim', color: '#b45309' },
];

// Pembulatan ke angka "rapi" (1/2/5 × 10^k) untuk batas atas sumbu Y.
function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const f = v / base;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * base;
}

const W = 800;
const H = 260;
const PAD = { l: 52, r: 14, t: 14, b: 30 };
const innerW = W - PAD.l - PAD.r;
const innerH = H - PAD.t - PAD.b;
const bottom = PAD.t + innerH;

export function DailyProductionChart({ data }: { data: DailyPoint[] }) {
  const [metric, setMetric] = useState<MetricKey>('panenJanjang');
  const m = METRICS.find((x) => x.key === metric)!;

  const values = useMemo(() => data.map((d) => d[metric]), [data, metric]);
  const total = values.reduce((a, b) => a + b, 0);
  const max = niceCeil(Math.max(1, ...values));

  const n0 = data.length || 1;
  const step = innerW / n0;
  const barW = Math.max(1, Math.min(step * 0.7, 26));
  const tickEvery = Math.max(1, Math.ceil(n0 / 8));
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="card">
      <div className="row-between" style={{ marginBottom: 12 }}>
        <strong>Produksi Harian</strong>
        <div className="tabs" style={{ margin: 0 }}>
          {METRICS.map((x) => (
            <button
              key={x.key}
              className={`tab ${metric === x.key ? 'active' : ''}`}
              onClick={() => setMetric(x.key)}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <div className="empty" style={{ padding: '32px 0' }}>Belum ada produksi pada periode ini.</div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img">
          {/* gridlines + label sumbu Y */}
          {gridLines.map((g) => {
            const y = PAD.t + innerH * (1 - g);
            return (
              <g key={g}>
                <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#e6eae8" strokeWidth={1} />
                <text x={PAD.l - 8} y={y + 4} textAnchor="end" fontSize={11} fill="#94a3b8">
                  {n(Math.round(max * g))}
                </text>
              </g>
            );
          })}

          {/* batang */}
          {data.map((d, i) => {
            const v = values[i];
            const h = (innerH * v) / max;
            const x = PAD.l + i * step + (step - barW) / 2;
            return (
              <rect key={d.date} x={x} y={bottom - h} width={barW} height={h} rx={2} fill={m.color}>
                <title>{`${fmtDate(d.date)}: ${n(v)} ${m.label}`}</title>
              </rect>
            );
          })}

          {/* label sumbu X (jarang) */}
          {data.map((d, i) =>
            i % tickEvery === 0 ? (
              <text
                key={`t${d.date}`}
                x={PAD.l + i * step + step / 2}
                y={H - 10}
                textAnchor="middle"
                fontSize={10}
                fill="#94a3b8"
              >
                {d.date.slice(8, 10)}/{d.date.slice(5, 7)}
              </text>
            ) : null,
          )}
        </svg>
      )}
    </div>
  );
}
