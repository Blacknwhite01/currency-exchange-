import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { useAsync } from '../hooks/useAsync.js';
import {
  KEYS,
  addRecent,
  readJson,
  sanitizeFavorites,
  sanitizeRecents,
  toggleFavorite as toggleFavoriteIn,
  writeJson,
} from '../lib/storage.js';

const AppDataContext = createContext(null);

const DEFAULT_PAIR = { from: 'USD', to: 'EUR' };

export function AppDataProvider({ children }) {
  const currencies = useAsync((signal) => api.currencies(signal), []);
  const status = useAsync((signal) => api.status(signal), []);

  const byCode = useMemo(() => {
    const map = new Map();
    (currencies.data ?? []).forEach((c) => map.set(c.code, c));
    return map;
  }, [currencies.data]);

  const [favorites, setFavorites] = useState(() => sanitizeFavorites(readJson(KEYS.favorites, [])));
  const [recents, setRecents] = useState(() => sanitizeRecents(readJson(KEYS.recents, [])));
  const [lastPair, setLastPairState] = useState(() => {
    const stored = readJson(KEYS.lastPair, null);
    return stored?.from && stored?.to ? stored : DEFAULT_PAIR;
  });

  useEffect(() => writeJson(KEYS.favorites, favorites), [favorites]);
  useEffect(() => writeJson(KEYS.recents, recents), [recents]);
  useEffect(() => writeJson(KEYS.lastPair, lastPair), [lastPair]);

  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);
  const notify = useCallback((message, tone = 'info') => {
    const id = ++toastId.current;
    setToasts((list) => [...list.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3200);
  }, []);

  const toggleFavorite = useCallback(
    (from, to) => {
      const next = toggleFavoriteIn(favorites, from, to);
      const added = next.length > favorites.length;
      setFavorites(next);
      notify(`${from} → ${to} ${added ? 'added to' : 'removed from'} favorites`, added ? 'success' : 'info');
    },
    [favorites, notify],
  );

  const recordConversion = useCallback((entry) => setRecents((list) => addRecent(list, entry)), []);
  const clearRecents = useCallback(() => {
    setRecents([]);
    notify('Recent conversions cleared');
  }, [notify]);

  const setLastPair = useCallback((from, to) => {
    setLastPairState((p) => (p.from === from && p.to === to ? p : { from, to }));
  }, []);

  const value = useMemo(
    () => ({
      currencies,
      byCode,
      status,
      favorites,
      toggleFavorite,
      recents,
      recordConversion,
      clearRecents,
      lastPair,
      setLastPair,
      toasts,
      notify,
    }),
    [currencies, byCode, status, favorites, toggleFavorite, recents, recordConversion, clearRecents, lastPair, setLastPair, toasts, notify],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData must be used inside AppDataProvider');
  return context;
}
