import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Layout } from '@/components/Layout';
import { Spinner } from '@/components/ui';

// Halaman berat/jarang -> lazy agar tidak membebani bundle utama.
const Peta = lazy(() => import('@/pages/Peta'));
const LaporanTerjadwal = lazy(() => import('@/pages/LaporanTerjadwal'));
const Master = lazy(() => import('@/pages/Master'));
const Pengguna = lazy(() => import('@/pages/Pengguna'));
import Login from '@/pages/Login';
import Ringkasan from '@/pages/Ringkasan';
import Kegiatan from '@/pages/Kegiatan';
import Produktivitas from '@/pages/Produktivitas';
import Pemupukan from '@/pages/Pemupukan';
import Rekonsiliasi from '@/pages/Rekonsiliasi';
import Sistem from '@/pages/Sistem';
import SetPassword from '@/pages/SetPassword';

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
      <Route path="/set-password" element={<SetPassword />} />
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
        <Route path="/pemupukan" element={<Pemupukan />} />
        <Route path="/rekonsiliasi" element={<Rekonsiliasi />} />
        <Route
          path="/peta"
          element={
            <Suspense fallback={<div className="loading"><Spinner /></div>}>
              <Peta />
            </Suspense>
          }
        />
        <Route
          path="/master"
          element={
            <Suspense fallback={<div className="loading"><Spinner /></div>}>
              <Master />
            </Suspense>
          }
        />
        <Route
          path="/pengguna"
          element={
            <Suspense fallback={<div className="loading"><Spinner /></div>}>
              <Pengguna />
            </Suspense>
          }
        />
        <Route
          path="/laporan-terjadwal"
          element={
            <Suspense fallback={<div className="loading"><Spinner /></div>}>
              <LaporanTerjadwal />
            </Suspense>
          }
        />
        <Route path="/sistem" element={<Sistem />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
