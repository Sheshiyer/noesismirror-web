import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Storage shim mirroring visitedStore — keeps persist hydration safe under
// test / SSR envs where window.localStorage is absent.
const memoryStorage: Storage = {
  length: 0,
  clear: () => {},
  getItem: () => null,
  key: () => null,
  removeItem: () => {},
  setItem: () => {},
};
const safeStorage = () =>
  typeof window !== 'undefined' && window.localStorage ? window.localStorage : memoryStorage;

// TP9 — session expiry + silent-refresh tracking.
//
// The JWT we receive after CF Access login encodes a Unix-seconds `exp`
// claim. We decode that locally so the HUD / modal layer can show a
// countdown and so TokenHandler can pre-warm a refresh attempt 5 min
// before expiry. `refreshing` is purely UI bookkeeping — the actual
// refresh endpoint doesn't exist yet (v1 stub).
interface SessionState {
  /** Unix milliseconds. null when no token / undecodable. */
  expiresAt: number | null;
  /** True while a refresh attempt is in flight. */
  refreshing: boolean;
  /** Re-decode noesis_token from localStorage and update expiresAt. */
  syncFromToken: () => void;
  /** Mark refresh-in-flight. */
  setRefreshing: (b: boolean) => void;
  /** Imperative reset — called from signOut. */
  clear: () => void;
  /** Convenience: minutes until expiry, or null when unknown / expired. */
  getRemainingMinutes: () => number | null;
}

/**
 * Decode a JWT payload's `exp` claim (Unix seconds) into Unix ms.
 * Returns null on any parse failure — sessionStore degrades silently.
 */
function decodeExpFromToken(token: string | null): number | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (payload.length % 4 !== 0) {
      payload += '=';
    }
    const json = atob(payload);
    const data = JSON.parse(json) as { exp?: number };
    if (typeof data.exp !== 'number') return null;
    return data.exp * 1000;
  } catch {
    return null;
  }
}

function readToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem('noesis_token');
  } catch {
    return null;
  }
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      expiresAt: decodeExpFromToken(readToken()),
      refreshing: false,
      syncFromToken: () => {
        const exp = decodeExpFromToken(readToken());
        set({ expiresAt: exp });
      },
      setRefreshing: (b) => set({ refreshing: b }),
      clear: () => set({ expiresAt: null, refreshing: false }),
      getRemainingMinutes: () => {
        const { expiresAt } = get();
        if (expiresAt === null) return null;
        const ms = expiresAt - Date.now();
        if (ms <= 0) return null;
        return Math.floor(ms / 60000);
      },
    }),
    {
      name: 'noesis_session',
      storage: createJSONStorage(safeStorage),
      // Only persist the timestamp — `refreshing` is in-flight UI state.
      partialize: (state) => ({ expiresAt: state.expiresAt }),
    }
  )
);
