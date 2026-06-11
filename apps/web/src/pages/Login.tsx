import { useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui';

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) setError(error);
    // Sukses: redirect ditangani oleh App (route /login -> /).
  }

  return (
    <div className="login-wrap">
      <Card className="login-card">
        <div className="login-brand">
          <div className="login-logo" />
          <h1 style={{ fontSize: 22, color: 'var(--primary-dark)' }}>Monitoring Agro</h1>
          <div className="muted" style={{ fontSize: 13 }}>Dashboard admin kebun sawit</div>
        </div>

        <form onSubmit={onSubmit}>
          <div className="field">
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="manager1@barokah.test"
            />
          </div>
          <div className="field">
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error ? <div className="error-box" style={{ marginBottom: 12 }}>{error}</div> : null}

          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Memproses…' : 'Masuk'}
          </button>
        </form>

        <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: 18, marginBottom: 0 }}>
          Akun dibuat oleh admin grup. Mandor mencatat lewat aplikasi mobile.
        </p>
      </Card>
    </div>
  );
}
