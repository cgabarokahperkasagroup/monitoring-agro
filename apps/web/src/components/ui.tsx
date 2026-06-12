// Komponen UI tingkat-aplikasi (dipakai semua halaman dashboard).
// Dibangun di atas primitif shadcn di components/ui/*. API dijaga stabil.
import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Card as ShadCard } from '@/components/ui/card';
import { Badge as ShadBadge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function Spinner() {
  return <span className="spinner" aria-label="memuat" />;
}

// Modal sederhana (overlay + kartu). Tutup via backdrop / tombol / Esc.
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal-card ${wide ? 'modal-wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose} aria-label="Tutup">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

type Tone = 'neutral' | 'ok' | 'info' | 'warn' | 'danger';
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return <ShadBadge tone={tone}>{children}</ShadBadge>;
}

export function Card({
  children,
  className = '',
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <ShadCard className={cn('p-5', className)} style={style}>
      {children}
    </ShadCard>
  );
}

export function Kpi({ label, value, foot }: { label: string; value: ReactNode; foot?: ReactNode }) {
  return (
    <Card>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {foot ? <div className="kpi-foot">{foot}</div> : null}
    </Card>
  );
}

// Pembungkus status query: loading / error / kosong / konten.
export function QueryState({
  isLoading,
  error,
  isEmpty,
  emptyText = 'Belum ada data.',
  children,
}: {
  isLoading: boolean;
  error?: unknown;
  isEmpty?: boolean;
  emptyText?: string;
  children: ReactNode;
}) {
  if (isLoading)
    return (
      <div className="loading">
        <Spinner />
        <div style={{ marginTop: 10 }}>Memuat…</div>
      </div>
    );
  if (error)
    return <div className="error-box">Gagal memuat data: {(error as Error)?.message ?? 'kesalahan tak diketahui'}</div>;
  if (isEmpty) return <div className="empty">{emptyText}</div>;
  return <>{children}</>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <Label className="mb-1.5">{label}</Label>
      {children}
    </div>
  );
}
