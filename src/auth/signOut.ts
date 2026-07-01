import type { NavigateFunction } from 'react-router-dom';
import { useSessionStore } from '../core/store/sessionStore';

// CF Access logout endpoint clears the upstream Access session so
// "revoke session" removes the SSO cookie, not only the local JWT.
const CF_ACCESS_LOGOUT_URL =
  'https://red-queen-4dfa.cloudflareaccess.com/cdn-cgi/access/logout';

export interface SignOutOptions {
  /** Skip the browser confirm() prompt (used by automated flows). */
  skipConfirm?: boolean;
  /** Also bounce through CF Access /cdn-cgi/access/logout to clear SSO. */
  revokeRemote?: boolean;
}

/**
 * Sign out the current user. Clears the auth token + sessionStore while
 * preserving any other preference keys in localStorage.
 */
export function signOut(
  navigate: NavigateFunction,
  opts: SignOutOptions = {}
) {
  const { skipConfirm = false, revokeRemote = false } = opts;

  if (!skipConfirm) {
    const ok = window.confirm('the field will recede; sign out?');
    if (!ok) return;
  }

  localStorage.removeItem('noesis_token');
  useSessionStore.getState().clear();

  if (revokeRemote) {
    window.location.href = CF_ACCESS_LOGOUT_URL;
    return;
  }

  navigate('/', { replace: true });
}
