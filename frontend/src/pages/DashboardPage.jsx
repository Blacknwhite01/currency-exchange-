import { useState } from 'react';
import { Link } from 'react-router-dom';
import ChangeCard from '../components/ChangeCard.jsx';
import ConverterPanel from '../components/ConverterPanel.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import FavoritesList from '../components/FavoritesList.jsx';
import Icon from '../components/Icon.jsx';
import RateSummary from '../components/RateSummary.jsx';
import RecentList from '../components/RecentList.jsx';
import PeriodTabs from '../charts/PeriodTabs.jsx';
import TrendChart from '../charts/TrendChart.jsx';
import { useAppData } from '../context/AppData.jsx';

export default function DashboardPage() {
  const { lastPair } = useAppData();
  const [initial] = useState(() => ({ ...lastPair, amount: '100' }));
  const [pair, setPair] = useState({ from: initial.from, to: initial.to });
  const [period, setPeriod] = useState('1M');

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Overview</h1>
          <p className="page-header__lead">Convert instantly, then see how your pair has been moving.</p>
        </div>
      </div>

      <div className="grid grid--dashboard">
        <div className="grid__converter">
          <ErrorBoundary>
            <ConverterPanel initial={initial} compact title="Quick convert" onChange={({ from, to }) => setPair({ from, to })} />
          </ErrorBoundary>
        </div>
        <div className="grid__rates">
          <ErrorBoundary>
            <RateSummary />
          </ErrorBoundary>
        </div>

        <section className="card grid__trend" aria-labelledby="trend-preview-title">
          <header className="card__header card__header--wrap">
            <div>
              <h2 id="trend-preview-title" className="card__title">
                {pair.from} → {pair.to} trend
              </h2>
              <p className="card__subtitle">Stored daily observations</p>
            </div>
            <div className="card__actions">
              <PeriodTabs value={period} onChange={setPeriod} label="Trend period" />
              <Link className="btn btn--ghost btn--sm" to="/analytics">
                Analytics <Icon name="arrowRight" size={16} />
              </Link>
            </div>
          </header>
          <ErrorBoundary>
            <TrendChart from={pair.from} to={pair.to} period={period} height={220} preview />
          </ErrorBoundary>
        </section>

        <section className="card grid__change" aria-labelledby="change-title">
          <header className="card__header">
            <div>
              <h2 id="change-title" className="card__title">
                Daily movement
              </h2>
              <p className="card__subtitle">Latest vs previous observation</p>
            </div>
          </header>
          <ErrorBoundary>
            <ChangeCard from={pair.from} to={pair.to} compact />
          </ErrorBoundary>
        </section>

        <div className="grid__favorites">
          <FavoritesList />
        </div>
        <div className="grid__recents">
          <RecentList limit={5} />
        </div>
      </div>
    </>
  );
}
