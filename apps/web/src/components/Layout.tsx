import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Sprout, Map, BarChart3, FlaskConical, Scale,
  Database, Users, Clock, ShieldCheck, LogOut, Leaf, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };
type NavGroup = { section: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    section: 'Operasional',
    items: [
      { to: '/', label: 'Ringkasan', icon: LayoutDashboard, end: true },
      { to: '/kegiatan', label: 'Kegiatan', icon: Sprout },
      { to: '/peta', label: 'Peta Sebaran', icon: Map },
      { to: '/produktivitas', label: 'Produktivitas', icon: BarChart3 },
      { to: '/pemupukan', label: 'Pemupukan', icon: FlaskConical },
      { to: '/rekonsiliasi', label: 'Rekonsiliasi', icon: Scale },
    ],
  },
  {
    section: 'Administrasi',
    items: [
      { to: '/master', label: 'Data Master', icon: Database },
      { to: '/pengguna', label: 'Pengguna', icon: Users },
      { to: '/laporan-terjadwal', label: 'Laporan Terjadwal', icon: Clock },
      { to: '/sistem', label: 'Sistem', icon: ShieldCheck },
    ],
  },
];

const TITLES: Record<string, { title: string; sub: string }> = {
  '/': { title: 'Ringkasan', sub: 'KPI produksi & pengiriman' },
  '/kegiatan': { title: 'Kegiatan', sub: 'Catatan panen & pengiriman lapangan' },
  '/peta': { title: 'Peta Sebaran Kegiatan', sub: 'Titik GPS panen & pengiriman' },
  '/produktivitas': { title: 'Produktivitas', sub: 'Per divisi & per karyawan' },
  '/pemupukan': { title: 'Pemupukan', sub: 'Realisasi vs rencana' },
  '/rekonsiliasi': { title: 'Rekonsiliasi Pengiriman', sub: 'Panen → angkut → terima pabrik' },
  '/master': { title: 'Data Master', sub: 'Estate, divisi, blok, karyawan' },
  '/pengguna': { title: 'Pengguna & Akses', sub: 'Role dan cakupan estate/divisi' },
  '/laporan-terjadwal': { title: 'Laporan Terjadwal', sub: 'Otomatis via pg_cron + unduh CSV' },
  '/sistem': { title: 'Sistem', sub: 'Audit log & status sinkron perangkat' },
};

export function Layout() {
  const { session, profile, signOut } = useAuth();
  const loc = useLocation();
  const head = TITLES[loc.pathname] ?? { title: 'Monitoring Agro', sub: '' };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-dot">
            <Leaf size={19} strokeWidth={2.4} />
          </div>
          <div>
            <div className="brand-name">Monitoring Agro</div>
            <div className="brand-sub">Dashboard Kebun</div>
          </div>
        </div>

        {NAV.map((group) => (
          <div key={group.section}>
            <div className="nav-section">{group.section}</div>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-ico">
                    <Icon size={18} strokeWidth={2} />
                  </span>
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        ))}

        <div className="sidebar-foot">
          <div className="user-mini">
            {profile?.full_name ? <strong>{profile.full_name}</strong> : session?.user.email}
            <br />
            <span className="muted">{profile?.role ?? '—'}</span>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={signOut}>
            <LogOut size={15} />
            Keluar
          </Button>
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
