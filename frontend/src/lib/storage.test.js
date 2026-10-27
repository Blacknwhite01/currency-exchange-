import { describe, expect, it } from 'vitest';
import { MAX_RECENTS, addRecent, isFavorite, sanitizeFavorites, toggleFavorite } from './storage.js';

const entry = (amount, from = 'USD', to = 'EUR', at = '2026-10-24T10:00:00Z') => ({
  id: `${amount}${from}${to}${at}`,
  amount,
  from,
  to,
  result: 1,
  rate: 1,
  at,
});

describe('favorites', () => {
  it('toggles a pair on and off', () => {
    const added = toggleFavorite([], 'USD', 'INR');
    expect(isFavorite(added, 'USD', 'INR')).toBe(true);
    expect(isFavorite(added, 'INR', 'USD')).toBe(false);
    expect(toggleFavorite(added, 'USD', 'INR')).toEqual([]);
  });

  it('drops malformed and duplicate stored entries', () => {
    const stored = [{ from: 'USD', to: 'EUR' }, { from: 'USD', to: 'EUR' }, { from: 'usd', to: 'x' }, null, 'junk'];
    expect(sanitizeFavorites(stored)).toEqual([{ from: 'USD', to: 'EUR' }]);
    expect(sanitizeFavorites('not a list')).toEqual([]);
  });
});

describe('recent conversions', () => {
  const now = Date.parse('2026-10-24T12:00:00Z');

  it('keeps only the most recent 20', () => {
    let list = [];
    for (let i = 0; i < 25; i += 1) list = addRecent(list, entry(String(i), 'USD', i % 2 ? 'EUR' : 'GBP'), now);
    expect(list).toHaveLength(MAX_RECENTS);
    expect(list[0].amount).toBe('24');
  });

  it('ignores an exact repeat of the latest entry', () => {
    const list = [entry('100')];
    expect(addRecent(list, entry('100'), now)).toBe(list);
  });

  it('replaces the latest entry when the same pair is edited within a minute', () => {
    const list = [entry('10', 'USD', 'EUR', '2026-10-24T11:59:30Z')];
    const next = addRecent(list, entry('100', 'USD', 'EUR', '2026-10-24T12:00:00Z'), now);
    expect(next).toHaveLength(1);
    expect(next[0].amount).toBe('100');
  });

  it('adds a new entry for a different pair', () => {
    const list = [entry('10')];
    expect(addRecent(list, entry('10', 'EUR', 'GBP'), now)).toHaveLength(2);
  });
});
