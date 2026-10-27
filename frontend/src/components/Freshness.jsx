import { formatDateTime, timeAgo } from '../lib/format.js';
import Icon from './Icon.jsx';

/** Shows when the rates were published and by whom, and warns clearly when they are stale. */
export default function Freshness({ freshness, compact = false }) {
  if (!freshness) return null;
  const stale = freshness.status === 'STALE';
  return (
    <div className={`freshness ${stale ? 'freshness--stale' : ''} ${compact ? 'freshness--compact' : ''}`}>
      <p className="freshness__line">
        <Icon name={stale ? 'alert' : 'clock'} size={15} />
        <span>
          {stale ? 'Last available rates' : 'Rates'} published{' '}
          <time dateTime={freshness.providerUpdated} title={formatDateTime(freshness.providerUpdated)}>
            {timeAgo(freshness.providerUpdated)}
          </time>{' '}
          · {freshness.provider}
        </span>
      </p>
      {!compact && (
        <p className="freshness__detail">
          Published {formatDateTime(freshness.providerUpdated)}
          {freshness.nextUpdate && <> · next provider update {formatDateTime(freshness.nextUpdate)}</>}
        </p>
      )}
      {stale && freshness.notice && (
        <p className="freshness__notice" role="status">
          {freshness.notice}
        </p>
      )}
    </div>
  );
}
