import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { ApiError } from '../api';

export default function Perfil() {
  const { user, updateProfile, updateLimit, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [limit, setLimit] = useState(user?.dailyHoursLimit || 6);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault(); setError(''); setMessage('');
    if (name.trim().length < 2) { setError('El nombre debe tener al menos 2 caracteres.'); return; }
    const hours = Number(limit);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) { setError('El límite diario debe estar entre 0.5 y 24 horas.'); return; }
    setBusy(true);
    try {
      await updateProfile(name.trim());
      await updateLimit(hours);
      setMessage('Tu perfil se actualizó.');
    } catch (err) { setError(err instanceof ApiError ? err.message : 'No pudimos guardar los cambios.'); }
    finally { setBusy(false); }
  }

  function signOut() { logout(); navigate('/login', { replace: true }); }

  return (
    <section className="profile-page">
      <header className="page-title-row"><div><p className="eyebrow">MI CUENTA</p><h1>Perfil</h1><p className="page-subtitle">Información y preferencias de tu cuenta.</p></div></header>
      <div className="profile-layout">
        <div className="card profile-summary"><div className="profile-avatar-large">{user?.name?.charAt(0)?.toUpperCase() || 'M'}</div><h2>{user?.name || 'Estudiante'}</h2><p>{user?.email}</p><span className="badge badge-progress">Estudiante</span></div>
        <form className="card profile-form" onSubmit={save}>
          <h2>Información de la cuenta</h2>
          {error && <div className="form-error" role="alert">{error}</div>}
          {message && <div className="form-success" role="status">{message}</div>}
          <div className="field"><label htmlFor="profile-name">Nombre de usuario</label><input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={80} required /></div>
          <div className="field"><label htmlFor="profile-email">Correo electrónico</label><input id="profile-email" value={user?.email || ''} readOnly disabled /></div>
          <div className="field"><label htmlFor="profile-limit">Límite diario de planificación (horas)</label><input id="profile-limit" type="number" min="0.5" max="24" step="0.5" value={limit} onChange={(e) => setLimit(e.target.value)} /></div>
          <div className="row"><button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button><button type="button" className="btn-danger-ghost profile-logout" onClick={signOut}>Cerrar sesión</button></div>
        </form>
      </div>
    </section>
  );
}
