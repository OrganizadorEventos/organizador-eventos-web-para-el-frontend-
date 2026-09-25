import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { LoadingState, EmptyState, ErrorState } from '../components/States';
import ProgressBar from '../components/ProgressBar';
import { formatHours } from '../lib/dates';

export default function Eventos() {
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { events: list } = await api.get('/events');
      setEvents(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos cargar los eventos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState label="Cargando tus eventos…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!events) return null;

  return (
    <div>
      <div className="row-between">
        <div>
          <h1>Mis eventos</h1>
          <p style={{ color: 'var(--color-text-soft)', margin: 0 }}>
            Seleccioná un evento para ver su plan, reprogramar y registrar avance.
          </p>
        </div>
        <Link to="/crear" className="btn-secondary" style={{ textDecoration: 'none' }}>
          + Nuevo evento
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="card">
          <EmptyState
            emoji="🎪"
            title="Todavía no tenés eventos"
            text="Creá tu primer evento y su plan logístico. Empezá por reservar el salón, invitar y confirmar catering."
          >
            <Link to="/crear" className="btn-secondary" style={{ textDecoration: 'none' }}>
              Crear mi primer evento
            </Link>
          </EmptyState>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
          {events.map((ev) => (
            <li key={ev.id}>
              <Link to={`/evento/${ev.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card hoverable" style={{ transition: 'box-shadow .15s' }}>
                  <div className="row-between">
                    <div>
                      <h3 style={{ margin: 0 }}>{ev.name}</h3>
                      {ev.description && (
                        <p style={{ color: 'var(--color-text-soft)', margin: '4px 0 8px' }}>{ev.description}</p>
                      )}
                      <div className="meta" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                        <span className="badge badge-progress">Progreso {ev.progress}%</span>
                        <span>{ev.taskCount} gestiones</span>
                        <span>{ev.pendingCount} pendientes</span>
                        {ev.postponedCount > 0 && <span className="badge badge-postponed">{ev.postponedCount} en pausa</span>}
                        <span>{formatHours(ev.doneHours)} hechas de {formatHours(ev.totalHours)}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <ProgressBar value={ev.progress} showLabel={false} />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}