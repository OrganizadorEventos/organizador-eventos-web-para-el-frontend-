import { useEffect, useState } from 'react';
import Modal from './Modal';
import { api, ApiError } from '../api';
import { formatDate, formatHours, localYMD } from '../lib/dates';

const HEADING = 'reprogramar-title';

export default function ConflictoModal({ open, task, eventId, onClose, onResolved, onVerifyRescheduled }) {
  const [newDate, setNewDate] = useState('');
  const [newHours, setNewHours] = useState(1);
  const [conflict, setConflict] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && task) {
      setNewDate(task.scheduledDate || localYMD());
      setNewHours(task.estimatedHours || 1);
      setConflict(null);
      setError('');
      setBusy(false);
    }
  }, [open, task]);

  // Al abrir, precargar el estado del formulario
  // (reset depende de la apertura; se reinicia por key en el padre usando task.id)

  async function reschedule(payload) {
    setBusy(true);
    setError('');
    try {
      const requestedDate = payload?.newDate;
      if (typeof requestedDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
        setError('La fecha seleccionada no tiene el formato AAAA-MM-DD.');
        return false;
      }

      const result = await api.post(
        `/events/${eventId}/tasks/${task.id}/reschedule`,
        { ...payload, newDate: requestedDate },
      );
      const savedTask = await onVerifyRescheduled?.(task.id);
      if (!savedTask) {
        setError('La operación respondió, pero no pudimos volver a consultar la gestión para confirmar la fecha guardada.');
        return false;
      }

      if (result?.task?.scheduledDate !== requestedDate || savedTask.scheduledDate !== requestedDate) {
        const actualDate = savedTask.scheduledDate || result?.task?.scheduledDate || 'sin fecha';
        setError(`Solicitaste ${requestedDate}, pero la gestión quedó guardada con fecha ${actualDate}. No se confirmó la reprogramación.`);
        return false;
      }
      onResolved('Gestión reprogramada correctamente.');
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.payload?.conflict) {
        setConflict(err.payload.conflict);
      } else {
        setError(err?.message || 'No pudimos reprogramar la gestión.');
      }
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onFormSubmit(e) {
    e.preventDefault();
    if (!newDate) {
      setError('Elegí la nueva fecha (AAAA-MM-DD).');
      return;
    }
    const hours = Number(newHours) || task?.estimatedHours || 1;
    const ok = await reschedule({ newDate, newHours: hours });
    if (ok) onClose();
  }

  async function moveTo(date) {
    const ok = await reschedule({ newDate: date, newHours: Number(newHours) || task?.estimatedHours || 1 });
    if (ok) onClose();
  }

  async function applyReducedHours() {
    const hours = Number(newHours) || conflict.maxAllowedHours;
    const ok = await reschedule({ newDate: conflict.date, newHours: hours });
    if (ok) onClose();
  }

  async function acceptAnyway() {
    const ok = await reschedule({ newDate: conflict.date, newHours: Number(newHours) || task?.estimatedHours || 1, acceptConflict: true });
    if (ok) onClose();
  }

  async function postpone() {
    setBusy(true);
    setError('');
    try {
      await api.post(`/events/${eventId}/tasks/${task.id}/execute`, { action: 'postponed', note: 'Pospuesta para resolver el conflicto de horario.' });
      onResolved('La gestión quedó en pausa. Elegí otra fecha cuando retomes.');
      onClose();
    } catch (err) {
      setError(err?.message || 'No pudimos posponer la gestión.');
      setBusy(false);
    }
  }

  const reductionImpossible = conflict && conflict.otherHours >= conflict.dailyLimit;

  return (
    <Modal open={open} title="Reprogramar gestión" onClose={onClose} labelledBy={HEADING}>
      <p>
        <strong>“{task?.title}”</strong> · {formatHours(task?.estimatedHours)} estimadas · {task?.scheduledDate ? formatDate(task.scheduledDate) : 'sin fecha'}
      </p>

      {error && <div className="form-error" role="alert">{error}</div>}

      {!conflict ? (
        <form onSubmit={onFormSubmit}>
          <div className="row">
            <div className="field" style={{ flex: 1, minWidth: 250 }}>
              <label htmlFor={`rd-${task?.id}-date`}>Nueva fecha (AAAA-MM-DD)</label>
              <div className="row">
                <input
                  id={`rd-${task?.id}-date`}
                  type="text"
                  autoComplete="off"
                  placeholder="2026-09-27"
                  maxLength={10}
                  pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  aria-describedby={`rd-${task?.id}-date-hint`}
                  style={{ flex: 1, minWidth: 145 }}
                />
                <label htmlFor={`rd-${task?.id}-calendar`} className="field-hint" style={{ margin: 0 }}>
                  Calendario
                </label>
                <input
                  id={`rd-${task?.id}-calendar`}
                  type="date"
                  aria-label="Elegir fecha desde el calendario"
                  value={/^\d{4}-\d{2}-\d{2}$/.test(newDate) ? newDate : ''}
                  onChange={(e) => setNewDate(e.target.value)}
                  style={{ width: 155 }}
                />
              </div>
              <span id={`rd-${task?.id}-date-hint`} className="field-hint">
                Escribí el año completo o elegí una fecha en el calendario.
              </span>
            </div>
            <div className="field" style={{ width: 120 }}>
              <label htmlFor={`rd-${task?.id}-hours`}>Horas est.</label>
              <input
                id={`rd-${task?.id}-hours`}
                type="number"
                min="0.25"
                max="24"
                step="0.25"
                value={newHours}
                onChange={(e) => setNewHours(e.target.value)}
              />
            </div>
          </div>
          <div className="row">
            <button type="submit" disabled={busy}>
              {busy ? 'Verificando conflicto…' : 'Reprogramar'}
            </button>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      ) : (
        <div className="conflict-panel" role="alertdialog" aria-live="polite">
          <div className="conflict-title">
            <span aria-hidden="true">⚠️</span> Conflicto: sobrecarga diaria
          </div>
          <p>{conflict.message}</p>
          <p className="field-hint">
            Hay <strong>{formatHours(conflict.scheduledHours)}</strong> de gestiones pendientes el{' '}
            {formatDate(conflict.date)} y tu límite es <strong>{formatHours(conflict.dailyLimit)}</strong>.
            Quedan {formatHours(conflict.otherHours)} de otras gestiones ese día.
          </p>

          <p style={{ fontWeight: 700, marginTop: 12 }}>¿Cómo querés resolverlo?</p>

          {/* Alternativa 1: otro día */}
          <div className="conflict-alt">
            <h4>Mover a otra fecha</h4>
            <p className="field-hint">Días sin conflicto para mover esta gestión:</p>
            <div className="alt-suggested">
              {conflict.alternatives
                .find((a) => a.id === 'another_day')
                ?.suggestedDates.map((d) => (
                  <button
                    key={d.date}
                    type="button"
                    className={d.fitsLimit ? 'btn-secondary btn-sm' : 'btn-ghost btn-sm'}
                    disabled={busy}
                    onClick={() => moveTo(d.date)}
                    title={d.fitsLimit ? 'No genera conflicto' : 'Sigue superando el límite'}
                  >
                    {formatDate(d.date)} · {formatHours(d.load)}
                  </button>
                ))}
            </div>
          </div>

          {/* Alternativa 2: reducir horas */}
          <div className="conflict-alt">
            <h4>Reducir horas estimadas</h4>
            {reductionImpossible ? (
              <p className="field-error">
                Ya hay {formatHours(conflict.otherHours)} de otras gestiones ese día (igual al límite), así que
                recortar esta no alcanza. Probá mover de fecha.
              </p>
            ) : (
              <>
                <p className="field-hint">
                  Para entrar en el límite, esta gestión debe ocupar a lo sumo{' '}
                  <strong>{formatHours(conflict.maxAllowedHours)}</strong>.
                </p>
                <div className="row">
                  <input
                    type="number"
                    min="0.25"
                    max="24"
                    step="0.25"
                    style={{ width: 120 }}
                    aria-label="Horas reducidas para la gestión"
                    value={newHours}
                    onChange={(e) => setNewHours(e.target.value)}
                  />
                  <button type="button" className="btn-secondary" disabled={busy} onClick={applyReducedHours}>
                    Aplicar horas reducidas
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Alternativa 3: posponer */}
          <div className="conflict-alt">
            <h4>Posponer la gestión</h4>
            <p className="field-hint">La sacás del plan activo hoy; seguirá visible como “en pausa”.</p>
            <button type="button" className="btn-ghost" disabled={busy} onClick={postpone}>
              Posponer
            </button>
          </div>

          {/* Alternativa 4: aceptar */}
          <div className="conflict-alt">
            <h4>Aceptar la sobrecarga</h4>
            <p className="field-hint">
              Programar igualmente (quedarás {formatHours(conflict.excessHours)} por encima de tu límite ese día).
            </p>
            <button type="button" className="btn-ghost" disabled={busy} onClick={acceptAnyway}>
              Aceptar igual
            </button>
          </div>

          <div className="row" style={{ marginTop: 14 }}>
            <button type="button" className="btn-secondary btn-sm" disabled={busy || !conflict} onClick={() => { setConflict(null); setError(''); }}>
              ← Volver a elegir fecha
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
