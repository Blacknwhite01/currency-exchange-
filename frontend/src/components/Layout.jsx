import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAppData } from '../context/AppData.jsx';
import { formatDate, timeAgo } from '../lib/format.js';
import Icon from './Icon.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/converter', label: 'Converter', icon: 'convert' },
  { to: '/analytics', label: 'Analytics', icon: 'analytics' },
];

function StatusPill() {
  const { status } = useAppData();
  if (status.error) {
    return (
      <span className="status-pill status-pill--error" role="status">
        <Icon name="alert" size={14} /> Service unreachable
      </span>
    );
  }
  const s = status.data;
  if (!s) return <span className="status-pill">Checking rates…</span>;
  const stale = Boolean(s.lastError);
  return (
    <span
      className={`status-pill ${stale ? 'status-pill--warn' : ''}`}
      title={s.latestRealDate ? `Real observations stored since ${formatDate(s.earliestRealDate)} (${s.realObservationDays} day${s.realObservationDays === 1 ? '' : 's'})` : undefined}
    >
      <span className={`status-dot ${stale ? 'status-dot--warn' : ''}`} aria-hidden="true" />
      {stale ? 'Showing last available rates' : s.providerUpdated ? `Rates updated ${timeAgo(s.providerUpdated)}` : 'Awaiting first rates'}
    </span>
  );
}

export default function Layout() {
  const location = useLocation();
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            <Icon name="convert" size={20} />
          </span>
          <span className="brand__name">
            Currency<span>Exchange</span>
          </span>
        </div>
        <nav className="nav" aria-label="Main">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav__link ${isActive ? 'is-active' : ''}`}>
              <Icon name={item.icon} size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <p className="sidebar__note">
          Rates are indicative and may differ from those offered by banks, card providers or exchange services. This app does
          not execute transactions.
        </p>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div className="brand brand--mobile">
            <span className="brand__mark" aria-hidden="true">
              <Icon name="convert" size={18} />
            </span>
            <span className="brand__name">
              Currency<span>Exchange</span>
            </span>
          </div>
          <StatusPill />
        </header>
        <main id="main" className="page" key={location.pathname} tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="footer">
          Indicative rates for information only · Data: ExchangeRate-API · Favorites and history are stored only in this browser.
        </footer>
      </div>
    </div>
  );
}
