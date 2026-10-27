import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async loader whenever `deps` change, aborting the previous request.
 * Previous data is kept while a new request is in flight so views can dim instead of flashing.
 * Pass `enabled = false` to skip loading (e.g. while inputs are invalid).
 */
export function useAsync(loader, deps, enabled = true) {
  const [state, setState] = useState({ data: null, error: null, loading: enabled });
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    if (!enabled) {
      setState((s) => ({ ...s, loading: false }));
      return undefined;
    }
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true }));
    loaderRef.current(controller.signal).then(
      (data) => !controller.signal.aborted && setState({ data, error: null, loading: false }),
      (error) => {
        if (error.name === 'AbortError' || controller.signal.aborted) return;
        setState((s) => ({ ...s, error, loading: false }));
      },
    );
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}
