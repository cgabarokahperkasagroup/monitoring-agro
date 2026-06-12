import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient';
import { Card, Spinner } from '@/components/ui';

// Halaman tujuan tautan undangan / reset. Sesi dibentuk dari token di URL
// (detectSessionInUrl), lalu pengguna mengatur kata sandi.
export default function SetPassword() {
  const { session, initializing } = useAuth();
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (pw.length < 8) return setErr('Kata sandi minimal 8 karakter.');
    if (pw !== pw2) return setErr('Konfirmasi kata sandi tidak cocok.');
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(error.message);
    setDone(true);
    setTimeout(() => navigate('/'), 1200);
  }

  if (initializing) {
    return <div className="loading" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><Spinner /></div>;
  }

  return (
    <div className="login-wrap">
      <Card className="login-card">
        <div className="login-brand">
          <div className="login-logo" />
          <h1 style={{ fontSize: 22, color: 'var(--primary-dark)' }}>Monitoring Agro</h1>
          <div className="muted" style={{ fontSize: 13 }}>Atur kata sandi akun Anda</div>
        </div>

        {!session ? (
          <>
            <div className="error-box" style={{ marginBottom: 12 }}>
              Tautan undangan tidak valid atau sudah kedaluwarsa.
            </div>
            <Link to="/login" className="btn btn-primary" style={{ width: '100%' }}>Ke halaman masuk</Link>
          </>
        ) : done ? (
          <div className="card" style={{ background: 'var(--primary-soft)', borderColor: 'var(--primary-soft)' }}>
            <strong>Kata sandi tersimpan ✓</strong>
            <p className="muted" style={{ margin: '6px 0 0' }}>Mengalihkan ke dashboard…</p>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="field">
              <label className="label">Kata sandi baru</label>
              <input className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Min. 8 karakter" />
            </div>
            <div className="field">
              <label className="label">Ulangi kata sandi</label>
              <input className="input" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </div>
            {err ? <div className="error-box" style={{ marginBottom: 12 }}>{err}</div> : null}
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan & masuk'}
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
