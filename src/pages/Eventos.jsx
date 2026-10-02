import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { LoadingState, EmptyState, ErrorState } from '../components/States';
import Modal from '../components/Modal';
import { formatDate, localYMD } from '../lib/dates';

function statusOf(event) {
  if (event.status === 'done' || (event.taskCount > 0 && event.doneCount === event.taskCount)) return 'Completada';
  if (event.overdueCount > 0 || (event.date && event.date < localYMD())) return 'Vencida';
  return 'Pendiente';
}

export default function Eventos() {
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [course, setCourse] = useState('all');
  const [status, setStatus] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const { events: list } = await api.get(`/events?date=${localYMD()}`); setEvents(list); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Ha ocurrido un error cargando la información.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const courses = useMemo(() => [...new Set((events || []).map((event) => event.course).filter(Boolean))].sort(), [events]);
  const filtered = useMemo(() => (events || []).filter((event) => {
    const state = statusOf(event);
    const matchesQuery = `${event.name} ${event.course} ${event.type}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesQuery && (course === 'all' || event.course === course) && (status === 'all' || state === status);
  }), [events, query, course, status]);

  async function removeEvent() {
    if (!deleteTarget) return;
    setBusy(true);
    try { await api.del(`/events/${deleteTarget.id}`); setDeleteTarget(null); await load(); }
    catch (err) { setError(err?.message || 'No pudimos eliminar el evento.'); }
    finally { setBusy(false); }
  }

  if (loading && !events) return <LoadingState label="Cargando tus eventos…" />;
  if (error && !events) return <ErrorState message={error} onRetry={load} />;

  return (
    <section className="events-page">
      <header className="page-title-row"><div><p className="eyebrow">MIVO · ORGANIZADOR DE EVENTOS</p><h1>Estados de eventos</h1><p className="page-subtitle">Consulta el estado de preparación de cada evento.</p></div><Link to="/crear" className="primary-link-button">＋ Nuevo evento</Link></header>
      {error && <div className="form-error" role="alert">{error}</div>}
      {!events?.length ? <div className="card"><EmptyState emoji="▤" title="Aún no tienes eventos" text="Crea tu primer evento y organiza su preparación."><Link to="/crear" className="primary-link-button">Crear evento</Link></EmptyState></div> : (
        <>
          <section className="events-tools card" aria-label="Filtros y búsqueda"><label className="search-field" htmlFor="activity-search"><span aria-hidden="true">⌕</span><input id="activity-search" type="search" placeholder="Buscar evento…" value={query} onChange={(e) => setQuery(e.target.value)} /></label><div className="field"><label htmlFor="events-course">Lugar o espacio</label><select id="events-course" value={course} onChange={(e) => setCourse(e.target.value)}><option value="all">Todos los lugares</option>{courses.map((item) => <option key={item}>{item}</option>)}</select></div><div className="field"><label htmlFor="events-status">Estado de preparación</label><select id="events-status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Todos</option><option>Pendiente</option><option>Completada</option><option>Vencida</option></select></div></section>
          {filtered.length === 0 ? <div className="card"><EmptyState emoji="⌕" title="No encontramos eventos" text="Prueba con otra búsqueda o cambia los filtros." /></div> : <div className="card activity-table-card"><div className="table-wrap"><table className="table activity-table"><thead><tr><th>Evento</th><th>Lugar</th><th>Tipo de evento</th><th>Fecha</th><th>Preparación</th><th>Acciones</th></tr></thead><tbody>{filtered.map((event) => { const state = statusOf(event); return <tr key={event.id}><td><Link className="table-title-link" to={`/evento/${event.id}`}>{event.name}</Link><small>{event.taskCount} subtareas · {event.progress}% preparado</small></td><td>{event.course || 'Por definir'}</td><td>{event.type || 'Evento'}</td><td>{event.date ? formatDate(event.date) : 'Por definir'}</td><td><span className={`activity-state state-${state === 'Vencida' ? 'overdue' : state === 'Completada' ? 'done' : 'pending'}`}>{state}</span></td><td><div className="table-actions"><Link to={`/evento/${event.id}`} state={{ edit: true }} aria-label={`Editar ${event.name}`} title="Editar">✎</Link><Link to={`/evento/${event.id}`} aria-label={`Ver ${event.name}`} title="Ver">↗</Link><button type="button" onClick={() => setDeleteTarget(event)} aria-label={`Eliminar ${event.name}`} title="Eliminar">⌫</button></div></td></tr>; })}</tbody></table></div><p className="table-footer">Mostrando {filtered.length} de {events.length} eventos</p></div>}
        </>
      )}
      <Modal open={Boolean(deleteTarget)} title="Eliminar evento" onClose={() => setDeleteTarget(null)} labelledBy="delete-activity-title"><p>¿Quieres eliminar “{deleteTarget?.name}” y todas sus subtareas de preparación? Esta acción no se puede deshacer.</p><div className="row"><button type="button" className="btn-danger" disabled={busy} onClick={removeEvent}>{busy ? 'Eliminando…' : 'Eliminar evento'}</button><button type="button" className="btn-ghost" onClick={() => setDeleteTarget(null)}>Cancelar</button></div></Modal>
    </section>
  );
}
