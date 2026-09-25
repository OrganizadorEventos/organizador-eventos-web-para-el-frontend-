import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Hoy from './pages/Hoy';
import Crear from './pages/Crear';
import Eventos from './pages/Eventos';
import EventoDetalle from './pages/EventoDetalle';
import Progreso from './pages/Progreso';

function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="app-shell">
        <div className="state-box" role="status">
          <span className="spinner" aria-hidden="true" />
          <p>Cargando tu espacio de trabajo…</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/hoy" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/registro" element={<GuestOnly><Register /></GuestOnly>} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/" element={<Navigate to="/hoy" replace />} />
        <Route path="/hoy" element={<Hoy />} />
        <Route path="/crear" element={<Crear />} />
        <Route path="/eventos" element={<Eventos />} />
        <Route path="/evento/:id" element={<EventoDetalle />} />
        <Route path="/progreso" element={<Progreso />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}