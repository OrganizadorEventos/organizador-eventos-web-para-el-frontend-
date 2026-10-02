import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { ApiError } from '../api';
import AuthLayout from '../components/AuthLayout';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/hoy';
  const [email, setEmail] = useState(() => localStorage.getItem('mivo-email') || localStorage.getItem('floz-email') || '');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(Boolean(localStorage.getItem('mivo-email') || localStorage.getItem('floz-email')));
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      if (remember) localStorage.setItem('mivo-email', email);
      else localStorage.removeItem('mivo-email');
      localStorage.removeItem('floz-email');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <div className="auth-form-inner">
        <div className="auth-mobile-logo"><span className="brand-mark">◈</span> MIVO</div>
        <h1>Iniciar sesión</h1>
        {error && <div className="form-error" role="alert">{error}</div>}
        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="login-email">Correo electrónico</label>
            <input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="login-password">Contraseña</label>
            <div className="password-field">
              <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button className="password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                {showPassword ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A10.7 10.7 0 0112 5c6.4 0 10 7 10 7a15 15 0 01-3 3.7M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7c1.1 0 2.1-.2 3-.5"/></svg>}
              </button>
            </div>
          </div>
          <div className="auth-options">
            <label className="remember-option"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Recordarme</label>
            <Link className="forgot-link" to="/recuperar">¿Olvidaste tu contraseña?</Link>
          </div>
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Ingresando…' : 'Iniciar sesión'}</button>
        </form>
        <p className="auth-switch">¿No tienes una cuenta? <Link to="/registro">Regístrate aquí</Link></p>
      </div>
    </AuthLayout>
  );
}
