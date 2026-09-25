import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { ApiError } from '../api';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    try {
      await register(name, email, password);
      navigate('/hoy', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos crear tu cuenta.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell" style={{ maxWidth: 420, margin: '0 auto' }}>
      <div className="card" style={{ marginTop: 48 }}>
        <h1>Crear cuenta</h1>
        <p style={{ color: 'var(--color-text-soft)' }}>
          En un minuto tenés tu espacio para organizar eventos.
        </p>

        {error && <div className="form-error" role="alert">{error}</div>}

        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="reg-name">Nombre</label>
            <input id="reg-name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="reg-email">Correo electrónico</label>
            <input id="reg-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="reg-password">Contraseña</label>
            <input id="reg-password" type="password" autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <p className="field-hint">Mínimo 6 caracteres.</p>
          </div>
          <div className="field">
            <label htmlFor="reg-confirm">Repetir contraseña</label>
            <input id="reg-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <button type="submit" disabled={busy}>
            {busy ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <p style={{ marginTop: 14, fontSize: '0.95rem' }}>
          ¿Ya tenés cuenta? <Link to="/login">Ingresar</Link>
        </p>
      </div>
    </div>
  );
}