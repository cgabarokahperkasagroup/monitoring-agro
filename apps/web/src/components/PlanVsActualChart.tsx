// Bar chart "realisasi vs rencana" per kategori (div/CSS, tanpa dependensi).
import { Badge } from './ui';
import { n } from '@/lib/format';

export type PlanActualItem = { label: string; plan: number; actual: number };

function tone(pct: number | null): 'neutral' | 'ok' | 'warn' | 'danger' {
  if (pct == null) return 'neutral';
  if (pct >= 95) return 'ok';
  if (pct >= 70) return 'warn';
  return 'danger';
}

export function PlanVsActualChart({ items, unit = 'kg' }: { items: PlanActualItem[]; unit?: string }) {
  if (items.length === 0) return null;
  const max = Math.max(1, ...items.flatMap((i) => [i.plan, i.actual]));

  return (
    <div>
      <div className="pva-legend">
        <span><i className="pva-key pva-plan" /> Rencana</span>
        <span><i className="pva-key pva-actual" /> Realisasi</span>
      </div>
      <div className="rbar-list">
        {items.map((it, idx) => {
          const pct = it.plan > 0 ? (it.actual / it.plan) * 100 : null;
          return (
            <div className="pva-row" key={`${it.label}-${idx}`}>
              <div className="rbar-label" title={it.label}>{it.label}</div>
              <div className="pva-bars">
                <div className="pva-bar">
                  <div className="pva-fill pva-plan" style={{ width: `${(it.plan / max) * 100}%` }} />
                </div>
                <div className="pva-bar">
                  <div className="pva-fill pva-actual" style={{ width: `${(it.actual / max) * 100}%` }} />
                </div>
              </div>
              <div className="rbar-value">
                {n(Math.round(it.actual))} / {n(Math.round(it.plan))} {unit}{' '}
                <Badge tone={tone(pct)}>{pct == null ? 'tanpa rencana' : `${Math.round(pct)}%`}</Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
