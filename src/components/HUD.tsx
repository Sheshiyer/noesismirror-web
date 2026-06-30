import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Beacon } from '../types/world';
import { useGameStore } from '../core/store/gameStore';
import { useAudioStore } from '../core/store/audioStore';
import { useVisitedStore } from '../core/store/visitedStore';
import { signOut } from './TokenHandler';

export interface HUDProps {
  personId: string;
  personName?: string;
  beacons: Beacon[];
}

/**
 * Decode the `email` claim from a JWT payload. Returns null on any parse
 * failure rather than throwing — sign-out UI degrades gracefully.
 * Mirrors the helper in Home.tsx so the HUD can show the active session.
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

const CHIP_CLASSES =
  'border border-noesis-gold/40 bg-noesis-void/60 px-2 py-1 font-mono uppercase tracking-[0.25em] text-[10px] text-noesis-parchment/80';

const KEYBOARD_KEYS = ['WASD', 'SHIFT', 'G', 'ESC'] as const;

interface HelpRow {
  key: string;
  label: string;
}

const HELP_ROWS: HelpRow[] = [
  { key: 'W A S D', label: 'Walk through the field' },
  { key: 'SHIFT', label: 'Run' },
  { key: 'G', label: 'Enter the active mirror' },
  { key: 'ESC', label: 'Close panel · resume' },
  { key: 'M', label: 'Mute · unmute' },
  { key: 'P', label: 'Pause · resume' },
  { key: 'H', label: 'Toggle this help' },
];

const HIDE_AFTER_MS = 5000;
const FIELD_BANNER_MS = 4000;

export default function HUD({ personId, personName, beacons }: HUDProps) {
  const navigate = useNavigate();
  const hudVisible = useGameStore((s) => s.hudVisible);
  const setHudVisible = useGameStore((s) => s.setHudVisible);
  const muted = useAudioStore((s) => s.muted);
  const toggleMute = useAudioStore((s) => s.toggleMute);
  const visitedSet = useVisitedStore((s) => s.getVisited(personId));

  const [paused, setPaused] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);

  const hideTimerRef = useRef<number | null>(null);
  const bannerTimerRef = useRef<number | null>(null);

  const token =
    typeof window !== 'undefined' ? window.localStorage.getItem('noesis_token') : null;
  const userEmail = useMemo(() => decodeEmailFromToken(token), [token]);

  // TP8-019 — auto-hide tracking. Reveal HUD on any input, then start a 5s
  // timer to hide it again. Pause/help overlays force HUD visible.
  const armHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      setHudVisible(false);
    }, HIDE_AFTER_MS);
  }, [setHudVisible]);

  const revealHud = useCallback(() => {
    setHudVisible(true);
    armHideTimer();
  }, [armHideTimer, setHudVisible]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onMove = () => revealHud();
    const onKey = () => revealHud();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('keydown', onKey);
    // Start with HUD visible + timer armed.
    revealHud();
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('keydown', onKey);
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, [revealHud]);

  // TP8-011 / TP8-012 / TP8-013 — global keybindings owned by the HUD.
  // ESC closes pause + help; pressing the same opener key again toggles off.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKey = (event: KeyboardEvent) => {
      // Ignore key events when the user is typing into an input/textarea.
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 'p') {
        event.preventDefault();
        setPaused((p) => !p);
      } else if (key === 'h') {
        event.preventDefault();
        setHelpOpen((h) => !h);
      } else if (key === 'm') {
        event.preventDefault();
        toggleMute();
      } else if (key === 'escape') {
        if (paused) {
          event.preventDefault();
          setPaused(false);
        }
        if (helpOpen) {
          event.preventDefault();
          setHelpOpen(false);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paused, helpOpen, toggleMute]);

  // TP8-028 — field-name banner fades after 4s. State is local to this mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    bannerTimerRef.current = window.setTimeout(() => {
      setBannerVisible(false);
    }, FIELD_BANNER_MS);
    return () => {
      if (bannerTimerRef.current !== null) {
        window.clearTimeout(bannerTimerRef.current);
      }
    };
  }, []);

  const handleSignOut = useCallback(() => {
    try {
      signOut(navigate);
    } catch {
      // Fallback path in case signOut signature changes.
      window.localStorage.removeItem('noesis_token');
      navigate('/');
    }
  }, [navigate]);

  // When an overlay is up we force-show the HUD so the user can read it.
  const effectiveVisible = hudVisible || paused || helpOpen;

  const visitedCount = visitedSet.size;
  const beaconTotal = beacons.length;
  const fieldLabel = (personName ?? personId).toUpperCase();

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-10 transition-opacity duration-300 ${
        effectiveVisible ? 'opacity-100' : 'opacity-30'
      }`}
      aria-hidden={!effectiveVisible}
    >
      {/* TP8-001 — Brand sigil top-left, links home */}
      <div className="pointer-events-auto absolute top-4 left-6">
        <Link
          to="/"
          aria-label="Return to home"
          className="block opacity-30 transition-opacity duration-200 hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-none"
        >
          <img
            src="/brand-logo.svg"
            alt="Tryambakam Noesis"
            className="h-8 w-8"
          />
        </Link>
      </div>

      {/* TP8-002 — Session chip top-right (email + sign-out) */}
      <header className="pointer-events-auto absolute top-4 right-6 flex items-center gap-4 font-mono text-xs text-noesis-parchment/60">
        {userEmail && <span>{userEmail}</span>}
        <button
          type="button"
          onClick={handleSignOut}
          className="transition-colors duration-200 hover:text-noesis-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-noesis-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-noesis-void"
        >
          [ sign out ]
        </button>
        {muted && (
          <span
            aria-label="Audio muted"
            title="Audio muted (press M to unmute)"
            className="font-mono text-noesis-gold/80 line-through"
          >
            ♪
          </span>
        )}
      </header>

      {/* TP8-028 — Faint field-name banner top-center */}
      {bannerVisible && (
        <div
          className="pointer-events-none absolute top-6 left-1/2 -translate-x-1/2 font-display text-2xl tracking-[0.5em] text-noesis-parchment/30 transition-opacity duration-700"
          aria-hidden="true"
        >
          {fieldLabel}'S FIELD
        </div>
      )}

      {/* TP8-003 — Keyboard chip strip bottom-center */}
      <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {KEYBOARD_KEYS.map((k) => (
          <span key={k} className={CHIP_CLASSES}>
            {k}
          </span>
        ))}
      </div>

      {/* TP8-004 — Progress chip bottom-right */}
      <div className="pointer-events-none absolute bottom-6 right-6 font-mono uppercase tracking-[0.25em] text-[10px] text-noesis-parchment/70">
        {visitedCount} of {beaconTotal} mirrors observed
      </div>

      {/* TP8-011 — Pause overlay */}
      {paused && (
        <div
          className="pointer-events-auto fixed inset-0 z-30 grid place-items-center bg-noesis-void/80"
          role="dialog"
          aria-label="Paused"
        >
          <div className="flex flex-col items-center gap-4">
            <h2 className="font-display text-5xl tracking-[0.4em] text-noesis-gold">
              PAUSED
            </h2>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-noesis-parchment/60">
              press P or ESC to resume
            </p>
          </div>
        </div>
      )}

      {/* TP8-012 — Keyboard help modal */}
      {helpOpen && (
        <div
          className="pointer-events-auto fixed inset-0 z-30 grid place-items-center bg-noesis-void/80"
          role="dialog"
          aria-label="Keyboard help"
        >
          <div className="w-[28rem] max-w-[90vw] border border-noesis-gold/40 bg-noesis-void/90 p-8">
            <h2 className="mb-6 font-display text-2xl tracking-[0.3em] text-noesis-gold">
              CONTROLS
            </h2>
            <ul className="space-y-3">
              {HELP_ROWS.map((row) => (
                <li
                  key={row.key}
                  className="flex items-center justify-between gap-4 font-mono text-xs uppercase tracking-[0.2em] text-noesis-parchment/80"
                >
                  <span className="border border-noesis-gold/40 bg-noesis-void/60 px-2 py-1 text-noesis-gold">
                    {row.key}
                  </span>
                  <span className="text-right text-noesis-parchment/70">
                    {row.label}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-noesis-parchment/40">
              press H or ESC to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
