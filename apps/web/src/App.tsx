import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Layout } from '@/components/Layout';
import { Spinner } from '@/components/ui';
import Login from '@/pages/Login';
import Ringkasan from '@/pages/Ringkasan';
import Kegiatan from '@/pages/Kegiatan';
import Produktivitas from '@/pages/Produktivitas';
import Rekonsiliasi from '@/pages/Rekonsiliasi';
import Master from '@/pages/Master';
import Pengguna from '@/pages/Pengguna';

function Protected({ children }: { children: ReactNode }) {
  const { session, initializing } = useAuth();
  if (initializing) {
    return (
      <div className="loading" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Spinner />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { session } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/" element={<Ringkasan />} />
        <Route path="/kegiatan" element={<Kegiatan />} />
        <Route path="/produktivitas" element={<Produktivitas />} />
        <Route path="/rekonsiliasi" element={<Rekonsiliasi />} />
        <Route path="/master" element={<Master />} />
        <Route path="/pengguna" element={<Pengguna />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
