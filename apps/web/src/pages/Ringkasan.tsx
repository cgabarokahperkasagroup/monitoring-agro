import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useActivities } from '@/lib/queries';
import { Badge, Kpi, QueryState } from '@/components/ui';
import { daysAgoIso, fmtDate, n, todayIso } from '@/lib/format';

const PERIODS = [
  { days: 7, label: '7 hari' },
  { days: 30, label: '30 hari' },
  { days: 90, label: '90 hari' },
];

export default function Ringkasan() {
  const [days, setDays] = useState(30);
  const from = daysAgoIso(days);
  const { data, isLoading, error } = useActivities({ type: 'all', from, to: todayIso() });

  const k = useMemo(() => {
    const rows = data ?? [];
    const panen = rows.filter((r) => r.activity_type === 'panen');
    const kirim = rows.filter((r) => r.activity_type === 'pengiriman');
    const sum = (arr: typeof rows, f: (r: (typeof rows)[number]) => number | null) =>
      arr.reduce((a, r) => a + (f(r) ?? 0), 0);
    return {
      janjangPanen: sum(panen, (r) => r.total_janjang),
      tonasePanen: sum(panen, (r) => r.est_tonase),
      janjangKirim: sum(kirim, (r) => r.total_janjang),
      jmlPanen: panen.length,
      jmlKirim: kirim.length,
    };
  }, [data]);

  const recent = (data ?? []).slice(0, 8);

  return (
    <div>
      <div className="tabs">
        {PERIODS.map((p) => (
          <button key={p.days} className={`tab ${days === p.days ? 'active' : ''}`} onClick={() => setDays(p.days)}>
            {p.label}
          </button>
        ))}
        <span className="muted" style={{ alignSelf: 'center', fontSize: 12 }}>
          sejak {fmtDate(from)}
        </span>
      </div>

      <QueryState isLoading={isLoading} error={error}>
        <div className="grid grid-kpi">
          <Kpi label="Janjang panen" value={n(k.janjangPanen)} foot={`${k.jmlPanen} catatan panen`} />
          <Kpi label="Estimasi tonase panen (kg)" value={n(Math.round(k.tonasePanen))} />
          <Kpi label="Janjang dikirim" value={n(k.janjangKirim)} foot={`${k.jmlKirim} pengiriman`} />
          <Kpi
            label="Selisih janjang"
            value={n(k.janjangPanen - k.janjangKirim)}
            foot="panen − dikirim (periode)"
          />
        </div>

        <div className="row-between section-title">
          <span>Kegiatan Terbaru</span>
          <Link to="/kegiatan" className="btn btn-sm">Lihat semua</Link>
        </div>

        {recent.length === 0 ? (
          <div className="empty">Belum ada kegiatan pada periode ini.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Jenis</th>
                  <th>Divisi</th>
                  <th>Blok</th>
                  <th className="num">Janjang</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id}>
                    <td>{fmtDate(r.activity_date)}</td>
                    <td>
                      <Badge tone={r.activity_type === 'panen' ? 'ok' : 'info'}>
                        {r.activity_type === 'panen' ? 'Panen' : 'Pengiriman'}
                      </Badge>
                    </td>
                    <td>{r.division_name ?? '—'}</td>
                    <td>{r.block_code ?? '—'}</td>
                    <td className="num">{n(r.total_janjang)}</td>
                    <td className="muted">{r.status ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryState>
    </div>
  );
}
