import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../core/store/gameStore';
import { useReducedMotion } from '../hooks/useReducedMotion';

const ONBOARDED_KEY = 'noesis_onboarded';
const FADE_MS = 1500;
const CHIP_STRIP_MS = 5000;
const HELP_HINT_MS = 3000;

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

const CHIP_CLASSES =
  'border border-noesis-gold/40 bg-noesis-void/60 px-2 py-1 font-mono uppercase tracking-[0.25em] text-[10px] text-noesis-parchment/80';

const KEYBOARD_KEYS = ['WASD', 'SHIFT', 'G', 'ESC'] as const;

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

export default function Onboarding() {
  const phase = useGameStore((s) => s.onboardingPhase);
  const setPhase = useGameStore((s) => s.setOnboardingPhase);
  const modalOpen = useGameStore((s) => s.modalOpen);
  const reducedMotion = useReducedMotion();

  // Local dismissal flags per-tooltip (TP7-021).
  const [chipStripDismissed, setChipStripDismissed] = useState(false);
  const [approachTipDismissed, setApproachTipDismissed] = useState(false);
  const [helpHintDismissed, setHelpHintDismissed] = useState(false);

  // Track whether we've ever seen modalOpen go true (TP7-008 / TP7-009).
  const modalOpenSeenRef = useRef(false);
  // Stamp when first-open hint was shown so it can auto-clear.
  const firstOpenAtRef = useRef<number | null>(null);

  const persistComplete = useCallback(() => {
    try {
      window.localStorage.setItem(ONBOARDED_KEY, 'true');
    } catch {
      /* no-op — storage may be unavailable */
    }
  }, []);

  const handleSkip = useCallback(() => {
    setPhase('completion');
    persistComplete();
  }, [persistComplete, setPhase]);

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

  // TP7-001 — nothing to render once onboarding is complete.
  if (phase === 'completion') return null;

  // TP7-022 — reduced-motion fallback: render an instant text card with a
  // single dismiss button instead of the cinematic fade.
  if (reducedMotion && phase === 'arriving') {
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

  return (
    <>
      <style>{SIGIL_STYLE}</style>

      {/* TP7-011 — persistent skip link during all onboarding phases */}
      <button
        type="button"
        onClick={handleSkip}
        className="fixed top-4 right-6 z-[70] font-mono text-xs uppercase tracking-[0.3em] text-noesis-parchment/40 transition-colors hover:text-noesis-gold focus-visible:outline-none"
      >
        [ skip onboarding ]
      </button>

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

      {/* TP7-006 — keyboard chip strip after the fade clears */}
      {phase === 'walked' && !chipStripDismissed && (
        <div className="pointer-events-auto fixed bottom-24 left-1/2 z-[55] -translate-x-1/2">
          <div className="flex items-center gap-2 bg-noesis-void/70 px-3 py-2 backdrop-blur-sm">
            {KEYBOARD_KEYS.map((k) => (
              <span key={k} className={CHIP_CLASSES}>
                {k}
              </span>
            ))}
            <button
              type="button"
              onClick={() => setChipStripDismissed(true)}
              aria-label="Dismiss controls hint"
              className="ml-2 font-mono text-sm text-noesis-parchment/40 transition-colors hover:text-noesis-gold"
            >
              ×
            </button>
          </div>
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
    </>
  );
}
