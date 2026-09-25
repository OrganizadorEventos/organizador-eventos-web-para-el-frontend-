import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { LoadingState, EmptyState, ErrorState } from '../components/States';
import ProgressBar from '../components/ProgressBar';
import { formatDate, formatHours, formatDateTime } from '../lib/dates';

export default function Progreso() {
  const [events, setEvents] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { events: list } = await api.get('/events');
      setEvents(list);
      if (list.length && !list.some((e) => e.id === Number(selectedId))) {
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

  if (loading) return <LoadingState label="Cargando el progreso…" />;
  if (error && !events) return <ErrorState message={error} onRetry={loadEvents} />;
  if (!events) return null;

  if (events.length === 0) {
    return (
      <div>
        <h1>Progreso</h1>
        <div className="card">
          <EmptyState
            emoji="📊"
            title="Sin eventos para medir"
            text="Creá un evento para ver aquí la barra de progreso de su preparación."
          >
            <Link to="/crear" className="btn-secondary" style={{ textDecoration: 'none' }}>Crear evento</Link>
          </EmptyState>
        </div>
      </div>
    );
  }

  const done = detail ? detail.tasks.filter((t) => t.status === 'done') : [];
  const pending = detail ? detail.tasks.filter((t) => t.status === 'pending') : [];
  const postponed = detail ? detail.tasks.filter((t) => t.status === 'postponed') : [];

  return (
    <div>
      <h1>Progreso de preparación</h1>
      <p style={{ color: 'var(--color-text-soft)' }}>
        Cuánto del plan logístico está ejecutado. Se calcula con horas: hechas / (hechas + pendientes).
      </p>

      <div className="card">
        <label htmlFor="progress-select">Elegí el evento</label>
        <select id="progress-select" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.name} — {ev.progress}%</option>
          ))}
        </select>
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}

      {detail && (
        <>
          <div className="card">
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
              <ProgressBar value={detail.progress} label="Preparación del evento" />
            </div>
            <div className="row" style={{ marginTop: 14, gap: 16 }}>
              <div>
                <strong>{formatHours(detail.doneHours)}</strong>
                <span className="field-hint"> horas hechas</span>
              </div>
              <div>
                <strong>{formatHours(detail.totalHours)}</strong>
                <span className="field-hint"> horas planificadas</span>
              </div>
              <div>
                <strong>{detail.tasks.length}</strong>
                <span className="field-hint"> gestiones totales</span>
              </div>
              <div>
                <strong>{pending.length}</strong>
                <span className="field-hint"> pendientes</span>
              </div>
              <div>
                <strong>{postponed.length}</strong>
                <span className="field-hint"> en pausa</span>
              </div>
            </div>
          </div>

          <div className="row" style={{ alignItems: 'flex-start' }}>
            <div className="card" style={{ flex: 1, minWidth: 260 }}>
              <h2>Hechas ✅</h2>
              {done.length === 0 ? (
                <p className="field-hint">Todavía no registraste gestiones hechas.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {done.map((t) => (
                    <li key={t.id} style={{ marginBottom: 6 }}>
                      <strong>{t.title}</strong>
                      {t.note && <span className="field-hint"> — {t.note}</span>}
                      <span className="field-hint"> ({formatHours(t.estimatedHours)})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card" style={{ flex: 1, minWidth: 260 }}>
              <h2>Pendientes ⏳</h2>
              {pending.length === 0 ? (
                <p className="field-hint">Sin pendientes. ¡Todo planificado!</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {pending.map((t) => (
                    <li key={t.id} style={{ marginBottom: 6 }}>
                      <strong>{t.title}</strong>
                      <span className="field-hint"> · {t.scheduledDate ? formatDate(t.scheduledDate) : 'sin fecha'} · {formatHours(t.estimatedHours)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {postponed.length > 0 && (
            <div className="card">
              <h2>En pausa ⏸️</h2>
              <p className="field-hint">Pospuestas por imprevistos. No cuentan en el progreso hasta retomarlas.</p>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {postponed.map((t) => (
                  <li key={t.id} style={{ marginBottom: 6 }}>
                    <strong>{t.title}</strong>
                    {t.note && <span className="field-hint"> — {t.note}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {detail.activities?.length > 0 && (
            <div className="card">
              <h2>Bitácora del evento</h2>
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