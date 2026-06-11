import { useProfiles } from '@/lib/queries';
import { Badge, QueryState } from '@/components/ui';

function roleTone(role: string | null): 'ok' | 'info' | 'warn' | 'neutral' {
  switch (role) {
    case 'super_admin':
    case 'admin_grup':
      return 'warn';
    case 'manager_kebun':
      return 'info';
    case 'asisten':
    case 'mandor':
      return 'ok';
    default:
      return 'neutral';
  }
}

export default function Pengguna() {
  const { data, isLoading, error } = useProfiles();
  const rows = data ?? [];

  return (
    <div>
      <p className="muted" style={{ marginTop: 0 }}>
        Daftar pengguna & cakupan akses (estate/divisi). Pengelolaan role/scope dilakukan oleh admin grup.
      </p>
      <QueryState isLoading={isLoading} error={error} isEmpty={rows.length === 0}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Role</th>
                <th className="num">Cakupan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>{p.full_name ?? '—'}</td>
                  <td><Badge tone={roleTone(p.role)}>{p.role ?? '—'}</Badge></td>
                  <td className="num">{p.scopes.length === 0 ? '—' : `${p.scopes.length} scope`}</td>
                  <td><Badge tone={p.is_active ? 'ok' : 'neutral'}>{p.is_active ? 'Aktif' : 'Nonaktif'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </div>
  );
}
