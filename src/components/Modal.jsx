import { useEffect, useRef } from 'react';

export default function Modal({ open, title, onClose, children, labelledBy }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    ref.current?.focus();
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || undefined}
        tabIndex={-1}
      >
        <div className="row-between">
          <h2 id={labelledBy}>{title}</h2>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} aria-label="Cerrar">
            ✕ Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}