import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { formatHours } from '../lib/dates';
import mascot from '../assets/mivo-cats.png';

const navItems = [
  { to: '/hoy', label: 'Hoy', icon: '⌂' },
  { to: '/crear', label: 'Crear evento', icon: '+' },
  { to: '/eventos', label: 'Estados de eventos', icon: '▤' },
  { to: '/progreso', label: 'Progreso', icon: '▥' },
  { to: '/perfil', label: 'Perfil', icon: '○' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pageTitle = navItems.find((item) => location.pathname === item.to)?.label || (location.pathname.startsWith('/evento/') ? 'Detalle del evento' : 'MIVO · Organizador de eventos');

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <>
      <a href="#main" className="skip-link">Saltar al contenido principal</a>
      <div className="workspace">
        <aside className="sidebar">
          <NavLink to="/hoy" className="brand" aria-label="MIVO, inicio">
            <img className="brand-mascot" src={mascot} alt="" /><span>MIVO</span>
          </NavLink>
          <nav className="nav" aria-label="Navegación principal">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : '')}>
                <span className="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24">{item.to === '/hoy' ? <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /> : item.to === '/crear' ? <path d="M12 5v14M5 12h14" /> : item.to === '/eventos' ? <><rect x="3" y="4" width="4" height="4" rx="1"/><path d="M10 6h11M10 12h11M10 18h11"/><rect x="3" y="10" width="4" height="4" rx="1"/><rect x="3" y="16" width="4" height="4" rx="1"/></> : item.to === '/progreso' ? <path d="M4 20V11h4v9M10 20V5h4v15M16 20v-8h4v8" /> : <circle cx="12" cy="12" r="9" />}</svg></span><span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-footer">
            <span className="avatar" aria-hidden="true">{user?.name?.charAt(0)?.toUpperCase() || 'E'}</span>
            <div className="user-details"><span className="user-name" aria-label={`Usuario: ${user?.name}`}>{user?.name || 'Organizador'}</span><span className="user-limit">Organización · {formatHours(user?.dailyHoursLimit)} h/día</span></div>
            <button type="button" className="logout-button" onClick={handleLogout} aria-label="Cerrar sesión" title="Cerrar sesión">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M9 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-3M7 8V5a2 2 0 0 1 2-2M15 12H3m0 0 5-5m-5 5 5 5" />
              </svg>
            </button>
          </div>
        </aside>
        <main id="main" className="main-panel">
          <div className="mobile-brand"><img className="brand-mascot" src={mascot} alt="" /> MIVO <span className="mobile-page-title">/ {pageTitle}</span></div>
          <div className="page-content"><Outlet /></div>
        </main>
      </div>
    </>
  );
}

