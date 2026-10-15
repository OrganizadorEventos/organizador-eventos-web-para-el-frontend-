import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { LoadingState, EmptyState, ErrorState } from '../components/States';
import ProgressBar from '../components/ProgressBar';
import { formatDate, formatHours, formatDateTime, localYMD } from '../lib/dates';

function taskState(task, today) {
  if (task.status === 'done') return { key: 'done', label: 'Hecha' };
  if (task.status === 'postponed') return { key: 'postponed', label: 'En pausa' };
  if (task.status === 'pending' && task.scheduledDate && task.scheduledDate < today) {
    return { key: 'overdue', label: 'Vencida' };
  }
  return { key: 'pending', label: 'Pendiente' };
}

function eventCounts(event) {
  const overdue = Number(event.overdueCount || 0);
  const pending = Math.max(0, Number(event.pendingCount || 0) - overdue);
  return {
    done: Number(event.doneCount || 0),
    pending,
    overdue,
    postponed: Number(event.postponedCount || 0),
  };
}

export default function Progreso() {
  const [events, setEvents] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { events: list } = await api.get(`/events?date=${localYMD()}`);
      setEvents(list);
      if (!list.length) {
        setSelectedId('');
        setDetail(null);
      } else if (!list.some((e) => e.id === Number(selectedId))) {
        setSelectedId(String(list[0].id));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos cargar los eventos.');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const loadDetail = useCallback(async () => {
    if (!selectedId) { setDetail(null); return; }
    setError('');
    try {
      const { event } = await api.get(`/events/${selectedId}`);
      setDetail(event);
    } catch (err) {
      setError(err?.message || 'No pudimos cargar el detalle.');
    }
  }, [selectedId]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  async function setTaskCompleted(task, completed) {
    if (!detail || updatingTaskId !== null) return;
    setUpdatingTaskId(task.id);
    setError('');
    try {
      await api.post(`/events/${detail.id}/tasks/${task.id}/execute`, {
        action: completed ? 'done' : 'pending',
      });
      const [{ events: list }, { event }] = await Promise.all([
        api.get(`/events?date=${localYMD()}`),
        api.get(`/events/${detail.id}`),
      ]);
      setEvents(list);
      setDetail(event);
    } catch (err) {
      setError(err?.message || 'No pudimos actualizar la subtarea.');
    } finally {
      setUpdatingTaskId(null);
    }
  }

  if (loading) return <LoadingState label="Cargando el progreso…" />;
  if (error && !events) return <ErrorState message={error} onRetry={loadEvents} />;
  if (!events) return null;

  if (events.length === 0) {
    return (
      <section className="progress-page">
      <header className="page-title-row"><div><p className="eyebrow">MIVO · RESUMEN</p><h1>Progreso de eventos</h1><p className="page-subtitle">Consulta el avance de las subtareas de tus eventos.</p></div></header>
        <div className="card">
          <EmptyState
            emoji="📊"
            title="Sin eventos para medir"
            text="Crea un evento para consultar el progreso de sus subtareas."
          >
            <Link to="/crear" className="btn-secondary" style={{ textDecoration: 'none' }}>Crear evento</Link>
          </EmptyState>
        </div>
      </section>
    );
  }

  const totalTasks = events.reduce((sum, event) => sum + Number(event.taskCount || 0), 0);
  const completedTasks = events.reduce((sum, event) => sum + eventCounts(event).done, 0);
  const pendingTasks = events.reduce((sum, event) => sum + eventCounts(event).pending, 0);
  const overdueTasks = events.reduce((sum, event) => sum + eventCounts(event).overdue, 0);
  const postponedTasks = events.reduce((sum, event) => sum + eventCounts(event).postponed, 0);
  const overallProgress = totalTasks ? Math.round(completedTasks / totalTasks * 100) : 0;
  const upcomingEvents = [...events].filter((event) => event.date && event.date >= localYMD()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  const today = localYMD();
  const detailCounts = (detail?.tasks || []).reduce((counts, task) => {
    const state = taskState(task, today).key;
    counts[state] = (counts[state] || 0) + 1;
    return counts;
  }, { done: 0, pending: 0, overdue: 0, postponed: 0 });
  const detailTasks = (detail?.tasks || []).map((task) => ({ ...task, displayState: taskState(task, today) }));
  return (
    <section className="progress-page">
      <header className="page-title-row"><div><p className="eyebrow">MIVO · RESUMEN</p><h1>Progreso de eventos</h1><p className="page-subtitle">Visualiza el avance y el tiempo dedicado a la organización.</p></div><div className="progress-overall-chip"><span>Progreso general</span><strong>{overallProgress}%</strong></div></header>

      <section className="progress-overview" aria-label="Resumen de subtareas por estado">
        <article className="card progress-state-card progress-state-done"><span className="progress-state-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></span><strong>{completedTasks}</strong><span>Completadas</span></article>
        <article className="card progress-state-card progress-state-pending"><span className="progress-state-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg></span><strong>{pendingTasks}</strong><span>Pendientes</span></article>
        <article className="card progress-state-card progress-state-overdue"><span className="progress-state-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v4m0 3h.01"/></svg></span><strong>{overdueTasks}</strong><span>Vencidas</span></article>
      </section>
      {postponedTasks > 0 && <p className="progress-paused-note">{postponedTasks} subtareas en pausa; se muestran aparte y no se cuentan como pendientes ni vencidas.</p>}
      <section className="card event-progress-list">
        <h2>Progreso por evento</h2>
        <div className="event-progress-items">
          {events.map((event) => {
            const counts = eventCounts(event);
            return (
            <article className="event-progress-item" key={event.id}>
              <div className="row-between">
                <Link to={`/evento/${event.id}`}>{event.name}</Link>
                <strong>{event.progress}%</strong>
              </div>
              <ProgressBar value={event.progress} label={`${counts.done} de ${event.taskCount || 0} subtareas · ${formatHours(event.doneHours)} de ${formatHours(event.totalHours)}`} />
              <div className="event-progress-counts" aria-label={`Estados de subtareas de ${event.name}`}>
                <span className="task-state-text task-state-done">{counts.done} hechas</span>
                <span className="task-state-text task-state-pending">{counts.pending} pendientes</span>
                <span className="task-state-text task-state-overdue">{counts.overdue} vencidas</span>
                {counts.postponed > 0 && <span className="task-state-text task-state-postponed">{counts.postponed} en pausa</span>}
              </div>
              {Number(event.taskCount) > 0 && Number(event.doneCount) === Number(event.taskCount) && <span className="event-progress-complete">✓ Completado</span>}
              <button type="button" className="btn-secondary btn-sm" onClick={() => { setSelectedId(String(event.id)); document.getElementById('progress-event-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>Ver subtareas</button>
            </article>
            );
          })}
        </div>
      </section>
      {upcomingEvents.length > 0 && <section className="card upcoming-deadlines"><div className="row-between"><h2>Próximos vencimientos</h2><Link to="/eventos">Ver todas</Link></div><ul>{upcomingEvents.map((event) => <li key={event.id}><span className="deadline-dot" /><Link to={`/evento/${event.id}`}>{event.name}</Link><span>{formatDate(event.date)}</span></li>)}</ul></section>}
      <div className="card">
        <label htmlFor="progress-select">Elige un evento</label>
        <select id="progress-select" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.name} — {ev.progress}%</option>
          ))}
        </select>
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}

      {detail && (
        <>
          <div className="card" id="progress-event-detail">
            <div className="row-between">
              <div>
                <h2 style={{ margin: 0 }}>{detail.name}</h2>
                {detail.description && <p className="field-hint" style={{ margin: '4px 0 0' }}>{detail.description}</p>}
              </div>
              <Link to={`/evento/${detail.id}`} style={{ textDecoration: 'none' }}>
                <button type="button" className="btn-secondary btn-sm">Abrir evento</button>
              </Link>
            </div>
            <div style={{ marginTop: 14 }}>
              <ProgressBar value={detail.progress} label="Progreso del evento" />
            </div>
            <div className="progress-detail-counts">
              <span className="task-state-text task-state-done">{detailCounts.done} hechas</span>
              <span className="task-state-text task-state-pending">{detailCounts.pending} pendientes</span>
              <span className="task-state-text task-state-overdue">{detailCounts.overdue} vencidas</span>
              <span className="task-state-text task-state-postponed">{detailCounts.postponed} en pausa</span>
              <span>{formatHours(detail.doneHours)} de {formatHours(detail.totalHours)} horas completadas</span>
            </div>
          </div>

          {detailTasks.length > 0 && (
            <section className="card progress-task-section" aria-label={`Subtareas de ${detail.name}`}>
              <div className="progress-task-section-heading">
                <div><p className="eyebrow">DETALLE</p><h2>Subtareas planificadas</h2></div>
                <span>{detailTasks.length} en total</span>
              </div>
              <div className="progress-task-list">
                {detailTasks.map((task) => (
                  <article className="progress-task-row" key={task.id}>
                    <label className="progress-task-check" aria-label={task.status === 'done' ? `Marcar ${task.title} como pendiente` : `Marcar ${task.title} como hecha`}>
                      <input type="checkbox" checked={task.status === 'done'} disabled={updatingTaskId === task.id} onChange={() => setTaskCompleted(task, task.status !== 'done')} />
                    </label>
                    <div className="progress-task-main">
                      <strong>{task.title}</strong>
                      <div className="progress-task-meta">
                        <span>{task.scheduledDate ? formatDate(task.scheduledDate) : 'Sin fecha planificada'}</span>
                        {task.estimatedHours !== null && task.estimatedHours !== undefined && <span>{formatHours(task.estimatedHours)}</span>}
                        {task.note && <span>{task.note}</span>}
                      </div>
                    </div>
                    <span className={`progress-task-status task-state-${task.displayState.key}`}><i aria-hidden="true" />{task.displayState.label}</span>
                  </article>
                ))}
              </div>
            </section>
          )}

          {detail.tasks.length === 0 ? (
            <div className="card"><p className="field-hint" style={{ margin: 0 }}>Este evento no tiene subtareas agregadas.</p></div>
          ) : null}

          {detail.activities?.length > 0 && (
            <div className="card">
              <h2>Bitácora del evento</h2>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Cuándo</th>
                      <th scope="col">Subtarea</th>
                      <th scope="col">Acción</th>
                      <th scope="col">Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.activities.map((a) => (
                      <tr key={a.id}>
                        <td>{formatDateTime(a.created_at)}</td>
                        <td>{a.task_title}</td>
                        <td>{ACTION_LABEL[a.action] || a.action}</td>
                        <td>{a.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

const ACTION_LABEL = {
  created: 'Creada',
  rescheduled: 'Reprogramada',
  done: 'Marcada hecha',
  postponed: 'Pospuesta',
  edited: 'Editada',
  pending: 'Reabierta',
  deleted: 'Eliminada',
};
