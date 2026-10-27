const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'NETWORK_ERROR' } = {}) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(path, params, signal) {
  const query = params ? `?${new URLSearchParams(params)}` : '';
  let response;
  try {
    response = await fetch(`${BASE_URL}/api${path}${query}`, { signal, headers: { Accept: 'application/json' } });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Cannot reach the exchange-rate service. Check that the backend is running.');
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON body (e.g. a proxy error page); handled below.
  }
  if (!response.ok) {
    throw new ApiError(body?.message ?? `Request failed (${response.status}).`, {
      status: response.status,
      code: body?.code ?? 'HTTP_ERROR',
    });
  }
  if (body === null) {
    throw new ApiError('The service returned an unreadable response.', { status: response.status, code: 'BAD_RESPONSE' });
  }
  return body;
}

export const api = {
  currencies: (signal) => request('/currencies', null, signal),
  status: (signal) => request('/status', null, signal),
  latest: (base, signal) => request('/rates/latest', { base }, signal),
  convert: ({ from, to, amount }, signal) => request('/convert', { from, to, amount }, signal),
  history: ({ from, to, period }, signal) => request('/history', { from, to, period }, signal),
  compare: ({ base, symbols, period }, signal) =>
    request('/analytics/compare', { base, symbols: symbols.join(','), period }, signal),
  change: ({ from, to }, signal) => request('/analytics/change', { from, to }, signal),
};
