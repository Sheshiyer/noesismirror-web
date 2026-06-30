import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, type NavigateFunction } from 'react-router-dom';
import { useSessionStore } from '../core/store/sessionStore';

// CF Access logout endpoint — clears the upstream Access session so
// "revoke session" actually removes the SSO cookie, not just the local JWT.
const CF_ACCESS_LOGOUT_URL =
  'https://red-queen-4dfa.cloudflareaccess.com/cdn-cgi/access/logout';

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
      // eslint-disable-next-line no-console
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

export interface SignOutOptions {
  /** Skip the browser confirm() prompt (used by automated flows). */
  skipConfirm?: boolean;
  /** Also bounce through CF Access /cdn-cgi/access/logout to clear SSO. */
  revokeRemote?: boolean;
}

/**
 * Sign out the current user. Clears the auth token + sessionStore while
 * preserving any other preference keys in localStorage.
 *
 * - TP9-006: by default, prompts with a browser confirm() (v1 — full
 *   modal would need a portal at App level). Pass skipConfirm to bypass.
 * - TP9-015: when revokeRemote is true, redirects to the CF Access
 *   logout endpoint after clearing local state. CF then bounces the
 *   user back to their default landing page.
 */
export function signOut(
  navigate: NavigateFunction,
  opts: SignOutOptions = {}
) {
  const { skipConfirm = false, revokeRemote = false } = opts;

  if (!skipConfirm) {
    // eslint-disable-next-line no-alert
    const ok = window.confirm('the field will recede; sign out?');
    if (!ok) return;
  }

  localStorage.removeItem('noesis_token');
  useSessionStore.getState().clear();

  if (revokeRemote) {
    // Hard navigation — CF will clear the Access cookie then redirect.
    window.location.href = CF_ACCESS_LOGOUT_URL;
    return;
  }

  navigate('/', { replace: true });
}
