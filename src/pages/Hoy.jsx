import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { localYMD, formatDate, formatHours } from '../lib/dates';
import { LoadingState, EmptyState, ErrorState, SuccessBanner } from '../components/States';
import Modal from '../components/Modal';
import NoteModal from '../components/NoteModal';
import ConflictoModal from '../components/ConflictoModal';

function eventStatus(event, today) {
  if (event.status === 'done') return 'done';
  if (event.taskCount > 0 && event.doneCount === event.taskCount) return 'done';
  if (event.overdueCount > 0 || (event.date && event.date < today)) return 'overdue';
  return 'pending';
}

function taskStatus(task, today) {
  if (task.status === 'done') return { key: 'done', label: 'Hecha' };
  if (task.status === 'postponed') return { key: 'postponed', label: 'Pospuesta' };
  if (task.status === 'pending' && task.scheduledDate && task.scheduledDate < today) return { key: 'overdue', label: 'Vencida' };
  return { key: 'pending', label: 'Pendiente' };
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
  const [taskDetails, setTaskDetails] = useState({});
  const [taskDetailLoading, setTaskDetailLoading] = useState({});
  const [taskMessage, setTaskMessage] = useState('');
  const [taskActionError, setTaskActionError] = useState('');
  const [taskActionBusy, setTaskActionBusy] = useState(false);
  const [reprogramTask, setReprogramTask] = useState(null);
  const [pendingEditAfterConflict, setPendingEditAfterConflict] = useState(null);
  const [executeTask, setExecuteTask] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState(null);
  const [busyDeleteTask, setBusyDeleteTask] = useState(false);
  const taskDetailRequestRef = useRef({});
  const taskLoadAttemptedRef = useRef(new Set());

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    if (!silent) taskLoadAttemptedRef.current.clear();
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
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const todayDate = data?.date || localYMD();
  const eventNames = useMemo(() => [...new Set((events || []).map((event) => event.name))].sort((a, b) => a.localeCompare(b)), [events]);
  const visibleEvents = useMemo(() => (events || []).filter((event) => {
    const state = eventStatus(event, todayDate);
    return (eventFilter === 'all' || event.name === eventFilter) && (statusFilter === 'all' || state === statusFilter);
  }), [events, todayDate, eventFilter, statusFilter]);

  const loadEventTasks = useCallback(async (eventId) => {
    const requestId = (taskDetailRequestRef.current[eventId] || 0) + 1;
    taskDetailRequestRef.current[eventId] = requestId;
    setTaskDetailLoading((current) => ({ ...current, [eventId]: true }));
    setTaskActionError('');
    try {
      const { event } = await api.get(`/events/${eventId}`);
      if (taskDetailRequestRef.current[eventId] === requestId) {
        setTaskDetails((current) => ({ ...current, [eventId]: event }));
      }
      return event;
    } catch (err) {
      setTaskActionError(err instanceof ApiError ? err.message : 'No pudimos cargar las subtareas del evento.');
      return null;
    } finally {
      if (taskDetailRequestRef.current[eventId] === requestId) {
        setTaskDetailLoading((current) => ({ ...current, [eventId]: false }));
      }
    }
  }, []);

  useEffect(() => {
    if (visibleEvents.length === 0) return;
    visibleEvents.forEach((event) => {
      if (Number(event.taskCount) > 0 && !taskDetails[event.id] && !taskDetailLoading[event.id] && !taskLoadAttemptedRef.current.has(event.id)) {
        taskLoadAttemptedRef.current.add(event.id);
        loadEventTasks(event.id);
      }
    });
  }, [visibleEvents, taskDetails, taskDetailLoading, loadEventTasks]);

  async function refreshAfterTaskAction(eventId) {
    const requestId = (taskDetailRequestRef.current[eventId] || 0) + 1;
    taskDetailRequestRef.current[eventId] = requestId;
    const [, response] = await Promise.all([
      load({ silent: true }),
      api.get(`/events/${eventId}`),
    ]);
    if (taskDetailRequestRef.current[eventId] === requestId) {
      setTaskDetails((current) => ({ ...current, [eventId]: response.event }));
    }
    return response.event;
  }

  function flashTaskMessage(text) {
    setTaskMessage(text);
    window.setTimeout(() => setTaskMessage(''), 5000);
  }

  async function executeTaskAction(task, action, note) {
    setTaskActionBusy(true);
    try {
      const { task: updatedTask } = await api.post(`/events/${task.eventId}/tasks/${task.id}/execute`, { action, note });
      const requestId = (taskDetailRequestRef.current[task.eventId] || 0) + 1;
      taskDetailRequestRef.current[task.eventId] = requestId;
      setTaskDetails((current) => {
        const event = current[task.eventId];
        if (!event) return current;
        return {
          ...current,
          [task.eventId]: {
            ...event,
            tasks: event.tasks.map((item) => Number(item.id) === Number(updatedTask.id) ? { ...item, ...updatedTask } : item),
          },
        };
      });
      setExecuteTask(null);
      flashTaskMessage(action === 'done' ? '¡Subtarea completada!' : action === 'pending' ? 'Subtarea reabierta.' : 'Subtarea pospuesta. Quedó en pausa.');
      try {
        await refreshAfterTaskAction(task.eventId);
      } catch {
        setTaskActionError('La subtarea se actualizó, pero no pudimos refrescar todos los datos. Inténtalo de nuevo.');
      }
    } finally {
      setTaskActionBusy(false);
    }
  }

  async function saveEditedTask() {
    if (!editTask) return;
    const hours = Number(editTask.estimatedHours);
    if (!Number.isFinite(hours) || hours <= 0) {
      setTaskActionError('Las horas estimadas deben ser mayores que 0.');
      return;
    }
    setTaskActionError('');
    setTaskActionBusy(true);
    try {
      await api.patch(`/events/${editTask.eventId}/tasks/${editTask.id}`, {
        title: editTask.title,
        scheduledDate: editTask.scheduledDate || null,
        estimatedHours: hours,
      });
      setEditTask(null);
      await refreshAfterTaskAction(editTask.eventId);
      flashTaskMessage('Subtarea actualizada.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.payload?.conflict) {
        setPendingEditAfterConflict({ id: editTask.id, eventId: editTask.eventId, title: editTask.title });
        setReprogramTask({ ...editTask, initialConflict: err.payload.conflict });
        setEditTask(null);
        return;
      }
      setTaskActionError(err?.message || 'No pudimos guardar la subtarea.');
    } finally {
      setTaskActionBusy(false);
    }
  }

  const closeReprogram = useCallback(() => {
    setReprogramTask(null);
    setPendingEditAfterConflict(null);
  }, []);

  async function handleReprogramResolved(text) {
    const pendingEdit = pendingEditAfterConflict;
    setPendingEditAfterConflict(null);
    if (pendingEdit) {
      await api.patch(`/events/${pendingEdit.eventId}/tasks/${pendingEdit.id}`, { title: pendingEdit.title });
      await refreshAfterTaskAction(pendingEdit.eventId);
      flashTaskMessage('Subtarea actualizada.');
      return;
    }
    await refreshAfterTaskAction(reprogramTask.eventId);
    flashTaskMessage(text);
  }

  async function deleteTask() {
    if (!confirmDeleteTask) return;
    setBusyDeleteTask(true);
    setTaskActionError('');
    try {
      await api.del(`/events/${confirmDeleteTask.eventId}/tasks/${confirmDeleteTask.id}`);
      const eventId = confirmDeleteTask.eventId;
      setConfirmDeleteTask(null);
      await refreshAfterTaskAction(eventId);
      flashTaskMessage('Subtarea eliminada.');
    } catch (err) {
      setTaskActionError(err?.message || 'No pudimos eliminar la subtarea.');
    } finally {
      setBusyDeleteTask(false);
    }
  }

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
    {taskMessage && <SuccessBanner message={taskMessage} />}
    {taskActionError && <div className="form-error" role="alert">{taskActionError}</div>}
    <section className="activity-section" aria-label="Mis eventos">
      <h2 className="section-title">Mis eventos<span>{visibleEvents.length}</span></h2>
      {visibleEvents.length ? <ul className="urgent-list">{visibleEvents.map((event) => {
          const state = eventStatus(event, todayDate);
        return <li className="activity-card event-card" key={event.id}>
          <div className={`event-type-icon event-icon-${state}`} aria-hidden="true"><EventTypeIcon type={event.type} /></div>
          <div className="activity-main"><div className="activity-title-row"><Link to={`/evento/${event.id}`} className="activity-title">{event.name}</Link></div><div className="activity-meta"><span>▪ {event.date ? formatDate(event.date) : 'Fecha por definir'}</span><span>◇ {event.type || 'Evento'}</span></div>
            {Number(event.taskCount) > 0 ? (() => {
              const total = Number(event.taskCount) || 0;
              const completed = Math.min(total, Number(event.doneCount) || 0);
              const pending = Number(event.pendingCount) || 0;
              const remaining = total - completed;
              const percentage = (completed / total) * 100;
              const remainingLabel = remaining === 0 ? 'Todas completadas' : `Falta${remaining === 1 ? '' : 'n'} ${remaining}`;
              return <div className="event-task-progress">
                <div className="event-task-counts"><span>{total} {total === 1 ? 'subtarea' : 'subtareas'}</span><span>{pending} {pending === 1 ? 'pendiente' : 'pendientes'}</span><strong>{remainingLabel}</strong></div>
                <div className="event-task-progress-track" role="progressbar" aria-label={`Subtareas completadas: ${completed} de ${total}`} aria-valuenow={Math.round(percentage)} aria-valuemin="0" aria-valuemax="100"><div className="event-task-progress-fill" style={{ width: `${percentage}%` }} /></div>
                <span className="event-task-progress-label">Subtareas completadas: {completed} de {total}</span>
              </div>;
            })() : <div className="event-task-progress event-task-progress-empty"><span>Sin subtareas</span></div>}
          </div>
          <span className={`activity-state state-${state}`}>{statusLabel[state]}</span>
          <div className="event-menu-wrap">
            <button type="button" className="event-more" aria-label={`Más opciones para ${event.name}`} title="Más opciones" aria-haspopup="menu" aria-expanded={openMenuId === event.id} onClick={() => setOpenMenuId((current) => current === event.id ? null : event.id)}><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg></button>
            {openMenuId === event.id && <div className="event-action-menu" role="menu">
              <Link to={`/evento/${event.id}`} state={{ edit: true }} role="menuitem" onClick={() => setOpenMenuId(null)}>Editar</Link>
              <button type="button" role="menuitem" onClick={() => { setDeleteTarget(event); setOpenMenuId(null); }}>Eliminar</button>
              {state !== 'done' && <button type="button" role="menuitem" disabled={actionBusy} onClick={() => finishEvent(event)}>Marcar terminado</button>}
            </div>}
          </div>
          <div className="today-event-tasks">
            {Number(event.taskCount || 0) === 0 ? <p className="today-tasks-empty">Este evento todavía no tiene subtareas.</p> : taskDetailLoading[event.id] ? <p className="today-tasks-empty" role="status">Cargando subtareas…</p> : taskDetails[event.id] ? (
              taskDetails[event.id].tasks.length ? taskDetails[event.id].tasks.map((rawTask) => {
                const task = { ...rawTask, eventId: event.id };
                const state = taskStatus(task, todayDate);
                return <article className={`today-task-row today-task-${state.key}`} key={task.id}>
                  <div className="today-task-info">
                    <div className="today-task-title-line"><strong>{task.title}</strong><span className={`today-task-badge today-task-badge-${state.key}`}><i aria-hidden="true" />{state.label}</span></div>
                    {task.description && <p className="today-task-description">{task.description}</p>}
                    <div className="today-task-meta">
                      <span>{task.scheduledDate ? formatDate(task.scheduledDate) : 'Sin fecha planificada'}</span>
                      {task.estimatedHours !== null && task.estimatedHours !== undefined && <span>{formatHours(task.estimatedHours)}</span>}
                      {task.note && <span>{task.note}</span>}
                    </div>
                  </div>
                  <div className="today-task-actions">
                    <button type="button" className="btn-ghost btn-sm" disabled={taskActionBusy || busyDeleteTask} onClick={() => setReprogramTask(task)}>Reprogramar</button>
                    {task.status !== 'done' && <>
                      <button type="button" className="btn-ghost btn-sm today-task-done-action" disabled={taskActionBusy || busyDeleteTask} onClick={() => setExecuteTask({ task, action: 'done' })}>Hecho</button>
                      {task.status !== 'postponed' && <button type="button" className="btn-ghost btn-sm" disabled={taskActionBusy || busyDeleteTask} onClick={() => setExecuteTask({ task, action: 'postponed' })}>Posponer</button>}
                    </>}
                    <button type="button" className="btn-ghost btn-sm" disabled={taskActionBusy || busyDeleteTask} onClick={() => setEditTask({ ...task, scheduledDate: task.scheduledDate || '' })}>Editar</button>
                    <button type="button" className="btn-danger-ghost btn-sm" disabled={taskActionBusy || busyDeleteTask} onClick={() => setConfirmDeleteTask(task)}>Quitar</button>
                  </div>
                </article>;
              }) : <p className="today-tasks-empty">Este evento todavía no tiene subtareas.</p>
            ) : <p className="today-tasks-empty">No se pudieron cargar las subtareas.</p>}
          </div>
        </li>;
      })}</ul> : events ? <div className="card today-empty"><EmptyState emoji="☕" title={events.length ? 'No hay resultados' : 'Aún no has creado eventos'} text={events.length ? 'Cambia los filtros para ver tus eventos.' : 'Crea tu primer evento para empezar a organizar sus preparativos.'}>{!events.length && <Link className="primary-link-button" to="/crear">Crear evento</Link>}</EmptyState></div> : <div className="card"><p>No se pudieron cargar los eventos.</p><button type="button" className="btn-secondary btn-sm" onClick={load}>Reintentar</button></div>}
    </section>
    <Modal open={Boolean(deleteTarget)} title="Eliminar evento" onClose={() => !actionBusy && setDeleteTarget(null)} labelledBy="today-delete-title">
      <p>¿Quieres eliminar “{deleteTarget?.name}” y todas sus subtareas? Esta acción no se puede deshacer.</p>
      <div className="row"><button type="button" className="btn-danger" disabled={actionBusy} onClick={deleteEvent}>{actionBusy ? 'Eliminando…' : 'Eliminar evento'}</button><button type="button" className="btn-ghost" disabled={actionBusy} onClick={() => setDeleteTarget(null)}>Cancelar</button></div>
    </Modal>
    <Modal open={Boolean(editTask)} title="Editar subtarea" onClose={() => setEditTask(null)} labelledBy="today-edit-task-title">
      {editTask && <>
        <div className="field"><label htmlFor="today-edit-task-name">Título</label><input id="today-edit-task-name" value={editTask.title} onChange={(event) => setEditTask((task) => ({ ...task, title: event.target.value }))} /></div>
        <div className="row">
          <div className="field" style={{ flex: 1, minWidth: 170 }}><label htmlFor="today-edit-task-date">Para el día</label><input id="today-edit-task-date" type="date" value={editTask.scheduledDate} onChange={(event) => setEditTask((task) => ({ ...task, scheduledDate: event.target.value }))} /></div>
          <div className="field" style={{ width: 120 }}><label htmlFor="today-edit-task-hours">Horas est.</label><input id="today-edit-task-hours" type="number" min="0" step="any" value={editTask.estimatedHours} onChange={(event) => setEditTask((task) => ({ ...task, estimatedHours: event.target.value }))} /></div>
        </div>
        {taskActionError && <div className="form-error" role="alert">{taskActionError}</div>}
        <div className="row"><button type="button" className="btn-success" disabled={taskActionBusy} onClick={saveEditedTask}>{taskActionBusy ? 'Guardando…' : 'Guardar'}</button><button type="button" className="btn-ghost" onClick={() => setEditTask(null)}>Cancelar</button></div>
      </>}
    </Modal>
    <Modal open={Boolean(confirmDeleteTask)} title="Quitar subtarea" onClose={() => !busyDeleteTask && setConfirmDeleteTask(null)} labelledBy="today-delete-task-title">
      <p>¿Quitar “{confirmDeleteTask?.title}” del plan?</p>
      {taskActionError && <div className="form-error" role="alert">{taskActionError}</div>}
      <div className="row"><button type="button" className="btn-danger" disabled={busyDeleteTask} onClick={deleteTask}>{busyDeleteTask ? 'Quitando…' : 'Sí, quitar'}</button><button type="button" className="btn-ghost" disabled={busyDeleteTask} onClick={() => setConfirmDeleteTask(null)}>Cancelar</button></div>
    </Modal>
    <ConflictoModal
      key={reprogramTask?.id || 'today-reprogram'}
      open={Boolean(reprogramTask)}
      task={reprogramTask}
      eventId={reprogramTask?.eventId}
      initialConflict={reprogramTask?.initialConflict}
      onClose={closeReprogram}
      onResolved={handleReprogramResolved}
      onVerifyRescheduled={async (taskId) => {
        const refreshed = await api.get(`/events/${reprogramTask.eventId}`);
        setTaskDetails((current) => ({ ...current, [reprogramTask.eventId]: refreshed.event }));
        return refreshed.event?.tasks?.find((task) => Number(task.id) === Number(taskId)) || null;
      }}
    />
    <NoteModal open={Boolean(executeTask)} task={executeTask?.task} action={executeTask?.action} onClose={() => setExecuteTask(null)} onConfirm={executeTaskAction} />
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
