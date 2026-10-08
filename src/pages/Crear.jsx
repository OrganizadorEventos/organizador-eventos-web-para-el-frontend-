import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { localYMD } from '../lib/dates';
import { EVENT_TYPES } from '../lib/eventTypes';
import TimePicker from '../components/TimePicker';

function newTask() {
  return { key: crypto.randomUUID(), title: '', scheduledDate: localYMD(), estimatedHours: 1 };
}

export default function Crear() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [otherType, setOtherType] = useState('');
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function updateTask(key, patch) {
    setTasks((items) => items.map((item) => item.key === key ? { ...item, ...patch } : item));
  }

  async function submit(e) {
    e.preventDefault(); setError('');
    if (name.trim().length < 2) return setError('El nombre del evento debe tener al menos 2 caracteres.');
    const cleanType = type === 'Otro' ? otherType.trim() : type;
    if (!cleanType) return setError('Especifica el tipo de evento.');
    if (!date) return setError('Selecciona la fecha del evento.');
    const cleanTasks = tasks.map((task) => ({ title: task.title.trim(), scheduledDate: task.scheduledDate, estimatedHours: Number(task.estimatedHours) }));
    const invalid = cleanTasks.find((task) => task.title.length < 2 || !task.scheduledDate || !Number.isFinite(task.estimatedHours) || task.estimatedHours <= 0);
    if (invalid) return setError('Completa cada subtarea con título, fecha y horas estimadas mayores que 0.');
    setBusy(true);
    try {
      const { event } = await api.post('/events', {
        name: name.trim(), type: cleanType, weight: weight === '' ? null : Number(weight), date, time,
        description: description.trim(),
        tasks: cleanTasks,
      });
      navigate('/hoy', { state: { created: true, eventName: event.name } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos crear el evento.');
    } finally { setBusy(false); }
  }

  return (
    <section className="create-page">
      <header className="page-title-row create-title"><span className="create-section-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M7.5 3v4M16.5 3v4M4 9.5h16"/></svg></span><h1>Crear evento</h1></header>
      {error && <div className="form-error" role="alert">{error}</div>}
      <form className="create-form-grid" onSubmit={submit} noValidate>
       <div className="card create-info-card">
        <div className="field create-name-field"><label htmlFor="activity-title">Nombre del evento *</label><input id="activity-title" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Feria de emprendimiento" required /></div>
        <div className="field"><label htmlFor="activity-type">Tipo de evento *</label><select id="activity-type" value={type} onChange={(e) => setType(e.target.value)} required><option value="">Selecciona un tipo de evento</option>{EVENT_TYPES.map((eventType) => <option key={eventType}>{eventType}</option>)}</select></div>
        {type === 'Otro' && <div className="field"><label htmlFor="activity-other-type">Especifica el tipo de evento *</label><input id="activity-other-type" value={otherType} onChange={(e) => setOtherType(e.target.value)} maxLength={80} required /></div>}
        <div className="field create-date-field"><label htmlFor="activity-date">Fecha del evento *</label><input id="activity-date" type="date" lang="es-CO" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
        <div className="field create-time-field"><label htmlFor="activity-time">Hora del evento</label><TimePicker id="activity-time" value={time} onChange={setTime} /></div>
        <div className="field create-field-wide"><label htmlFor="activity-description">Descripción (opcional)</label><textarea id="activity-description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Añade detalles..." /></div>
       </div>
       <section className="card subtasks-editor">
          <div className="row-between"><div className="create-section-heading"><span className="create-section-icon create-plan-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 5h11M9 12h11M9 19h11"/><circle cx="4" cy="5" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="19" r="1"/></svg></span><div><h2>Plan de preparación</h2><p className="field-hint">Agrega subtareas para organizar y llevar a cabo el evento.</p></div></div><button type="button" className="btn-ghost btn-sm" onClick={() => setTasks((items) => [...items, newTask()])}>＋ Agregar subtarea</button></div>
          {tasks.length === 0 && <div className="create-empty-tasks"><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 4H6a2 2 0 0 0-2 2v14h16V6a2 2 0 0 0-2-2h-3M9 3h6v4H9z"/><path d="m8 14 2.5 2.5L16 11"/></svg></span><strong>No hay subtareas</strong><p>Agrega subtareas para organizar tu evento.</p></div>}
          {tasks.map((task, index) => <fieldset className="subtask-fieldset" key={task.key}><legend>Subtarea {index + 1}</legend><div className="field"><label htmlFor={`subtask-title-${task.key}`}>Subtarea *</label><input id={`subtask-title-${task.key}`} value={task.title} onChange={(e) => updateTask(task.key, { title: e.target.value })} placeholder="Ej. Confirmar el servicio de catering" /></div><div className="activity-fields-row"><div className="field"><label htmlFor={`subtask-date-${task.key}`}>Fecha planificada</label><input id={`subtask-date-${task.key}`} type="date" value={task.scheduledDate} onChange={(e) => updateTask(task.key, { scheduledDate: e.target.value })} /></div><div className="field"><label htmlFor={`subtask-hours-${task.key}`}>Horas estimadas</label><input id={`subtask-hours-${task.key}`} type="number" min="0" step="any" value={task.estimatedHours} onChange={(e) => updateTask(task.key, { estimatedHours: e.target.value })} /></div><button type="button" className="btn-ghost btn-sm" onClick={() => updateTask(task.key, { scheduledDate: localYMD() })}>Ahora</button></div><button type="button" className="subtask-remove" onClick={() => setTasks((items) => items.filter((item) => item.key !== task.key))}>Quitar subtarea</button></fieldset>)}
        </section>
        <div className="form-submit-row"><button type="submit" disabled={busy}>{busy ? 'Creando…' : 'Crear evento'}</button></div>
      </form>
    </section>
  );
}


