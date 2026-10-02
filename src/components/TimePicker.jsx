import { useEffect, useRef, useState } from 'react';

const hours = Array.from({ length: 12 }, (_, i) => i + 1);
const minutes = Array.from({ length: 60 }, (_, i) => i);

function parts(value) {
  const [h = '09', m = '00'] = (value || '').split(':');
  const hour = Number(h);
  return {
    hour: hour % 12 || 12,
    minute: Number(m) || 0,
    period: hour >= 12 ? 'pm' : 'am',
  };
}

function format(value) {
  if (!value) return '';
  const { hour, minute, period } = parts(value);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period === 'am' ? 'a. m.' : 'p. m.'}`;
}

export default function TimePicker({ id, value, onChange, label = 'Seleccionar hora' }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const current = parts(value);

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    const closeEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
    };
  }, [open]);

  function select(hour, minute, period) {
    const hour24 = (hour % 12) + (period === 'pm' ? 12 : 0);
    onChange(`${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  }

  function column(items, selected, onSelect, name, render = (item) => String(item).padStart(2, '0')) {
    return <div className="time-picker-column" role="listbox" aria-label={name}>
      {items.map((item) => <button type="button" role="option" aria-selected={item === selected} className={item === selected ? 'time-picker-option selected' : 'time-picker-option'} key={item} onClick={() => onSelect(item)}>{render(item)}</button>)}
    </div>;
  }

  return <div className="time-picker" ref={root}>
    <button id={id} type="button" className="time-picker-trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((shown) => !shown)}>
      {format(value) || 'Seleccionar hora'}
    </button>
    {open && <div className="time-picker-popup" aria-label="Hora del evento">
      {column(hours, current.hour, (hour) => select(hour, current.minute, current.period), 'Hora')}
      {column(minutes, current.minute, (minute) => select(current.hour, minute, current.period), 'Minutos')}
      {column(['am', 'pm'], current.period, (period) => select(current.hour, current.minute, period), 'Periodo', (period) => period === 'am' ? 'a. m.' : 'p. m.')}
    </div>}
  </div>;
}
