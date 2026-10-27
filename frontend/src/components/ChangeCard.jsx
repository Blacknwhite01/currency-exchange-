import { useAsync } from '../hooks/useAsync.js';
import { api } from '../lib/api.js';
import { formatDate, formatPercent, formatRate } from '../lib/format.js';
import Icon from './Icon.jsx';
import { DemoNotice, EmptyState, ErrorState, Skeleton } from './States.jsx';

const DIRECTION = {
  UP: { icon: 'up', label: 'Up', tone: 'up' },
  DOWN: { icon: 'down', label: 'Down', tone: 'down' },
  FLAT: { icon: 'flat', label: 'No change', tone: 'flat' },
};

/** Movement between the two most recent daily observations of a pair (not intraday movement). */
export default function ChangeCard({ from, to, compact = false }) {
  const change = useAsync((signal) => api.change({ from, to }, signal), [from, to], Boolean(from && to));
  const data = change.data;

  if (change.error && !change.loading) {
    return <ErrorState compact title="Daily change unavailable" message={change.error.message} onRetry={change.reload} />;
  }
  if (!data) {
    return (
      <div className="change-skeleton">
        <Skeleton width="40%" height={14} />
        <Skeleton width="60%" height={34} />
        <Skeleton width="80%" height={14} />
      </div>
    );
  }
  if (!data.latest) {
    return <EmptyState icon="clock" title="No observations yet" message={data.note} />;
  }

  const direction = DIRECTION[data.direction];
  const usesDemo = data.previous?.source === 'DEMO' || data.latest.source === 'DEMO';

  return (
    <div className={`change ${change.loading ? 'is-refreshing' : ''}`}>
      <div className="change__headline">
        <div>
          <p className="change__label">
            1 {from} in {to}
          </p>
          <p className="change__rate">{formatRate(data.latest.rate)}</p>
        </div>
        {direction ? (
          <p className={`delta delta--${direction.tone}`}>
            <Icon name={direction.icon} size={18} />
            <span>
              <span className="sr-only">{direction.label}: </span>
              {formatPercent(data.percentChange)}
            </span>
          </p>
        ) : (
          <p className="delta delta--flat">
            <span>—</span>
          </p>
        )}
      </div>

      {data.previous ? (
        <dl className={`change__grid ${compact ? 'change__grid--compact' : ''}`}>
          <div>
            <dt>Previous ({formatDate(data.previous.date, { day: 'numeric', month: 'short' })})</dt>
            <dd>{formatRate(data.previous.rate)}</dd>
          </div>
          <div>
            <dt>Latest ({formatDate(data.latest.date, { day: 'numeric', month: 'short' })})</dt>
            <dd>{formatRate(data.latest.rate)}</dd>
          </div>
          <div>
            <dt>Absolute change</dt>
            <dd>
              {Number(data.absoluteChange) > 0 ? '+' : Number(data.absoluteChange) < 0 ? '−' : ''}
              {formatRate(Math.abs(Number(data.absoluteChange)))}
            </dd>
          </div>
          <div>
            <dt>Direction</dt>
            <dd>{direction?.label ?? '—'}</dd>
          </div>
        </dl>
      ) : (
        <p className="muted small">{data.note}</p>
      )}

      <p className="change__basis small muted">
        <Icon name="info" size={14} /> Change between daily observations
        {data.daysBetween > 1 ? ` ${data.daysBetween} days apart` : ''} — not intraday market movement.
      </p>
      {usesDemo && !compact && <DemoNotice>The previous observation is demo data, so this change is illustrative only.</DemoNotice>}
      {usesDemo && compact && <span className="tag tag--demo">Uses demo data</span>}
    </div>
  );
}
