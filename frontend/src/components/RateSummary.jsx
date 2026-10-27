import { useState } from 'react';
import { useAppData } from '../context/AppData.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../lib/api.js';
import { formatRate } from '../lib/format.js';
import CurrencyFlag from './CurrencyFlag.jsx';
import CurrencySelect from './CurrencySelect.jsx';
import Freshness from './Freshness.jsx';
import { ErrorState, Skeleton } from './States.jsx';

const WATCHLIST = ['USD', 'EUR', 'GBP', 'JPY', 'INR', 'CNY', 'AUD', 'CAD', 'CHF', 'SGD', 'AED'];

/** Latest rates for popular currencies against a chosen base. */
export default function RateSummary({ limit = 7 }) {
  const { byCode } = useAppData();
  const [base, setBase] = useState('USD');
  const latest = useAsync((signal) => api.latest(base, signal), [base]);
  const codes = WATCHLIST.filter((c) => c !== base && byCode.has(c)).slice(0, limit);

  return (
    <section className="card rate-summary" aria-labelledby="rate-summary-title">
      <header className="card__header">
        <div>
          <h2 id="rate-summary-title" className="card__title">
            Exchange rates
          </h2>
          <p className="card__subtitle">Value of 1 {base}</p>
        </div>
        <div className="rate-summary__base">
          <CurrencySelect label="Base currency" hideLabel value={base} onChange={setBase} variant="mini" />
        </div>
      </header>

      {latest.error && !latest.loading ? (
        <ErrorState compact title="Rates unavailable" message={latest.error.message} onRetry={latest.reload} />
      ) : !latest.data ? (
        <ul className="rate-list" aria-hidden="true">
          {Array.from({ length: limit }, (_, i) => (
            <li key={i} className="rate-row">
              <Skeleton width={28} height={28} radius={14} />
              <Skeleton width="40%" height={14} />
              <Skeleton width={70} height={14} />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ul className={`rate-list ${latest.loading ? 'is-refreshing' : ''}`}>
            {codes.map((code) => {
              const currency = byCode.get(code);
              return (
                <li key={code} className="rate-row">
                  <CurrencyFlag currency={currency} size={28} />
                  <span className="rate-row__name">
                    <strong>{code}</strong>
                    <span className="muted">{currency?.name}</span>
                  </span>
                  <span className="rate-row__value">{formatRate(latest.data.rates[code])}</span>
                </li>
              );
            })}
          </ul>
          <Freshness freshness={latest.data.freshness} compact />
        </>
      )}
    </section>
  );
}
