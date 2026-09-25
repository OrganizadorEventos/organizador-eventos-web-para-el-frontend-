import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { localYMD } from '../lib/dates';

function emptyTask() {
  return { key: crypto.randomUUID(), title: '', scheduledDate: localYMD(), estimatedHours: 1 };
}

const SUGGESTED = ['Reservar el salón', 'Enviar invitaciones', 'Confirmar catering'];

export default function Crear() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [tasks, setTasks] = useState([emptyTask(), emptyTask(), emptyTask()]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function updateTask(key, patch) {
    setTasks((list) => list.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  }

  function onSuggested(sug) {
    const row = tasks.find((t) => !t.title.trim()) || tasks[tasks.length - 1];
    updateTask(row.key, { title: sug });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    const invalidTask = tasks.find((t) => {
      const hours = Number(t.estimatedHours);
      return (
        t.title.trim().length < 2 ||
        !t.scheduledDate ||
        !Number.isFinite(hours) ||
        hours < 0.25 ||
        hours > 24
      );
    });

    if (invalidTask) {
      setError('Revisá las gestiones: cada una debe tener título, plazo y entre 0.25 y 24 horas.');
      return;
    }

    const clean = tasks.map((t) => ({
      title: t.title.trim(),
      scheduledDate: t.scheduledDate,
      estimatedHours: Number(t.estimatedHours),
    }));
    if (name.trim().length < 2) {
      setError('Dale un nombre al evento (al menos 2 caracteres).');
      return;
    }
    if (type.trim().length === 0) {
      setError('Ingresá el tipo de evento.');
      return;
    }

    if (!date) {
      setError('Ingresá una fecha válida para el evento.');
      return;
    }

    if (clean.length === 0) {
      setError('Agregá al menos una gestión logística con título.');
      return;
    }
    setBusy(true);
    try {
      const { event } = await api.post('/events', {
        name: name.trim(),
        type: type.trim(),
        date,
        description: description.trim(),
        tasks: clean,
      });
      navigate(`/evento/${event.id}`, { state: { created: true } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos crear el evento.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1>Crear evento</h1>
      <p style={{ color: 'var(--color-text-soft)' }}>
        Definí el evento y su plan de trabajo logístico inicial (subtareas con plazo y horas estimadas).
      </p>

      {error && <div className="form-error" role="alert">{error}</div>}

      <form onSubmit={onSubmit} noValidate>
        <div className="card">
          <div className="field">
            <label htmlFor="ev-name">Nombre del evento *</label>
            <input
              id="ev-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Fiesta de cumpleaños de Emma"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="ev-type">Tipo de evento *</label>
            <input
              id="ev-type"
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="Ej: Conferencia"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="ev-date">Fecha del evento *</label>
            <input
              id="ev-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="ev-desc">Descripción (opcional)</label>
            <textarea
              id="ev-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Festejo familiar de 10 años en casa."
            />
          </div>
        </div>

        <div className="card">
          <div className="row-between">
            <div>
              <h2 style={{ margin: 0 }}>Plan de trabajo logístico</h2>
              <p className="field-hint" style={{ marginTop: 4 }}>
                Sugerencias: {SUGGESTED.map((s) => (
                  <button key={s} type="button" className="btn-ghost btn-sm" onClick={() => onSuggested(s)} style={{ marginRight: 6 }}>
                    + {s}
                  </button>
                ))}
              </p>
            </div>
          </div>

          {tasks.map((task, i) => (
            <fieldset key={task.key} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <legend>Gestión {i + 1}</legend>
              <div className="field">
                <label htmlFor={`task-title-${task.key}`}>Título *</label>
                <input
                  id={`task-title-${task.key}`}
                  type="text"
                  value={task.title}
                  onChange={(e) => updateTask(task.key, { title: e.target.value })}
                  placeholder="Ej: Reservar el salón"
                />
              </div>
              <div className="row">
                <div className="field" style={{ flex: 1, minWidth: 160, marginBottom: 0 }}>
                  <label htmlFor={`task-date-${task.key}`}>Para el día</label>
                  <input
                    id={`task-date-${task.key}`}
                    type="date"
                    value={task.scheduledDate || ''}
                    onChange={(e) => updateTask(task.key, { scheduledDate: e.target.value })}
                  />
                </div>
                <div className="field" style={{ width: 110, marginBottom: 0 }}>
                  <label htmlFor={`task-hours-${task.key}`}>Horas est.</label>
                  <input
                    id={`task-hours-${task.key}`}
                    type="number"
                    min="0.25"
                    max="24"
                    step="0.25"
                    value={task.estimatedHours}
                    onChange={(e) => updateTask(task.key, { estimatedHours: e.target.value })}
                  />
                </div>
                <button
                  type="button"
                  className="btn-danger-ghost btn-sm"
                  onClick={() => setTasks((list) => (list.length > 1 ? list.filter((t) => t.key !== task.key) : list))}
                  aria-label={`Quitar gestión ${i + 1}`}
                  style={{ alignSelf: 'flex-end' }}
                >
                  Quitar
                </button>
              </div>
            </fieldset>
          ))}

          <button
            type="button"
            className="btn-secondary"
            onClick={() => setTasks((list) => [...list, emptyTask()])}
          >
            + Agregar gestión
          </button>
        </div>

        <div className="row">
          <button type="submit" disabled={busy} style={{ minWidth: 180 }}>
            {busy ? 'Creando…' : 'Crear evento'}
          </button>
          <span className="field-hint">Las horas estimadas se usan para el límite diario y el progreso.</span>
        </div>
      </form>
    </div>
  );
}
