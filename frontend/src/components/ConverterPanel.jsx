import { useEffect, useId, useState } from 'react';
import { useAppData } from '../context/AppData.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { api } from '../lib/api.js';
import { formatMoney, formatNumber, formatRate, parseAmount } from '../lib/format.js';
import { isFavorite } from '../lib/storage.js';
import CurrencySelect from './CurrencySelect.jsx';
import Freshness from './Freshness.jsx';
import Icon from './Icon.jsx';
import { ErrorState, Skeleton } from './States.jsx';

const QUICK_PAIRS = [
  ['USD', 'EUR'],
  ['EUR', 'GBP'],
  ['USD', 'INR'],
  ['GBP', 'USD'],
  ['USD', 'JPY'],
  ['AUD', 'USD'],
];

/** How long the result must stay unchanged before it is saved to recent conversions. */
const RECORD_DELAY_MS = 1500;

export default function ConverterPanel({ initial, compact = false, onChange, title = 'Convert currency' }) {
  const { byCode, favorites, toggleFavorite, recordConversion, setLastPair } = useAppData();
  const [amount, setAmount] = useState(initial.amount ?? '100');
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [spin, setSpin] = useState(false);
  const amountId = useId();

  const parsed = parseAmount(amount);
  const requestedAmount = useDebouncedValue(parsed.value ?? null, 350);
  const conversion = useAsync(
    (signal) => api.convert({ from, to, amount: requestedAmount }, signal),
    [from, to, requestedAmount],
    Boolean(requestedAmount && from && to),
  );
  const data = conversion.data;
  const matchesInput = data && data.from === from && data.to === to && parsed.value && Number(data.amount) === Number(parsed.value);

  useEffect(() => {
    setLastPair(from, to);
    onChange?.({ from, to, amount: parsed.value ?? amount });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, requestedAmount]);

  useEffect(() => {
    if (!matchesInput || conversion.loading) return undefined;
    const timer = setTimeout(() => {
      recordConversion({
        id: `${Date.now()}-${from}-${to}`,
        amount: String(data.amount),
        from: data.from,
        to: data.to,
        result: data.result,
        rate: data.rate,
        at: new Date().toISOString(),
      });
    }, RECORD_DELAY_MS);
    return () => clearTimeout(timer);
  }, [matchesInput, conversion.loading, data, from, to, recordConversion]);

  const swap = () => {
    setFrom(to);
    setTo(from);
    setSpin((s) => !s);
  };
  const chooseFrom = (code) => (code === to ? swap() : setFrom(code));
  const chooseTo = (code) => (code === from ? swap() : setTo(code));

  const favorite = isFavorite(favorites, from, to);
  const fromCurrency = byCode.get(from);
  const toCurrency = byCode.get(to);
  const showError = parsed.error && amount !== '';

  return (
    <section className={`card converter ${compact ? 'converter--compact' : ''}`} aria-labelledby={`${amountId}-title`}>
      <header className="card__header">
        <div>
          <h2 id={`${amountId}-title`} className="card__title">
            {title}
          </h2>
          {!compact && <p className="card__subtitle">Indicative mid-market rates, calculated on the server.</p>}
        </div>
        <button
          type="button"
          className={`icon-btn star-btn ${favorite ? 'is-active' : ''}`}
          aria-pressed={favorite}
          aria-label={favorite ? `Remove ${from} to ${to} from favorites` : `Save ${from} to ${to} as a favorite`}
          title={favorite ? 'Remove from favorites' : 'Save pair to favorites'}
          onClick={() => toggleFavorite(from, to)}
        >
          <Icon name="star" filled={favorite} />
        </button>
      </header>

      <div className="converter__fields">
        <div className={`field amount-field ${showError ? 'has-error' : ''}`}>
          <label className="field-label" htmlFor={amountId}>
            Amount
          </label>
          <div className="amount-input">
            <span className="amount-input__symbol" aria-hidden="true">
              {fromCurrency?.symbol ?? from}
            </span>
            <input
              id={amountId}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={showError ? 'true' : 'false'}
              aria-describedby={showError ? `${amountId}-error` : undefined}
              placeholder="0.00"
            />
          </div>
          {showError && (
            <p id={`${amountId}-error`} className="field-error" role="alert">
              {parsed.error}
            </p>
          )}
        </div>

        <div className="converter__pair">
          <CurrencySelect label="From" value={from} onChange={chooseFrom} />
          <button
            type="button"
            className={`swap-btn ${spin ? 'is-spun' : ''}`}
            onClick={swap}
            aria-label={`Swap currencies: convert ${to} to ${from} instead`}
            title="Swap currencies"
          >
            <Icon name="swap" size={20} />
          </button>
          <CurrencySelect label="To" value={to} onChange={chooseTo} />
        </div>
      </div>

      <div className={`converter__result ${conversion.loading && data ? 'is-refreshing' : ''}`} aria-live="polite" aria-busy={conversion.loading}>
        {!parsed.value ? (
          <p className="muted">Enter an amount above to see the converted value.</p>
        ) : conversion.error && !conversion.loading ? (
          <ErrorState compact title="Conversion unavailable" message={conversion.error.message} onRetry={conversion.reload} />
        ) : !data ? (
          <div className="result-skeleton">
            <Skeleton width="45%" height={14} />
            <Skeleton width="70%" height={40} />
            <Skeleton width="55%" height={14} />
          </div>
        ) : (
          <>
            <p className="result__from">
              {formatNumber(data.amount, { maximumFractionDigits: 8 })} {fromCurrency?.name ?? data.from} =
            </p>
            <p className="result__value">
              {formatMoney(data.result, data.to)}
              <span className="result__code">{data.to}</span>
            </p>
            <p className="result__name">{toCurrency?.name}</p>
            <p className="result__rates">
              <span>
                1 {data.from} = {formatRate(data.rate)} {data.to}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                1 {data.to} = {formatRate(data.inverseRate)} {data.from}
              </span>
            </p>
            <Freshness freshness={data.freshness} compact={compact} />
          </>
        )}
      </div>

      {!compact && (
        <div className="quick-pairs" aria-label="Popular pairs">
          <span className="quick-pairs__label">Popular:</span>
          {QUICK_PAIRS.filter(([a, b]) => byCode.has(a) && byCode.has(b)).map(([a, b]) => (
            <button
              key={`${a}${b}`}
              type="button"
              className={`chip ${a === from && b === to ? 'is-active' : ''}`}
              aria-pressed={a === from && b === to}
              onClick={() => {
                setFrom(a);
                setTo(b);
              }}
            >
              {a} → {b}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
