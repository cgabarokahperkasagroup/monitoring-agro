import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

const NAV = [
  { to: '/', label: 'Ringkasan', icon: '▱', end: true },
  { to: '/kegiatan', label: 'Kegiatan', icon: '🌴' },
  { to: '/rekonsiliasi', label: 'Rekonsiliasi', icon: '⚖' },
  { to: '/master', label: 'Data Master', icon: '🗂' },
  { to: '/pengguna', label: 'Pengguna', icon: '👤' },
];

const TITLES: Record<string, { title: string; sub: string }> = {
  '/': { title: 'Ringkasan', sub: 'KPI produksi & pengiriman' },
  '/kegiatan': { title: 'Kegiatan', sub: 'Catatan panen & pengiriman lapangan' },
  '/rekonsiliasi': { title: 'Rekonsiliasi Pengiriman', sub: 'Panen → angkut → terima pabrik' },
  '/master': { title: 'Data Master', sub: 'Estate, divisi, blok, karyawan' },
  '/pengguna': { title: 'Pengguna & Akses', sub: 'Role dan cakupan estate/divisi' },
};

export function Layout() {
  const { session, profile, signOut } = useAuth();
  const loc = useLocation();
  const head = TITLES[loc.pathname] ?? { title: 'Monitoring Agro', sub: '' };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-dot" />
          <div>
            <div className="brand-name">Monitoring Agro</div>
            <div className="brand-sub">Dashboard Kebun</div>
          </div>
        </div>

        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="nav-ico">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        <div className="sidebar-foot">
          <div className="user-mini">
            {profile?.full_name ? <strong>{profile.full_name}</strong> : session?.user.email}
            <br />
            <span className="muted">{profile?.role ?? '—'}</span>
          </div>
          <button className="btn btn-sm" style={{ width: '100%' }} onClick={signOut}>
            Keluar
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div>
            <div className="page-title">{head.title}</div>
            {head.sub ? <div className="page-sub">{head.sub}</div> : null}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>{session?.user.email}</div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
