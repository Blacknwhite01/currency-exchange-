import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppData.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../lib/api.js';
import { formatRate } from '../lib/format.js';
import CurrencyFlag from './CurrencyFlag.jsx';
import Icon from './Icon.jsx';
import { EmptyState } from './States.jsx';

export default function FavoritesList() {
  const { favorites, toggleFavorite, byCode, lastPair } = useAppData();
  const navigate = useNavigate();
  // One request gives every favorite's current cross rate.
  const latest = useAsync((signal) => api.latest('USD', signal), [], favorites.length > 0);
  const rates = latest.data?.rates;

  const rateFor = (from, to) => (rates?.[from] && rates?.[to] ? Number(rates[to]) / Number(rates[from]) : null);
  const open = (from, to) => navigate(`/converter?${new URLSearchParams({ from, to })}`);

  return (
    <section className="card favorites" aria-labelledby="favorites-title">
      <header className="card__header">
        <div>
          <h2 id="favorites-title" className="card__title">
            Favorite pairs
          </h2>
          <p className="card__subtitle">Saved in this browser</p>
        </div>
        {favorites.length > 0 && <span className="count-badge">{favorites.length}</span>}
      </header>

      {favorites.length === 0 ? (
        <EmptyState
          icon="star"
          title="No favorites yet"
          message="Save a pair with the star in the converter to reach it in one click."
          action={
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => open(lastPair.from, lastPair.to)}>
              Open converter
            </button>
          }
        />
      ) : (
        <ul className="pair-list">
          {favorites.map(({ from, to }) => {
            const rate = rateFor(from, to);
            const supported = !byCode.size || (byCode.has(from) && byCode.has(to));
            return (
              <li key={`${from}-${to}`} className="pair-item">
                <button type="button" className="pair-item__main" onClick={() => open(from, to)} disabled={!supported}>
                  <span className="flag-pair">
                    <CurrencyFlag currency={byCode.get(from)} code={from} size={26} />
                    <CurrencyFlag currency={byCode.get(to)} code={to} size={26} />
                  </span>
                  <span className="pair-item__label">
                    <strong>
                      {from} → {to}
                    </strong>
                    <span className="muted small">{supported ? (rate ? `1 ${from} = ${formatRate(rate)} ${to}` : ' ') : 'No longer supported'}</span>
                  </span>
                  <Icon name="arrowRight" size={18} className="pair-item__go" />
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--sm"
                  aria-label={`Remove ${from} to ${to} from favorites`}
                  title="Remove favorite"
                  onClick={() => toggleFavorite(from, to)}
                >
                  <Icon name="close" size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
