import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { localYMD, formatDate, formatHours } from '../lib/dates';
import { LoadingState, EmptyState, ErrorState } from '../components/States';
import NoteModal from '../components/NoteModal';
import ConflictoModal from '../components/ConflictoModal';

export default function Hoy() {
  const { user, updateLimit } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [noteTask, setNoteTask] = useState(null);
  const [rescheduleTask, setRescheduleTask] = useState(null);
  const [courseFilter, setCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [daysFilter, setDaysFilter] = useState('7');
  const [showSortHelp, setShowSortHelp] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await api.get(`/today?date=${localYMD()}`)); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Ha ocurrido un error cargando la información.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function confirmAction(task, action, note) {
    await api.post(`/events/${task.eventId}/tasks/${task.id}/execute`, { action, note });
    setNoteTask(null);
    setMessage(action === 'done' ? 'Actividad marcada como hecha.' : 'Actividad pospuesta.');
    await load();
  }

  const grouped = useMemo(() => {
    if (!data) return { overdue: [], today: [], upcoming: [], courses: [] };
    const currentDate = data.date;
    const upcoming = daysFilter === 'all' ? (data.future || data.upcoming || []) : (data.upcoming || []);
    const allTasks = [...data.urgentes, ...upcoming];
    const courses = [...new Set(allTasks.map((task) => task.course).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const matches = (task, section) => {
      const sectionName = task.overdue ? 'overdue' : task.scheduledDate === currentDate ? 'today' : 'upcoming';
      if (sectionName !== section) return false;
      if (courseFilter !== 'all' && (task.course || '') !== courseFilter) return false;
      if (statusFilter !== 'all' && statusFilter !== sectionName) return false;
      return true;
    };
    return {
      overdue: data.urgentes.filter((task) => matches(task, 'overdue')),
      today: data.urgentes.filter((task) => matches(task, 'today')),
      upcoming: upcoming.filter((task) => matches(task, 'upcoming')),
      courses,
    };
  }, [data, courseFilter, statusFilter, daysFilter]);

  if (loading && !data) return <LoadingState label="Cargando tus actividades…" />;
  if (error && !data) return <ErrorState message="Ha ocurrido un error cargando la información." onRetry={load} />;
  if (!data) return null;

  const workload = Number(data.workloadHours || 0);
  const totalVisible = grouped.overdue.length + grouped.today.length + grouped.upcoming.length;
  const periodCount = data.urgentes.length + (daysFilter === 'all' ? (data.future || []).length : (data.upcoming || []).length);
  const pct = data.dailyLimit > 0 ? Math.min(100, Math.round((workload / data.dailyLimit) * 100)) : 0;
  const sections = [
    { id: 'overdue', title: 'Vencidas', tasks: grouped.overdue },
    { id: 'today', title: 'Para hoy', tasks: grouped.today },
    { id: 'upcoming', title: `Próximas (${daysFilter === 'all' ? 'todas' : '7 días'})`, tasks: grouped.upcoming },
  ];

  return (
    <div className="today-page">
      <header className="row-between page-heading">
        <div><h1>Hoy</h1><p className="page-subtitle">Gestiona y planifica tus compromisos académicos</p></div>
        <Link to="/perfil" className="profile-chip"><span className="avatar" aria-hidden="true">{user?.name?.charAt(0)?.toUpperCase() || 'E'}</span><span><strong>PERFIL</strong><small>{user?.name || 'Estudiante'}</small></span></Link>
      </header>

      <section className="today-filters" aria-label="Filtros de actividades">
        <div className="field"><label htmlFor="filter-course">Curso</label><select id="filter-course" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}><option value="all">Todos</option>{grouped.courses.map((course) => <option key={course} value={course}>{course}</option>)}<option value="">Sin curso</option></select></div>
        <div className="field"><label htmlFor="filter-status">Estado</label><select id="filter-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">Todos</option><option value="overdue">Vencidas</option><option value="today">Para hoy</option><option value="upcoming">Pendientes</option></select></div>
        <div className="field"><label htmlFor="filter-days">Días</label><select id="filter-days" value={daysFilter} onChange={(e) => setDaysFilter(e.target.value)}><option value="7">Próximos 7 días</option><option value="all">Todos</option></select></div>
        <div className="sort-help-wrap">
          <button className="sort-help" type="button" aria-expanded={showSortHelp} onClick={() => setShowSortHelp((visible) => !visible)}>ⓘ ¿Cómo se ordena?</button>
          {showSortHelp && <p className="sort-help-message" role="status">Primero aparecen las actividades vencidas, luego las de hoy y después las próximas. Puedes filtrar la lista por curso, estado o fecha.</p>}
        </div>
      </section>

      <section className="daily-summary" aria-label="Carga de hoy">
        <div><span className="summary-label">Carga de hoy</span><strong>{formatHours(workload)} <small>/ {formatHours(data.dailyLimit)} h</small></strong></div>
        <div className="summary-progress"><div className="progress-track"><div className={`progress-fill${pct >= 100 ? ' is-over-limit' : ''}`} style={{ width: `${pct}%` }} /></div><span>{pct}% del límite diario</span></div>
        <label className="daily-limit-field" htmlFor="limit-input">Límite<input id="limit-input" type="number" min="0.5" max="24" step="0.5" value={data.dailyLimit} onChange={async (e) => { const value = Number(e.target.value); if (value > 0 && value <= 24) { try { const updated = await updateLimit(value); setData((current) => ({ ...current, dailyLimit: updated.dailyHoursLimit })); } catch (err) { setError(err.message); } } }} /></label>
      </section>

      {message && <div className="form-success" role="status">{message}</div>}
      {error && <div className="form-error" role="alert">{error}<button className="btn-ghost btn-sm" type="button" onClick={load}>Reintentar</button></div>}

      {totalVisible === 0 && periodCount === 0 ? (
        <div className="card today-empty"><EmptyState emoji="☕" title="No hay tareas programadas" text="Aún no tienes actividades en este periodo."><Link className="primary-link-button" to="/crear">Crear actividad</Link></EmptyState></div>
      ) : totalVisible === 0 ? (
        <div className="card today-empty"><EmptyState emoji="⌕" title="No hay resultados" text="Cambia o limpia los filtros para ver tus actividades." /></div>
      ) : sections.map((section) => (
        <section className="activity-section" key={section.id}>
          <h2 className={`section-title section-${section.id}`}>{section.title}<span>{section.tasks.length}</span></h2>
          {section.tasks.length ? <ul className="urgent-list">{section.tasks.map((task) => (
            <li className={`activity-card activity-${section.id}`} key={task.id}>
              <div className="activity-main">
                <div className="activity-title-row"><Link to={`/evento/${task.eventId}`} className="activity-title">{task.title}</Link><span className={`activity-state state-${section.id}`}>{section.id === 'overdue' ? 'Vencida' : section.id === 'today' ? 'Para hoy' : 'Pendiente'}</span></div>
                <div className="activity-meta"><span>▣ {task.course || task.eventName || 'Sin curso'}</span>{task.eventType && <span>◈ {task.eventType}</span>}<span>▦ {formatDate(task.scheduledDate)}</span><span>◷ {formatHours(task.estimatedHours)} estimadas</span></div>
                {task.description && <p className="activity-description">{task.description}</p>}
              </div>
              <div className="activity-actions"><button type="button" className="btn-done" onClick={() => setNoteTask({ task, action: 'done' })}>✓ Hecha</button><button type="button" className="btn-postpone" onClick={() => setNoteTask({ task, action: 'postponed' })}>◷ Posponer</button><button type="button" className="btn-reschedule" onClick={() => setRescheduleTask(task)}>⟳ Reprogramar</button></div>
            </li>
          ))}</ul> : <p className="section-empty">No hay actividades en esta sección.</p>}
        </section>
      ))}

      <NoteModal open={Boolean(noteTask)} task={noteTask?.task} action={noteTask?.action} onClose={() => setNoteTask(null)} onConfirm={confirmAction} />
      <ConflictoModal key={rescheduleTask?.id || 'today-reschedule'} open={Boolean(rescheduleTask)} task={rescheduleTask} eventId={rescheduleTask?.eventId} onClose={() => setRescheduleTask(null)} onResolved={(text) => { setMessage(text); load(); }} onVerifyRescheduled={async (taskId) => { const { event } = await api.get(`/events/${rescheduleTask.eventId}`); return event.tasks.find((task) => Number(task.id) === Number(taskId)) || null; }} />
    </div>
  );
}
