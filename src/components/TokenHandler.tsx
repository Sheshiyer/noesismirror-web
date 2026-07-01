import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../core/store/sessionStore';

// TP9-002 — silent refresh attempt window. We try once when the token is
// inside this many ms of expiry. The actual refresh endpoint doesn't
// exist yet; for v1 we log + flip the flag so the UI can react and the
// existing 401-redirect path handles the actual failure.
const REFRESH_WINDOW_MS = 5 * 60 * 1000;

export function TokenHandler() {
  const location = useLocation();
  const navigate = useNavigate();
  const syncFromToken = useSessionStore((s) => s.syncFromToken);
  const setRefreshing = useSessionStore((s) => s.setRefreshing);
  const refreshAttempted = useRef(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#token=')) return;

    const token = decodeURIComponent(hash.substring(7));
    localStorage.setItem('noesis_token', token);
    // TP9-001 — keep sessionStore in sync the moment the token lands.
    syncFromToken();
    refreshAttempted.current = false;
    navigate('/', { replace: true });
  }, [location, navigate, syncFromToken]);

  // TP9-002 — poll once a minute. If we cross into the 5-min pre-expiry
  // window, attempt a silent refresh (currently a stub — flips the flag
  // and logs; the worker endpoint isn't wired yet). On real expiry,
  // Home's grants 401 handler does the redirect (TP9-003).
  useEffect(() => {
    const tick = () => {
      const expiresAt = useSessionStore.getState().expiresAt;
      if (expiresAt === null) return;
      const remaining = expiresAt - Date.now();
      if (remaining > REFRESH_WINDOW_MS) {
        refreshAttempted.current = false;
        return;
      }
      if (remaining <= 0) return;
      if (refreshAttempted.current) return;
      refreshAttempted.current = true;
      setRefreshing(true);
      // Stub: real refresh endpoint TBD. Log + clear the in-flight flag.
      console.warn(
        '[noesis] silent token refresh not yet implemented; session will expire in',
        Math.round(remaining / 1000),
        's'
      );
      setRefreshing(false);
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [setRefreshing]);

  return null;
}
