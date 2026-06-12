import { useMemo, useState } from 'react';
import { useActivities, useDivisions, useEstates, type ActivityFilters, type ActivityRow } from '@/lib/queries';
import { ActivityDetailModal } from '@/components/ActivityDetailModal';
import { ExportButtons } from '@/components/ExportButtons';
import { Badge, Field, QueryState } from '@/components/ui';
import { daysAgoIso, fmtDate, n, todayIso } from '@/lib/format';
import { ACTIVITY_STATUSES, activityStatusLabel, activityStatusTone } from '@/lib/status';
import type { ExportColumn } from '@/lib/export';

const KEGIATAN_COLUMNS: ExportColumn<ActivityRow>[] = [
  { header: 'Tanggal', value: (r) => fmtDate(r.activity_date) },
  { header: 'Jenis', value: (r) => (r.activity_type === 'panen' ? 'Panen' : 'Pengiriman') },
  { header: 'Estate', value: (r) => r.estate_name },
  { header: 'Divisi', value: (r) => r.division_name },
  { header: 'Blok', value: (r) => r.block_code },
  { header: 'Janjang', value: (r) => r.total_janjang },
  { header: 'Est. tonase', value: (r) => r.est_tonase },
  { header: 'SPB/Tujuan', value: (r) => r.spb_number ?? r.destination_pks },
  { header: 'Status', value: (r) => r.status },
  { header: 'Jml foto', value: (r) => r.photo_count },
];

export default function Kegiatan() {
  const [type, setType] = useState<ActivityFilters['type']>('all');
  const [estateId, setEstateId] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState(daysAgoIso(30));
  const [to, setTo] = useState(todayIso());
  const [detail, setDetail] = useState<ActivityRow | null>(null);

  const { data: estates } = useEstates();
  const { data: divisions } = useDivisions();

  const divisionOptions = useMemo(
    () => (divisions ?? []).filter((d) => !estateId || d.estate_id === estateId),
    [divisions, estateId],
  );

  const { data, isLoading, error } = useActivities({ type, estateId, divisionId, status, from, to });
  const rows = data ?? [];

  return (
    <div>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="filters">
          <Field label="Jenis">
            <select className="select" value={type} onChange={(e) => setType(e.target.value as ActivityFilters['type'])}>
              <option value="all">Semua</option>
              <option value="panen">Panen</option>
              <option value="pengiriman">Pengiriman</option>
            </select>
          </Field>
          <Field label="Estate">
            <select
              className="select"
              value={estateId}
              onChange={(e) => {
                setEstateId(e.target.value);
                setDivisionId('');
              }}
            >
              <option value="">Semua estate</option>
              {(estates ?? []).map((es) => (
                <option key={es.id} value={es.id}>{es.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Divisi">
            <select className="select" value={divisionId} onChange={(e) => setDivisionId(e.target.value)}>
              <option value="">Semua divisi</option>
              {divisionOptions.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Semua status</option>
              {ACTIVITY_STATUSES.map((s) => (
                <option key={s} value={s}>{activityStatusLabel(s)}</option>
              ))}
            </select>
          </Field>
          <Field label="Dari">
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="Sampai">
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
      </div>

      <QueryState isLoading={isLoading} error={error} isEmpty={rows.length === 0} emptyText="Tidak ada kegiatan sesuai filter.">
        <div className="row-between" style={{ marginBottom: 10 }}>
          <span className="muted">{rows.length} kegiatan</span>
          <ExportButtons
            title="Daftar Kegiatan — Monitoring Agro"
            subtitle={`Periode ${fmtDate(from)} – ${fmtDate(to)}`}
            filename={`kegiatan_${from}_sd_${to}`}
            columns={KEGIATAN_COLUMNS}
            rows={rows}
          />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Jenis</th>
                <th>Estate</th>
                <th>Divisi</th>
                <th>Blok</th>
                <th className="num">Janjang</th>
                <th className="num">Est. tonase</th>
                <th>SPB / Tujuan</th>
                <th>Status</th>
                <th>Foto</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="clickable" onClick={() => setDetail(r)}>
                  <td>{fmtDate(r.activity_date)}</td>
                  <td>
                    <Badge tone={r.activity_type === 'panen' ? 'ok' : 'info'}>
                      {r.activity_type === 'panen' ? 'Panen' : 'Pengiriman'}
                    </Badge>
                  </td>
                  <td>{r.estate_name ?? '—'}</td>
                  <td>{r.division_name ?? '—'}</td>
                  <td>{r.block_code ?? '—'}</td>
                  <td className="num">{n(r.total_janjang)}</td>
                  <td className="num">{n(r.est_tonase)}</td>
                  <td>{r.spb_number ?? r.destination_pks ?? '—'}</td>
                  <td><Badge tone={activityStatusTone(r.status)}>{activityStatusLabel(r.status)}</Badge></td>
                  <td>{r.photo_count > 0 ? <Badge tone="neutral">📷 {r.photo_count}</Badge> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          Klik baris untuk melihat detail & foto bukti.
        </p>
      </QueryState>

      <ActivityDetailModal activity={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
