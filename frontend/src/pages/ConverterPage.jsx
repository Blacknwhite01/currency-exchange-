import { useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import ChangeCard from '../components/ChangeCard.jsx';
import ConverterPanel from '../components/ConverterPanel.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import Icon from '../components/Icon.jsx';
import RecentList from '../components/RecentList.jsx';
import TrendChart from '../charts/TrendChart.jsx';
import { useAppData } from '../context/AppData.jsx';
import { parseAmount } from '../lib/format.js';

const CODE = /^[A-Z]{3}$/;

export default function ConverterPage() {
  const { lastPair } = useAppData();
  const [params] = useSearchParams();
  const location = useLocation();

  // Favorites and recent conversions link here with ?from=&to=&amount=; each navigation remounts the panel.
  const initial = useMemo(() => {
    const from = (params.get('from') ?? '').toUpperCase();
    const to = (params.get('to') ?? '').toUpperCase();
    const amount = params.get('amount');
    const validPair = CODE.test(from) && CODE.test(to);
    return {
      from: validPair ? from : lastPair.from,
      to: validPair ? to : lastPair.to,
      amount: amount && parseAmount(amount).value ? amount : '100',
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const [pair, setPair] = useState({ from: initial.from, to: initial.to });

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Converter</h1>
          <p className="page-header__lead">Search any of 160+ currencies, swap in one tap and save the pairs you use most.</p>
        </div>
      </div>

      <div className="grid grid--converter">
        <div className="grid__main">
          <ErrorBoundary>
            <ConverterPanel key={location.key} initial={initial} onChange={({ from, to }) => setPair({ from, to })} />
          </ErrorBoundary>
        </div>

        <div className="grid__side">
          <section className="card" aria-labelledby="glance-title">
            <header className="card__header">
              <div>
                <h2 id="glance-title" className="card__title">
                  {pair.from} → {pair.to} at a glance
                </h2>
                <p className="card__subtitle">Last month of stored observations</p>
              </div>
              <Link className="btn btn--ghost btn--sm" to="/analytics">
                Details <Icon name="arrowRight" size={16} />
              </Link>
            </header>
            <ErrorBoundary>
              <ChangeCard from={pair.from} to={pair.to} compact />
              <div className="spacer" />
              <TrendChart from={pair.from} to={pair.to} period="1M" height={160} preview />
            </ErrorBoundary>
          </section>
          <RecentList limit={6} />
        </div>
      </div>

      <p className="disclaimer">
        <Icon name="info" size={16} />
        Rates are indicative estimates for informational use and may differ from the rate applied by a bank, card provider or
        exchange service. No financial transactions are performed.
      </p>
    </>
  );
}
