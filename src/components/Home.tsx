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

// TP1-001, TP1-002, TP1-005, TP1-006 — keyframes scoped via inline <style>.
// Kept alongside the existing sigil-draw to avoid plumbing a global stylesheet.
const HOME_STYLE = `
  @keyframes noesis-sigil-draw {
    0% { opacity: 0; clip-path: inset(100% 0 0 0); }
    100% { opacity: 1; clip-path: inset(0 0 0 0); }
  }
  .noesis-sigil-draw {
    animation: noesis-sigil-draw 2s ease-out forwards;
  }
  @keyframes grid-drift {
    0% { transform: translate(0, 0); }
    50% { transform: translate(4px, 3px); }
    100% { transform: translate(0, 0); }
  }
  @keyframes breath {
    0%, 100% { transform: scale(1); }
    21% { transform: scale(1.03); }
    58% { transform: scale(1.03); }
  }
  @keyframes underline-grow {
    from { width: 0; }
    to { width: 60%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .noesis-sigil-draw,
    .noesis-grid-drift,
    .noesis-breath,
    .noesis-underline-grow {
      animation: none;
    }
    .noesis-sigil-draw { opacity: 1; clip-path: none; }
    .noesis-underline-grow { width: 60%; }
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

// TP1-014 — render localStorage timestamps as human-friendly relative time.
function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 0) return 'just now';
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min${min === 1 ? '' : 's'} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} day${day === 1 ? '' : 's'} ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month} month${month === 1 ? '' : 's'} ago`;
  const year = Math.floor(day / 365);
  return `${year} year${year === 1 ? '' : 's'} ago`;
}

function lastVisitedFor(personId: string): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`noesis_visit_${personId}`);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

// TP1-021 — error type → human-friendly copy for the auth surface.
function describeError(err: unknown): string {
  if (!(err instanceof Error)) return 'the field cannot be reached';
  const msg = err.message;
  if (/401/.test(msg)) return 'your session has lapsed';
  if (/^API error: 5\d\d/.test(msg)) return 'the field is unstable';
  if (/fetch|network|Failed to fetch|NetworkError/i.test(msg)) {
    return 'the field cannot be reached';
  }
  return msg;
}

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return /fetch|network|Failed to fetch|NetworkError/i.test(err.message);
}

function Backdrop({ driftEnabled }: { driftEnabled: boolean }) {
  // TP1-001 — wrap the grid in an outer + inner so the mask stays put
  // while the inner pattern drifts a few pixels in a slow loop.
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      >
        <div
          className={`absolute inset-0 opacity-[0.07] ${driftEnabled ? 'motion-safe:animate-[grid-drift_8s_ease-in-out_infinite]' : ''}`}
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent 0 39px, #C5A017 39px 40px),
              repeating-linear-gradient(90deg, transparent 0 39px, #C5A017 39px 40px)
            `,
          }}
        />
      </div>
      <div
        className="motion-safe:transition-opacity absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(45,0,80,0.4) 0%, transparent 60%)',
        }}
      />
    </>
  );
}

const TITLE_TEXT = 'TRYAMBAKAM NOESIS';

// TP1-002 — staggered char reveal helper.
function StaggeredTitle({ mounted }: { mounted: boolean }) {
  return (
    <h1 className="font-display text-3xl md:text-5xl lg:text-6xl text-noesis-gold tracking-[0.3em] mb-2 text-center">
      {TITLE_TEXT.split('').map((ch, i) => (
        <span
          key={`${ch}-${i}`}
          className="inline-block transition-all duration-300 ease-out"
          style={{
            transitionDelay: `${i * 50}ms`,
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(4px)',
          }}
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </h1>
  );
}

// TP1-006 — animated emerald underline beneath the subtitle.
function Subtitle() {
  return (
    <div className="flex flex-col items-center mb-12">
      <p className="font-mono text-xs md:text-sm text-noesis-parchment/50 uppercase tracking-[0.4em] text-center">
        Self-Consciousness as Technology
      </p>
      <div className="h-px bg-noesis-emerald mx-auto mt-2 noesis-underline-grow motion-safe:animate-[underline-grow_1.5s_ease-out_forwards]" />
    </div>
  );
}

// TP1-003 — cursor parallax. Returns the per-axis offset (px) for the
// center glow div. 1/40 dampening matches the spec ratio.
function useCursorParallax() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    const handler = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      setOffset({ x: (e.clientX - cx) / 40, y: (e.clientY - cy) / 40 });
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);
  return offset;
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [grants, setGrants] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusedGrantIdx, setFocusedGrantIdx] = useState(0);
  // TP1-022 — track auto-retry attempts on transient network failures.
  const [retryAttempt, setRetryAttempt] = useState(0);
  // TP1-002 — gate the title reveal on a post-mount second frame.
  const [titleMounted, setTitleMounted] = useState(false);
  const grantRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const parallax = useCursorParallax();
  const flashReason = (location.state as LocationState | null)?.reason;
  const flashMessage = flashReason ? FLASH_MESSAGES[flashReason] : null;

  const getToken = () => localStorage.getItem('noesis_token');
  const userEmail = isAuthenticated ? decodeEmailFromToken(getToken()) : null;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setTitleMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

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
        throw new Error('API error: 401');
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: GrantsResponse = await response.json();
      setIsAuthenticated(true);
      setGrants(data.grants ?? []);
      setRetryAttempt(0);
    } catch (err) {
      setError(describeError(err));
      setIsAuthenticated(false);

      // TP1-022 — auto-retry on transient network errors with exponential
      // backoff (1s, 2s, 4s, then give up). 401/5xx don't retry.
      if (isNetworkError(err) && retryAttempt < 3) {
        const delay = 1000 * Math.pow(2, retryAttempt);
        const next = retryAttempt + 1;
        setRetryAttempt(next);
        window.setTimeout(() => {
          checkAuth();
        }, delay);
      }
    } finally {
      setIsLoading(false);
    }
  }, [retryAttempt]);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // TP1-014 — record visit so the chip can show "X ago" next time.
    try {
      localStorage.setItem(`noesis_visit_${personId}`, String(Date.now()));
    } catch {
      /* storage disabled — nothing to record. */
    }
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

  const handleRevokeSession = () => {
    // TP9-015 — bounce through CF Access logout to clear the SSO cookie.
    signOut(navigate, { revokeRemote: true, skipConfirm: true });
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
      {/* TP9-015 — revoke session: bounces through CF Access logout */}
      <button
        type="button"
        onClick={handleRevokeSession}
        className="text-noesis-parchment/40 hover:text-noesis-gold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-noesis-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-noesis-void"
      >
        [ revoke session ]
      </button>
    </header>
  ) : null;

  // TP1-004 + TP1-005 — sigil with hover scale + breath pulse.
  // Parallax shift applied via inline transform on the wrapper.
  const Sigil = ({ animateDraw = false }: { animateDraw?: boolean }) => (
    <div
      className="mb-8"
      style={{
        transform: `translate(${parallax.x}px, ${parallax.y}px)`,
        transition: 'transform 200ms ease-out',
        willChange: 'transform',
      }}
    >
      <div className="motion-safe:animate-[breath_19s_ease-in-out_infinite] noesis-breath">
        <img
          src="/brand-logo.svg"
          alt="Tryambakam Noesis"
          className={`w-16 h-16 md:w-24 md:h-24 opacity-90 hover:opacity-100 scale-100 hover:scale-105 transition-all duration-200 ${
            animateDraw ? 'noesis-sigil-draw' : ''
          }`}
        />
      </div>
    </div>
  );

  // Loading state — TP1-007 sigil draw animation
  if (isLoading) {
    return (
      <div className={OUTER_CLASSES}>
        <style>{HOME_STYLE}</style>
        <Backdrop driftEnabled />
        <div className="relative z-10 flex flex-col items-center">
          <Sigil animateDraw />
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
        <style>{HOME_STYLE}</style>
        <Backdrop driftEnabled />
        {AuthHeader}
        <div className="relative z-10 flex flex-col items-center w-full px-6">
          <Sigil />
          <StaggeredTitle mounted={titleMounted} />
          <Subtitle />
          <div className="font-mono text-sm text-noesis-emerald uppercase tracking-wider border border-noesis-emerald/40 px-4 py-2 mb-8 text-center">
            {error}
            {retryAttempt > 0 && retryAttempt < 3 && (
              <span className="block text-[10px] mt-1 text-noesis-parchment/50">
                retrying… ({retryAttempt}/3)
              </span>
            )}
          </div>
          <button className={`${BUTTON_CLASSES} w-full max-w-xs md:w-auto`} onClick={handleAuth}>
            [ AUTHENTICATE ]
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={OUTER_CLASSES}>
      <style>{HOME_STYLE}</style>
      <Backdrop driftEnabled />
      {AuthHeader}
      <div className="relative z-10 flex flex-col items-center w-full px-6">
        <Sigil />
        <StaggeredTitle mounted={titleMounted} />
        <Subtitle />

        {flashMessage && (
          <div
            className="font-mono text-sm text-noesis-emerald uppercase tracking-wider border border-noesis-emerald/40 px-4 py-2 mb-8"
            role="status"
          >
            {flashMessage}
          </div>
        )}

        {/* TP1-018 — space-y-4 → space-y-6 */}
        <div className="max-w-2xl font-sans text-noesis-parchment/80 text-center space-y-6 leading-relaxed mb-12">
          <p>A private 3D memory palace for witness premium packs.</p>
          <p>The 16 symbolic mirrors of the Noesis Engine are cast here as a walkable field.</p>
          <p>Terrain becomes text. Distance becomes inquiry.</p>
        </div>

        {!isAuthenticated ? (
          <div className="flex flex-col items-center gap-4 w-full max-w-xs">
            <div className="font-mono text-xs text-noesis-parchment/60 uppercase tracking-[0.3em] text-center">
              Please authenticate to enter the field.
            </div>
            <button className={`${BUTTON_CLASSES} w-full md:w-auto`} onClick={handleAuth}>
              [ SIGN IN ]
            </button>
          </div>
        ) : grants.length === 0 ? (
          /* TP1-009 + TP1-010 — empty-state copy + mailto CTA */
          <div className="flex flex-col items-center gap-4 w-full max-w-xs">
            <div className="font-mono text-xs text-noesis-parchment/60 uppercase tracking-[0.3em] text-center">
              No fields are currently inscribed to your name.
            </div>
            <a
              className={`${BUTTON_CLASSES} w-full md:w-auto text-center`}
              href="mailto:sheshnarayan.iyer@gmail.com?subject=Tryambakam Noesis · Access Request"
            >
              [ REQUEST ACCESS ]
            </a>
          </div>
        ) : grants.length === 1 ? (
          /* TP1-011 — Sacred-Gold sigil prefix; TP1-014 — last-visited stamp; TP1-027 — mobile gutter */
          <div className="flex flex-col items-center w-full max-w-md">
            <button
              className={`${BUTTON_CLASSES} w-full md:w-auto`}
              onClick={() => handleEnterField(grants[0])}
            >
              <span className="text-noesis-gold">◆</span> {grants[0].toUpperCase()}
            </button>
            {(() => {
              const last = lastVisitedFor(grants[0]);
              return last !== null ? (
                <span className="font-mono text-[10px] text-noesis-parchment/40 mt-2">
                  · {formatRelative(last)}
                </span>
              ) : null;
            })()}
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
              {grants.map((grant, idx) => {
                const last = lastVisitedFor(grant);
                return (
                  <div key={grant} className="flex flex-col items-center w-full">
                    <button
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
                      {/* TP1-011 — Sacred-Gold sigil prefix */}
                      <span className="text-noesis-gold">◆</span> {grant.toUpperCase()}
                    </button>
                    {/* TP1-014 — last-visited timestamp */}
                    {last !== null && (
                      <span className="font-mono text-[10px] text-noesis-parchment/40 mt-1">
                        · {formatRelative(last)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <button className={`${BUTTON_CLASSES} w-full md:w-auto`} onClick={handleEnterDashboard}>
              [ DASHBOARD ]
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
