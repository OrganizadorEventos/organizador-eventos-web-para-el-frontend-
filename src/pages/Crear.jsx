import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { localYMD } from '../lib/dates';

function newTask() {
  return { key: crypto.randomUUID(), title: '', scheduledDate: localYMD(), estimatedHours: 1 };
}

export default function Crear() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [otherType, setOtherType] = useState('');
  const [course, setCourse] = useState('');
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [tasks, setTasks] = useState([newTask()]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function updateTask(key, patch) {
    setTasks((items) => items.map((item) => item.key === key ? { ...item, ...patch } : item));
  }

  async function submit(e) {
    e.preventDefault(); setError('');
    if (name.trim().length < 2) return setError('El título debe tener al menos 2 caracteres.');
    const cleanType = type === 'Otro' ? otherType.trim() : type;
    if (!cleanType) return setError('Especifica el tipo de actividad.');
    if (!date) return setError('Selecciona la fecha límite.');
    if (weight !== '' && (!Number.isFinite(Number(weight)) || Number(weight) < 0 || Number(weight) > 100)) return setError('El peso debe estar entre 0 y 100.');
    const cleanTasks = tasks.map((task) => ({ title: task.title.trim(), scheduledDate: task.scheduledDate, estimatedHours: Number(task.estimatedHours) }));
    const invalid = cleanTasks.find((task) => task.title.length < 2 || !task.scheduledDate || !Number.isFinite(task.estimatedHours) || task.estimatedHours <= 0);
    if (!cleanTasks.length || invalid) return setError('Completa cada subtarea con título, fecha y horas estimadas mayores que 0.');
    setBusy(true);
    try {
      const { event } = await api.post('/events', {
        name: name.trim(), type: cleanType, course: course.trim(), weight: weight === '' ? null : Number(weight), date,
        description: description.trim(),
        tasks: cleanTasks,
      });
      navigate(`/evento/${event.id}`, { state: { created: true } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos crear la actividad.');
    } finally { setBusy(false); }
  }

  return (
    <section className="create-page">
      <header className="page-title-row"><div><p className="eyebrow">MIVO · ACTIVIDADES</p><h1>Crear nueva actividad</h1><p className="page-subtitle">Completa los datos de tu actividad.</p></div></header>
      {error && <div className="form-error" role="alert">{error}</div>}
      <form className="card activity-form-card" onSubmit={submit} noValidate>
        <div className="field"><label htmlFor="activity-title">Título *</label><input id="activity-title" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Resolver taller de funciones" required /></div>
        <div className="field"><label htmlFor="activity-type">Tipo *</label><select id="activity-type" value={type} onChange={(e) => setType(e.target.value)} required><option value="">Selecciona un tipo</option><option>Tarea</option><option>Examen</option><option>Proyecto</option><option>Lectura</option><option>Presentación</option><option>Otro</option></select></div>
        {type === 'Otro' && <div className="field"><label htmlFor="activity-other-type">Especifica el tipo *</label><input id="activity-other-type" value={otherType} onChange={(e) => setOtherType(e.target.value)} maxLength={80} required /></div>}
        <div className="activity-fields-row">
          <div className="field"><label htmlFor="activity-course">Curso</label><input id="activity-course" value={course} onChange={(e) => setCourse(e.target.value)} maxLength={120} placeholder="Ej. Cálculo II" /></div>
          <div className="field"><label htmlFor="activity-weight">Peso (opcional)</label><div className="input-suffix"><input id="activity-weight" type="number" min="0" max="100" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Ej. 30" /><span>%</span></div></div>
        </div>
        <div className="field"><label htmlFor="activity-date">Fecha límite *</label><input id="activity-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
        <div className="field"><label htmlFor="activity-description">Descripción (opcional)</label><textarea id="activity-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Añade información útil para completar la actividad." /></div>
        <section className="subtasks-editor">
          <div className="row-between"><div><h2>Subtareas</h2><p className="field-hint">Divide la actividad en pasos que puedas planificar.</p></div><button type="button" className="btn-ghost btn-sm" onClick={() => setTasks((items) => [...items, newTask()])}>＋ Agregar subtarea</button></div>
          {tasks.map((task, index) => <fieldset className="subtask-fieldset" key={task.key}><legend>Subtarea {index + 1}</legend><div className="field"><label htmlFor={`subtask-title-${task.key}`}>Título *</label><input id={`subtask-title-${task.key}`} value={task.title} onChange={(e) => updateTask(task.key, { title: e.target.value })} placeholder="Ej. Revisar los ejercicios 1–5" /></div><div className="activity-fields-row"><div className="field"><label htmlFor={`subtask-date-${task.key}`}>Fecha</label><input id={`subtask-date-${task.key}`} type="date" value={task.scheduledDate} onChange={(e) => updateTask(task.key, { scheduledDate: e.target.value })} /></div><div className="field"><label htmlFor={`subtask-hours-${task.key}`}>Tiempo estimado (h)</label><input id={`subtask-hours-${task.key}`} type="number" min="0" step="any" value={task.estimatedHours} onChange={(e) => updateTask(task.key, { estimatedHours: e.target.value })} /></div></div>{tasks.length > 1 && <button type="button" className="subtask-remove" onClick={() => setTasks((items) => items.filter((item) => item.key !== task.key))}>Quitar subtarea</button>}</fieldset>)}
        </section>
        <div className="form-submit-row"><button type="submit" disabled={busy}>{busy ? 'Creando…' : 'Crear actividad'}</button></div>
      </form>
    </section>
  );
}
