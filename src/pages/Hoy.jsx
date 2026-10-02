import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { localYMD, formatDate, formatHours } from '../lib/dates';
import { LoadingState, EmptyState, ErrorState } from '../components/States';
import Modal from '../components/Modal';

function eventStatus(event, today) {
  if (event.status === 'done') return 'done';
  if (event.taskCount > 0 && event.doneCount === event.taskCount) return 'done';
  if (event.overdueCount > 0 || (event.date && event.date < today)) return 'overdue';
  return 'pending';
}

const statusLabel = { overdue: 'Vencido', pending: 'Pendiente', done: 'Terminado' };

export default function Hoy() {
  const { user, updateLimit } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showSortHelp, setShowSortHelp] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const date = localYMD();
      const [today, { events }] = await Promise.all([api.get(`/today?date=${date}`), api.get(`/events?date=${date}`)]);
      setData({ ...today, events });
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Ha ocurrido un error cargando la información.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const eventNames = useMemo(() => [...new Set((data?.events || []).map((event) => event.name))].sort((a, b) => a.localeCompare(b)), [data]);
  const visibleEvents = useMemo(() => (data?.events || []).filter((event) => {
    const state = eventStatus(event, data.date);
    return (eventFilter === 'all' || event.name === eventFilter) && (statusFilter === 'all' || state === statusFilter);
  }), [data, eventFilter, statusFilter]);

  async function finishEvent(event) {
    setActionBusy(true);
    setError('');
    try {
      // The existing event PATCH route supports status updates across backend versions.
      const { event: updated } = await api.patch(`/events/${event.id}`, { status: 'done' });
      const { events } = await api.get(`/events?date=${data.date}`);
      const refreshed = events.find((item) => item.id === event.id);
      if (updated?.status !== 'done' && refreshed?.status !== 'done') {
        throw new Error('El servidor no confirmó el cambio. Verifica que la migración 004_event_status_and_cascade_delete.sql esté aplicada y que el backend esté actualizado.');
      }
      setOpenMenuId(null);
      setData((current) => current && ({ ...current, events }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err?.message || 'No pudimos marcar el evento como terminado.');
    } finally { setActionBusy(false); }
  }

  async function deleteEvent() {
    if (!deleteTarget) return;
    setActionBusy(true);
    setError('');
    try {
      await api.del(`/events/${deleteTarget.id}`);
      const deletedId = deleteTarget.id;
      setDeleteTarget(null);
      setOpenMenuId(null);
      setData((current) => current && ({
        ...current,
        events: current.events.filter((event) => event.id !== deletedId),
      }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos eliminar el evento.');
    } finally { setActionBusy(false); }
  }
  if (loading && !data) return <LoadingState label="Cargando Hoy…" />;
  if (error && !data) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  const workload = Number(data.workloadHours || 0);
  const pct = data.dailyLimit > 0 ? Math.min(100, Math.round((workload / data.dailyLimit) * 100)) : 0;

  return <div className="today-page">
    <header className="row-between page-heading">
      <div><h1>Hoy</h1></div>
      <Link to="/perfil" className="profile-chip"><span className="avatar" aria-hidden="true">{user?.name?.charAt(0)?.toUpperCase() || 'O'}</span><span><strong>PERFIL</strong><small>{user?.name || 'Organizador'}</small></span></Link>
    </header>

    <section className="today-filters" aria-label="Filtros de eventos">
      <div className="field"><label htmlFor="filter-event">Evento</label><select id="filter-event" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}><option value="all">Todos</option>{eventNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></div>
      <div className="field"><label htmlFor="filter-status">Estado</label><select id="filter-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">Todos</option><option value="overdue">Vencidos</option><option value="pending">Pendientes</option><option value="done">Terminados</option></select></div>
      <div className="sort-help-wrap"><button className="sort-help" type="button" aria-expanded={showSortHelp} onClick={() => setShowSortHelp((visible) => !visible)}>ⓘ ¿Cómo se ordena?</button>{showSortHelp && <p className="sort-help-message" role="status">Primero aparecen los eventos vencidos, luego los pendientes y finalmente los terminados.</p>}</div>
    </section>

    <section className="daily-summary" aria-label="Carga de hoy">
      <div><span className="summary-label">Carga de hoy</span><strong>{formatHours(workload)} <small>/ {formatHours(data.dailyLimit)} h</small></strong></div>
      <div className="summary-progress"><div className="progress-track"><div className={`progress-fill${pct >= 100 ? ' is-over-limit' : ''}`} style={{ width: `${pct}%` }} /></div><span>{pct}% del límite diario</span></div>
      <label className="daily-limit-field" htmlFor="limit-input">Límite<input id="limit-input" type="number" min="0.5" max="24" step="0.5" value={data.dailyLimit} onChange={async (e) => { const value = Number(e.target.value); if (value > 0 && value <= 24) { try { const updated = await updateLimit(value); setData((current) => ({ ...current, dailyLimit: updated.dailyHoursLimit })); } catch (err) { setError(err.message); } } }} /></label>
    </section>

    {error && <div className="form-error" role="alert">{error}<button className="btn-ghost btn-sm" type="button" onClick={load}>Reintentar</button></div>}
    <section className="activity-section" aria-label="Mis eventos">
      <h2 className="section-title">Mis eventos<span>{visibleEvents.length}</span></h2>
      {visibleEvents.length ? <ul className="urgent-list">{visibleEvents.map((event) => {
        const state = eventStatus(event, data.date);
        return <li className="activity-card event-card" key={event.id}>
          <Link to={`/evento/${event.id}`} className={`event-type-icon event-icon-${state}`} aria-label={`Abrir ${event.name}`}>{state === 'done' ? '✓' : state === 'overdue' ? '!' : '◎'}</Link>
          <div className="activity-main"><div className="activity-title-row"><Link to={`/evento/${event.id}`} className="activity-title">{event.name}</Link></div><div className="activity-meta"><span>▣ {event.date ? formatDate(event.date) : 'Fecha por definir'}</span><span>◇ {event.type || 'Evento'}</span><span>☷ {event.taskCount} subtareas</span></div></div>
          <span className={`activity-state state-${state}`}>{statusLabel[state]}</span>
          <div className="event-menu-wrap">
            <button type="button" className="event-more" aria-label={`Acciones de ${event.name}`} aria-haspopup="menu" aria-expanded={openMenuId === event.id} onClick={() => setOpenMenuId((current) => current === event.id ? null : event.id)}>•••</button>
            {openMenuId === event.id && <div className="event-action-menu" role="menu">
              <Link to={`/evento/${event.id}`} state={{ edit: true }} role="menuitem" onClick={() => setOpenMenuId(null)}>Editar</Link>
              <button type="button" role="menuitem" onClick={() => { setDeleteTarget(event); setOpenMenuId(null); }}>Eliminar</button>
              {state !== 'done' && <button type="button" role="menuitem" disabled={actionBusy} onClick={() => finishEvent(event)}>Marcar terminado</button>}
            </div>}
          </div>
        </li>;
      })}</ul> : <div className="card today-empty"><EmptyState emoji="☕" title={data.events?.length ? 'No hay resultados' : 'Aún no has creado eventos'} text={data.events?.length ? 'Cambia los filtros para ver tus eventos.' : 'Crea tu primer evento para empezar a organizar sus preparativos.'}>{!data.events?.length && <Link className="primary-link-button" to="/crear">Crear evento</Link>}</EmptyState></div>}
    </section>
    <Modal open={Boolean(deleteTarget)} title="Eliminar evento" onClose={() => !actionBusy && setDeleteTarget(null)} labelledBy="today-delete-title">
      <p>¿Quieres eliminar “{deleteTarget?.name}” y todas sus subtareas? Esta acción no se puede deshacer.</p>
      <div className="row"><button type="button" className="btn-danger" disabled={actionBusy} onClick={deleteEvent}>{actionBusy ? 'Eliminando…' : 'Eliminar evento'}</button><button type="button" className="btn-ghost" disabled={actionBusy} onClick={() => setDeleteTarget(null)}>Cancelar</button></div>
    </Modal>
  </div>;
}
