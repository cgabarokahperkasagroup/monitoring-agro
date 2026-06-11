import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDeliveries, type DeliveryRow } from '@/lib/queries';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/auth';
import { Badge, QueryState } from '@/components/ui';
import { daysAgoIso, fmtDate, n, n2, todayIso } from '@/lib/format';

function reconTone(status: string | null): 'neutral' | 'ok' | 'warn' | 'danger' {
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

export default function Rekonsiliasi() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [from, setFrom] = useState(daysAgoIso(30));
  const [to, setTo] = useState(todayIso());
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
        <p className="muted" style={{ marginBottom: 0, marginTop: 12, fontSize: 12.5 }}>
          Masukkan tonase final dari timbangan pabrik (PKS). Selisih dihitung terhadap estimasi muat;
          &lt; 2% dianggap <strong>cocok</strong>, selebihnya <strong>selisih</strong>.
        </p>
      </div>

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
    </div>
  );
}
