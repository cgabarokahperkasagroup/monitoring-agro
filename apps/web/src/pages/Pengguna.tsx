import { useState } from 'react';
import { useProfiles, type ProfileRow } from '@/lib/queries';
import { useAuth } from '@/lib/auth';
import { UserManageModal } from '@/components/UserManageModal';
import { CreateUserModal } from '@/components/CreateUserModal';
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

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin_grup: 'Admin Grup',
  manager_kebun: 'Manajer Kebun',
  asisten: 'Asisten',
  mandor: 'Mandor',
};

export default function Pengguna() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin_grup';
  const { data, isLoading, error } = useProfiles();
  const rows = data ?? [];
  const [edit, setEdit] = useState<ProfileRow | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 4 }}>
        <p className="muted" style={{ marginTop: 0 }}>
          Daftar pengguna & cakupan akses (estate/divisi).{' '}
          {isAdmin
            ? 'Klik baris untuk mengubah role & cakupan.'
            : 'Pengelolaan role/cakupan hanya untuk admin grup / super admin.'}
        </p>
        {isAdmin ? (
          <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>+ Undang / Buat Pengguna</button>
        ) : null}
      </div>
      <QueryState isLoading={isLoading} error={error} isEmpty={rows.length === 0}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Role</th>
                <th className="num">Cakupan</th>
                <th>Status</th>
                {isAdmin ? <th></th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr
                  key={p.id}
                  className={isAdmin ? 'clickable' : ''}
                  onClick={isAdmin ? () => setEdit(p) : undefined}
                >
                  <td>{p.full_name ?? '—'}</td>
                  <td><Badge tone={roleTone(p.role)}>{p.role ? (ROLE_LABEL[p.role] ?? p.role) : '—'}</Badge></td>
                  <td className="num">{p.scopes.length === 0 ? '—' : `${p.scopes.length} scope`}</td>
                  <td><Badge tone={p.is_active ? 'ok' : 'neutral'}>{p.is_active ? 'Aktif' : 'Nonaktif'}</Badge></td>
                  {isAdmin ? <td><span className="muted">Kelola →</span></td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>

      {isAdmin ? <UserManageModal profile={edit} onClose={() => setEdit(null)} /> : null}
      {isAdmin ? <CreateUserModal open={creating} onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
