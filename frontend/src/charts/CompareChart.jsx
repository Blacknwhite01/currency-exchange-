import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Icon from '../components/Icon.jsx';
import { DemoNotice, EmptyState, ErrorState, Skeleton } from '../components/States.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../lib/api.js';
import { formatDate, formatPercent, formatRate } from '../lib/format.js';
import { AXIS_COLOR, DEMO_COLOR, GRID_COLOR, PERIODS, dateTickFormatter, niceScale, splitBySource, toTs } from './chartUtils.js';

function mergeSeries(series) {
  const byTs = new Map();
  for (const s of series) {
    for (const r of splitBySource(s.points, (p) => Number(p.changePct))) {
      const row = byTs.get(r.ts) ?? { ts: r.ts, date: r.date };
      row.date = row.date ?? r.date;
      row[s.code] = r.real;
      row[`${s.code}__demo`] = r.demo;
      if (!r.gap) {
        row[`${s.code}__rate`] = r.rate;
        row[`${s.code}__pct`] = r.value;
        row[`${s.code}__src`] = r.source;
      }
      byTs.set(r.ts, row);
    }
  }
  return [...byTs.values()].sort((a, b) => a.ts - b.ts);
}

function CompareTooltip({ active, payload, base, codes, colorOf }) {
  const row = payload?.[0]?.payload;
  if (!active || !row?.date) return null;
  const items = codes
    .filter((c) => row[`${c}__pct`] != null)
    .sort((a, b) => row[`${b}__pct`] - row[`${a}__pct`]);
  if (items.length === 0) return null;
  const demo = items.some((c) => row[`${c}__src`] === 'DEMO');
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__date">{formatDate(row.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
      <ul className="chart-tooltip__list">
        {items.map((c) => (
          <li key={c}>
            <span className="legend-swatch" style={{ background: colorOf(c) }} />
            <span className="chart-tooltip__code">{c}</span>
            <strong>{formatPercent(row[`${c}__pct`])}</strong>
            <span className="muted">
              1 {base} = {formatRate(row[`${c}__rate`])}
            </span>
          </li>
        ))}
      </ul>
      {demo && <p className="chart-tooltip__demo">Includes demo data</p>}
    </div>
  );
}

/**
 * Compares currencies against one base. Each line is the % change from that currency's first
 * observation in the period, so all series share one axis regardless of magnitude.
 */
export default function CompareChart({ base, symbols, period, colorOf, height = 320 }) {
  const [showTable, setShowTable] = useState(false);
  const compare = useAsync(
    (signal) => api.compare({ base, symbols, period }, signal),
    [base, symbols.join(','), period],
    Boolean(base && symbols.length > 0),
  );
  const data = compare.data;
  const series = useMemo(() => (data ? data.series.filter((s) => symbols.includes(s.code)) : []), [data, symbols]);
  const rows = useMemo(() => mergeSeries(series), [series]);
  const scale = useMemo(
    () => niceScale(series.flatMap((s) => s.points.map((p) => Number(p.changePct))).concat(0), { minPad: 0.1 }),
    [series],
  );
  const codes = series.map((s) => s.code);
  const periodName = PERIODS.find((p) => p.value === period)?.name ?? period;

  if (symbols.length === 0) {
    return <EmptyState icon="plus" title="Add a currency to compare" message={`Pick up to five currencies to compare against ${base}.`} />;
  }
  if (compare.error && !compare.loading) {
    return <ErrorState title="Could not load comparison" message={compare.error.message} onRetry={compare.reload} />;
  }
  if (!data) {
    return (
      <div className="chart-skeleton" style={{ height }}>
        <Skeleton height="100%" radius={12} />
      </div>
    );
  }
  if (series.every((s) => s.points.length === 0)) {
    return (
      <EmptyState
        icon="chart"
        title={`No stored observations against ${base} in the last ${periodName}`}
        message="Comparison lines appear once daily observations have been collected for these currencies."
      />
    );
  }

  const tick = dateTickFormatter(period);
  return (
    <div className={`compare ${compare.loading ? 'is-refreshing' : ''}`}>
      <div className="chart-meta">
        <div className="chart-legend" role="list" aria-label="Series">
          {series.map((s) => (
            <span key={s.code} className="legend-item" role="listitem">
              <span className="legend-swatch" style={{ background: colorOf(s.code) }} />
              <strong>{s.code}</strong>
              <span className="muted">{s.changePct != null ? formatPercent(s.changePct) : s.points.length === 1 ? '1 observation' : 'no data'}</span>
            </span>
          ))}
          {data.containsDemoData && (
            <span className="legend-item">
              <span className="legend-swatch legend-swatch--dashed" style={{ borderColor: DEMO_COLOR }} /> Demo portion
            </span>
          )}
        </div>
        <button type="button" className="btn btn--ghost btn--sm" aria-pressed={showTable} onClick={() => setShowTable((s) => !s)}>
          <Icon name={showTable ? 'chart' : 'table'} size={16} /> {showTable ? 'Chart view' : 'Table view'}
        </button>
      </div>

      {showTable ? (
        <div className="table-wrap" style={{ maxHeight: height }}>
          <table className="data-table">
            <caption className="sr-only">Change against {base} over {periodName}</caption>
            <thead>
              <tr>
                <th scope="col">Currency</th>
                <th scope="col" className="num">Start (1 {base})</th>
                <th scope="col" className="num">Latest (1 {base})</th>
                <th scope="col" className="num">Change</th>
                <th scope="col" className="num">Observations</th>
              </tr>
            </thead>
            <tbody>
              {series.map((s) => (
                <tr key={s.code}>
                  <th scope="row">{s.code}</th>
                  <td className="num">{s.startRate != null ? formatRate(s.startRate) : '—'}</td>
                  <td className="num">{s.endRate != null ? formatRate(s.endRate) : '—'}</td>
                  <td className="num">{formatPercent(s.changePct)}</td>
                  <td className="num">{s.points.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="chart-box"
          style={{ height }}
          role="img"
          aria-label={`Line chart comparing ${codes.join(', ')} against ${base} over ${periodName}, as percentage change. ${series
            .map((s) => `${s.code} ${formatPercent(s.changePct)}`)
            .join(', ')}.`}
        >
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
                tickFormatter={(v) => formatPercent(v)}
                tick={{ fill: AXIS_COLOR, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={64}
              />
              <ReferenceLine y={0} stroke="#c3cad8" />
              <Tooltip content={<CompareTooltip base={base} codes={codes} colorOf={colorOf} />} cursor={{ stroke: AXIS_COLOR, strokeWidth: 1 }} />
              {series.map((s) => [
                <Line
                  key={`${s.code}-demo`}
                  dataKey={`${s.code}__demo`}
                  stroke={colorOf(s.code)}
                  strokeOpacity={0.55}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  activeDot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                  legendType="none"
                />,
                <Line
                  key={s.code}
                  dataKey={s.code}
                  stroke={colorOf(s.code)}
                  strokeWidth={2}
                  dot={s.points.length <= 40 ? { r: 3.5, fill: colorOf(s.code), stroke: '#fff', strokeWidth: 2 } : false}
                  activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />,
              ])}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {data.containsDemoData && <DemoNotice />}
    </div>
  );
}
