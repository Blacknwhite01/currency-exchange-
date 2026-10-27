// Browser-local persistence for favorites, recent conversions and the last-used pair.
// Storage can be unavailable (private mode, blocked site data), so every access is guarded
// and the app keeps working in memory.

export const KEYS = {
  favorites: 'cx.favorites.v1',
  recents: 'cx.recents.v1',
  lastPair: 'cx.lastPair.v1',
};

export const MAX_RECENTS = 20;

export function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore: the in-memory state remains correct for this session.
  }
}

const isCode = (code) => typeof code === 'string' && /^[A-Z]{3}$/.test(code);

/** Drops malformed entries that may exist from older versions or manual edits. */
export function sanitizeFavorites(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  return list.filter((f) => {
    const key = f && `${f.from}-${f.to}`;
    if (!f || !isCode(f.from) || !isCode(f.to) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function sanitizeRecents(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((r) => r && isCode(r.from) && isCode(r.to) && r.amount && r.result != null && r.at)
    .slice(0, MAX_RECENTS);
}

export const pairKey = (from, to) => `${from}-${to}`;

export function isFavorite(favorites, from, to) {
  return favorites.some((f) => f.from === from && f.to === to);
}

export function toggleFavorite(favorites, from, to) {
  return isFavorite(favorites, from, to)
    ? favorites.filter((f) => !(f.from === from && f.to === to))
    : [{ from, to, addedAt: new Date().toISOString() }, ...favorites];
}

/**
 * Adds a conversion to the front of the list. Repeating the latest entry is ignored, and a
 * quick follow-up edit of the same pair (e.g. typing a longer amount) replaces it.
 */
export function addRecent(recents, entry, now = Date.now()) {
  const [latest, ...rest] = recents;
  if (latest && latest.from === entry.from && latest.to === entry.to) {
    if (latest.amount === entry.amount) return recents;
    if (now - new Date(latest.at).getTime() < 60_000) {
      return [entry, ...rest].slice(0, MAX_RECENTS);
    }
  }
  return [entry, ...recents].slice(0, MAX_RECENTS);
}
