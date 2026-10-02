import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError } from '../api';
import { useAuth } from '../auth';
import AuthLayout from '../components/AuthLayout';

export default function Restablecer() {
  const { resetPassword } = useAuth();
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setError(''); setMessage('');
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    setBusy(true);
    try {
      const result = await resetPassword(params.get('token') || '', password);
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos actualizar la contraseña.');
    } finally { setBusy(false); }
  }

  return (
    <AuthLayout>
      <div className="auth-form-inner recovery-form">
        <h1>Nueva contraseña</h1>
        <p className="auth-intro">Elige una contraseña nueva para volver a entrar a MIVO.</p>
        {error && <div className="form-error" role="alert">{error}</div>}
        {message ? <div className="form-success" role="status">{message}<Link className="dev-reset-link" to="/login">Iniciar sesión</Link></div> : (
          <form onSubmit={submit}>
            <div className="field"><label htmlFor="new-password">Contraseña nueva</label><input id="new-password" type="password" autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
            <div className="field"><label htmlFor="confirm-password">Confirmar contraseña</label><input id="confirm-password" type="password" autoComplete="new-password" minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div>
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contraseña'}</button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
