import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Icon from '../components/Icon.jsx';
import { DemoNotice, EmptyState, ErrorState, Skeleton } from '../components/States.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../lib/api.js';
import { formatDate, formatPercent, formatRate } from '../lib/format.js';
import { AXIS_COLOR, DEMO_COLOR, GRID_COLOR, PERIODS, PRIMARY_SERIES, dateTickFormatter, niceScale, splitBySource, toTs } from './chartUtils.js';

function TrendTooltip({ active, payload, pair }) {
  const row = payload?.[0]?.payload;
  if (!active || !row || row.gap) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__date">{formatDate(row.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
      <p className="chart-tooltip__value">
        1 {pair.from} = <strong>{formatRate(row.rate)}</strong> {pair.to}
      </p>
      {row.source === 'DEMO' && <p className="chart-tooltip__demo">Demo data — not a real observation</p>}
    </div>
  );
}

/** Line chart of stored observations for one pair over the selected period. */
export default function TrendChart({ from, to, period, height = 300, preview = false }) {
  const [showTable, setShowTable] = useState(false);
  const history = useAsync((signal) => api.history({ from, to, period }, signal), [from, to, period], Boolean(from && to));
  const data = history.data;

  const rows = useMemo(() => (data ? splitBySource(data.points) : []), [data]);
  const scale = useMemo(() => niceScale(rows.filter((r) => !r.gap).map((r) => r.value)), [rows]);
  const points = data?.points ?? [];
  const first = points[0];
  const last = points[points.length - 1];
  const change = first && last && points.length > 1 ? ((Number(last.rate) - Number(first.rate)) / Number(first.rate)) * 100 : null;
  const periodName = PERIODS.find((p) => p.value === period)?.name ?? period;
  const hasDemo = data?.demoObservations > 0;
  const hasReal = data?.realObservations > 0;

  if (history.error && !history.loading) {
    return <ErrorState title="Could not load rate history" message={history.error.message} onRetry={history.reload} />;
  }
  if (!data) {
    return (
      <div className="chart-skeleton" style={{ height }}>
        <Skeleton height="100%" radius={12} />
      </div>
    );
  }
  if (points.length === 0) {
    return (
      <EmptyState
        icon="chart"
        title={`No stored observations for ${from} → ${to} in the last ${periodName}`}
        message="The app records the provider's daily rates. This chart fills in as observations accumulate — try a longer period or check back after the next daily update."
      />
    );
  }

  const tick = dateTickFormatter(period);
  const summary = points.length === 1
    ? `Only one observation so far: 1 ${from} = ${formatRate(first.rate)} ${to} on ${formatDate(first.date)}.`
    : `1 ${from} moved from ${formatRate(first.rate)} to ${formatRate(last.rate)} ${to} between ${formatDate(first.date)} and ${formatDate(last.date)} (${formatPercent(change)}).`;

  return (
    <div className={`trend ${history.loading ? 'is-refreshing' : ''}`}>
      <div className="chart-meta">
        <p className="chart-summary">
          {summary}{' '}
          <span className="muted">
            {data.realObservations} recorded{hasDemo ? `, ${data.demoObservations} demo` : ''} observation{points.length === 1 ? '' : 's'}.
          </span>
        </p>
        {!preview && (
          <button type="button" className="btn btn--ghost btn--sm" aria-pressed={showTable} onClick={() => setShowTable((s) => !s)}>
            <Icon name={showTable ? 'chart' : 'table'} size={16} /> {showTable ? 'Chart view' : 'Table view'}
          </button>
        )}
      </div>

      {hasDemo && (
        <div className="chart-legend" aria-hidden={showTable}>
          {hasReal && (
            <span className="legend-item">
              <span className="legend-swatch" style={{ background: PRIMARY_SERIES }} /> Recorded observations
            </span>
          )}
          <span className="legend-item">
            <span className="legend-swatch legend-swatch--dashed" style={{ borderColor: DEMO_COLOR }} /> Demo data (synthetic)
          </span>
        </div>
      )}

      {showTable ? (
        <div className="table-wrap" style={{ maxHeight: height }}>
          <table className="data-table">
            <caption className="sr-only">
              {from} to {to} rates, {periodName}
            </caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col" className="num">1 {from} in {to}</th>
                <th scope="col">Source</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.date}>
                  <td>{formatDate(p.date)}</td>
                  <td className="num">{formatRate(p.rate)}</td>
                  <td>{p.source === 'DEMO' ? <span className="tag tag--demo">Demo</span> : <span className="tag">Recorded</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chart-box" style={{ height }} role="img" aria-label={`Line chart of ${from} to ${to} over ${periodName}. ${summary}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={GRID_COLOR} vertical={false} />
              <XAxis
                dataKey="ts"
                type="number"
                scale="time"
                domain={[toTs(data.startDate), toTs(data.endDate)]}
                tickFormatter={tick}
                tick={{ fill: AXIS_COLOR, fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: GRID_COLOR }}
                minTickGap={28}
              />
              <YAxis
                domain={scale.domain}
                ticks={scale.ticks}
                tickFormatter={(v) => formatRate(v)}
                tick={{ fill: AXIS_COLOR, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={64}
              />
              <Tooltip content={<TrendTooltip pair={{ from, to }} />} cursor={{ stroke: AXIS_COLOR, strokeWidth: 1 }} />
              <Line
                type="monotone"
                dataKey="demo"
                stroke={DEMO_COLOR}
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="real"
                stroke={PRIMARY_SERIES}
                strokeWidth={2}
                dot={(props) => {
                  // Dots on short series; on long ones only the latest recorded observation is marked.
                  const show = props.payload.real != null && (points.length <= 40 || props.index === rows.length - 1);
                  return show ? (
                    <circle key={props.key} cx={props.cx} cy={props.cy} r={4} fill={PRIMARY_SERIES} stroke="#fff" strokeWidth={2} />
                  ) : (
                    <g key={props.key} />
                  );
                }}
                activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {hasDemo && !preview && <DemoNotice />}
    </div>
  );
}
