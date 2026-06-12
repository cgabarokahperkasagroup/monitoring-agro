import { useState, type FormEvent } from 'react';
import { Leaf } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
          <div className="login-logo">
            <Leaf size={26} strokeWidth={2.4} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Monitoring Agro</h1>
          <div className="muted" style={{ fontSize: 13 }}>Dashboard admin kebun sawit</div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="manager1@barokah.test"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error ? <div className="error-box">{error}</div> : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Memproses…' : 'Masuk'}
          </Button>
        </form>

        <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: 18, marginBottom: 0 }}>
          Akun dibuat oleh admin grup. Mandor mencatat lewat aplikasi mobile.
        </p>
      </Card>
    </div>
  );
}
