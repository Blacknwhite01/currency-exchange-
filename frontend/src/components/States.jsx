import Icon from './Icon.jsx';

export function Skeleton({ width = '100%', height = 16, radius = 8, className = '' }) {
  return <span className={`skeleton ${className}`} style={{ width, height, borderRadius: radius }} aria-hidden="true" />;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, compact = false }) {
  return (
    <div className={`state state--error ${compact ? 'state--compact' : ''}`} role="alert">
      <Icon name="alert" size={compact ? 18 : 24} />
      <div>
        <p className="state__title">{title}</p>
        {message && <p className="state__message">{message}</p>}
      </div>
      {onRetry && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
          <Icon name="refresh" size={16} /> Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = 'info', title, message, action }) {
  return (
    <div className="state state--empty">
      <span className="state__icon">
        <Icon name={icon} size={22} />
      </span>
      <p className="state__title">{title}</p>
      {message && <p className="state__message">{message}</p>}
      {action}
    </div>
  );
}

export function DemoNotice({ children }) {
  return (
    <p className="demo-notice">
      <Icon name="info" size={16} />
      <span>
        {children ?? 'Includes demo data: synthetic values for layout demonstration only, not real market observations.'}
      </span>
    </p>
  );
}
