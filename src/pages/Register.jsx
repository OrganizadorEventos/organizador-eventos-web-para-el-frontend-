import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { ApiError } from '../api';
import AuthLayout from '../components/AuthLayout';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault(); setError('');
    if (name.trim().length < 2) { setError('El nombre debe tener al menos 2 caracteres.'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    setBusy(true);
    try { await register(name, email, password); navigate('/hoy', { replace: true }); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'No pudimos crear tu cuenta.'); }
    finally { setBusy(false); }
  }

  return (
    <AuthLayout>
      <div className="auth-form-inner register-form">
        <div className="auth-mobile-logo"><span className="brand-mark">M</span> MIVO</div>
        <h1>Crear cuenta</h1>
        {error && <div className="form-error" role="alert">{error}</div>}
        <form onSubmit={onSubmit} noValidate>
          <div className="field"><label htmlFor="reg-name">Nombre de usuario</label><input id="reg-name" type="text" autoComplete="name" minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="field"><label htmlFor="reg-email">Correo electrónico</label><input id="reg-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="field"><label htmlFor="reg-password">Contraseña</label><div className="password-field"><input id="reg-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /><button className="password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>◉</button></div><p className="field-hint">Mínimo 6 caracteres.</p></div>
          <div className="field"><label htmlFor="reg-confirm">Confirmar contraseña</label><div className="password-field"><input id="reg-confirm" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /><button className="password-toggle" type="button" onClick={() => setShowConfirm((value) => !value)} aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}>◉</button></div></div>
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Creando cuenta…' : 'Registrarse'}</button>
        </form>
        <p className="auth-switch">¿Ya tienes una cuenta? <Link to="/login">Inicia sesión</Link></p>
      </div>
    </AuthLayout>
  );
}
