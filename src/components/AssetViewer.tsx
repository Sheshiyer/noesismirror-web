import { useCallback, useEffect, useRef, useState } from 'react';
import type { Beacon } from '../types/world';
import { renderers } from './assetRenderers/registry';
import { useGameStore } from '../core/store/gameStore';
import { useVisitedStore } from '../core/store/visitedStore';

export interface AssetViewerProps {
  beacon: Beacon;
  onClose: () => void;
  reducedMotion: boolean;
}

const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

// Sacred-Gold constellation grid: hair-thin lines at low opacity, 60×60 cell grid.
const CONSTELLATION_BG: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(0deg, rgba(212,175,55,0.25) 0, rgba(212,175,55,0.25) 0.5px, transparent 0.5px, transparent 60px), repeating-linear-gradient(90deg, rgba(212,175,55,0.25) 0, rgba(212,175,55,0.25) 0.5px, transparent 0.5px, transparent 60px)',
};

// TP3-003 / TP4 — derive personId from beacon.assetUrl which has shape
// `/api/assets/<personId>/...`. This is a temporary measure until WorldPage
// threads personId directly into AssetViewer; WorldPage is owned by a
// different wave agent and outside this file's scope.
function derivePersonIdFromAssetUrl(assetUrl: string): string | null {
  const parts = assetUrl.split('/');
  // parts[0] = '' (leading slash), parts[1] = 'api', parts[2] = 'assets', parts[3] = personId
  return parts[3] ?? null;
}

// TP4-024 — format a media-element duration (seconds) as mm:ss; null if unknown.
function formatDuration(seconds: number | null): string | null {
  if (seconds == null || !isFinite(seconds) || seconds <= 0) return null;
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AssetViewer({ beacon, onClose, reducedMotion }: AssetViewerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const Renderer = renderers[beacon.type];
  const setModalOpen = useGameStore((state) => state.setModalOpen);
  // Contract: useVisitedStore() returns the full store object.
  const { markVisited } = useVisitedStore();

  // TP4-001 — iris reveal: backdrop fade-in then panel scale/opacity.
  // We start at "entering" then flip to "entered" on next frame so the
  // CSS transition runs from the initial state to the resting state.
  const [phase, setPhase] = useState<'entering' | 'entered' | 'exiting'>(
    reducedMotion ? 'entered' : 'entering',
  );

  // TP4-003 — playback progress (0..1) for a media element inside the panel.
  const [progress, setProgress] = useState<number>(0);
  const [hasMedia, setHasMedia] = useState<boolean>(false);

  // TP4-024 — file-metadata for footer (duration for media, etc).
  const [mediaDuration, setMediaDuration] = useState<number | null>(null);

  // TP4-025 — share button toast.
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    setModalOpen(true);
    return () => {
      setModalOpen(false);
    };
  }, [setModalOpen]);

  // TP4-001 — kick the entering->entered transition on next frame.
  useEffect(() => {
    if (reducedMotion) return;
    const r = requestAnimationFrame(() => setPhase('entered'));
    return () => cancelAnimationFrame(r);
  }, [reducedMotion]);

  // TP3-003 / TP4 — mark the beacon as visited once a viewer mounts for it.
  // markVisited is intentionally excluded from deps: WD-4's store may not
  // memoize function identity, and the mark is keyed on the (personId, beaconId)
  // tuple which is what we actually care about for re-runs.
  useEffect(() => {
    if (!Renderer) return;
    const personId = derivePersonIdFromAssetUrl(beacon.assetUrl);
    if (personId) {
      markVisited(personId, beacon.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Renderer, beacon.assetUrl, beacon.id]);

  // TP4-003 — drive a top progress bar from any video/audio inside the panel.
  // Re-checks on every render; uses requestAnimationFrame for smoothness.
  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const media =
        panelRef.current?.querySelector<HTMLMediaElement>('video, audio') ?? null;
      if (media) {
        if (!hasMedia) setHasMedia(true);
        const d = isFinite(media.duration) && media.duration > 0 ? media.duration : 0;
        if (d > 0) {
          setProgress(Math.min(1, Math.max(0, media.currentTime / d)));
          if (mediaDuration !== d) setMediaDuration(d);
        }
      } else if (hasMedia) {
        setHasMedia(false);
        setProgress(0);
        setMediaDuration(null);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [hasMedia, mediaDuration]);

  // TP4-002 — close path: set exiting state, wait 200ms, then call onClose.
  // reducedMotion skips the animation and closes synchronously.
  const closeRequestedRef = useRef(false);
  const handleClose = useCallback(() => {
    if (closeRequestedRef.current) return;
    closeRequestedRef.current = true;
    if (reducedMotion) {
      onClose();
      return;
    }
    setPhase('exiting');
    window.setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose, reducedMotion]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
        return;
      }

      // TP4-008 — media keyboard shortcuts. Look for the first <video> or
      // <audio> inside the panel and dispatch the action. We intentionally
      // run BEFORE the focus-trap branch so shortcuts work while focus
      // is anywhere inside the modal.
      const media =
        panelRef.current?.querySelector<HTMLMediaElement>('video, audio') ?? null;
      if (media) {
        if (event.key === ' ' || event.code === 'Space') {
          event.preventDefault();
          if (media.paused) {
            void media.play().catch(() => {});
          } else {
            media.pause();
          }
          return;
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          media.currentTime = Math.max(0, media.currentTime - 10);
          return;
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          const duration = isFinite(media.duration) ? media.duration : Infinity;
          media.currentTime = Math.min(duration, media.currentTime + 10);
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          media.volume = Math.min(1, media.volume + 0.1);
          return;
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          media.volume = Math.max(0, media.volume - 0.1);
          return;
        }
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusableElements = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
      );
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    },
    [handleClose],
  );

  // TP4-025 — share: copy a deep-link to clipboard.
  const handleShare = useCallback(() => {
    const personId = derivePersonIdFromAssetUrl(beacon.assetUrl);
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}${personId ? `/p/${personId}` : ''}?beacon=${beacon.id}`
        : '';
    if (!url) return;
    try {
      void navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      });
    } catch {
      // navigator.clipboard may be unavailable in some browsers; fail silently.
    }
  }, [beacon.assetUrl, beacon.id]);

  // TP4-026 — download URL (uses buildAssetUrl via assetRenderers in body).
  // We just pass the raw assetUrl to <a download>; the browser will follow.
  const downloadHref = beacon.assetUrl;

  // TP4-024 — choose a metadata footer string. Renderer reports word count
  // by writing data-noesis-words on the body container; we read it lazily.
  const footerText = (() => {
    const parts: string[] = [];
    if (hasMedia) {
      const fmt = formatDuration(mediaDuration);
      if (fmt) parts.push(`duration ${fmt}`);
    } else {
      const wordsAttr = bodyRef.current?.querySelector('[data-noesis-words]') as
        | HTMLElement
        | null;
      const words = wordsAttr?.getAttribute('data-noesis-words');
      if (words) {
        const n = Number(words);
        if (n > 0) {
          parts.push(`${n.toLocaleString()} words`);
          parts.push(`${Math.ceil(n / 220)} min read`);
        }
      }
    }
    return parts.join('  ·  ');
  })();

  // TP4-001 — backdrop classes per phase.
  const backdropOpacity = reducedMotion
    ? 'opacity-100'
    : phase === 'entered'
    ? 'opacity-100'
    : 'opacity-0';
  const backdropMotion = reducedMotion
    ? ''
    : 'transition-opacity duration-200 ease-out';

  // TP4-001 — panel classes per phase: scale 0.98 -> 1, opacity 0 -> 1, 400ms.
  const panelTransform =
    reducedMotion || phase === 'entered'
      ? 'opacity-100 scale-100'
      : phase === 'exiting'
      ? 'opacity-0 scale-[0.98]'
      : 'opacity-0 scale-[0.98]';
  const panelMotion = reducedMotion
    ? ''
    : phase === 'exiting'
    ? 'transition-all duration-200 ease-in'
    : 'transition-all duration-[400ms] ease-out';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-noesis-void/80 backdrop-blur-sm ${backdropOpacity} ${backdropMotion}`}
      onKeyDown={handleKeyDown}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className={`relative bg-noesis-surface border border-noesis-gold/40 max-w-5xl w-[90vw] max-h-[88vh] flex flex-col py-8 px-10 origin-center ${panelTransform} ${panelMotion}`}
        role={Renderer ? 'dialog' : 'alertdialog'}
        aria-modal="true"
        aria-label={beacon.label}
        aria-describedby="viewer-summary"
      >
        {/* TP4-003 — playback progress bar (only when a media element is present) */}
        {hasMedia && (
          <div
            aria-hidden="true"
            className="absolute top-0 left-0 right-0 h-px bg-noesis-gold/15 overflow-hidden"
          >
            <div
              className="h-full bg-noesis-gold"
              style={{ width: `${(progress * 100).toFixed(2)}%` }}
            />
          </div>
        )}

        {/* Sacred-Gold constellation grid backdrop */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={CONSTELLATION_BG}
        />

        {/* Header row */}
        <div className="relative flex items-start justify-between shrink-0 gap-6">
          <div className="min-w-0">
            <h2 className="font-display text-2xl text-noesis-gold tracking-wide truncate">
              {beacon.label}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <p className="font-mono text-xs text-noesis-parchment/50 uppercase tracking-widest">
                {beacon.type}
              </p>
              {/* TP4-022 — scene-audio dimmed indicator (always visible while open) */}
              <span className="font-mono text-xs text-noesis-parchment/40 uppercase tracking-widest">
                · scene audio dimmed
              </span>
            </div>
            {beacon.summary && (
              <p
                id="viewer-summary"
                className="font-mono text-xs text-noesis-parchment/40 uppercase tracking-widest mt-1 sr-only"
              >
                {beacon.summary}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* TP4-025 — share */}
            <button
              type="button"
              onClick={handleShare}
              className="font-display text-noesis-gold text-xl leading-none hover:text-noesis-emerald focus:outline-none focus:ring-1 focus:ring-noesis-gold/60 px-2"
              aria-label="Share link"
              title="Copy link"
            >
              {'⤴'}
            </button>
            {/* TP4-026 — download */}
            <a
              href={downloadHref}
              download={beacon.label}
              className="font-display text-noesis-gold text-xl leading-none hover:text-noesis-emerald focus:outline-none focus:ring-1 focus:ring-noesis-gold/60 px-2"
              aria-label="Download asset"
              title="Download"
            >
              {'↓'}
            </a>
            <span className="font-mono text-xs text-noesis-parchment/50 uppercase tracking-widest hidden sm:inline">
              [ ESC | G ]
            </span>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={handleClose}
              className="font-display text-noesis-gold text-2xl leading-none hover:text-noesis-emerald focus:outline-none focus:ring-1 focus:ring-noesis-gold/60 px-2"
              aria-label="Close"
            >
              {'×'}
            </button>
            {/* TP4-025 — copied toast */}
            {copied && (
              <span
                role="status"
                aria-live="polite"
                className="font-mono text-xs text-noesis-emerald uppercase tracking-widest"
              >
                copied
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div ref={bodyRef} className="flex-1 overflow-auto min-h-0 mt-6 relative">
          {Renderer ? (
            <Renderer beacon={beacon} />
          ) : (
            <p className="font-mono text-noesis-parchment/60">
              No viewer available for asset type &ldquo;{beacon.type}&rdquo;.
            </p>
          )}
        </div>

        {/* TP4-024 — metadata footer */}
        {footerText && (
          <div className="relative shrink-0 mt-4 pt-3 border-t border-noesis-gold/15">
            <p className="font-mono text-xs text-noesis-parchment/40 uppercase tracking-widest">
              {footerText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
