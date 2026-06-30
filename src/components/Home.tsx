import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from '../config';
import { signOut } from './TokenHandler';

interface LocationState {
  reason?: 'session_expired' | 'no_access';
  personId?: string;
}

const FLASH_MESSAGES: Record<NonNullable<LocationState['reason']>, string> = {
  session_expired: 'Your session expired. Please sign in again.',
  no_access: 'You do not have access to that reading.',
};

interface GrantsResponse {
  grants: string[];
}

const OUTER_CLASSES =
  'min-h-screen w-full bg-noesis-void text-noesis-parchment font-sans flex flex-col items-center justify-center relative overflow-hidden';

const BUTTON_CLASSES =
  'border border-noesis-gold/60 hover:border-noesis-gold bg-transparent hover:bg-noesis-gold/10 text-noesis-gold font-mono uppercase tracking-[0.25em] text-sm px-8 py-3 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-noesis-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-noesis-void';

const SIGIL_DRAW_STYLE = `
  @keyframes noesis-sigil-draw {
    0% { opacity: 0; clip-path: inset(100% 0 0 0); }
    100% { opacity: 1; clip-path: inset(0 0 0 0); }
  }
  .noesis-sigil-draw {
    animation: noesis-sigil-draw 2s ease-out forwards;
  }
  @media (prefers-reduced-motion: reduce) {
    .noesis-sigil-draw {
      animation: none;
      opacity: 1;
      clip-path: none;
    }
  }
`;

/**
 * Decode the `email` claim from a JWT payload. Returns null on any
 * parse failure rather than throwing — sign-out UI should degrade
 * gracefully if the token is malformed.
 */
function decodeEmailFromToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (payload.length % 4 !== 0) {
      payload += '=';
    }
    const json = atob(payload);
    const data = JSON.parse(json) as { email?: string };
    return typeof data.email === 'string' ? data.email : null;
  } catch {
    return null;
  }
}

function Backdrop() {
  return (
    <>
      <div
        className="motion-safe:transition-opacity absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent 0 39px, #C5A017 39px 40px),
            repeating-linear-gradient(90deg, transparent 0 39px, #C5A017 39px 40px)
          `,
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />
      <div
        className="motion-safe:transition-opacity absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(45,0,80,0.4) 0%, transparent 60%)',
        }}
      />
    </>
  );
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [grants, setGrants] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusedGrantIdx, setFocusedGrantIdx] = useState(0);
  const grantRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const flashReason = (location.state as LocationState | null)?.reason;
  const flashMessage = flashReason ? FLASH_MESSAGES[flashReason] : null;

  const getToken = () => localStorage.getItem('noesis_token');
  const userEmail = isAuthenticated ? decodeEmailFromToken(getToken()) : null;

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const token = getToken();
    if (!token) {
      setIsAuthenticated(false);
      setGrants([]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/grants`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('noesis_token');
        setIsAuthenticated(false);
        setGrants([]);
        return;
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: GrantsResponse = await response.json();
      setIsAuthenticated(true);
      setGrants(data.grants ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // TP1-023 — reactive document.title
  useEffect(() => {
    if (isAuthenticated === null) return;
    if (!isAuthenticated) {
      document.title = 'Tryambakam Noesis · Sign In';
      return;
    }
    const noun = grants.length === 1 ? 'Field' : 'Fields';
    document.title = `Tryambakam Noesis · ${grants.length} ${noun}`;
  }, [isAuthenticated, grants.length]);

  const handleAuth = () => {
    // Redirect to API auth endpoint - more reliable than popup
    // After CF Access login, API will redirect back with token in URL hash
    window.location.href = `${API_URL}/auth/callback?redirect=${encodeURIComponent(window.location.origin)}`;
  };

  const handleEnterField = (personId: string) => {
    navigate(`/p/${personId}`);
  };

  const handleEnterDashboard = () => {
    navigate('/home');
  };

  const handleSignOut = () => {
    signOut(navigate);
    // Force fresh state — clears grants + isAuthenticated locally too
    setIsAuthenticated(false);
    setGrants([]);
  };

  // TP1-016 — arrow-key navigation across grant chips
  const handleGrantKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (grants.length === 0) return;
    const { key } = e;
    if (key === 'ArrowDown' || key === 'ArrowRight') {
      e.preventDefault();
      const next = (focusedGrantIdx + 1) % grants.length;
      setFocusedGrantIdx(next);
      grantRefs.current[next]?.focus();
    } else if (key === 'ArrowUp' || key === 'ArrowLeft') {
      e.preventDefault();
      const next = (focusedGrantIdx - 1 + grants.length) % grants.length;
      setFocusedGrantIdx(next);
      grantRefs.current[next]?.focus();
    } else if (key === 'Enter') {
      e.preventDefault();
      const grant = grants[focusedGrantIdx];
      if (grant) handleEnterField(grant);
    }
  };

  // TP1-008 — top-right header with email + sign-out (shown only when authenticated)
  const AuthHeader = isAuthenticated ? (
    <header className="absolute top-4 right-6 z-20 flex items-center gap-4 font-mono text-xs text-noesis-parchment/60">
      {userEmail && <span>{userEmail}</span>}
      <button
        type="button"
        onClick={handleSignOut}
        className="hover:text-noesis-gold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-noesis-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-noesis-void"
      >
        [ sign out ]
      </button>
    </header>
  ) : null;

  // Loading state — TP1-007 sigil draw animation
  if (isLoading) {
    return (
      <div className={OUTER_CLASSES}>
        <style>{SIGIL_DRAW_STYLE}</style>
        <Backdrop />
        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-8 opacity-90">
            <img
              src="/brand-logo.svg"
              alt="Tryambakam Noesis"
              className="w-24 h-24 noesis-sigil-draw"
            />
          </div>
          <div className="font-mono text-xs text-noesis-parchment/60 uppercase tracking-[0.3em]">
            Entering the field…
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !isAuthenticated) {
    return (
      <div className={OUTER_CLASSES}>
        <Backdrop />
        {AuthHeader}
        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-8 opacity-90">
            <img src="/brand-logo.svg" alt="Tryambakam Noesis" className="w-24 h-24" />
          </div>
          <h1 className="font-display text-5xl md:text-6xl text-noesis-gold tracking-[0.3em] mb-2 text-center">
            TRYAMBAKAM NOESIS
          </h1>
          <p className="font-mono text-xs md:text-sm text-noesis-parchment/50 uppercase tracking-[0.4em] mb-12 text-center">
            Self-Consciousness as Technology
          </p>
          <div className="font-mono text-sm text-noesis-emerald uppercase tracking-wider border border-noesis-emerald/40 px-4 py-2 mb-8">
            {error}
          </div>
          <button className={BUTTON_CLASSES} onClick={handleAuth}>
            [ AUTHENTICATE ]
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={OUTER_CLASSES}>
      <Backdrop />
      {AuthHeader}
      <div className="relative z-10 flex flex-col items-center w-full">
        <div className="mb-8 opacity-90">
          <img src="/brand-logo.svg" alt="Tryambakam Noesis" className="w-24 h-24" />
        </div>

        <h1 className="font-display text-5xl md:text-6xl text-noesis-gold tracking-[0.3em] mb-2 text-center">
          TRYAMBAKAM NOESIS
        </h1>
        <p className="font-mono text-xs md:text-sm text-noesis-parchment/50 uppercase tracking-[0.4em] mb-12 text-center">
          Self-Consciousness as Technology
        </p>

        {flashMessage && (
          <div
            className="font-mono text-sm text-noesis-emerald uppercase tracking-wider border border-noesis-emerald/40 px-4 py-2 mb-8"
            role="status"
          >
            {flashMessage}
          </div>
        )}

        {/* TP1-018 — space-y-4 → space-y-6 */}
        <div className="max-w-2xl font-sans text-noesis-parchment/80 text-center space-y-6 leading-relaxed mb-12 px-6">
          <p>A private 3D memory palace for witness premium packs.</p>
          <p>The 16 symbolic mirrors of the Noesis Engine are cast here as a walkable field.</p>
          <p>Terrain becomes text. Distance becomes inquiry.</p>
        </div>

        {!isAuthenticated ? (
          <div className="flex flex-col items-center gap-4">
            <div className="font-mono text-xs text-noesis-parchment/60 uppercase tracking-[0.3em]">
              Please authenticate to enter the field.
            </div>
            <button className={BUTTON_CLASSES} onClick={handleAuth}>
              [ SIGN IN ]
            </button>
          </div>
        ) : grants.length === 0 ? (
          /* TP1-009 + TP1-010 — empty-state copy + mailto CTA */
          <div className="flex flex-col items-center gap-4">
            <div className="font-mono text-xs text-noesis-parchment/60 uppercase tracking-[0.3em]">
              No fields are currently inscribed to your name.
            </div>
            <a
              className={BUTTON_CLASSES}
              href="mailto:sheshnarayan.iyer@gmail.com?subject=Tryambakam Noesis · Access Request"
            >
              [ REQUEST ACCESS ]
            </a>
          </div>
        ) : grants.length === 1 ? (
          <div className="flex flex-col items-center">
            <button className={BUTTON_CLASSES} onClick={() => handleEnterField(grants[0])}>
              [ ENTER FIELD — {grants[0].toUpperCase()} ]
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full max-w-md">
            {/* TP1-020 — contextual count line */}
            <div className="font-mono text-xs text-noesis-parchment/50 uppercase tracking-[0.3em] mb-4">
              {grants.length} fields available
            </div>
            {/* TP1-016 — arrow-key nav container */}
            <div
              className="flex flex-col gap-3 w-full mb-6"
              role="listbox"
              aria-label="Available fields"
              onKeyDown={handleGrantKeyDown}
            >
              {grants.map((grant, idx) => (
                <button
                  key={grant}
                  ref={(el) => {
                    grantRefs.current[idx] = el;
                  }}
                  tabIndex={0}
                  role="option"
                  aria-selected={idx === focusedGrantIdx}
                  className={`${BUTTON_CLASSES} w-full`}
                  onClick={() => handleEnterField(grant)}
                  onFocus={() => setFocusedGrantIdx(idx)}
                >
                  [ {grant.toUpperCase()} ]
                </button>
              ))}
            </div>
            <button className={BUTTON_CLASSES} onClick={handleEnterDashboard}>
              [ DASHBOARD ]
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
