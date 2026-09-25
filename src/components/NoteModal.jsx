import { useState } from 'react';
import Modal from './Modal';

const ACTION_META = {
  done: {
    title: 'Marcar como hecha',
    confirm: 'Confirmar hecha',
    noteLabel: 'Nota (opcional)',
    noteHint: 'Ej: “Catering confirmado por teléfono”.',
    srText: 'la gestión como hecha',
  },
  postponed: {
    title: 'Posponer gestión',
    confirm: 'Posponer',
    noteLabel: 'Motivo (opcional)',
    noteHint: 'Ej: “Falta el presupuesto del proveedor”.',
    srText: 'la gestión como pospuesta',
  },
};

export default function NoteModal({ open, task, action, onClose, onConfirm }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const meta = ACTION_META[action] || ACTION_META.done;
  const headingId = 'note-modal-title';

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onConfirm(task, action, note.trim());
    } catch (err) {
      setError(err?.message || 'No pudimos guardar. Intentá otra vez.');
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title={meta.title} onClose={onClose} labelledBy={headingId}>
      <p>
        Vas a marcar <strong>“{task?.title}”</strong> como {action === 'done' ? 'hecha' : 'pospuesta'}.
      </p>
      {error && <div className="form-error" role="alert">{error}</div>}
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="note-input">{meta.noteLabel}</label>
          <textarea
            id="note-input"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={meta.noteHint}
          />
        </div>
        <div className="row">
          <button type="submit" className={action === 'done' ? 'btn-success' : ''} disabled={busy}>
            {busy ? 'Guardando…' : meta.confirm}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </Modal>
  );
}