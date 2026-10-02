import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api';
import { useAuth } from '../auth';
import AuthLayout from '../components/AuthLayout';

export default function Recuperar() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(''); setMessage(''); setResetUrl(''); setBusy(true);
    try {
      const result = await requestPasswordReset(email);
      setMessage(result.message);
      setResetUrl(result.developmentResetUrl || '');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos solicitar el restablecimiento.');
    } finally { setBusy(false); }
  }

  return (
    <AuthLayout>
      <div className="auth-form-inner recovery-form">
        <h1>Recuperar contraseña</h1>
        <p className="auth-intro">Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.</p>
        {error && <div className="form-error" role="alert">{error}</div>}
        {message && <div className="form-success" role="status">{message}{resetUrl && <a className="dev-reset-link" href={resetUrl}>Abrir enlace de desarrollo</a>}</div>}
        <form onSubmit={submit}>
          <div className="field"><label htmlFor="recover-email">Correo electrónico</label><input id="recover-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Enviar enlace'}</button>
        </form>
        <p className="auth-switch"><Link to="/login">Volver al inicio de sesión</Link></p>
      </div>
    </AuthLayout>
  );
}
