import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useDivisions,
  useEstates,
  useOrganizations,
  type ProfileRow,
  type UserScope,
} from '@/lib/queries';
import { supabase } from '@/lib/supabaseClient';
import { Badge, Modal } from './ui';

const ROLES = [
  { value: 'mandor', label: 'Mandor' },
  { value: 'asisten', label: 'Asisten' },
  { value: 'manager_kebun', label: 'Manajer Kebun' },
  { value: 'admin_grup', label: 'Admin Grup' },
  { value: 'super_admin', label: 'Super Admin' },
];

const SCOPE_TYPES = [
  { value: 'division', label: 'Divisi' },
  { value: 'estate', label: 'Estate' },
  { value: 'org', label: 'Organisasi' },
] as const;

type ScopeType = (typeof SCOPE_TYPES)[number]['value'];

function scopeTypeLabel(t: string): string {
  return SCOPE_TYPES.find((s) => s.value === t)?.label ?? t;
}

export function UserManageModal({
  profile,
  onClose,
}: {
  profile: ProfileRow | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: estates = [] } = useEstates();
  const { data: divisions = [] } = useDivisions();
  const { data: orgs = [] } = useOrganizations();

  const [role, setRole] = useState('');
  const [active, setActive] = useState(true);
  const [scopeType, setScopeType] = useState<ScopeType>('division');
  const [scopeId, setScopeId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setRole(profile.role ?? 'mandor');
      setActive(profile.is_active ?? true);
      setScopeType('division');
      setScopeId('');
      setError(null);
    }
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const nameOfScope = useMemo(() => {
    const e = new Map(estates.map((x) => [x.id, x.name]));
    const d = new Map(divisions.map((x) => [x.id, x.name]));
    const o = new Map(orgs.map((x) => [x.id, x.name]));
    return (s: UserScope) =>
      (s.scope_type === 'estate' ? e : s.scope_type === 'division' ? d : o).get(s.scope_id) ?? s.scope_id;
  }, [estates, divisions, orgs]);

  const targetOptions = useMemo(() => {
    if (scopeType === 'estate') return estates.map((x) => ({ id: x.id, label: x.name }));
    if (scopeType === 'division') return divisions.map((x) => ({ id: x.id, label: x.name }));
    return orgs.map((x) => ({ id: x.id, label: x.name }));
  }, [scopeType, estates, divisions, orgs]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!profile) return;
      const { error } = await supabase
        .from('profiles')
        .update({ role, is_active: active })
        .eq('id', profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ['profiles'] });
    },
    onError: (e: unknown) => setError((e as Error)?.message ?? 'Gagal menyimpan profil.'),
  });

  const addScope = useMutation({
    mutationFn: async () => {
      if (!profile || !scopeId) throw new Error('Pilih target cakupan dulu.');
      const { error } = await supabase
        .from('user_scopes')
        .insert({ user_id: profile.id, scope_type: scopeType, scope_id: scopeId });
      if (error) throw error;
    },
    onSuccess: () => {
      setScopeId('');
      setError(null);
      void qc.invalidateQueries({ queryKey: ['profiles'] });
    },
    onError: (e: unknown) => setError((e as Error)?.message ?? 'Gagal menambah cakupan.'),
  });

  const removeScope = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_scopes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['profiles'] }),
    onError: (e: unknown) => setError((e as Error)?.message ?? 'Gagal menghapus cakupan.'),
  });

  return (
    <Modal open={!!profile} onClose={onClose} title={profile?.full_name ?? 'Kelola Pengguna'}>
      {profile ? (
        <>
          {error ? <div className="error-box" style={{ marginBottom: 14 }}>{error}</div> : null}

          <div className="section-title" style={{ marginTop: 0 }}>Role & Status</div>
          <div className="filters" style={{ alignItems: 'flex-end' }}>
            <div className="field" style={{ minWidth: 200 }}>
              <label className="label">Role</label>
              <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label">Status</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40 }}>
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                <span>{active ? 'Aktif' : 'Nonaktif'}</span>
              </label>
            </div>
            <button
              className="btn btn-primary"
              disabled={saveProfile.isPending}
              onClick={() => saveProfile.mutate()}
            >
              {saveProfile.isPending ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>

          <div className="section-title">Cakupan Akses</div>
          {profile.scopes.length === 0 ? (
            <p className="muted" style={{ marginTop: 0 }}>Belum ada cakupan. Tambahkan di bawah.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {profile.scopes.map((s) => (
                <div key={s.id} className="row-between scope-row">
                  <span>
                    <Badge tone="info">{scopeTypeLabel(s.scope_type)}</Badge>{' '}
                    <strong>{nameOfScope(s)}</strong>
                  </span>
                  <button
                    className="btn btn-sm"
                    disabled={removeScope.isPending}
                    onClick={() => removeScope.mutate(s.id)}
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="filters" style={{ alignItems: 'flex-end' }}>
            <div className="field">
              <label className="label">Jenis cakupan</label>
              <select
                className="select"
                value={scopeType}
                onChange={(e) => {
                  setScopeType(e.target.value as ScopeType);
                  setScopeId('');
                }}
              >
                {SCOPE_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ minWidth: 200 }}>
              <label className="label">Target</label>
              <select className="select" value={scopeId} onChange={(e) => setScopeId(e.target.value)}>
                <option value="">Pilih…</option>
                {targetOptions.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </div>
            <button
              className="btn"
              disabled={!scopeId || addScope.isPending}
              onClick={() => addScope.mutate()}
            >
              + Tambah
            </button>
          </div>

          <p className="muted" style={{ fontSize: 12, marginTop: 16, marginBottom: 0 }}>
            Akun baru dibuat lewat undangan Supabase Auth (profil otomatis dibuat sebagai
            Mandor). Hanya admin grup / super admin yang dapat mengubah role & cakupan.
          </p>
        </>
      ) : null}
    </Modal>
  );
}
