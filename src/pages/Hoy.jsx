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

function formatConflictDate(date) {
  const [year, month, day] = String(date || '').split('-');
  return year && month && day ? `${day}/${month}/${year}` : date;
}

function eventIconKind(type) {
  const normalized = String(type || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (normalized.includes('conciert')) return 'concert';
  if (normalized.includes('cumple')) return 'birthday';
  if (normalized.includes('boda') || normalized.includes('social')) return 'celebration';
  if (normalized.includes('feria')) return 'fair';
  if (normalized.includes('taller')) return 'workshop';
  if (normalized.includes('conferenc') || normalized.includes('corporativ')) return 'presentation';
  return 'calendar';
}

function EventTypeIcon({ type }) {
  const kind = eventIconKind(type);
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {kind === 'concert' && <><path d="M10 18V5l10-2v13"/><circle cx="7" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></>}
      {kind === 'birthday' && <><path d="M4 13h16v7H4zM3 20h18M7 13V9m5 4V7m5 6V9"/><path d="M6 6c0-1 1-1 1-2m4 1c0-1 1-1 1-2m4 3c0-1 1-1 1-2"/></>}
      {kind === 'celebration' && <path d="M20.8 8.7c0 4.2-8.8 10-8.8 10s-8.8-5.8-8.8-10a4.7 4.7 0 0 1 8.8-2.2 4.7 4.7 0 0 1 8.8 2.2Z"/>}
      {kind === 'fair' && <><path d="M3 10h18l-2-6H5l-2 6Z"/><path d="M4 10v10h16V10M9 20v-6h6v6M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/></>}
      {kind === 'workshop' && <><path d="M14.5 6.5a4 4 0 0 0-5.2 5.2L4 17l3 3 5.3-5.3a4 4 0 0 0 5.2-5.2l-2.3 2.3-2.5-2.5 1.8-2.8Z"/><path d="m4 4 3 3"/></>}
      {kind === 'presentation' && <><rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M12 17v4m-4 0h8M7 13l3-3 2 2 4-5"/></>}
      {kind === 'calendar' && <><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M7.5 3v4M16.5 3v4M4 9.5h16"/></>}
    </svg>
  );
}

const statusLabel = { overdue: 'Vencido', pending: 'Pendiente', done: 'Terminado' };

export default function Hoy() {
  const { user, updateLimit } = useAuth();
  const [data, setData] = useState(null);
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showSortHelp, setShowSortHelp] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [limitDraft, setLimitDraft] = useState(String(user?.dailyHoursLimit || 6));
  const [limitBusy, setLimitBusy] = useState(false);
  const [limitConflict, setLimitConflict] = useState(null);
  const [reducedHours, setReducedHours] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const date = localYMD();
    const results = await Promise.allSettled([
      api.get(`/today?date=${date}`),
      api.get(`/events?date=${date}`),
    ]);
    let failed = false;
    if (results[0].status === 'fulfilled') setData(results[0].value);
    else failed = true;
    if (results[1].status === 'fulfilled') setEvents(results[1].value.events);
    else failed = true;
    setError(failed ? 'No se pudo cargar toda la información. Inténtalo de nuevo.' : '');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const todayDate = data?.date || localYMD();
  const eventNames = useMemo(() => [...new Set((events || []).map((event) => event.name))].sort((a, b) => a.localeCompare(b)), [events]);
  const visibleEvents = useMemo(() => (events || []).filter((event) => {
    const state = eventStatus(event, todayDate);
    return (eventFilter === 'all' || event.name === eventFilter) && (statusFilter === 'all' || state === statusFilter);
  }), [events, todayDate, eventFilter, statusFilter]);

  async function saveLimit(value) {
    setLimitBusy(true);
    setError('');
    try {
      const updated = await updateLimit(value);
      setData((current) => current && ({ ...current, dailyLimit: updated.dailyHoursLimit }));
      setLimitDraft(String(updated.dailyHoursLimit));
      setLimitConflict(null);
      setReducedHours({});
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && Array.isArray(err.payload?.conflicts)) {
        setLimitConflict({ proposedLimit: value, conflicts: err.payload.conflicts });
      } else {
        setError(err instanceof ApiError ? err.message : 'No se pudo guardar el límite diario. Inténtalo de nuevo.');
      }
      return false;
    } finally {
      setLimitBusy(false);
    }
  }

  async function resolveLimitTask(task, action) {
    if (!limitConflict || limitBusy) return;
    setLimitBusy(true);
    setError('');
    try {
      if (action === 'postpone') {
        await api.post(`/events/${task.eventId}/tasks/${task.id}/execute`, {
          action: 'postponed',
          note: 'Pospuesta para resolver el nuevo límite diario.',
        });
      } else {
        const hours = Number(reducedHours[task.id]);
        if (!Number.isFinite(hours) || hours <= 0 || hours >= task.estimatedHours) {
          setError('Indica una duración menor a la actual y mayor que 0.');
          return;
        }
        await api.post(`/events/${task.eventId}/tasks/${task.id}/reschedule`, {
          newDate: task.scheduledDate,
          newHours: hours,
        });
      }
      const proposedLimit = limitConflict.proposedLimit;
      await load();
      await saveLimit(proposedLimit);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar la subtarea. Inténtalo de nuevo.');
    } finally {
      setLimitBusy(false);
    }
  }

  function cancelLimitChange() {
    setLimitConflict(null);
    setReducedHours({});
    setLimitDraft(String(data?.dailyLimit || user?.dailyHoursLimit || 6));
  }

  async function finishEvent(event) {
    setActionBusy(true);
    setError('');
    try {
      // The existing event PATCH route supports status updates across backend versions.
      const { event: updated } = await api.patch(`/events/${event.id}`, { status: 'done' });
      const { events: refreshedEvents } = await api.get(`/events?date=${todayDate}`);
      const refreshed = refreshedEvents.find((item) => item.id === event.id);
      if (updated?.status !== 'done' && refreshed?.status !== 'done') {
        throw new Error('El servidor no confirmó el cambio. Verifica que la migración 004_event_status_and_cascade_delete.sql esté aplicada y que el backend esté actualizado.');
      }
      setOpenMenuId(null);
      setEvents(refreshedEvents);
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
      setEvents((current) => current?.filter((event) => event.id !== deletedId) || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos eliminar el evento.');
    } finally { setActionBusy(false); }
  }
  if (loading && !data && !events) return <LoadingState label="Cargando Hoy…" />;
  if (error && !data && !events) return <ErrorState message={error} onRetry={load} />;
  if (!data && !events) return null;

  const workload = Number(data?.workloadHours || 0);
  const pct = data?.dailyLimit > 0 ? Math.round((workload / data.dailyLimit) * 100) : 0;
  const barPct = Math.max(0, Math.min(100, pct));

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

    {data && <section className="daily-summary" aria-label="Carga de hoy">
      <div><span className="summary-label">Carga de hoy</span><strong>{formatHours(workload)} <small>/ {formatHours(data.dailyLimit)}</small></strong></div>
      <div className="summary-progress"><div className="progress-track"><div className={`progress-fill${pct > 100 ? ' is-over-limit' : ''}`} style={{ width: `${barPct}%` }} /></div><span>{pct}% del límite diario</span></div>
      <div className="daily-limit-control">
        <label className="daily-limit-field" htmlFor="limit-input">Límite<input id="limit-input" type="number" min="1" max="24" step="0.5" value={limitDraft} onChange={(e) => setLimitDraft(e.target.value)} /></label>
        <button type="button" className="btn-secondary btn-sm" disabled={limitBusy || Number(limitDraft) === Number(data.dailyLimit)} onClick={() => {
          const value = Number(limitDraft);
          if (!Number.isFinite(value) || value < 1 || value > 24) {
            setError('El límite diario debe estar entre 1 y 24 horas.');
            return;
          }
          saveLimit(value);
        }}>{limitBusy ? 'Guardando…' : 'Guardar límite'}</button>
      </div>
    </section>}

    {error && <div className="form-error" role="alert">{error}<button className="btn-ghost btn-sm" type="button" onClick={load}>Reintentar</button></div>}
    <section className="activity-section" aria-label="Mis eventos">
      <h2 className="section-title">Mis eventos<span>{visibleEvents.length}</span></h2>
      {visibleEvents.length ? <ul className="urgent-list">{visibleEvents.map((event) => {
          const state = eventStatus(event, todayDate);
        return <li className="activity-card event-card" key={event.id}>
          <Link to={`/evento/${event.id}`} className={`event-type-icon event-icon-${state}`} aria-label={`Abrir ${event.name}. Tipo: ${event.type || 'Evento'}. Estado: ${statusLabel[state]}`} title={event.type || 'Evento'}><EventTypeIcon type={event.type} /></Link>
          <div className="activity-main"><div className="activity-title-row"><Link to={`/evento/${event.id}`} className="activity-title">{event.name}</Link></div><div className="activity-meta"><span>▪ {event.date ? formatDate(event.date) : 'Fecha por definir'}</span><span>◇ {event.type || 'Evento'}</span><span>☷ {event.taskCount} subtareas</span></div></div>
          <span className={`activity-state state-${state}`}>{statusLabel[state]}</span>
          <div className="event-menu-wrap">
            <button type="button" className="event-more" aria-label={`Más opciones para ${event.name}`} title="Más opciones" aria-haspopup="menu" aria-expanded={openMenuId === event.id} onClick={() => setOpenMenuId((current) => current === event.id ? null : event.id)}><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg></button>
            {openMenuId === event.id && <div className="event-action-menu" role="menu">
              <Link to={`/evento/${event.id}`} state={{ edit: true }} role="menuitem" onClick={() => setOpenMenuId(null)}>Editar</Link>
              <button type="button" role="menuitem" onClick={() => { setDeleteTarget(event); setOpenMenuId(null); }}>Eliminar</button>
              {state !== 'done' && <button type="button" role="menuitem" disabled={actionBusy} onClick={() => finishEvent(event)}>Marcar terminado</button>}
            </div>}
          </div>
        </li>;
      })}</ul> : events ? <div className="card today-empty"><EmptyState emoji="☕" title={events.length ? 'No hay resultados' : 'Aún no has creado eventos'} text={events.length ? 'Cambia los filtros para ver tus eventos.' : 'Crea tu primer evento para empezar a organizar sus preparativos.'}>{!events.length && <Link className="primary-link-button" to="/crear">Crear evento</Link>}</EmptyState></div> : <div className="card"><p>No se pudieron cargar los eventos.</p><button type="button" className="btn-secondary btn-sm" onClick={load}>Reintentar</button></div>}
    </section>
    <Modal open={Boolean(deleteTarget)} title="Eliminar evento" onClose={() => !actionBusy && setDeleteTarget(null)} labelledBy="today-delete-title">
      <p>¿Quieres eliminar “{deleteTarget?.name}” y todas sus subtareas? Esta acción no se puede deshacer.</p>
      <div className="row"><button type="button" className="btn-danger" disabled={actionBusy} onClick={deleteEvent}>{actionBusy ? 'Eliminando…' : 'Eliminar evento'}</button><button type="button" className="btn-ghost" disabled={actionBusy} onClick={() => setDeleteTarget(null)}>Cancelar</button></div>
    </Modal>
    <Modal open={Boolean(limitConflict)} title="Conflicto de sobrecarga" onClose={cancelLimitChange} labelledBy="daily-limit-conflict-title">
      {limitConflict && <div className="daily-limit-conflicts" role="alert">
        <h3 id="daily-limit-conflict-title">Conflicto de sobrecarga</h3>
        <p>Elige cómo resolver la sobrecarga antes de guardar el nuevo límite.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        {limitConflict.conflicts.map((conflict) => <section className="daily-limit-conflict-date" key={conflict.date}>
          <p>Para el {formatConflictDate(conflict.date)} tienes {formatHours(conflict.scheduledHours).replace('h', ' h')} planificadas y el nuevo límite sería de {formatHours(limitConflict.proposedLimit).replace('h', ' h')}.</p>
          <ul>{conflict.tasks.map((task) => <li key={task.id}>
            <div><strong>{task.title}</strong><small>{formatHours(task.estimatedHours)} · {formatDate(task.scheduledDate)}</small></div>
            <div className="daily-limit-task-actions">
              <button type="button" className="btn-ghost btn-sm" disabled={limitBusy} onClick={() => resolveLimitTask(task, 'postpone')}>Posponer subtarea</button>
              <input type="number" min="0.25" max={Math.max(0.25, task.estimatedHours - 0.25)} step="0.25" aria-label={`Nueva duración de ${task.title}`} value={reducedHours[task.id] ?? task.estimatedHours} onChange={(e) => setReducedHours((current) => ({ ...current, [task.id]: e.target.value }))} />
              <button type="button" className="btn-secondary btn-sm" disabled={limitBusy} onClick={() => resolveLimitTask(task, 'reduce')}>Reducir horas</button>
            </div>
          </li>)}</ul>
        </section>)}
        <div className="row" style={{ marginTop: 14 }}><button type="button" className="btn-ghost" disabled={limitBusy} onClick={cancelLimitChange}>Cancelar</button></div>
      </div>}
    </Modal>
  </div>;
}
