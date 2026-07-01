import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import ThreeSixtyIcon from '@mui/icons-material/ThreeSixty';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { Link, useNavigate } from 'react-router-dom';
import type { Beacon } from '../types/world';
import { CameraMode, useGameStore, type Quality } from '../core/store/gameStore';
import { useAudioStore } from '../core/store/audioStore';
import { useVisitedStore } from '../core/store/visitedStore';
import { API_URL } from '../config';
import { signOut } from '../auth/signOut';
import Settings from './Settings';
import {
  FieldSurface,
  HudIconButton,
  HudKeyChip,
  HudStatusDot,
  ObservedProgress,
} from './hud/FieldHudChrome';

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

/**
 * Fix F — Brand-aligned modal frame per bento module 6.
 *
 * Outer 1px Sacred Gold hairline, Deep Surface body, Panchang header bar
 * separated by a hairline Muted Silver divider, geometric corner brackets at
 * each corner. Reusable for pause / help / settings / completion modals.
 */
function NoesisModalFrame({
  title,
  children,
  footnote,
}: {
  title: string;
  children: ReactNode;
  footnote?: string;
}) {
  return (
    <div className="relative w-[28rem] max-w-[90vw] border border-noesis-gold/40 bg-[#0E1428]">
      {/* Corner brackets — sacred geometry marks at each corner */}
      <span aria-hidden className="pointer-events-none absolute -top-px -left-px h-3 w-3 border-t border-l border-noesis-gold" />
      <span aria-hidden className="pointer-events-none absolute -top-px -right-px h-3 w-3 border-t border-r border-noesis-gold" />
      <span aria-hidden className="pointer-events-none absolute -bottom-px -left-px h-3 w-3 border-b border-l border-noesis-gold" />
      <span aria-hidden className="pointer-events-none absolute -bottom-px -right-px h-3 w-3 border-b border-r border-noesis-gold" />

      {/* Header bar */}
      <div className="border-b border-noesis-silver/30 px-8 py-4">
        <h2 className="font-display text-xl tracking-[0.4em] text-noesis-gold">
          {title}
        </h2>
      </div>

      {/* Body */}
      <div className="px-8 py-6">{children}</div>

      {/* Footer */}
      {footnote && (
        <div className="border-t border-noesis-silver/30 px-8 py-3 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-noesis-parchment/40">
          {footnote}
        </div>
      )}
    </div>
  );
}

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
  { key: 'Q', label: 'Cycle quality' },
  { key: 'C', label: 'Cycle camera mode' },
  { key: 'B', label: 'Toggle mini-map' },
  { key: 'F', label: 'Toggle FPS' },
  { key: 'V', label: 'Visited beacons' },
  { key: 'S', label: 'Settings' },
];

const HIDE_AFTER_MS = 5000;
const FIELD_BANNER_MS = 4000;
const TOAST_MS = 1000;
const HEALTH_POLL_MS = 30_000;
const SLOW_HEALTH_MS = 1000;

// TP8-005 — mini-map sampling: assumes character is at origin in world
// space; beacons map by their (x, z) into a square viewport. The half-extent
// determines how far you can "see" — large enough to fit a typical layout.
const MAP_PIXELS = 120;
const MAP_HALF_EXTENT = 60;

type HealthStatus = 'ok' | 'slow' | 'fail' | 'unknown';

const QUALITY_ORDER: Quality[] = ['low', 'medium', 'high'];
const nextQuality = (q: Quality): Quality =>
  QUALITY_ORDER[(QUALITY_ORDER.indexOf(q) + 1) % QUALITY_ORDER.length];

// Cycle null -> false -> true -> null so the toast reads as a deliberate walk
// through the three states.
function nextReducedMotion(cur: boolean | null): boolean | null {
  if (cur === null) return false;
  if (cur === false) return true;
  return null;
}

function reducedMotionLabel(v: boolean | null): string {
  if (v === null) return 'AUTO';
  return v ? 'ON' : 'OFF';
}

export default function HUD({ personId, personName, beacons }: HUDProps) {
  const navigate = useNavigate();

  // ===== Store wiring =====
  const hudVisible = useGameStore((s) => s.hudVisible);
  const setHudVisible = useGameStore((s) => s.setHudVisible);
  const characterRef = useGameStore((s) => s.characterRef);
  // Fix A — gate the persistent chip strip on loading-complete so LoadingScreen
  // doesn't show two pools of controls simultaneously.
  const isGameStarted = useGameStore((s) => s.isGameStarted);

  const quality = useGameStore((s) => s.quality);
  const setQuality = useGameStore((s) => s.setQuality);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const toggleCameraMode = useGameStore((s) => s.toggleCameraMode);

  const reducedMotionPref = useGameStore((s) => s.reducedMotionPref);
  const setReducedMotionPref = useGameStore((s) => s.setReducedMotionPref);

  const showFps = useGameStore((s) => s.showFps);
  const toggleFps = useGameStore((s) => s.toggleFps);

  const miniMapOpen = useGameStore((s) => s.miniMapOpen);
  const toggleMiniMap = useGameStore((s) => s.toggleMiniMap);

  const settingsOpen = useGameStore((s) => s.settingsOpen);
  const setSettingsOpen = useGameStore((s) => s.setSettingsOpen);

  const muted = useAudioStore((s) => s.muted);
  const audioContextStarted = useAudioStore((s) => s.audioContextStarted);
  const toggleMute = useAudioStore((s) => s.toggleMute);

  const visitedSet = useVisitedStore((s) => s.getVisited(personId));

  // ===== Local UI state =====
  const [paused, setPaused] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [visitedListOpen, setVisitedListOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [health, setHealth] = useState<HealthStatus>('unknown');
  const [compassYaw, setCompassYaw] = useState(0);

  const hideTimerRef = useRef<number | null>(null);
  const bannerTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const visitTsRef = useRef<Map<string, number>>(new Map());

  const token =
    typeof window !== 'undefined' ? window.localStorage.getItem('noesis_token') : null;
  const userEmail = useMemo(() => decodeEmailFromToken(token), [token]);

  // Stamp newly-visited beacon ids so the V-panel can show a relative time.
  useEffect(() => {
    visitedSet.forEach((id) => {
      if (!visitTsRef.current.has(id)) {
        visitTsRef.current.set(id, Date.now());
      }
    });
  }, [visitedSet]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, TOAST_MS);
  }, []);

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
    revealHud();
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('keydown', onKey);
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, [revealHud]);

  // TP8-011/012/013 + TP8-005..010, TP8-014, TP8-016 — global keybindings.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKey = (event: KeyboardEvent) => {
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

      // Shift+R cycles reduced-motion preference. Check before single 'r' or
      // any plain-key paths to avoid swallowing.
      if (event.shiftKey && key === 'r') {
        event.preventDefault();
        const next = nextReducedMotion(reducedMotionPref);
        setReducedMotionPref(next);
        showToast(`REDUCED MOTION: ${reducedMotionLabel(next)}`);
        return;
      }

      if (key === 'p') {
        event.preventDefault();
        setPaused((p) => !p);
      } else if (key === 'h') {
        event.preventDefault();
        setHelpOpen((h) => !h);
      } else if (key === 'm') {
        event.preventDefault();
        toggleMute();
      } else if (key === 'b') {
        event.preventDefault();
        toggleMiniMap();
      } else if (key === 'f') {
        event.preventDefault();
        toggleFps();
      } else if (key === 'q') {
        event.preventDefault();
        const next = nextQuality(quality);
        setQuality(next);
        showToast(`QUALITY: ${next.toUpperCase()}`);
      } else if (key === 'c') {
        event.preventDefault();
        toggleCameraMode();
      } else if (key === 's') {
        event.preventDefault();
        setSettingsOpen(!settingsOpen);
      } else if (key === 'v') {
        event.preventDefault();
        setVisitedListOpen((o) => !o);
      } else if (key === 'escape') {
        if (paused) {
          event.preventDefault();
          setPaused(false);
        }
        if (helpOpen) {
          event.preventDefault();
          setHelpOpen(false);
        }
        if (visitedListOpen) {
          event.preventDefault();
          setVisitedListOpen(false);
        }
        // Settings handles its own ESC; don't double-handle.
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    paused,
    helpOpen,
    visitedListOpen,
    settingsOpen,
    quality,
    reducedMotionPref,
    setQuality,
    setReducedMotionPref,
    toggleMute,
    toggleMiniMap,
    toggleFps,
    toggleCameraMode,
    setSettingsOpen,
    showToast,
  ]);

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

  // TP8-006 — compass yaw poll. Reads characterRef.rotation.y once per
  // animation frame. Cheap enough to be fine even when the compass would be
  // hidden — kept always-on so the value is fresh when it appears.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let raf = 0;
    const tick = () => {
      const ref = characterRef?.current;
      if (ref) {
        setCompassYaw(ref.rotation.y);
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [characterRef]);

  // TP8-008 — FPS counter. Only measures when `showFps` is true to keep the
  // off-state truly zero-cost.
  useEffect(() => {
    if (!showFps || typeof window === 'undefined') return;
    let raf = 0;
    let frames = 0;
    let last = performance.now();
    const tick = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 500) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [showFps]);

  // TP8-025 — connection status poll. Treats abort/non-200 as fail; latency
  // over SLOW_HEALTH_MS as slow.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    const probe = async () => {
      const started = performance.now();
      try {
        const ctrl = new AbortController();
        const timeout = window.setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch(`${API_URL}/api/health`, { signal: ctrl.signal });
        window.clearTimeout(timeout);
        const elapsed = performance.now() - started;
        if (cancelled) return;
        if (!res.ok) setHealth('fail');
        else if (elapsed > SLOW_HEALTH_MS) setHealth('slow');
        else setHealth('ok');
      } catch {
        if (!cancelled) setHealth('fail');
      }
    };
    void probe();
    const id = window.setInterval(probe, HEALTH_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const handleSignOut = useCallback(() => {
    try {
      signOut(navigate);
    } catch {
      window.localStorage.removeItem('noesis_token');
      navigate('/');
    }
  }, [navigate]);

  const effectiveVisible = hudVisible || paused || helpOpen;

  const visitedCount = visitedSet.size;
  const beaconTotal = beacons.length;
  const fieldLabel = (personName ?? personId).toUpperCase();
  const cameraConfig: Record<CameraMode, { label: string; icon: ReactNode }> = {
    [CameraMode.Follow]: {
      label: 'Third person camera',
      icon: <PersonIcon fontSize="small" />,
    },
    [CameraMode.FPV]: {
      label: 'First person camera',
      icon: <VisibilityIcon fontSize="small" />,
    },
    [CameraMode.Detached]: {
      label: 'Detached camera',
      icon: <ThreeSixtyIcon fontSize="small" />,
    },
  };
  const qualityLabel =
    quality === 'high'
      ? 'High quality'
      : quality === 'medium'
        ? 'Medium quality'
        : 'Low quality';

  // ===== Mini-map dots =====
  const mapDots = useMemo(() => {
    const half = MAP_PIXELS / 2;
    return beacons.map((b) => {
      const nx = Math.max(-1, Math.min(1, b.position.x / MAP_HALF_EXTENT));
      const nz = Math.max(-1, Math.min(1, b.position.z / MAP_HALF_EXTENT));
      return {
        id: b.id,
        cx: half + nx * half,
        cy: half + nz * half,
        visited: visitedSet.has(b.id),
      };
    });
  }, [beacons, visitedSet]);

  const audioActive = audioContextStarted && !muted;
  const healthLabel: Record<HealthStatus, string> = {
    ok: 'Connection healthy',
    slow: 'Connection slow',
    fail: 'Connection failed',
    unknown: 'Connection unknown',
  };

  // Sort visited beacons in the V panel by visit timestamp (latest first).
  const visitedRows = useMemo(() => {
    return beacons
      .filter((b) => visitedSet.has(b.id))
      .map((b) => ({ beacon: b, ts: visitTsRef.current.get(b.id) ?? 0 }))
      .sort((a, b) => b.ts - a.ts);
  }, [beacons, visitedSet]);

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

      <FieldSurface
        ariaLabel="Session controls"
        className="pointer-events-auto absolute top-4 right-20 flex max-w-[min(34rem,calc(100vw-7rem))] items-center gap-3 px-4 py-2"
      >
        {userEmail && (
          <span className="truncate font-mono text-[11px] text-noesis-parchment/70">
            {userEmail}
          </span>
        )}
        <button
          type="button"
          onClick={handleSignOut}
          className="shrink-0 font-mono text-[10px] uppercase tracking-[0.22em] text-noesis-gold transition-colors hover:text-noesis-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-noesis-gold/60"
        >
          Sign out
        </button>
        {muted && (
          <span className="font-mono text-[10px] text-noesis-gold line-through">
            audio
          </span>
        )}
        <HudStatusDot
          label={audioActive ? 'Scene audio active' : 'Scene audio inactive'}
          tone={audioActive ? 'emerald' : 'silver'}
          pulse={audioActive}
        />
      </FieldSurface>

      <nav
        aria-label="Field actions"
        className="pointer-events-auto absolute top-4 right-4 flex flex-col gap-2"
      >
        <HudIconButton
          label="Cycle quality"
          title={`Cycle quality: ${qualityLabel} (Q)`}
          onClick={() => {
            const next = nextQuality(quality);
            setQuality(next);
            showToast(`QUALITY: ${next.toUpperCase()}`);
          }}
        >
          <AutoAwesomeIcon fontSize="small" />
        </HudIconButton>
        <HudIconButton
          label={cameraConfig[cameraMode].label}
          title="Cycle camera (C)"
          onClick={toggleCameraMode}
        >
          {cameraConfig[cameraMode].icon}
        </HudIconButton>
        <HudIconButton
          label={muted ? 'Unmute scene audio' : 'Mute scene audio'}
          title="Toggle scene audio (M)"
          pressed={!muted}
          onClick={toggleMute}
        >
          {muted ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
        </HudIconButton>
        <HudIconButton
          label="Open settings"
          title="Settings (S)"
          pressed={settingsOpen}
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          <SettingsIcon fontSize="small" />
        </HudIconButton>
      </nav>

      {/* TP8-006 — Compass top-center (small N/E/S/W rose) */}
      <FieldSurface
        role="img"
        ariaLabel="Compass"
        className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 flex items-center justify-center px-2 py-2"
      >
        <svg
          width={60}
          height={60}
          viewBox="0 0 60 60"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <g transform={`rotate(${-(compassYaw * 180) / Math.PI} 30 30)`}>
            <circle
              cx={30}
              cy={30}
              r={24}
              fill="none"
              stroke="#C5A017"
              strokeOpacity={0.3}
              strokeWidth={1}
            />
            <text
              x={30}
              y={12}
              fill="#C5A017"
              fontFamily="SF Mono, ui-monospace, monospace"
              fontSize={9}
              textAnchor="middle"
            >
              N
            </text>
            <text
              x={52}
              y={33}
              fill="#F0EDE3"
              fillOpacity={0.5}
              fontFamily="SF Mono, ui-monospace, monospace"
              fontSize={8}
              textAnchor="middle"
            >
              E
            </text>
            <text
              x={30}
              y={54}
              fill="#F0EDE3"
              fillOpacity={0.5}
              fontFamily="SF Mono, ui-monospace, monospace"
              fontSize={8}
              textAnchor="middle"
            >
              S
            </text>
            <text
              x={8}
              y={33}
              fill="#F0EDE3"
              fillOpacity={0.5}
              fontFamily="SF Mono, ui-monospace, monospace"
              fontSize={8}
              textAnchor="middle"
            >
              W
            </text>
          </g>
        </svg>
      </FieldSurface>

      {/* TP8-005 — Mini-map (toggle with B) */}
      {miniMapOpen && (
        <aside
          role="complementary"
          aria-label="Mini map"
          className="pointer-events-none absolute top-32 right-6 border border-noesis-gold/40 bg-noesis-void/60 p-2"
        >
          <svg
            width={MAP_PIXELS}
            height={MAP_PIXELS}
            viewBox={`0 0 ${MAP_PIXELS} ${MAP_PIXELS}`}
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Beacon map"
            role="img"
          >
            <rect
              x={0}
              y={0}
              width={MAP_PIXELS}
              height={MAP_PIXELS}
              fill="none"
              stroke="#C5A017"
              strokeOpacity={0.2}
            />
            {mapDots.map((d) => (
              <circle
                key={d.id}
                cx={d.cx}
                cy={d.cy}
                r={3}
                fill={d.visited ? '#C5A017' : '#10B5A7'}
                opacity={d.visited ? 1 : 0.7}
              />
            ))}
            {/* Character marker at center */}
            <circle
              cx={MAP_PIXELS / 2}
              cy={MAP_PIXELS / 2}
              r={4}
              fill="#F0EDE3"
              stroke="#070B1D"
              strokeWidth={1}
            />
          </svg>
          <div className="mt-1 text-center font-mono text-[8px] uppercase tracking-[0.25em] text-noesis-parchment/40">
            B · map
          </div>
        </aside>
      )}

      {/* Fix B — Field-name banner repositioned to bottom-left (game-style HUD).
          Was top-6 left-1/2 — collided with compass at top-16. */}
      {bannerVisible && (
        <div
          className="pointer-events-none absolute bottom-6 left-6 font-display text-2xl tracking-[0.5em] text-noesis-parchment/30 transition-opacity duration-700"
          aria-hidden="true"
        >
          {fieldLabel}'S FIELD
        </div>
      )}

      {/* Fix A — Keyboard chip strip gated on isGameStarted so it doesn't leak
          through the LoadingScreen overlay. Strip lives bottom-center as before. */}
      {isGameStarted && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {KEYBOARD_KEYS.map((key) => (
            <HudKeyChip key={key}>{key}</HudKeyChip>
          ))}
        </div>
      )}

      {/* Fix B — FPS counter now rides shared HUD chrome away from the right rail. */}
      {showFps && (
        <FieldSurface
          ariaLabel="Performance metrics"
          className="pointer-events-none absolute top-16 left-6 flex items-center gap-2 px-3 py-2"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-noesis-parchment/65">
            FPS
          </span>
          <span className="font-mono text-sm text-noesis-gold">{fps}</span>
        </FieldSurface>
      )}

      {/* TP8-004 — Progress chip bottom-right + connection status dot */}
      <div className="pointer-events-none absolute right-6 bottom-6">
        <ObservedProgress
          observed={visitedCount}
          total={beaconTotal}
          healthLabel={healthLabel[health]}
          healthTone={
            health === 'ok'
              ? 'emerald'
              : health === 'slow'
                ? 'gold'
                : health === 'fail'
                  ? 'red'
                  : 'silver'
          }
        />
      </div>

      {/* TP8-009 / TP8-010 — Quality / reduced-motion toast */}
      {toast && (
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-3xl uppercase tracking-[0.3em] text-noesis-gold motion-safe:animate-pulse"
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}

      {/* Fix F — Pause overlay: sacred-geometry frame per bento module 6.
          Outer 1px Sacred Gold border, Deep Surface body, Panchang header
          bar, hairline Muted Silver divider, geometric corner brackets. */}
      {paused && (
        <div
          className="pointer-events-auto fixed inset-0 z-30 grid place-items-center bg-noesis-void/80"
          role="dialog"
          aria-label="Paused"
        >
          <NoesisModalFrame title="PAUSED" footnote="press P or ESC to resume">
            <p className="font-sans text-sm leading-relaxed text-noesis-parchment/70">
              The field rests when you do. Nothing decays in your absence.
            </p>
          </NoesisModalFrame>
        </div>
      )}

      {/* Fix F — Keyboard help modal: same sacred-geometry frame. */}
      {helpOpen && (
        <div
          className="pointer-events-auto fixed inset-0 z-30 grid place-items-center bg-noesis-void/80"
          role="dialog"
          aria-label="Keyboard help"
        >
          <NoesisModalFrame title="CONTROLS" footnote="press H or ESC to close">
            <ul className="space-y-3">
              {HELP_ROWS.map((row) => (
                <li
                  key={row.key}
                  className="flex items-center justify-between gap-4 font-sans text-xs uppercase tracking-[0.2em] text-noesis-parchment/80"
                >
                  <span className="border border-noesis-gold/40 bg-noesis-void/60 px-2 py-1 font-mono text-noesis-gold">
                    {row.key}
                  </span>
                  <span className="text-right text-noesis-parchment/70">
                    {row.label}
                  </span>
                </li>
              ))}
            </ul>
          </NoesisModalFrame>
        </div>
      )}

      {/* TP8-016 — Visited beacons side panel (V) */}
      {visitedListOpen && (
        <aside
          role="complementary"
          aria-label="Visited beacons"
          className="pointer-events-auto fixed top-1/2 right-6 z-30 w-80 max-w-[80vw] -translate-y-1/2 border border-noesis-gold/40 bg-noesis-void/90 p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl tracking-[0.3em] text-noesis-gold">
              VISITED
            </h2>
            <button
              type="button"
              onClick={() => setVisitedListOpen(false)}
              aria-label="Close visited list"
              className="grid h-8 w-8 place-items-center text-noesis-gold transition-colors hover:text-noesis-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-noesis-gold/60"
            >
              <CloseIcon fontSize="small" />
            </button>
          </div>
          {visitedRows.length === 0 ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-noesis-parchment/50">
              No mirrors observed yet.
            </p>
          ) : (
            <ul className="space-y-2 text-noesis-parchment/80">
              {visitedRows.map(({ beacon, ts }) => (
                <li
                  key={beacon.id}
                  className="flex items-baseline justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.2em]"
                >
                  <span className="truncate text-noesis-gold">{beacon.label}</span>
                  <span className="shrink-0 text-noesis-parchment/40">
                    {ts ? new Date(ts).toLocaleTimeString() : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-noesis-parchment/40">
            press V or ESC to close
          </p>
        </aside>
      )}

      {/* TP8-014 — Settings drawer (S) */}
      <Settings />
    </div>
  );
}
