export function LoadingState({ label = 'Cargando…' }) {
  return (
    <div className="state-box" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function EmptyState({ emoji = '🗂️', title, text, children }) {
  return (
    <div className="state-box">
      <span className="emoji" aria-hidden="true">{emoji}</span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {children && <div style={{ marginTop: 12 }}>{children}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="form-error" role="alert">
      <strong>No pudimos completar la acción.</strong> {message}
      {onRetry && (
        <div style={{ marginTop: 10 }}>
          <button type="button" className="btn-secondary btn-sm" onClick={onRetry}>
            Volver a intentar
          </button>
        </div>
      )}
    </div>
  );
}

export function SuccessBanner({ message }) {
  return (
    <div className="form-success" role="status" aria-live="polite">
      {message}
    </div>
  );
}