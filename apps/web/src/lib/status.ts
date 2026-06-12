// Label & warna status kegiatan (enum agro.activity_status).
export type ActivityStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | string | null;

export function activityStatusLabel(s: ActivityStatus): string {
  switch (s) {
    case 'draft':
      return 'Draft';
    case 'submitted':
      return 'Menunggu verifikasi';
    case 'approved':
      return 'Disetujui';
    case 'rejected':
      return 'Ditolak';
    default:
      return s || '—';
  }
}

export function activityStatusTone(s: ActivityStatus): 'neutral' | 'ok' | 'info' | 'warn' | 'danger' {
  switch (s) {
    case 'approved':
      return 'ok';
    case 'submitted':
      return 'info';
    case 'rejected':
      return 'danger';
    case 'draft':
      return 'warn';
    default:
      return 'neutral';
  }
}

export const ACTIVITY_STATUSES = ['draft', 'submitted', 'approved', 'rejected'] as const;
