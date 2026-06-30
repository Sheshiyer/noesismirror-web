import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useGameStore } from '../core/store/gameStore';
import { useAudioStore } from '../core/store/audioStore';
import { useVisitedStore } from '../core/store/visitedStore';
import { useReducedMotion as useReducedMotionMedia } from '../hooks/useReducedMotion';

const ONBOARDED_KEY = 'noesis_onboarded';
const LAST_VISIT_KEY_PREFIX = 'noesis_last_visit_';
const FADE_MS = 1500;
const CHIP_STRIP_MS = 5000;
const HELP_HINT_MS = 3000;
const PULSE_MS = 600;
const SIGIL_TONE_DELAY_MS = 1200; // matches sigil draw duration
const FIRST_VISIT_TOAST_MS = 2000;
const FIRST_WALK_ARROW_MS = 10_000;
const SUGGEST_NEXT_MS = 5000;
const RETURNING_CHIP_MS = 4000;

// TP7-003 — inline SVG sigil whose stroke draws over 1.2s. CSS variables
// drive both the dasharray length and the animation duration so the
// reduced-motion variant can skip the animation cleanly.
const SIGIL_STYLE = `
  @keyframes noesis-sigil-stroke {
    from { stroke-dashoffset: 220; opacity: 0.4; }
    to { stroke-dashoffset: 0; opacity: 1; }
  }
  .noesis-sigil-stroke path,
  .noesis-sigil-stroke line,
  .noesis-sigil-stroke circle {
    stroke-dasharray: 220;
    stroke-dashoffset: 220;
    animation: noesis-sigil-stroke 1.2s ease-out forwards;
  }
  @media (prefers-reduced-motion: reduce) {
    .noesis-sigil-stroke path,
    .noesis-sigil-stroke line,
    .noesis-sigil-stroke circle {
      animation: none;
      stroke-dashoffset: 0;
      opacity: 1;
    }
  }
  @keyframes noesis-overlay-fade {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  .noesis-overlay-fade {
    animation: noesis-overlay-fade 1.5s ease-out forwards;
  }
  @media (prefers-reduced-motion: reduce) {
    .noesis-overlay-fade {
      animation: none;
      opacity: 0;
    }
  }
`;

function CompassSigil() {
  // Eight short radiating lines plus a center disc — a placeholder for the
  // brand mark; matches the Sacred-Gold palette used elsewhere.
  const spokes = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const x1 = 48 + Math.cos(angle) * 16;
    const y1 = 48 + Math.sin(angle) * 16;
    const x2 = 48 + Math.cos(angle) * 40;
    const y2 = 48 + Math.sin(angle) * 40;
    return { x1, y1, x2, y2, key: i };
  });
  return (
    <svg
      viewBox="0 0 96 96"
      width={96}
      height={96}
      xmlns="http://www.w3.org/2000/svg"
      className="noesis-sigil-stroke"
      aria-hidden="true"
    >
      <g stroke="#C5A017" strokeWidth={1.5} fill="none">
        <circle cx={48} cy={48} r={10} />
        {spokes.map((s) => (
          <line key={s.key} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
        ))}
      </g>
    </svg>
  );
}

/**
 * Resolve the effective reduced-motion preference. Order of precedence:
 *   1. Explicit gameStore.reducedMotionPref (true/false)
 *   2. OS-level prefers-reduced-motion query (when pref is null)
 */
function useReducedMotion(): boolean {
  const explicit = useGameStore((s) => s.reducedMotionPref);
  const osPref = useReducedMotionMedia();
  return explicit === null ? osPref : explicit;
}

/**
 * Play a short single tone via the global AudioContext that AmbientAudio
 * activates on first user gesture. We create a fresh OscillatorNode so we
 * don't disturb the ambient drone.
 */
function playTone(freq: number, durationMs: number, gainValue: number) {
  try {
    const AudioCtxCtor: typeof AudioContext =
      (window.AudioContext as typeof AudioContext) ||
      ((window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext as typeof AudioContext);
    if (!AudioCtxCtor) return;
    const ctx = new AudioCtxCtor();
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(gainValue, ctx.currentTime + 0.04);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + durationMs / 1000);
    osc.connect(g).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000 + 0.05);
    osc.onended = () => {
      try {
        void ctx.close();
      } catch {
        /* ignore */
      }
    };
  } catch {
    /* audio unavailable — onboarding stays silent */
  }
}

/** Format a Date as a coarse "X ago" string for the returning-user chip. */
function formatAgo(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

export default function Onboarding() {
  const { personId } = useParams<{ personId: string }>();
  const [searchParams] = useSearchParams();

  const phase = useGameStore((s) => s.onboardingPhase);
  const setPhase = useGameStore((s) => s.setOnboardingPhase);
  const modalOpen = useGameStore((s) => s.modalOpen);
  const reducedMotion = useReducedMotion();

  const masterVolume = useAudioStore((s) => s.masterVolume);
  const muted = useAudioStore((s) => s.muted);

  const visitedSet = useVisitedStore((s) => (personId ? s.getVisited(personId) : new Set<string>()));

  // Local dismissal flags per-tooltip (TP7-021).
  const [chipStripDismissed, setChipStripDismissed] = useState(false);
  const [approachTipDismissed, setApproachTipDismissed] = useState(false);
  const [helpHintDismissed, setHelpHintDismissed] = useState(false);
  const [showFirstWalkArrow, setShowFirstWalkArrow] = useState(false);
  const [firstVisitToast, setFirstVisitToast] = useState<string | null>(null);
  const [suggestNextVisible, setSuggestNextVisible] = useState(false);
  const [returningChip, setReturningChip] = useState<string | null>(null);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);

  // Track whether we've ever seen modalOpen go true (TP7-008 / TP7-009).
  const modalOpenSeenRef = useRef(false);
  // Stamp when first-open hint was shown so it can auto-clear.
  const firstOpenAtRef = useRef<number | null>(null);
  // TP7-013/014: track previous visited count so we can detect 0→1 and N→10.
  const prevVisitedCountRef = useRef(visitedSet.size);
  // TP7-005: ensure sigil tone fires exactly once per arrival.
  const sigilTonePlayedRef = useRef(false);
  // TP7-016: ensure completion chord + modal fire exactly once.
  const completionFiredRef = useRef(false);

  const persistComplete = useCallback(() => {
    try {
      window.localStorage.setItem(ONBOARDED_KEY, 'true');
    } catch {
      /* no-op — storage may be unavailable */
    }
  }, []);

  // TP7-017: stamp last-visit on every world mount, and capture the previous
  // value so we can decide whether to show the "WELCOME BACK" chip.
  const lastVisitKey = personId ? `${LAST_VISIT_KEY_PREFIX}${personId}` : null;
  useEffect(() => {
    if (!lastVisitKey) return;
    try {
      const prior = window.localStorage.getItem(lastVisitKey);
      if (
        prior &&
        phase === 'completion' &&
        !returningChip
      ) {
        const priorMs = Number(prior);
        if (Number.isFinite(priorMs) && priorMs > 0) {
          const ago = Date.now() - priorMs;
          setReturningChip(`WELCOME BACK · last visit ${formatAgo(ago)}`);
          window.setTimeout(() => setReturningChip(null), RETURNING_CHIP_MS);
        }
      }
      window.localStorage.setItem(lastVisitKey, String(Date.now()));
    } catch {
      /* storage may be unavailable */
    }
    // Intentionally run once per mount for this personId — phase changes
    // shouldn't re-trigger the chip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastVisitKey]);

  // TP7-020 — `?onboard=1` forces a re-onboard. Runs once on mount.
  useEffect(() => {
    if (searchParams.get('onboard') === '1') {
      try {
        window.localStorage.removeItem(ONBOARDED_KEY);
      } catch {
        /* ignore */
      }
      setPhase('arriving');
      sigilTonePlayedRef.current = false;
      completionFiredRef.current = false;
      setCompletionModalOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSkip = useCallback(() => {
    setPhase('completion');
    persistComplete();
  }, [persistComplete, setPhase]);

  // TP7-005 — single tonal pulse at the end of the sigil draw. Coherence-
  // Emerald frequency: G4 (392Hz), 600ms envelope, ~0.05 effective gain.
  useEffect(() => {
    if (phase !== 'arriving') return;
    if (sigilTonePlayedRef.current) return;
    if (reducedMotion) return; // no tone for reduced-motion users
    const id = window.setTimeout(() => {
      sigilTonePlayedRef.current = true;
      const gain = 0.05 * masterVolume * (muted ? 0 : 1);
      if (gain > 0) playTone(392, PULSE_MS, gain);
    }, SIGIL_TONE_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [phase, reducedMotion, masterVolume, muted]);

  // TP7-002 — drive the arrival fade. After 1.5s advance to 'walked' and
  // persist the completion flag (the fade itself is one-shot, but we
  // commit early so a refresh during the chip strip skips arrival).
  useEffect(() => {
    if (phase !== 'arriving') return;
    const id = window.setTimeout(() => {
      setPhase('walked');
      persistComplete();
    }, FADE_MS);
    return () => window.clearTimeout(id);
  }, [phase, persistComplete, setPhase]);

  // TP7-007 — first-walk arrow at the bottom-center while in 'walked' phase.
  // Fades after 10s automatically.
  useEffect(() => {
    if (phase !== 'walked') {
      setShowFirstWalkArrow(false);
      return;
    }
    setShowFirstWalkArrow(true);
    const id = window.setTimeout(() => setShowFirstWalkArrow(false), FIRST_WALK_ARROW_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  // TP7-006 — auto-fade the keyboard chip strip after CHIP_STRIP_MS.
  useEffect(() => {
    if (phase !== 'walked') return;
    if (chipStripDismissed) return;
    const id = window.setTimeout(() => {
      setChipStripDismissed(true);
    }, CHIP_STRIP_MS);
    return () => window.clearTimeout(id);
  }, [phase, chipStripDismissed]);

  // TP7-008 — promote to first-approach the first time the modal opens
  // (gameStore.modalOpen is a useful proxy — AssetViewer sets it true on
  // mount). When the modal closes again we promote to first-open ➜ then
  // first-close so the help-hint chip can render.
  useEffect(() => {
    if (modalOpen) {
      modalOpenSeenRef.current = true;
      if (phase === 'walked' || phase === 'first-approach') {
        setPhase('first-open');
        firstOpenAtRef.current = Date.now();
      }
    } else if (modalOpenSeenRef.current && phase === 'first-open') {
      setPhase('first-close');
    }
  }, [modalOpen, phase, setPhase]);

  // Auto-clear the "Press H any time for help" chip after HELP_HINT_MS once
  // the first-close phase begins (TP7-009 spec'd 3s).
  useEffect(() => {
    if (phase !== 'first-close') return;
    if (helpHintDismissed) return;
    const id = window.setTimeout(() => {
      setHelpHintDismissed(true);
      // After the help hint clears, onboarding is fully done.
      setPhase('completion');
      persistComplete();
    }, HELP_HINT_MS);
    return () => window.clearTimeout(id);
  }, [phase, helpHintDismissed, setPhase, persistComplete]);

  // TP7-013 — congratulate on first beacon visit (0 -> 1).
  // TP7-014 — once at least one beacon has been visited but not all, surface
  // a "find the next mirror" hint for SUGGEST_NEXT_MS.
  // TP7-016 — completion chord + modal once all beacons visited.
  useEffect(() => {
    const count = visitedSet.size;
    const prev = prevVisitedCountRef.current;
    if (count !== prev) {
      // 0 -> 1: first visit
      if (prev === 0 && count === 1) {
        const gain = 0.06 * masterVolume * (muted ? 0 : 1);
        if (gain > 0 && !reducedMotion) playTone(523.25, 500, gain); // C5
        setFirstVisitToast('1 OF 10 MIRRORS OBSERVED');
        window.setTimeout(() => setFirstVisitToast(null), FIRST_VISIT_TOAST_MS);
        // Suggest next after the toast.
        window.setTimeout(() => {
          setSuggestNextVisible(true);
          window.setTimeout(() => setSuggestNextVisible(false), SUGGEST_NEXT_MS);
        }, FIRST_VISIT_TOAST_MS);
      }
      prevVisitedCountRef.current = count;
    }

    // TP7-016 — fire completion chord exactly once when count crosses to 10.
    if (count >= 10 && !completionFiredRef.current) {
      completionFiredRef.current = true;
      if (!reducedMotion) {
        const baseGain = 0.05 * masterVolume * (muted ? 0 : 1);
        if (baseGain > 0) {
          playTone(261.63, 1400, baseGain); // C4 root
          playTone(392.0, 1400, baseGain); // G4 fifth
          playTone(523.25, 1400, baseGain); // C5 octave
        }
      }
      setCompletionModalOpen(true);
    }
  }, [visitedSet, masterVolume, muted, reducedMotion]);

  // TP7-001 — nothing to render once onboarding is complete (but completion
  // modal + returning-user chip may still surface).
  const onboardingChromeVisible = phase !== 'completion';

  // TP7-022 — reduced-motion fallback: render an instant text card with a
  // single dismiss button instead of the cinematic fade.
  if (onboardingChromeVisible && reducedMotion && phase === 'arriving') {
    return (
      <div
        className="fixed inset-0 z-[60] grid place-items-center bg-noesis-void"
        role="dialog"
        aria-label="Field arrival"
      >
        <div className="flex flex-col items-center gap-4">
          <h2 className="font-display text-3xl tracking-[0.4em] text-noesis-gold">
            THE FIELD IS AWAKENING
          </h2>
          <button
            type="button"
            onClick={() => {
              setPhase('walked');
              persistComplete();
            }}
            className="border border-noesis-gold/60 px-6 py-2 font-mono text-xs uppercase tracking-[0.25em] text-noesis-gold transition-colors hover:bg-noesis-gold/10"
          >
            [ ENTER ]
          </button>
        </div>
      </div>
    );
  }

  // Completion modal CTA — restart resets onboarding via ?onboard=1.
  const restartHref = useMemo(() => {
    if (typeof window === 'undefined') return '?onboard=1';
    const url = new URL(window.location.href);
    url.searchParams.set('onboard', '1');
    return url.pathname + url.search;
  }, []);

  return (
    <>
      <style>{SIGIL_STYLE}</style>

      {/* TP7-011 — persistent skip link during all onboarding phases */}
      {onboardingChromeVisible && (
        <button
          type="button"
          onClick={handleSkip}
          className="fixed top-4 right-6 z-[70] font-mono text-xs uppercase tracking-[0.3em] text-noesis-parchment/40 transition-colors hover:text-noesis-gold focus-visible:outline-none"
        >
          [ skip onboarding ]
        </button>
      )}

      {/* TP7-002 / TP7-003 / TP7-004 — arrival fade overlay */}
      {phase === 'arriving' && (
        <div
          className="noesis-overlay-fade fixed inset-0 z-[60] grid place-items-center bg-noesis-void"
          aria-label="Field arrival"
          role="presentation"
        >
          <div className="flex flex-col items-center gap-6">
            <CompassSigil />
            <p className="font-mono text-xs uppercase tracking-[0.5em] text-noesis-parchment/60">
              THE FIELD IS AWAKENING
            </p>
          </div>
        </div>
      )}

      {/* TP7-006 — keyboard chip strip removed; HUD owns the persistent strip
          at bottom-6. Duplicate render was causing two stacked chip pools
          during the 'walked' phase. */}

      {/* TP7-007 — first-walk arrow at bottom-center */}
      {showFirstWalkArrow && (
        <div
          className="pointer-events-none fixed bottom-40 left-1/2 z-[55] -translate-x-1/2 font-display text-4xl text-noesis-gold motion-safe:animate-bounce"
          aria-hidden="true"
        >
          →
        </div>
      )}

      {/* TP7-008 — enlarged "Press G" tooltip during first approach */}
      {phase === 'first-approach' && !approachTipDismissed && (
        <div className="pointer-events-auto fixed top-1/2 left-1/2 z-[55] -translate-x-1/2 translate-y-32">
          <div className="flex items-center gap-3 bg-noesis-void/80 border border-noesis-gold/60 px-6 py-4 backdrop-blur-sm">
            <span className="font-display text-2xl text-noesis-gold motion-safe:animate-pulse">
              Press G to enter the mirror
            </span>
            <button
              type="button"
              onClick={() => setApproachTipDismissed(true)}
              aria-label="Dismiss approach hint"
              className="font-mono text-sm text-noesis-parchment/40 transition-colors hover:text-noesis-gold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* TP7-009 — first-open help-hint chip (drops near viewer top-left) */}
      {phase === 'first-close' && !helpHintDismissed && (
        <div className="pointer-events-auto fixed top-20 left-6 z-[55]">
          <div className="flex items-center gap-2 bg-noesis-void/80 border border-noesis-gold/40 px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-noesis-parchment/80">
              Press H any time for help
            </span>
            <button
              type="button"
              onClick={() => {
                setHelpHintDismissed(true);
                setPhase('completion');
                persistComplete();
              }}
              aria-label="Dismiss help hint"
              className="font-mono text-sm text-noesis-parchment/40 transition-colors hover:text-noesis-gold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* TP7-013 — first visit congratulation toast */}
      {firstVisitToast && (
        <div
          className="pointer-events-none fixed top-24 left-1/2 z-[60] -translate-x-1/2 font-mono text-sm uppercase tracking-[0.3em] text-noesis-gold"
          role="status"
          aria-live="polite"
        >
          {firstVisitToast}
        </div>
      )}

      {/* TP7-014 — suggest-next hint after first visit (generic direction) */}
      {suggestNextVisible && (
        <div
          className="pointer-events-none fixed bottom-32 left-1/2 z-[55] -translate-x-1/2 flex flex-col items-center gap-1"
          aria-hidden="true"
        >
          <span className="font-display text-4xl text-noesis-gold motion-safe:animate-bounce">
            →
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-noesis-gold/80">
            find the next mirror
          </span>
        </div>
      )}

      {/* Fix C — returning-user welcome chip moved to top-right (was top-center
          where it collided with the compass at top-16 and the field label).
          Per bento module 5: peripheral chip register, Satoshi (font-sans). */}
      {returningChip && (
        <div
          className="pointer-events-none fixed top-6 right-6 z-[60] border border-noesis-gold/40 bg-noesis-void/70 px-3 py-2 font-sans text-[10px] uppercase tracking-[0.3em] text-noesis-parchment/80"
          role="status"
          aria-live="polite"
        >
          {returningChip}
        </div>
      )}

      {/* TP7-016 — completion modal */}
      {completionModalOpen && (
        <div
          className="pointer-events-auto fixed inset-0 z-[80] grid place-items-center bg-noesis-void/85"
          role="dialog"
          aria-label="All mirrors observed"
        >
          <div className="flex max-w-2xl flex-col items-center gap-6 border border-noesis-gold/40 bg-noesis-void/95 px-10 py-12 text-center">
            <h2 className="font-display text-3xl tracking-[0.2em] text-noesis-gold">
              the system succeeds when you no longer need the map
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => {
                  try {
                    if (navigator.share) {
                      void navigator.share({
                        title: 'Tryambakam Noesis',
                        text: 'I observed all 10 mirrors in the field.',
                        url: window.location.href,
                      });
                    } else if (navigator.clipboard) {
                      void navigator.clipboard.writeText(window.location.href);
                    }
                  } catch {
                    /* ignore share failures */
                  }
                }}
                className="border border-noesis-gold/60 px-6 py-2 font-mono text-xs uppercase tracking-[0.25em] text-noesis-gold transition-colors hover:bg-noesis-gold/10"
              >
                [ share ]
              </button>
              <a
                href={restartHref}
                className="border border-noesis-gold/40 px-6 py-2 font-mono text-xs uppercase tracking-[0.25em] text-noesis-parchment/70 transition-colors hover:border-noesis-gold/60 hover:text-noesis-gold"
              >
                [ restart ]
              </a>
              <button
                type="button"
                onClick={() => setCompletionModalOpen(false)}
                className="font-mono text-xs uppercase tracking-[0.25em] text-noesis-parchment/40 transition-colors hover:text-noesis-gold"
              >
                [ close ]
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
