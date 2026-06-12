import { useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActivityPhotos, type ActivityRow } from '@/lib/queries';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/auth';
import { activityStatusLabel, activityStatusTone } from '@/lib/status';
import { Badge, Modal, QueryState } from './ui';
import { fmtDate, n } from '@/lib/format';

const VERIFY_ROLES = ['asisten', 'manager_kebun', 'admin_grup', 'super_admin'];

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value ?? '—'}</span>
    </div>
  );
}

export function ActivityDetailModal({
  activity,
  onClose,
}: {
  activity: ActivityRow | null;
  onClose: () => void;
}) {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const { data: photos, isLoading, error } = useActivityPhotos(activity?.id ?? null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const isPanen = activity?.activity_type === 'panen';
  const canVerify = !!profile?.role && VERIFY_ROLES.includes(profile.role);
  const isSubmitted = activity?.status === 'submitted';

  const verify = useMutation({
    mutationFn: async (vars: { status: 'approved' | 'rejected'; reason?: string }) => {
      if (!activity) return;
      const patch: Record<string, unknown> = { status: vars.status };
      if (vars.status === 'rejected' && vars.reason?.trim()) {
        patch.notes = `${activity.notes ? activity.notes + '\n' : ''}Ditolak: ${vars.reason.trim()}`;
      }
      const { error } = await supabase.from('activities').update(patch).eq('id', activity.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setErr(null);
      setRejecting(false);
      setReason('');
      void qc.invalidateQueries({ queryKey: ['activities'] });
      onClose();
    },
    onError: (e: unknown) => setErr((e as Error)?.message ?? 'Gagal memperbarui status.'),
  });

  function close() {
    setRejecting(false);
    setReason('');
    setErr(null);
    onClose();
  }

  return (
    <>
      <Modal
        open={!!activity}
        onClose={close}
        title={
          activity ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Badge tone={isPanen ? 'ok' : 'info'}>{isPanen ? 'Panen' : 'Pengiriman'}</Badge>
              {fmtDate(activity.activity_date)}
            </span>
          ) : null
        }
      >
        {activity ? (
          <>
            <div className="detail-grid">
              <Row label="Estate" value={activity.estate_name} />
              <Row label="Divisi" value={activity.division_name} />
              {isPanen ? <Row label="Blok" value={activity.block_code} /> : null}
              <Row label="Janjang" value={n(activity.total_janjang)} />
              <Row label="Est. tonase" value={n(activity.est_tonase)} />
              {!isPanen ? <Row label="SPB" value={activity.spb_number} /> : null}
              {!isPanen ? <Row label="Tujuan PKS" value={activity.destination_pks} /> : null}
              <Row
                label="Status"
                value={<Badge tone={activityStatusTone(activity.status)}>{activityStatusLabel(activity.status)}</Badge>}
              />
            </div>
            {activity.notes ? (
              <div className="detail-notes">
                <span className="detail-label">Catatan</span>
                <p style={{ whiteSpace: 'pre-wrap' }}>{activity.notes}</p>
              </div>
            ) : null}

            {/* Verifikasi (asisten / manajer / admin) untuk kegiatan submitted */}
            {canVerify && isSubmitted ? (
              <div className="verify-bar">
                {err ? <div className="error-box" style={{ marginBottom: 10 }}>{err}</div> : null}
                {rejecting ? (
                  <>
                    <textarea
                      className="input"
                      style={{ height: 64, padding: 10, resize: 'vertical' }}
                      placeholder="Alasan penolakan (opsional, dikirim ke pencatat lewat catatan)"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button
                        className="btn btn-sm"
                        disabled={verify.isPending}
                        onClick={() => verify.mutate({ status: 'rejected', reason })}
                      >
                        Konfirmasi tolak
                      </button>
                      <button className="btn btn-sm" onClick={() => setRejecting(false)}>Batal</button>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-sm btn-primary"
                      disabled={verify.isPending}
                      onClick={() => verify.mutate({ status: 'approved' })}
                    >
                      ✓ Setujui
                    </button>
                    <button className="btn btn-sm" disabled={verify.isPending} onClick={() => setRejecting(true)}>
                      ✕ Tolak
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            <div className="section-title" style={{ marginTop: 18 }}>
              Foto bukti {photos && photos.length > 0 ? `(${photos.length})` : ''}
            </div>
            <QueryState
              isLoading={isLoading}
              error={error}
              isEmpty={(photos ?? []).length === 0}
              emptyText="Tidak ada foto untuk kegiatan ini."
            >
              <div className="photo-grid">
                {(photos ?? []).map((p) =>
                  p.url ? (
                    <button key={p.id} className="photo-thumb" onClick={() => setLightbox(p.url)}>
                      <img src={p.url} alt="foto bukti" loading="lazy" />
                    </button>
                  ) : (
                    <div key={p.id} className="photo-thumb photo-missing" title="URL gagal dibuat">
                      ⚠
                    </div>
                  ),
                )}
              </div>
            </QueryState>
          </>
        ) : null}
      </Modal>

      {lightbox ? (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="foto bukti" onClick={(e) => e.stopPropagation()} />
          <button className="lightbox-close" onClick={() => setLightbox(null)} aria-label="Tutup">
            ✕
          </button>
        </div>
      ) : null}
    </>
  );
}
