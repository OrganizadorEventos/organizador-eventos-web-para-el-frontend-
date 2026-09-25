import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api, ApiError } from '../api';
import { LoadingState, EmptyState, ErrorState, SuccessBanner } from '../components/States';
import ProgressBar from '../components/ProgressBar';
import Modal from '../components/Modal';
import NoteModal from '../components/NoteModal';
import ConflictoModal from '../components/ConflictoModal';
import { formatDate, formatHours, formatDateTime } from '../lib/dates';

const STATUS_META = {
  pending: { label: 'Pendiente', badge: 'badge-urgent' },
  done: { label: 'Hecha', badge: 'badge-done' },
  postponed: { label: 'En pausa', badge: 'badge-postponed' },
};

export default function EventoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(location.state?.created ? 'Evento creado. ¡Buen comienzo!' : '');

  const [editingEvent, setEditingEvent] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [newTask, setNewTask] = useState({ title: '', scheduledDate: '', estimatedHours: 1 });
  const [showNewTask, setShowNewTask] = useState(false);

  const [reprogram, setReprogram] = useState(null); // task
  const [executeTask, setExecuteTask] = useState(null); // {task, action}
  const [editTask, setEditTask] = useState(null);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState(null);
  const [busyDeleteTask, setBusyDeleteTask] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await api.get(`/events/${id}`);
      setEvent(res.event);
      return res.event;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos cargar el evento.');
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function flash(msg) {
    setMessage(msg);
    window.setTimeout(() => setMessage(''), 5000);
  }

  async function saveEvent() {
    try {
      await api.patch(`/events/${id}`, editingEvent);
      setEditingEvent(null);
      flash('Cambios guardados.');
      load();
    } catch (err) {
      setError(err?.message || 'No pudimos guardar.');
    }
  }

  async function doDeleteEvent() {
    setDeleteBusy(true);
    try {
      await api.del(`/events/${id}`);
      navigate('/eventos');
    } catch (err) {
      setError(err?.message || 'No pudimos eliminar el evento.');
      setDeleteBusy(false);
    }
  }

  async function addTask() {
    if (newTask.title.trim().length < 2) {
      setError('La gestión necesita un título de al menos 2 caracteres.');
      return;
    }
    setError('');
    try {
      await api.post(`/events/${id}/tasks`, {
        title: newTask.title.trim(),
        scheduledDate: newTask.scheduledDate || null,
        estimatedHours: Number(newTask.estimatedHours) || 1,
      });
      setNewTask({ title: '', scheduledDate: '', estimatedHours: 1 });
      setShowNewTask(false);
      flash('Gestión agregada al plan.');
      load();
    } catch (err) {
      setError(err?.message || 'No pudimos agregar la gestión.');
    }
  }

  async function saveEditedTask() {
    try {
      await api.patch(`/events/${id}/tasks/${editTask.id}`, {
        title: editTask.title,
        scheduledDate: editTask.scheduledDate || null,
        estimatedHours: Number(editTask.estimatedHours) || 1,
      });
      setEditTask(null);
      flash('Gestión actualizada.');
      load();
    } catch (err) {
      setError(err?.message || 'No pudimos guardar.');
    }
  }

  async function doDeleteTask() {
    setBusyDeleteTask(true);
    try {
      await api.del(`/events/${id}/tasks/${confirmDeleteTask.id}`);
      setConfirmDeleteTask(null);
      flash('Gestión eliminada.');
      load();
    } catch (err) {
      setError(err?.message || 'No pudimos eliminar.');
      setBusyDeleteTask(false);
    }
  }

  async function onExecute(task, action, note) {
    await api.post(`/events/${id}/tasks/${task.id}/execute`, { action, note });
    setExecuteTask(null);
    flash(action === 'done' ? '¡Gestión marcada como hecha!' : 'Gestión pospuesta. Quedó en pausa.');
    load();
  }

  if (loading) return <LoadingState label="Cargando el evento…" />;
  if (error && !event) return <ErrorState message={error} onRetry={load} />;
  if (!event) return null;

  return (
    <div>
      <div className="row-between">
        <div>
          <h1>{event.name}</h1>
          {event.description && <p style={{ color: 'var(--color-text-soft)', margin: 0 }}>{event.description}</p>}
        </div>
        <div className="row">
          <button type="button" className="btn-secondary btn-sm" onClick={() => setEditingEvent({ name: event.name, description: event.description })}>
            Editar
          </button>
          <button type="button" className="btn-danger-ghost btn-sm" onClick={() => setConfirmDelete(true)}>
            Eliminar
          </button>
        </div>
      </div>

      {message && <SuccessBanner message={message} />}
      {error && <div className="form-error" role="alert">{error}</div>}

      <div className="card">
        <div className="row-between" style={{ marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Preparación del evento</h2>
          <strong style={{ color: 'var(--color-primary)' }}>{event.progress}%</strong>
        </div>
        <ProgressBar value={event.progress} showLabel={false} />
        <p className="field-hint" style={{ marginTop: 8 }}>
          {formatHours(event.doneHours)} de {formatHours(event.totalHours)} horas de gestión completadas
          (las pospuestas no cuentan hasta retomarlas).
        </p>
      </div>

      <div className="card">
        <div className="row-between">
          <h2>Plan de trabajo logístico</h2>
          <button type="button" className="btn-secondary btn-sm" onClick={() => setShowNewTask((v) => !v)}>
            + Agregar gestión
          </button>
        </div>

        {showNewTask && (
          <div className="card" style={{ borderStyle: 'dashed' }}>
            <div className="row">
              <div className="field" style={{ flex: 2, minWidth: 200 }}>
                <label htmlFor="nt-title">Título de la gestión</label>
                <input id="nt-title" type="text" value={newTask.title} onChange={(e) => setNewTask((t) => ({ ...t, title: e.target.value }))} placeholder="Ej: Buscar proveedores" />
              </div>
              <div className="field" style={{ width: 150 }}>
                <label htmlFor="nt-date">Para el día</label>
                <input id="nt-date" type="date" value={newTask.scheduledDate} onChange={(e) => setNewTask((t) => ({ ...t, scheduledDate: e.target.value }))} />
              </div>
              <div className="field" style={{ width: 110 }}>
                <label htmlFor="nt-hours">Horas est.</label>
                <input id="nt-hours" type="number" min="0.25" max="24" step="0.25" value={newTask.estimatedHours} onChange={(e) => setNewTask((t) => ({ ...t, estimatedHours: e.target.value }))} />
              </div>
              <button type="button" className="btn-success" style={{ alignSelf: 'flex-end' }} onClick={addTask}>
                Guardar
              </button>
            </div>
          </div>
        )}

        {event.tasks.length === 0 ? (
          <EmptyState
            emoji="📝"
            title="Sin gestiones todavía"
            text="Agregá subtareas logísticas: reservar salón, enviar invitaciones, confirmar catering, coordinar proveedores…"
          />
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
            {event.tasks.map((task) => {
              const meta = STATUS_META[task.status];
              return (
                <li key={task.id} className="card" style={{ margin: 0, padding: 12 }}>
                  <div className="row-between">
                    <div>
                      <div className="row">
                        <strong>{task.title}</strong>
                        <span className={`badge ${meta.badge}`}>{meta.label}</span>
                      </div>
                      {task.description && <p className="field-hint" style={{ margin: '2px 0 0' }}>{task.description}</p>}
                      <div className="meta" style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                        <span>📅 {task.scheduledDate ? formatDate(task.scheduledDate) : 'Sin fecha'}</span>
                        <span style={{ marginLeft: 10 }}>⏱ {formatHours(task.estimatedHours)}</span>
                        {task.note && <span style={{ marginLeft: 10 }}>✍ {task.note}</span>}
                      </div>
                    </div>
                    <div className="row">
                      <button type="button" className="btn-ghost btn-sm" onClick={() => setReprogram(task)}>
                        Reprogramar
                      </button>
                      {task.status !== 'done' && (
                        <>
                          <button type="button" className="btn-success btn-sm" onClick={() => setExecuteTask({ task, action: 'done' })}>
                            Hecho
                          </button>
                          {task.status !== 'postponed' && (
                            <button type="button" className="btn-ghost btn-sm" onClick={() => setExecuteTask({ task, action: 'postponed' })}>
                              Posponer
                            </button>
                          )}
                        </>
                      )}
                      <button type="button" className="btn-ghost btn-sm" onClick={() => setEditTask({ ...task, scheduledDate: task.scheduledDate || '' })}>
                        Editar
                      </button>
                      <button type="button" className="btn-danger-ghost btn-sm" onClick={() => setConfirmDeleteTask(task)}>
                        Quitar
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {event.activities?.length > 0 && (
        <div className="card">
          <h2>Última actividad</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Cuándo</th>
                  <th scope="col">Gestión</th>
                  <th scope="col">Acción</th>
                  <th scope="col">Nota</th>
                </tr>
              </thead>
              <tbody>
                {event.activities.slice(0, 12).map((a) => (
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

      {/* Editar evento */}
      <Modal open={Boolean(editingEvent)} title="Editar evento" onClose={() => setEditingEvent(null)} labelledBy="edit-event-title">
        <div className="field">
          <label htmlFor="ee-name">Nombre del evento</label>
          <input id="ee-name" type="text" value={editingEvent?.name || ''} onChange={(e) => setEditingEvent((ev) => (ev ? { ...ev, name: e.target.value } : ev))} />
        </div>
        <div className="field">
          <label htmlFor="ee-desc">Descripción</label>
          <textarea id="ee-desc" rows={2} value={editingEvent?.description || ''} onChange={(e) => setEditingEvent((ev) => (ev ? { ...ev, description: e.target.value } : ev))} />
        </div>
        <div className="row">
          <button type="button" className="btn-success" onClick={saveEvent}>Guardar</button>
          <button type="button" className="btn-ghost" onClick={() => setEditingEvent(null)}>Cancelar</button>
        </div>
      </Modal>

      {/* Editar gestión */}
      <Modal open={Boolean(editTask)} title="Editar gestión" onClose={() => setEditTask(null)} labelledBy="edit-task-title">
        {editTask && (
          <>
            <div className="field">
              <label htmlFor="et-title">Título</label>
              <input id="et-title" type="text" value={editTask.title} onChange={(e) => setEditTask((t) => ({ ...t, title: e.target.value }))} />
            </div>
            <div className="row">
              <div className="field" style={{ flex: 1, minWidth: 170 }}>
                <label htmlFor="et-date">Para el día</label>
                <input id="et-date" type="date" value={editTask.scheduledDate} onChange={(e) => setEditTask((t) => ({ ...t, scheduledDate: e.target.value }))} />
              </div>
              <div className="field" style={{ width: 120 }}>
                <label htmlFor="et-hours">Horas est.</label>
                <input id="et-hours" type="number" min="0.25" max="24" step="0.25" value={editTask.estimatedHours} onChange={(e) => setEditTask((t) => ({ ...t, estimatedHours: e.target.value }))} />
              </div>
            </div>
            <div className="row">
              <button type="button" className="btn-success" onClick={saveEditedTask}>Guardar</button>
              <button type="button" className="btn-ghost" onClick={() => setEditTask(null)}>Cancelar</button>
            </div>
          </>
        )}
      </Modal>

      {/* Confirmar eliminar evento */}
      <Modal open={confirmDelete} title="Eliminar evento" onClose={() => setConfirmDelete(false)} labelledBy="del-event-title">
        <p>Se eliminarán “{event.name}” y todas sus gestiones. Esta acción no se puede deshacer.</p>
        <div className="row">
          <button type="button" className="btn-danger" disabled={deleteBusy} onClick={doDeleteEvent}>
            {deleteBusy ? 'Eliminando…' : 'Sí, eliminar'}
          </button>
          <button type="button" className="btn-ghost" onClick={() => setConfirmDelete(false)}>Cancelar</button>
        </div>
      </Modal>

      {/* Confirmar eliminar gestión */}
      <Modal open={Boolean(confirmDeleteTask)} title="Quitar gestión" onClose={() => setConfirmDeleteTask(null)} labelledBy="del-task-title">
        <p>¿Quitar “{confirmDeleteTask?.title}” del plan?</p>
        <div className="row">
          <button type="button" className="btn-danger" disabled={busyDeleteTask} onClick={doDeleteTask}>
            {busyDeleteTask ? 'Quitando…' : 'Sí, quitar'}
          </button>
          <button type="button" className="btn-ghost" onClick={() => setConfirmDeleteTask(null)}>Cancelar</button>
        </div>
      </Modal>

      {/* Reprogramar + conflicto */}
      <ConflictoModal
        key={reprogram?.id || 'c'}
        open={Boolean(reprogram)}
        task={reprogram}
        eventId={id}
        onClose={() => setReprogram(null)}
        onResolved={flash}
        onVerifyRescheduled={async (taskId) => {
          const refreshedEvent = await load({ silent: true });
          return refreshedEvent?.tasks?.find((item) => Number(item.id) === Number(taskId)) || null;
        }}
      />

      {/* Hecho / Posponer con nota */}
      <NoteModal
        open={Boolean(executeTask)}
        task={executeTask?.task}
        action={executeTask?.action}
        onClose={() => setExecuteTask(null)}
        onConfirm={onExecute}
      />
    </div>
  );
}

const ACTION_LABEL = {
  created: 'Creada',
  rescheduled: 'Reprogramada',
  done: 'Marcada hecha',
  postponed: 'Pospuesta',
  edited: 'Editada',
  deleted: 'Eliminada',
};
