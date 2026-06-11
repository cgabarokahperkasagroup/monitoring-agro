import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useDeliveries,
  useReconciliationSummary,
  type DeliveryRow,
  type ReconRow,
} from '@/lib/queries';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/auth';
import { Badge, QueryState } from '@/components/ui';
import { daysAgoIso, fmtDate, n, n2, todayIso } from '@/lib/format';

type Tone = 'neutral' | 'ok' | 'warn' | 'danger';

function varianceTone(pct: number | null): Tone {
  if (pct == null) return 'neutral';
  const a = Math.abs(pct);
  if (a < 2) return 'ok';
  if (a < 5) return 'warn';
  return 'danger';
}

function pctText(pct: number | null): string {
  return pct == null ? '—' : `${pct > 0 ? '+' : ''}${n2(pct)}%`;
}

export default function Rekonsiliasi() {
  const [tab, setTab] = useState<'summary' | 'delivery'>('summary');
  const [from, setFrom] = useState(daysAgoIso(30));
  const [to, setTo] = useState(todayIso());

  return (
    <div>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="filters">
          <div className="field">
            <label className="label">Dari</label>
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Sampai</label>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'summary' ? 'active' : ''}`} onClick={() => setTab('summary')}>
          Ringkasan (Panen → Angkut → Terima)
        </button>
        <button className={`tab ${tab === 'delivery' ? 'active' : ''}`} onClick={() => setTab('delivery')}>
          Per Pengiriman (catat final PKS)
        </button>
      </div>

      {tab === 'summary' ? <SummaryTab from={from} to={to} /> : <DeliveryTab from={from} to={to} />}
    </div>
  );
}

// ---------------------------------------------------------------------
function SummaryTab({ from, to }: { from: string; to: string }) {
  const { data, isLoading, error } = useReconciliationSummary({ from, to });
  const rows = data ?? [];

  const totals = useMemo(() => {
    return rows.reduce(
      (a, r) => ({
        panen_janjang: a.panen_janjang + r.panen_janjang,
        kirim_janjang: a.kirim_janjang + r.kirim_janjang,
        kirim_tonase: a.kirim_tonase + r.kirim_tonase,
        terima_tonase: a.terima_tonase + r.terima_tonase,
        delivery_count: a.delivery_count + r.delivery_count,
        reconciled_count: a.reconciled_count + r.reconciled_count,
      }),
      { panen_janjang: 0, kirim_janjang: 0, kirim_tonase: 0, terima_tonase: 0, delivery_count: 0, reconciled_count: 0 },
    );
  }, [rows]);

  const selisihJanjang = (r: Pick<ReconRow, 'panen_janjang' | 'kirim_janjang'>) => {
    const diff = r.panen_janjang - r.kirim_janjang;
    const pct = r.panen_janjang > 0 ? (diff / r.panen_janjang) * 100 : null;
    return { diff, pct };
  };
  // Susut timbang: estimasi muat vs final PKS. Hanya valid bila semua terekon.
  const selisihTonase = (r: Pick<ReconRow, 'kirim_tonase' | 'terima_tonase' | 'delivery_count' | 'reconciled_count'>) => {
    if (r.reconciled_count === 0) return { diff: null as number | null, pct: null as number | null };
    const diff = r.kirim_tonase - r.terima_tonase;
    const pct = r.kirim_tonase > 0 ? (diff / r.kirim_tonase) * 100 : null;
    return { diff, pct };
  };

  return (
    <>
      <p className="muted" style={{ marginTop: 0, fontSize: 12.5 }}>
        Agregat per divisi. <strong>Selisih janjang</strong> = panen − dikirim (belum terangkut/susut lapangan).{' '}
        <strong>Susut tonase</strong> = estimasi muat − tonase final PKS (hanya pengiriman yang sudah dicatat finalnya).
      </p>
      <QueryState isLoading={isLoading} error={error} isEmpty={rows.length === 0} emptyText="Belum ada data pada periode ini.">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Divisi</th>
                <th className="num">Janjang panen</th>
                <th className="num">Janjang angkut</th>
                <th className="num">Selisih janjang</th>
                <th className="num">Est. muat (kg)</th>
                <th className="num">Diterima PKS (kg)</th>
                <th className="num">Susut tonase</th>
                <th>Rekon</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const sj = selisihJanjang(r);
                const st = selisihTonase(r);
                return (
                  <tr key={r.division_id}>
                    <td>{r.division_name ?? '—'}</td>
                    <td className="num">{n(r.panen_janjang)}</td>
                    <td className="num">{n(r.kirim_janjang)}</td>
                    <td className="num">
                      {n(sj.diff)}{' '}
                      <Badge tone={varianceTone(sj.pct)}>{pctText(sj.pct)}</Badge>
                    </td>
                    <td className="num">{n(Math.round(r.kirim_tonase))}</td>
                    <td className="num">{r.reconciled_count > 0 ? n(Math.round(r.terima_tonase)) : '—'}</td>
                    <td className="num">
                      {st.diff == null ? (
                        '—'
                      ) : (
                        <>
                          {n(Math.round(st.diff))} <Badge tone={varianceTone(st.pct)}>{pctText(st.pct)}</Badge>
                        </>
                      )}
                    </td>
                    <td>
                      <Badge tone={r.reconciled_count === r.delivery_count && r.delivery_count > 0 ? 'ok' : 'warn'}>
                        {r.reconciled_count}/{r.delivery_count}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700 }}>
                <td>Total</td>
                <td className="num">{n(totals.panen_janjang)}</td>
                <td className="num">{n(totals.kirim_janjang)}</td>
                <td className="num">{n(totals.panen_janjang - totals.kirim_janjang)}</td>
                <td className="num">{n(Math.round(totals.kirim_tonase))}</td>
                <td className="num">{totals.reconciled_count > 0 ? n(Math.round(totals.terima_tonase)) : '—'}</td>
                <td className="num">
                  {totals.reconciled_count > 0 ? n(Math.round(totals.kirim_tonase - totals.terima_tonase)) : '—'}
                </td>
                <td>
                  <Badge tone="neutral">
                    {totals.reconciled_count}/{totals.delivery_count}
                  </Badge>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </QueryState>
    </>
  );
}

// ---------------------------------------------------------------------
function reconTone(status: string | null): Tone {
  switch (status) {
    case 'matched':
      return 'ok';
    case 'discrepancy':
      return 'danger';
    case 'pending':
      return 'warn';
    default:
      return 'neutral';
  }
}

function DeliveryTab({ from, to }: { from: string; to: string }) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading, error } = useDeliveries({ from, to });
  const rows = data ?? [];

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [rowError, setRowError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (vars: { row: DeliveryRow; net: number }) => {
      const { row, net } = vars;
      if (!row.delivery_id) throw new Error('Data muatan (delivery_records) tidak ditemukan.');
      const est = row.est_tonase_muat ?? 0;
      const variance = est > 0 ? Number((((net - est) / est) * 100).toFixed(2)) : null;
      const status = variance == null ? 'pending' : Math.abs(variance) < 2 ? 'matched' : 'discrepancy';
      const { error } = await supabase.from('delivery_reconciliation').upsert(
        {
          delivery_id: row.delivery_id,
          net_tonase_pks: net,
          variance_pct: variance,
          status,
          received_time: new Date().toISOString(),
          reconciled_by: session?.user.id ?? null,
        },
        { onConflict: 'delivery_id' },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      setRowError(null);
      void qc.invalidateQueries({ queryKey: ['deliveries'] });
      void qc.invalidateQueries({ queryKey: ['recon-summary'] });
    },
    onError: (e: unknown) => setRowError((e as Error)?.message ?? 'Gagal menyimpan rekonsiliasi.'),
  });

  function save(row: DeliveryRow) {
    const raw = (drafts[row.id] ?? '').trim().replace(',', '.');
    const net = Number(raw);
    if (raw === '' || !Number.isFinite(net)) {
      setRowError('Isi tonase final (kg) yang valid.');
      return;
    }
    mutation.mutate({ row, net });
  }

  return (
    <>
      <p className="muted" style={{ marginTop: 0, fontSize: 12.5 }}>
        Masukkan tonase final dari timbangan pabrik (PKS). Selisih dihitung terhadap estimasi muat;
        &lt; 2% dianggap <strong>cocok</strong>, selebihnya <strong>selisih</strong>.
      </p>
      {rowError ? <div className="error-box" style={{ marginBottom: 14 }}>{rowError}</div> : null}
      <QueryState isLoading={isLoading} error={error} isEmpty={rows.length === 0} emptyText="Belum ada pengiriman pada periode ini.">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>SPB</th>
                <th>Divisi</th>
                <th>Tujuan PKS</th>
                <th className="num">Est. muat (kg)</th>
                <th className="num">Final PKS (kg)</th>
                <th className="num">Selisih</th>
                <th>Status</th>
                <th style={{ width: 220 }}>Catat final</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.activity_date)}</td>
                  <td>{r.spb_number ?? '—'}</td>
                  <td>{r.division_name ?? '—'}</td>
                  <td>{r.destination_pks ?? '—'}</td>
                  <td className="num">{n(r.est_tonase_muat)}</td>
                  <td className="num">{n(r.net_tonase_pks)}</td>
                  <td className="num">{r.variance_pct == null ? '—' : `${n2(r.variance_pct)}%`}</td>
                  <td>
                    <Badge tone={reconTone(r.recon_status)}>
                      {r.recon_status === 'matched'
                        ? 'Cocok'
                        : r.recon_status === 'discrepancy'
                          ? 'Selisih'
                          : r.recon_status === 'pending'
                            ? 'Pending'
                            : 'Belum'}
                    </Badge>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        className="input"
                        style={{ height: 32 }}
                        type="number"
                        placeholder="kg"
                        value={drafts[r.id] ?? ''}
                        onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                      />
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={mutation.isPending}
                        onClick={() => save(r)}
                      >
                        Simpan
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </>
  );
}
