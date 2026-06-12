import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Field, Modal } from './ui';

const ROLES = [
  { value: 'mandor', label: 'Mandor' },
  { value: 'asisten', label: 'Asisten' },
  { value: 'manager_kebun', label: 'Manajer Kebun' },
  { value: 'admin_grup', label: 'Admin Grup' },
  { value: 'super_admin', label: 'Super Admin' },
];

type Result = { email: string; password?: string };

export function CreateUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('mandor');
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  function reset() {
    setEmail('');
    setFullName('');
    setRole('mandor');
    setErr(null);
    setResult(null);
  }
  function close() {
    reset();
    onClose();
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!email.trim()) throw new Error('Email wajib diisi.');
      const { data, error } = await supabase.functions.invoke('agro-create-user', {
        body: { email: email.trim(), full_name: fullName.trim(), role },
      });
      if (error) {
        let msg = error.message;
        try {
          const ctx = (error as unknown as { context?: { json?: () => Promise<{ error?: string }> } }).context;
          const b = ctx?.json ? await ctx.json() : null;
          if (b?.error) msg = b.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      const d = data as { error?: string; email: string; password?: string };
      if (d?.error) throw new Error(d.error);
      return d;
    },
    onSuccess: (d) => {
      setErr(null);
      setResult({ email: d.email, password: d.password });
      void qc.invalidateQueries({ queryKey: ['profiles'] });
    },
    onError: (e: unknown) => setErr((e as Error)?.message ?? 'Gagal membuat akun.'),
  });

  return (
    <Modal open={open} onClose={close} title="Undang / Buat Pengguna">
      {result ? (
        <>
          <div className="card" style={{ background: 'var(--primary-soft)', borderColor: 'var(--primary-soft)' }}>
            <strong>Akun dibuat ✓</strong>
            <p style={{ margin: '8px 0 0' }}>Email: <strong>{result.email}</strong></p>
            {result.password ? (
              <p style={{ margin: '6px 0 0' }}>
                Password sementara: <code style={{ fontSize: 14 }}>{result.password}</code>
                <br />
                <span className="muted" style={{ fontSize: 12 }}>
                  Bagikan ke pengguna; minta segera diganti. Atur cakupan akses lewat tombol "Kelola".
                </span>
              </p>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={reset}>Buat lagi</button>
            <button className="btn" onClick={close}>Selesai</button>
          </div>
        </>
      ) : (
        <>
          {err ? <div className="error-box" style={{ marginBottom: 14 }}>{err}</div> : null}
          <Field label="Email *">
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@barokah.test" />
          </Field>
          <Field label="Nama lengkap">
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nama pengguna" />
          </Field>
          <Field label="Role">
            <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
            </select>
          </Field>
          <p className="muted" style={{ fontSize: 12 }}>
            Password sementara akan dibuat otomatis & ditampilkan setelah akun dibuat. Cakupan akses (estate/divisi)
            diatur setelahnya lewat "Kelola".
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary" disabled={create.isPending || !email.trim()} onClick={() => create.mutate()}>
              {create.isPending ? 'Membuat…' : 'Buat akun'}
            </button>
            <button className="btn" onClick={close}>Batal</button>
          </div>
        </>
      )}
    </Modal>
  );
}
