import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { ApiError } from '../api';

export default function Login() {
  const { login, demo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/hoy';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ingreso no disponible.');
    } finally {
      setBusy(false);
    }
  }

  async function onDemo() {
    setError('');
    setBusy(true);
    try {
      await demo();
      navigate('/hoy', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos entrar con el usuario demo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell" style={{ maxWidth: 420, margin: '0 auto' }}>
      <div className="card" style={{ marginTop: 48 }}>
        <h1>Bienvenida/o 👋</h1>
        <p style={{ color: 'var(--color-text-soft)' }}>
          Organizá tus eventos sin perder de vista las gestiones de hoy.
        </p>

        {error && (
          <div className="form-error" role="alert">{error}</div>
        )}

        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="login-email">Correo electrónico</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="login-password">Contraseña</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={busy}>
            {busy ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <hr style={{ margin: '18px 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />

        <button type="button" className="btn-secondary" onClick={onDemo} disabled={busy}>
          Entrar con usuario demo (Sprint 0–1)
        </button>
        <p className="field-hint">
          El demo viene precargado con eventos y gestiones para probar la app al instante.
        </p>

        <p style={{ marginTop: 14, fontSize: '0.95rem' }}>
          ¿No tenés cuenta?{' '}
          <Link to="/registro">Crear cuenta</Link>
        </p>
      </div>
    </div>
  );
}