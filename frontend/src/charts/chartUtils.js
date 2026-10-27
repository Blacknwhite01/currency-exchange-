// Shared chart constants and data shaping.

/** Categorical slots in fixed order (validated for CVD separation on the light card surface). */
export const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];
export const PRIMARY_SERIES = SERIES_COLORS[0];
export const DEMO_COLOR = '#8f98ab';
export const GRID_COLOR = '#e3e8f1';
export const AXIS_COLOR = '#738096';

export const PERIODS = [
  { value: '1D', label: '1D', name: '1 day' },
  { value: '1W', label: '1W', name: '1 week' },
  { value: '1M', label: '1M', name: '1 month' },
  { value: '1Y', label: '1Y', name: '1 year' },
];

const DAY = 86_400_000;
/** Consecutive observations further apart than this are drawn with a break, not a joining line. */
const MAX_JOIN_GAP = 2 * DAY;

export const toTs = (isoDate) => Date.parse(`${isoDate}T00:00:00Z`);

/**
 * Splits observations into a solid "real" series and a dashed "demo" series. The demo line is
 * extended onto the first real point so the two meet; gaps in the data become line breaks.
 */
export function splitBySource(points, valueOf = (p) => Number(p.rate)) {
  const rows = [];
  let previous = null;
  for (const point of points) {
    const ts = toTs(point.date);
    const value = valueOf(point);
    const demo = point.source === 'DEMO';
    if (previous && ts - previous.ts > MAX_JOIN_GAP) {
      rows.push({ ts: previous.ts + DAY, real: null, demo: null, gap: true });
    }
    const joined = previous && !previous.gap && ts - previous.ts <= MAX_JOIN_GAP;
    const row = { ts, date: point.date, value, rate: Number(point.rate), source: point.source, real: demo ? null : value, demo: demo ? value : null };
    if (joined && !demo && previous.source === 'DEMO') row.demo = value;
    rows.push(row);
    previous = row;
  }
  return rows;
}

/**
 * Evenly spaced, round y-axis ticks (steps of 1, 2, 2.5 or 5 × 10^n) with breathing room around the
 * data; never collapses to a flat line when all values are equal.
 * @returns {{ domain: [number, number], ticks: number[] }}
 */
export function niceScale(values, { minPad = 0, count = 5 } = {}) {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return { domain: [0, 1], ticks: [0, 0.5, 1] };
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const pad = Math.max((max - min) * 0.08, Math.abs(max) * 0.002, minPad);
  const rawStep = (max - min + 2 * pad) / (count - 1);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rawStep);
  const start = Math.floor((min - pad) / step) * step;
  const end = Math.ceil((max + pad) / step) * step;
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  const ticks = [];
  for (let t = start; t <= end + step / 2; t += step) ticks.push(Number(t.toFixed(decimals)));
  return { domain: [ticks[0], ticks[ticks.length - 1]], ticks };
}

export function dateTickFormatter(period) {
  const options = period === '1Y' ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' };
  const formatter = new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'UTC' });
  return (ts) => formatter.format(new Date(ts));
}
