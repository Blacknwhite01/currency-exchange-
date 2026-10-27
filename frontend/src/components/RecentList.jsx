import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppData.jsx';
import { formatMoney, formatNumber, timeAgo } from '../lib/format.js';
import Icon from './Icon.jsx';
import { EmptyState } from './States.jsx';

export default function RecentList({ limit }) {
  const { recents, clearRecents } = useAppData();
  const navigate = useNavigate();
  const items = limit ? recents.slice(0, limit) : recents;

  return (
    <section className="card recents" aria-labelledby="recents-title">
      <header className="card__header">
        <div>
          <h2 id="recents-title" className="card__title">
            Recent conversions
          </h2>
          <p className="card__subtitle">Your last 20, stored only in this browser</p>
        </div>
        {recents.length > 0 && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={clearRecents}>
            <Icon name="trash" size={16} /> Clear
          </button>
        )}
      </header>

      {recents.length === 0 ? (
        <EmptyState icon="clock" title="No conversions yet" message="Conversions you make appear here so you can repeat them quickly." />
      ) : (
        <ul className="recent-list">
          {items.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="recent-item"
                onClick={() => navigate(`/converter?${new URLSearchParams({ from: r.from, to: r.to, amount: r.amount })}`)}
                aria-label={`Repeat: ${r.amount} ${r.from} to ${r.to}`}
              >
                <span className="recent-item__pair">
                  {r.from} → {r.to}
                </span>
                <span className="recent-item__amounts">
                  <span>
                    {formatNumber(r.amount, { maximumFractionDigits: 8 })} {r.from}
                  </span>
                  <Icon name="arrowRight" size={14} />
                  <strong>{formatMoney(r.result, r.to)}</strong>
                </span>
                <time className="recent-item__time muted small" dateTime={r.at}>
                  {timeAgo(r.at)}
                </time>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
