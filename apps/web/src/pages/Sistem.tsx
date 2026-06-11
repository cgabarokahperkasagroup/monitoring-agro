import { useMemo, useState } from 'react';
import {
  useAuditLogs,
  useDeviceSyncStatus,
  useProfiles,
  type AuditLog,
  type DeviceSync,
} from '@/lib/queries';
import { useAuth } from '@/lib/auth';
import { ExportButtons } from '@/components/ExportButtons';
import { Badge, Card, Field, Modal, QueryState } from '@/components/ui';
import { fmtDate, fmtDateTime, hoursSince, timeAgo } from '@/lib/format';
import type { ExportColumn } from '@/lib/export';

function syncTone(iso: string | null): { tone: 'ok' | 'warn' | 'danger' | 'neutral'; label: string } {
  const h = hoursSince(iso);
  if (h == null) return { tone: 'neutral', label: 'Belum ada' };
  if (h < 24) return { tone: 'ok', label: 'Aktif' };
  if (h < 24 * 7) return { tone: 'warn', label: 'Lambat' };
  return { tone: 'danger', label: 'Tidak aktif' };
}

function actionTone(a: string): 'ok' | 'info' | 'warn' | 'danger' | 'neutral' {
  switch (a) {
    case 'create':
      return 'ok';
    case 'approve':
      return 'info';
    case 'update':
      return 'neutral';
    case 'reject':
      return 'warn';
    case 'delete':
      return 'danger';
    default:
      return 'neutral';
  }
}

export default function Sistem() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin_grup';

  return (
    <div>
      <DeviceSyncSection />
      {isAdmin ? (
        <AuditSection />
      ) : (
        <Card>
          <strong>Audit Log</strong>
          <p className="muted" style={{ marginBottom: 0, marginTop: 8 }}>
            Audit log hanya dapat dilihat oleh admin grup / super admin.
          </p>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
function DeviceSyncSection() {
  const sync = useDeviceSyncStatus();
  const profiles = useProfiles();
  const rows = sync.data ?? [];

  const nameOf = useMemo(() => {
    const m = new Map((profiles.data ?? []).map((p) => [p.id, p]));
    return (id: string) => m.get(id);
  }, [profiles.data]);

  const exportRows = rows.map((r) => ({ ...r, _name: nameOf(r.created_by)?.full_name ?? r.created_by }));
  const COLUMNS: ExportColumn<(typeof exportRows)[number]>[] = [
    { header: 'Pengguna', value: (r) => r._name },
    { header: 'Role', value: (r) => nameOf(r.created_by)?.role ?? '' },
    { header: 'Perangkat', value: (r) => r.source_device ?? '' },
    { header: 'Catatan', value: (r) => r.total },
    { header: 'Kegiatan terakhir', value: (r) => fmtDate(r.last_activity) },
    { header: 'Terakhir terkirim', value: (r) => fmtDateTime(r.last_seen) },
  ];

  return (
    <Card style={{ marginBottom: 18 }}>
      <div className="row-between" style={{ marginBottom: 14 }}>
        <div>
          <strong>Status Sinkron Perangkat</strong>
          <div className="page-sub">Per pencatat — diturunkan dari data kegiatan yang sudah tersinkron.</div>
        </div>
        <ExportButtons
          title="Status Sinkron Perangkat — Monitoring Agro"
          filename="status-sinkron-perangkat"
          columns={COLUMNS}
          rows={exportRows}
        />
      </div>
      <QueryState
        isLoading={sync.isLoading}
        error={sync.error}
        isEmpty={rows.length === 0}
        emptyText="Belum ada data tersinkron dari perangkat."
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pengguna</th>
                <th>Role</th>
                <th>Perangkat</th>
                <th className="num">Catatan</th>
                <th>Kegiatan terakhir</th>
                <th>Terakhir terkirim</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: DeviceSync) => {
                const p = nameOf(r.created_by);
                const s = syncTone(r.last_seen);
                return (
                  <tr key={`${r.created_by}-${r.source_device ?? ''}`}>
                    <td>{p?.full_name ?? <span className="muted">{r.created_by.slice(0, 8)}…</span>}</td>
                    <td className="muted">{p?.role ?? '—'}</td>
                    <td>{r.source_device ?? '—'}</td>
                    <td className="num">{r.total}</td>
                    <td>{fmtDate(r.last_activity)}</td>
                    <td title={fmtDateTime(r.last_seen)}>{timeAgo(r.last_seen)}</td>
                    <td><Badge tone={s.tone}>{s.label}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </QueryState>
    </Card>
  );
}

// ---------------------------------------------------------------------
const ACTIONS = ['', 'create', 'update', 'approve', 'reject', 'delete'];

function AuditSection() {
  const [action, setAction] = useState('');
  const [detail, setDetail] = useState<AuditLog | null>(null);
  const { data, isLoading, error } = useAuditLogs({ action: action || undefined });
  const rows = data ?? [];

  const COLUMNS: ExportColumn<AuditLog>[] = [
    { header: 'Waktu', value: (r) => fmtDateTime(r.created_at) },
    { header: 'Aktor', value: (r) => r.actor_name },
    { header: 'Aksi', value: (r) => r.action },
    { header: 'Tabel', value: (r) => r.entity_table },
    { header: 'Entity', value: (r) => r.entity_id },
  ];

  return (
    <Card>
      <div className="row-between" style={{ marginBottom: 14 }}>
        <strong>Audit Log</strong>
        <ExportButtons title="Audit Log — Monitoring Agro" filename="audit-log" columns={COLUMNS} rows={rows} />
      </div>
      <div className="filters" style={{ marginBottom: 14 }}>
        <Field label="Aksi">
          <select className="select" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">Semua aksi</option>
            {ACTIONS.filter(Boolean).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </Field>
      </div>

      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={rows.length === 0}
        emptyText="Belum ada entri audit (audit dicatat saat status kegiatan diubah/diverifikasi)."
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Aktor</th>
                <th>Aksi</th>
                <th>Tabel</th>
                <th>Entity</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="clickable" onClick={() => setDetail(r)}>
                  <td title={fmtDateTime(r.created_at)}>{timeAgo(r.created_at)}</td>
                  <td>{r.actor_name ?? '—'}</td>
                  <td><Badge tone={actionTone(r.action)}>{r.action}</Badge></td>
                  <td>{r.entity_table}</td>
                  <td className="muted">{r.entity_id ? `${r.entity_id.slice(0, 8)}…` : '—'}</td>
                  <td><span className="muted">Detail →</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>

      <Modal open={!!detail} onClose={() => setDetail(null)} wide title="Detail Audit">
        {detail ? (
          <>
            <div className="detail-grid" style={{ marginBottom: 14 }}>
              <div className="detail-row"><span className="detail-label">Waktu</span><span className="detail-value">{fmtDateTime(detail.created_at)}</span></div>
              <div className="detail-row"><span className="detail-label">Aktor</span><span className="detail-value">{detail.actor_name ?? '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Aksi</span><span className="detail-value">{detail.action}</span></div>
              <div className="detail-row"><span className="detail-label">Tabel</span><span className="detail-value">{detail.entity_table}</span></div>
            </div>
            <div className="audit-diff">
              <div>
                <div className="detail-label">Sebelum</div>
                <pre className="audit-json">{detail.before ? JSON.stringify(detail.before, null, 2) : '—'}</pre>
              </div>
              <div>
                <div className="detail-label">Sesudah</div>
                <pre className="audit-json">{detail.after ? JSON.stringify(detail.after, null, 2) : '—'}</pre>
              </div>
            </div>
          </>
        ) : null}
      </Modal>
    </Card>
  );
}
