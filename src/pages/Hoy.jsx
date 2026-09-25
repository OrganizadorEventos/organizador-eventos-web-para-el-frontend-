import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { localYMD, formatDate, formatHours, weekdayShort } from '../lib/dates';
import { LoadingState, EmptyState, ErrorState } from '../components/States';
import ProgressBar from '../components/ProgressBar';
import NoteModal from '../components/NoteModal';

export default function Hoy() {
  const { user, updateLimit } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [noteTask, setNoteTask] = useState(null); // {task, action}

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/today?date=${localYMD()}`);
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos cargar el día de hoy.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function confirmAction(task, action, note) {
    await api.post(`/events/${task.eventId}/tasks/${task.id}/execute`, { action, note });
    setNoteTask(null);
    await load();
  }

  if (loading) return <LoadingState label={`Cargando las gestiones de hoy…`} />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  const src = data.workloadHours;
  const pct = data.dailyLimit > 0 ? Math.min(100, Math.round((src / data.dailyLimit) * 100)) : 0;
  const overLimit = src > data.dailyLimit;
  const todayLabel = `${weekdayShort(data.date)}, ${formatDate(data.date)}`;

  return (
    <div>
      <div className="row-between">
        <div>
          <h1>Hoy</h1>
          <p style={{ color: 'var(--color-text-soft)', margin: 0 }}>
            {todayLabel}. Las gestiones que piden atención inmediata.
          </p>
        </div>
      </div>

      <div className="card daily-widget">
        <h2>Carga del día</h2>
        <ProgressBar
          value={pct}
          label={`${formatHours(data.todayHours)} de hoy + ${formatHours(data.overdueHours)} vencidas = ${formatHours(src)} de ${formatHours(data.dailyLimit)} diarias`}
        />
        {overLimit ? (
          <p className="field-error" role="alert" style={{ marginTop: 8 }}>
            Estás superando tu límite diario. Considerá reprogramar gestiones desde el evento.
          </p>
        ) : (
          <p className="field-hint" style={{ marginTop: 8 }}>
            {src === 0 ? 'Sin carga planificada. ¡Que rinda! 🎉' : 'Dentro de tu límite diario.'}
          </p>
        )}
        <div className="row" style={{ marginTop: 10 }}>
          <label htmlFor="limit-input" style={{ fontWeight: 500, margin: 0 }}>
            Tu límite (h/día):
          </label>
          <input
            id="limit-input"
            type="number"
            min="0.5"
            max="24"
            step="0.5"
            value={data.dailyLimit}
            style={{ width: 90 }}
            onChange={async (e) => {
              const v = Number(e.target.value);
              if (v > 0 && v <= 24) {
                const me = await updateLimit(v);
                setData((d) => ({ ...d, dailyLimit: me.dailyLimit }));
              }
            }}
          />
        </div>
      </div>

      <div className="card">
        <h2>Gestiones urgentes</h2>
        <p className="field-hint">Reglas de prioridad: 1) vencidas, 2) de hoy, 3) mayor carga estimada.</p>
        {data.urgentes.length === 0 ? (
          <EmptyState
            emoji="✅"
            title="Nada urgente por hoy"
            text="No tenés gestiones vencidas ni planificadas para hoy. Disfrutá el día."
          />
        ) : (
          <ul className="urgent-list">
            {data.urgentes.map((task) => (
              <li key={task.id} className={`urgent-card${task.overdue ? ' is-overdue' : ''}`}>
                <div className="row-between">
                  <div>
                    <h3 style={{ marginBottom: 2 }}>
                      {task.title}
                      {task.overdue ? <span className="badge badge-overdue" style={{ marginLeft: 8 }}>Vencida</span> : <span className="badge badge-urgent" style={{ marginLeft: 8 }}>Hoy</span>}
                    </h3>
                    <div className="meta">
                      {task.eventName && (
                        <Link to={`/evento/${task.eventId}`}>
                          <span className="badge badge-progress">📌 {task.eventName}</span>
                        </Link>
                      )}
                      <span>{formatHours(task.estimatedHours)}</span>
                      <span>{task.description || ''}</span>
                    </div>
                  </div>
                  <div className="row">
                    <button type="button" className="btn-success btn-sm" onClick={() => setNoteTask({ task, action: 'done' })}>
                      Hecho
                    </button>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => setNoteTask({ task, action: 'postponed' })}>
                      Posponer
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="field-hint">
        {data.rules.map((r) => (
          <span key={r} style={{ display: 'block' }}>{r}</span>
        ))}
      </p>

      <NoteModal
        open={Boolean(noteTask)}
        task={noteTask?.task}
        action={noteTask?.action}
        onClose={() => setNoteTask(null)}
        onConfirm={confirmAction}
      />
    </div>
  );
}