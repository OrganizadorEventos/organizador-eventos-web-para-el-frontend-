/** Fecha local en YYYY-MM-DD (la API usa la fecha que envía el cliente). */
export function localYMD(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function toInputValue(date) {
  if (!date) return '';
  return localYMD(new Date(`${date}T12:00:00`));
}

export function formatDate(date) {
  if (!date) return 'Sin fecha';
  const d = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat('es', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  }).format(d);
}

export function formatDateShort(date) {
  if (!date) return '—';
  const d = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(d);
}

export function formatHours(h) {
  const n = Number(h || 0);
  return Number.isInteger(n) ? `${n}h` : `${n.toFixed(1).replace('.', ',')}h`;
}

export function isOverdue(date, today = localYMD()) {
  return Boolean(date && date < today);
}

export function isToday(date, today = localYMD()) {
  return date === today;
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

export function weekdayShort(date) {
  if (!date) return '';
  const d = new Date(`${date}T12:00:00`);
  const map = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  return map[d.getDay()];
}