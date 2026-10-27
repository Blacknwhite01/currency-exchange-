// Display formatting. Values arrive from the backend already calculated with BigDecimal;
// rounding here is for presentation only.

const moneyFormatters = new Map();

function moneyFormatter(code, small) {
  const key = `${code}|${small}`;
  if (!moneyFormatters.has(key)) {
    let formatter;
    try {
      formatter = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: code,
        currencyDisplay: 'narrowSymbol',
        ...(small ? { maximumSignificantDigits: 4 } : {}),
      });
    } catch {
      formatter = null;
    }
    moneyFormatters.set(key, formatter);
  }
  return moneyFormatters.get(key);
}

/** Formats an amount in a currency, keeping significant digits for tiny values (e.g. 0.00006). */
export function formatMoney(value, code) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  const small = number !== 0 && Math.abs(number) < 1;
  const formatter = moneyFormatter(code, small);
  if (formatter) return formatter.format(number);
  return `${formatNumber(number, small ? { maximumSignificantDigits: 4 } : { maximumFractionDigits: 2 })} ${code}`;
}

export function formatNumber(value, options = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return new Intl.NumberFormat(undefined, options).format(number);
}

/** Exchange rates: 4 decimals at or above 1, otherwise 5 significant digits. */
export function formatRate(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  if (Math.abs(number) >= 1) {
    return formatNumber(number, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  return formatNumber(number, { maximumSignificantDigits: 5 });
}

export function formatPercent(value, { signed = true } = {}) {
  const number = Number(value);
  if (value === null || value === undefined || !Number.isFinite(number)) return '—';
  const text = formatNumber(Math.abs(number), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (!signed) return `${text}%`;
  if (number > 0) return `+${text}%`;
  if (number < 0) return `−${text}%`;
  return `${text}%`;
}

/** Formats a backend LocalDate ("2026-10-24") without shifting it into the viewer's time zone. */
export function formatDate(isoDate, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!isoDate) return '—';
  const date = new Date(`${isoDate}T00:00:00Z`);
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'UTC' }).format(date);
}

export function formatDateTime(isoInstant) {
  if (!isoInstant) return '—';
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(isoInstant));
}

export function timeAgo(isoInstant, now = Date.now()) {
  if (!isoInstant) return '';
  const seconds = Math.round((now - new Date(isoInstant).getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (Math.abs(seconds) < 60) return rtf.format(-seconds, 'second');
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return rtf.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(-hours, 'hour');
  return rtf.format(-Math.round(hours / 24), 'day');
}

export const MAX_DECIMALS = 8;

/**
 * Validates a typed amount. Returns { value } with a normalised string for the API,
 * or { error } with a message to show the user.
 */
export function parseAmount(raw) {
  const text = String(raw ?? '').trim().replace(/[\s,]/g, '');
  if (text === '') return { error: 'Enter an amount to convert.' };
  if (!/^\d*\.?\d*$/.test(text) || text === '.') {
    return { error: text.startsWith('-') ? 'The amount must be greater than zero.' : 'Enter a valid number, for example 100 or 25.50.' };
  }
  if (Number(text) <= 0) return { error: 'The amount must be greater than zero.' };
  const decimals = text.includes('.') ? text.split('.')[1].replace(/0+$/, '').length : 0;
  if (decimals > MAX_DECIMALS) return { error: `Use at most ${MAX_DECIMALS} decimal places.` };
  if (Number(text) > 1e15) return { error: 'The amount is too large to convert.' };
  return { value: text };
}
