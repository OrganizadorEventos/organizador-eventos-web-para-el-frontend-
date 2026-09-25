import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { formatHours } from '../lib/dates';

const navItems = [
  { to: '/hoy', label: 'Hoy' },
  { to: '/crear', label: 'Crear evento' },
  { to: '/eventos', label: 'Eventos' },
  { to: '/progreso', label: 'Progreso' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <>
      <a href="#main" className="skip-link">
        Saltar al contenido principal
      </a>
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/hoy" className="brand" aria-label="Organizador de Eventos, inicio">
            <span aria-hidden="true">📋</span> Organizador
          </NavLink>
          <nav className="nav" aria-label="Navegación principal">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="user-box">
            <span className="user-name" aria-label={`Usuario: ${user?.name}`}>{user?.name}</span>
            <span className="user-limit" title="Límite diario por defecto">
              Límite {formatHours(user?.dailyHoursLimit)}
            </span>
            <button type="button" className="btn-ghost btn-sm" onClick={handleLogout}>
              Salir
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="app-shell">
        <div className="app-main">
          <Outlet />
        </div>
      </main>
    </>
  );
}