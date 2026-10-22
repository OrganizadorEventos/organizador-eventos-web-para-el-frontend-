import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { LoadingState, ErrorState, SuccessBanner } from '../components/States';
import ProgressBar from '../components/ProgressBar';
import Modal from '../components/Modal';
import NoteModal from '../components/NoteModal';
import ConflictoModal from '../components/ConflictoModal';
import { formatDate, formatHours, localYMD } from '../lib/dates';

function taskState(task, today) {
  if (task.status === 'done') return { key: 'done', label: 'Hecha' };
  if (task.status === 'postponed') return { key: 'postponed', label: 'Pospuesta' };
  if (task.status === 'pending' && task.scheduledDate && task.scheduledDate < today) {
    return { key: 'overdue', label: 'Vencida' };
  }
  return { key: 'pending', label: 'Pendiente' };
}

export default function Progreso() {
  const [events, setEvents] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [message, setMessage] = useState('');
  const [reprogramTask, setReprogramTask] = useState(null);
  const [pendingEditAfterConflict, setPendingEditAfterConflict] = useState(null);
  const [executeTask, setExecuteTask] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState(null);
  const [busyDeleteTask, setBusyDeleteTask] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { events: list } = await api.get(`/events?date=${localYMD()}`);
      setEvents(list);
      if (!list.length) {
        setSelectedId('');
        setDetail(null);
      } else if (!list.some((event) => event.id === Number(selectedId))) {
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
    setDetailLoading(true);
    setError('');
    try {
      const { event } = await api.get(`/events/${selectedId}`);
      setDetail(event);
    } catch (err) {
      setError(err?.message || 'No pudimos cargar el detalle.');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, [selectedId]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  const refreshProgress = useCallback(async (eventId = selectedId) => {
    const [{ events: list }, { event }] = await Promise.all([
      api.get(`/events?date=${localYMD()}`),
      api.get(`/events/${eventId}`),
    ]);
    setEvents(list);
    setDetail(event);
    return event;
  }, [selectedId]);

  function flash(text) {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  }

  async function executeTaskAction(task, action, note) {
    if (updatingTaskId !== null) return;
    setUpdatingTaskId(task.id);
    try {
      await api.post(`/events/${detail.id}/tasks/${task.id}/execute`, { action, note });
      setExecuteTask(null);
      await refreshProgress(detail.id);
      flash(action === 'done' ? '¡Subtarea completada!' : action === 'pending' ? 'Subtarea reabierta.' : 'Subtarea pospuesta. Quedó en pausa.');
    } catch (err) {
      throw err;
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function saveEditedTask() {
    if (!editTask || !detail) return;
    const hours = Number(editTask.estimatedHours);
    if (!Number.isFinite(hours) || hours <= 0) {
      setError('Las horas estimadas deben ser mayores que 0.');
      return;
    }
    setError('');
    try {
      await api.patch(`/events/${detail.id}/tasks/${editTask.id}`, {
        title: editTask.title,
        scheduledDate: editTask.scheduledDate || null,
        estimatedHours: hours,
      });
      setEditTask(null);
      await refreshProgress(detail.id);
      flash('Subtarea actualizada.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.payload?.conflict) {
        setPendingEditAfterConflict({ id: editTask.id, title: editTask.title });
        setReprogramTask({ ...editTask, initialConflict: err.payload.conflict });
        setEditTask(null);
        return;
      }
      setError(err?.message || 'No pudimos guardar.');
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
      await api.patch(`/events/${detail.id}/tasks/${pendingEdit.id}`, { title: pendingEdit.title });
      await refreshProgress(detail.id);
      flash('Subtarea actualizada.');
      return;
    }
    await refreshProgress(detail.id);
    flash(text);
  }

  async function deleteTask() {
    if (!confirmDeleteTask || !detail) return;
    setBusyDeleteTask(true);
    setError('');
    try {
      await api.del(`/events/${detail.id}/tasks/${confirmDeleteTask.id}`);
      setConfirmDeleteTask(null);
      await refreshProgress(detail.id);
      flash('Subtarea eliminada.');
    } catch (err) {
      setError(err?.message || 'No pudimos eliminar.');
    } finally {
      setBusyDeleteTask(false);
    }
  }

  if (loading) return <LoadingState label="Cargando el progreso…" />;
  if (error && !events) return <ErrorState message={error} onRetry={loadEvents} />;
  if (!events) return null;

  const today = localYMD();
  const detailTasks = (detail?.tasks || []).map((task) => ({ ...task, displayState: taskState(task, today) }));
  const detailCounts = detailTasks.reduce((counts, task) => {
    counts[task.displayState.key] += 1;
    return counts;
  }, { done: 0, pending: 0, overdue: 0, postponed: 0 });

  return (
    <section className="progress-page">
      <header className="page-title-row">
        <div>
          <p className="eyebrow">MIVO · RESUMEN</p>
          <h1>Progreso de eventos</h1>
          <p className="page-subtitle">Visualiza el avance y el tiempo dedicado a la organización.</p>
        </div>
      </header>

      <section className="card progress-main-card" aria-label="Progreso y subtareas del evento">
        {message && <SuccessBanner message={message} />}
        {events.length === 0 ? (
          <p className="progress-inline-empty">No existen eventos para mostrar. Crea un evento para consultar su progreso.</p>
        ) : (
          <>
            <div className="progress-event-picker">
              <label htmlFor="progress-select">Elige un evento</label>
              <select id="progress-select" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
                {events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
              </select>
            </div>

            {error && <div className="form-error" role="alert">{error}</div>}
            {detailLoading && <p className="progress-inline-empty" role="status">Cargando el evento…</p>}

            {detail && !detailLoading && (
              <>
                <section className="progress-event-summary" aria-label={`Resumen de ${detail.name}`}>
                  <div className="row-between progress-event-heading">
                    <div>
                      <h2>{detail.name}</h2>
                      {detail.description && <p className="field-hint">{detail.description}</p>}
                    </div>
                    <Link to={`/evento/${detail.id}`} className="btn-secondary btn-sm progress-open-event">Abrir evento</Link>
                  </div>
                  <ProgressBar value={detail.progress} label="Progreso del evento" />
                  <div className="progress-detail-counts">
                    <span className="task-state-text task-state-done">{detailCounts.done} hechas</span>
                    <span className="task-state-text task-state-pending">{detailCounts.pending} pendientes</span>
                    <span className="task-state-text task-state-overdue">{detailCounts.overdue} vencidas</span>
                    <span className="task-state-text task-state-postponed">{detailCounts.postponed} pospuestas</span>
                    <span className="progress-hours">{formatHours(detail.doneHours)} de {formatHours(detail.totalHours)} horas completadas</span>
                  </div>
                </section>

                <section className="progress-task-section" aria-label={`Subtareas de ${detail.name}`}>
                  <div className="progress-task-section-heading">
                    <div><p className="eyebrow">DETALLE</p><h2>Subtareas planificadas</h2></div>
                    <span>{detailTasks.length} en total</span>
                  </div>
                  {detailTasks.length === 0 ? (
                    <p className="progress-inline-empty">Este evento no tiene subtareas agregadas.</p>
                  ) : (
                    <div className="progress-task-list">
                      {detailTasks.map((task) => (
                        <article className="progress-task-row" key={task.id}>
                          <div className="progress-task-main">
                            <strong>{task.title}</strong>
                            <div className="progress-task-meta">
                              <span>{task.scheduledDate ? formatDate(task.scheduledDate) : 'Sin fecha planificada'}</span>
                              {task.estimatedHours !== null && task.estimatedHours !== undefined && <span>{formatHours(task.estimatedHours)}</span>}
                              {task.note && <span>{task.note}</span>}
                            </div>
                          </div>
                          <span className={`progress-task-status task-state-${task.displayState.key}`}><i aria-hidden="true" />{task.displayState.label}</span>
                          <div className="progress-task-actions">
                            <button type="button" className="btn-ghost btn-sm" disabled={updatingTaskId !== null} onClick={() => setReprogramTask(task)}>Reprogramar</button>
                            {task.displayState.key !== 'done' && (
                              <>
                                <button type="button" className="btn-ghost btn-sm" disabled={updatingTaskId !== null} onClick={() => setExecuteTask({ task, action: 'done' })}>Hecho</button>
                                {task.status !== 'postponed' && <button type="button" className="btn-ghost btn-sm" disabled={updatingTaskId !== null} onClick={() => setExecuteTask({ task, action: 'postponed' })}>Posponer</button>}
                              </>
                            )}
                            <button type="button" className="btn-ghost btn-sm" disabled={updatingTaskId !== null} onClick={() => setEditTask({ ...task, scheduledDate: task.scheduledDate || '' })}>Editar</button>
                            <button type="button" className="btn-danger-ghost btn-sm" disabled={updatingTaskId !== null} onClick={() => setConfirmDeleteTask(task)}>Quitar</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </section>

      <Modal open={Boolean(editTask)} title="Editar subtarea" onClose={() => setEditTask(null)} labelledBy="progress-edit-task-title">
        {editTask && <>
          <div className="field">
            <label htmlFor="progress-edit-title">Título</label>
            <input id="progress-edit-title" type="text" value={editTask.title} onChange={(event) => setEditTask((task) => ({ ...task, title: event.target.value }))} />
          </div>
          <div className="row">
            <div className="field" style={{ flex: 1, minWidth: 170 }}>
              <label htmlFor="progress-edit-date">Para el día</label>
              <input id="progress-edit-date" type="date" value={editTask.scheduledDate} onChange={(event) => setEditTask((task) => ({ ...task, scheduledDate: event.target.value }))} />
            </div>
            <div className="field" style={{ width: 120 }}>
              <label htmlFor="progress-edit-hours">Horas est.</label>
              <input id="progress-edit-hours" type="number" min="0" step="any" value={editTask.estimatedHours} onChange={(event) => setEditTask((task) => ({ ...task, estimatedHours: event.target.value }))} />
            </div>
          </div>
          <div className="row">
            <button type="button" className="btn-success" onClick={saveEditedTask}>Guardar</button>
            <button type="button" className="btn-ghost" onClick={() => setEditTask(null)}>Cancelar</button>
          </div>
        </>}
      </Modal>

      <Modal open={Boolean(confirmDeleteTask)} title="Quitar subtarea" onClose={() => setConfirmDeleteTask(null)} labelledBy="progress-delete-task-title">
        <p>¿Quitar “{confirmDeleteTask?.title}” del plan?</p>
        <div className="row">
          <button type="button" className="btn-danger" disabled={busyDeleteTask} onClick={deleteTask}>{busyDeleteTask ? 'Quitando…' : 'Sí, quitar'}</button>
          <button type="button" className="btn-ghost" onClick={() => setConfirmDeleteTask(null)}>Cancelar</button>
        </div>
      </Modal>

      <ConflictoModal
        key={reprogramTask?.id || 'progress-reprogram'}
        open={Boolean(reprogramTask)}
        task={reprogramTask}
        eventId={detail?.id}
        initialConflict={reprogramTask?.initialConflict}
        onClose={closeReprogram}
        onResolved={handleReprogramResolved}
        onVerifyRescheduled={async (taskId) => {
          const refreshed = await refreshProgress(detail.id);
          return refreshed?.tasks?.find((task) => Number(task.id) === Number(taskId)) || null;
        }}
      />

      <NoteModal
        open={Boolean(executeTask)}
        task={executeTask?.task}
        action={executeTask?.action}
        onClose={() => setExecuteTask(null)}
        onConfirm={executeTaskAction}
      />
    </section>
  );
}
