export default function ProgressBar({ value, label, showLabel = true }) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div>
      {showLabel && (
        <div className="progress-label">
          <span>{label || 'Progreso'}</span>
          <strong>{pct}%</strong>
        </div>
      )}
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label={label || 'Progreso de preparación'}
      >
        <div className={`progress-fill${pct === 100 ? ' is-done' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}