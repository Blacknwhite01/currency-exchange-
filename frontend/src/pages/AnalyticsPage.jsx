import { useEffect, useMemo, useState } from 'react';
import ChangeCard from '../components/ChangeCard.jsx';
import CurrencyFlag from '../components/CurrencyFlag.jsx';
import CurrencySelect from '../components/CurrencySelect.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import Icon from '../components/Icon.jsx';
import { DemoNotice } from '../components/States.jsx';
import CompareChart from '../charts/CompareChart.jsx';
import PeriodTabs from '../charts/PeriodTabs.jsx';
import TrendChart from '../charts/TrendChart.jsx';
import { PERIODS, SERIES_COLORS } from '../charts/chartUtils.js';
import { useAppData } from '../context/AppData.jsx';
import { formatDate, formatDateTime } from '../lib/format.js';

const MAX_COMPARE = SERIES_COLORS.length;
const DEFAULT_COMPARE = ['EUR', 'GBP', 'INR', 'JPY', 'USD'];

function DataStatus() {
  const { status } = useAppData();
  const s = status.data;
  if (!s) return null;
  return (
    <section className="card data-status" aria-label="Data freshness">
      <div className="data-status__item">
        <span className="data-status__label">Latest provider update</span>
        <span className="data-status__value">{s.providerUpdated ? formatDateTime(s.providerUpdated) : 'Not yet available'}</span>
      </div>
      <div className="data-status__item">
        <span className="data-status__label">Recorded history</span>
        <span className="data-status__value">
          {s.realObservationDays > 0
            ? `${s.realObservationDays} day${s.realObservationDays === 1 ? '' : 's'} since ${formatDate(s.earliestRealDate)}`
            : 'No observations yet'}
        </span>
      </div>
      <div className="data-status__item">
        <span className="data-status__label">Source</span>
        <span className="data-status__value">
          {s.provider} ({s.providerMode})
        </span>
      </div>
      {s.lastError && (
        <p className="data-status__warn" role="status">
          <Icon name="alert" size={16} /> Last refresh failed: {s.lastError}. Showing the most recent stored data.
        </p>
      )}
      {s.demoDataPresent && (
        <DemoNotice>
          Demo data is enabled: history before {formatDate(s.earliestRealDate)} is synthetic and shown as dashed grey lines. It
          is not real market data.
        </DemoNotice>
      )}
    </section>
  );
}

export default function AnalyticsPage() {
  const { lastPair, setLastPair, byCode } = useAppData();
  const [from, setFrom] = useState(lastPair.from);
  const [to, setTo] = useState(lastPair.to);
  const [period, setPeriod] = useState('1M');
  // Each compared currency keeps its color slot for as long as it stays selected.
  const [compared, setCompared] = useState(() =>
    DEFAULT_COMPARE.filter((c) => c !== lastPair.from).slice(0, 3).map((code, slot) => ({ code, slot })),
  );

  useEffect(() => setLastPair(from, to), [from, to, setLastPair]);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };
  const chooseFrom = (code) => (code === to ? swap() : setFrom(code));
  const chooseTo = (code) => (code === from ? swap() : setTo(code));

  const symbols = useMemo(() => compared.filter((c) => c.code !== from).map((c) => c.code), [compared, from]);
  const colorOf = (code) => SERIES_COLORS[compared.find((c) => c.code === code)?.slot ?? 0];

  const addCompared = (code) => {
    setCompared((list) => {
      if (list.some((c) => c.code === code) || list.length >= MAX_COMPARE) return list;
      const used = new Set(list.map((c) => c.slot));
      const slot = SERIES_COLORS.findIndex((_, i) => !used.has(i));
      return [...list, { code, slot }];
    });
  };
  const removeCompared = (code) => setCompared((list) => list.filter((c) => c.code !== code));
  const periodName = PERIODS.find((p) => p.value === period)?.name;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p className="page-header__lead">Trends, daily movement and comparisons built from stored rate observations.</p>
        </div>
      </div>

      <DataStatus />

      <div className="filter-bar card" role="group" aria-label="Chart filters">
        <div className="filter-bar__pair">
          <CurrencySelect label="From" value={from} onChange={chooseFrom} />
          <button type="button" className="swap-btn" onClick={swap} aria-label={`Swap currencies: show ${to} to ${from}`} title="Swap currencies">
            <Icon name="swap" size={20} />
          </button>
          <CurrencySelect label="To" value={to} onChange={chooseTo} />
        </div>
        <div className="filter-bar__period">
          <span className="field-label" aria-hidden="true">
            Period
          </span>
          <PeriodTabs value={period} onChange={setPeriod} />
        </div>
      </div>

      <div className="grid grid--analytics">
        <section className="card grid__trend-main" aria-labelledby="trend-title">
          <header className="card__header">
            <div>
              <h2 id="trend-title" className="card__title">
                {from} → {to} · {periodName}
              </h2>
              <p className="card__subtitle">Historical trend — value of 1 {from} in {to}</p>
            </div>
          </header>
          <ErrorBoundary>
            <TrendChart from={from} to={to} period={period} height={320} />
          </ErrorBoundary>
        </section>

        <section className="card grid__change-main" aria-labelledby="daily-title">
          <header className="card__header">
            <div>
              <h2 id="daily-title" className="card__title">
                Daily change
              </h2>
              <p className="card__subtitle">
                {from} → {to}
              </p>
            </div>
          </header>
          <ErrorBoundary>
            <ChangeCard from={from} to={to} />
          </ErrorBoundary>
        </section>

        <section className="card grid__compare" aria-labelledby="compare-title">
          <header className="card__header card__header--wrap">
            <div>
              <h2 id="compare-title" className="card__title">
                Currency comparison · {periodName}
              </h2>
              <p className="card__subtitle">
                % change in the value of 1 {from} (base) in each currency since the start of the period
              </p>
            </div>
          </header>
          <div className="compare-picker">
            <span className="compare-picker__base">
              <CurrencyFlag currency={byCode.get(from)} code={from} size={22} /> Base: <strong>{from}</strong>
            </span>
            <ul className="compare-picker__chips" aria-label="Compared currencies">
              {compared.map(({ code, slot }) => (
                <li key={code} className={`compare-chip ${code === from ? 'is-muted' : ''}`}>
                  <span className="legend-swatch" style={{ background: SERIES_COLORS[slot] }} aria-hidden="true" />
                  {code}
                  {code === from && <span className="sr-only"> (same as base, hidden)</span>}
                  <button type="button" className="compare-chip__remove" aria-label={`Remove ${code} from comparison`} onClick={() => removeCompared(code)}>
                    <Icon name="close" size={14} />
                  </button>
                </li>
              ))}
            </ul>
            {compared.length < MAX_COMPARE ? (
              <CurrencySelect
                label="Add currency to compare"
                hideLabel
                variant="add"
                value=""
                onChange={addCompared}
                disabledCodes={[from, ...compared.map((c) => c.code)]}
              />
            ) : (
              <span className="muted small">Up to {MAX_COMPARE} currencies</span>
            )}
          </div>
          <ErrorBoundary>
            <CompareChart base={from} symbols={symbols} period={period} colorOf={colorOf} />
          </ErrorBoundary>
        </section>
      </div>
    </>
  );
}
