import { useState, type ReactNode } from 'react';
import { useActivityPhotos, type ActivityRow } from '@/lib/queries';
import { Badge, Modal, QueryState } from './ui';
import { fmtDate, n } from '@/lib/format';

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
  const { data: photos, isLoading, error } = useActivityPhotos(activity?.id ?? null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const isPanen = activity?.activity_type === 'panen';

  return (
    <>
      <Modal
        open={!!activity}
        onClose={onClose}
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
              <Row label="Status" value={activity.status} />
            </div>
            {activity.notes ? (
              <div className="detail-notes">
                <span className="detail-label">Catatan</span>
                <p>{activity.notes}</p>
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
