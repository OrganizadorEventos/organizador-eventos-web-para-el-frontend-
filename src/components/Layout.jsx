import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { formatHours } from '../lib/dates';
import mascot from '../assets/mivo-cats.png';

const navItems = [
  { to: '/hoy', label: 'Hoy', icon: '⌂' },
  { to: '/crear', label: 'Crear actividad', icon: '+' },
  { to: '/eventos', label: 'Actividades', icon: '▤' },
  { to: '/progreso', label: 'Progreso', icon: '▥' },
  { to: '/perfil', label: 'Perfil', icon: '○' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pageTitle = navItems.find((item) => location.pathname === item.to)?.label || (location.pathname.startsWith('/evento/') ? 'Detalle de actividad' : 'MIVO');

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
                <span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-footer">
            <span className="avatar" aria-hidden="true">{user?.name?.charAt(0)?.toUpperCase() || 'E'}</span>
            <div className="user-details"><span className="user-name" aria-label={`Usuario: ${user?.name}`}>{user?.name || 'Estudiante'}</span><span className="user-limit">Estudiante · {formatHours(user?.dailyHoursLimit)} h/día</span></div>
            <button type="button" className="logout-button" onClick={handleLogout} aria-label="Cerrar sesión" title="Cerrar sesión">↪</button>
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
