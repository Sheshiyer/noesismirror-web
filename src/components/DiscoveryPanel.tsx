import { useEffect, useRef, useState } from 'react';
import type { Beacon, BeaconState, BeaconType } from '../types/world';
import { ACTIVE_DISTANCE, APPROACH_DISTANCE } from '../hooks/useBeaconProximity';
import { useVisitedStore } from '../core/store/visitedStore';
import { useAudioStore } from '../core/store/audioStore';

export interface DiscoveryPanelProps {
  beacon: Beacon;
  state: BeaconState;
  distance: number;
  reducedMotion: boolean;
  /** TP5-008 — visited-dot lookup needs the owning person id. Optional with
   * fallback so WorldPage (WD-4) can wire it independently without breaking the
   * type contract during the parallel sprint. */
  personId?: string;
  /** TP5-015 — optional click handler. WorldPage wires viewer-open through this. */
  onOpen?: () => void;
}

// TP5-005 — asset-type glyphs. Unicode v1; brand-aligned shapes.
const TYPE_GLYPH: Record<BeaconType, string> = {
  audio: '◉',
  video: '▷',
  reading: '❡',
  slides: '▤',
  study: '◈',
};

// TP5-018 — caption rotates by type.
const TYPE_CAPTION: Record<BeaconType, string> = {
  audio: 'press G to listen',
  video: 'press G to watch',
  reading: 'press G to read',
  slides: 'press G to traverse',
  study: 'press G to study',
};

// TP5-004 — per-type chip background tint. Pairs with the existing
// gold/40 border for a subtle differentiator at a glance.
const BG_BY_TYPE: Record<BeaconType, string> = {
  audio: 'bg-noesis-emerald/20',
  video: 'bg-noesis-gold/20',
  reading: 'bg-noesis-parchment/20',
  slides: 'bg-noesis-violet/20',
  study: 'bg-noesis-indigo/20',
};

// TP5-009 — placeholder length descriptors. v1 derives only from type;
// once Beacon.meta lands we can plug in real durations / page counts.
const LENGTH_BY_TYPE: Record<BeaconType, string> = {
  audio: 'media',
  video: 'media',
  reading: 'text',
  slides: 'pdf',
  study: 'text',
};

// CSS keyframe payload — scoped to the panel via a <style> tag.
// TP5-002: bloom flash on dormant→active. Brief Sacred-Gold halo (300ms).
const PANEL_STYLE = `
  @keyframes noesis-active-bloom {
    0% { box-shadow: 0 0 0 rgba(197,160,23, 0); }
    40% { box-shadow: 0 0 56px rgba(197,160,23, 0.55); }
    100% { box-shadow: 0 0 40px rgba(52,211,153, 0.25); }
  }
  .noesis-active-bloom {
    animation: noesis-active-bloom 300ms ease-out forwards;
  }
  @media (prefers-reduced-motion: reduce) {
    .noesis-active-bloom { animation: none; }
  }
`;

// TP5-011 + TP5-012 — Web Audio helper. Sums sine partials into a
// short envelope. Pull master volume + mute from the global audio
// store so the SFX respects user prefs. Module-level AudioContext so
// repeated state transitions don't allocate.
let sharedAudioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  return sharedAudioCtx;
}

function playTone(freqs: number[], durationMs: number, peakGain: number) {
  const ctx = getCtx();
  if (!ctx) return;
  // If suspended (no user gesture yet), skip — Web Audio will throw
  // otherwise and there's no audible result anyway.
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
    return;
  }
  const now = ctx.currentTime;
  const dur = durationMs / 1000;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(peakGain, now + 0.02);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  masterGain.connect(ctx.destination);
  for (const f of freqs) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, now);
    osc.connect(masterGain);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  }
}

export default function DiscoveryPanel({
  beacon,
  state,
  distance,
  reducedMotion,
  personId,
  onOpen,
}: DiscoveryPanelProps) {
  // TP5-001 — gate the entry transition on a second-frame state mirror so the
  // browser sees an initial "before" frame before swapping in the active class.
  const [mounted, setMounted] = useState(false);
  // TP5-003 — once active for >2s, fade the summary text. Keeps [G] bright.
  const [summaryFaded, setSummaryFaded] = useState(false);
  // TP5-019 — tooltip on [G] glyph hover.
  const [showTooltip, setShowTooltip] = useState(false);
  // TP5-002 — apply the bloom class only on the actual transition into
  // active so we don't replay it on every render.
  const [bloomActive, setBloomActive] = useState(false);
  // TP5-026 — focus the panel container when it becomes active.
  const containerRef = useRef<HTMLDivElement | null>(null);
  // TP5-011/012 — remember the previous state to detect transitions.
  const prevStateRef = useRef<BeaconState>(state);
  // TP5-025 — drive the polite live region from the latest state.
  const [liveMessage, setLiveMessage] = useState<string>('');

  const masterVolume = useAudioStore((s) => s.masterVolume);
  const muted = useAudioStore((s) => s.muted);

  useEffect(() => {
    if (state === 'dormant') {
      setMounted(false);
      setSummaryFaded(false);
      setBloomActive(false);
      setLiveMessage('');
      prevStateRef.current = state;
      return;
    }
    const raf = requestAnimationFrame(() => setMounted(true));

    const prev = prevStateRef.current;

    // TP5-011 — approach SFX: dormant → approachable. Low fundamental + fifth.
    if (prev === 'dormant' && state === 'approachable' && !muted) {
      playTone([220, 330], 200, 0.06 * masterVolume);
    }
    // TP5-012 — active SFX: approachable → active. Major triad burst.
    if (prev === 'approachable' && state === 'active' && !muted) {
      playTone([261.63, 329.63, 392.0], 300, 0.07 * masterVolume);
    }

    // TP5-002 — bloom only on transition into active.
    if (state === 'active' && prev !== 'active') {
      setBloomActive(true);
      const t = window.setTimeout(() => setBloomActive(false), 320);
      // TP5-026 — focus container on becoming active.
      requestAnimationFrame(() => containerRef.current?.focus());
      // TP5-025 — announce
      setLiveMessage(`near ${beacon.label} — press G to enter`);
      prevStateRef.current = state;
      return () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(t);
      };
    }

    if (state === 'approachable' && prev !== 'approachable') {
      setLiveMessage(`approaching ${beacon.label}`);
    }

    prevStateRef.current = state;
    return () => cancelAnimationFrame(raf);
  }, [state, beacon.label, masterVolume, muted]);

  // TP5-003 — after 2s in active, soften the summary text. Resets on state change.
  useEffect(() => {
    setSummaryFaded(false);
    if (state !== 'active') return;
    const t = window.setTimeout(() => setSummaryFaded(true), 2000);
    return () => window.clearTimeout(t);
  }, [state, beacon.id]);

  // TP5-008 — visited lookup. Stable reads from the store. Skip when personId
  // hasn't been threaded through yet (sprint-parallel safety).
  const isVisited = useVisitedStore((s) => s.isVisited);
  const visited = personId ? isVisited(personId, beacon.id) : false;

  if (state === 'dormant') return null;

  const isActive = state === 'active';

  // Progress = how close to crossing the ACTIVE threshold.
  // At distance >= APPROACH_DISTANCE: 0%. At distance <= ACTIVE_DISTANCE: 100%.
  const span = APPROACH_DISTANCE - ACTIVE_DISTANCE;
  const rawProgress = ((APPROACH_DISTANCE - distance) / span) * 100;
  const progress = Math.max(0, Math.min(100, rawProgress));

  const transition = reducedMotion
    ? ''
    : 'transition-all duration-300 ease-out';

  // TP5-002 — active state ramps scale from 0.95 → 1.0 and earns the
  // sacred-gold bloom flash via the keyframe class.
  const stateClasses = isActive
    ? `opacity-100 scale-100 border-noesis-gold/80 shadow-[0_0_40px_rgba(52,211,153,0.25)] ${bloomActive && !reducedMotion ? 'noesis-active-bloom' : ''}`
    : 'opacity-50 scale-95 border-noesis-gold/30';

  // TP5-024 — pulse only runs when motion is allowed. The motion-safe: variant
  // is double insurance for the OS-level preference.
  const pulseClass = reducedMotion ? '' : 'motion-safe:animate-pulse';

  const barColor = isActive ? 'bg-noesis-gold' : 'bg-noesis-emerald';

  // TP5-001 — entry transform. Slide 20px up + fade in on mount/state-change.
  // Reduced-motion users get the final state immediately.
  const entryStyle: React.CSSProperties = reducedMotion
    ? {}
    : {
        transform: mounted ? 'translateY(0)' : 'translateY(20px)',
        opacity: mounted ? undefined : 0,
        transition: 'transform 200ms ease-out, opacity 200ms ease-out',
      };

  const glyph = TYPE_GLYPH[beacon.type];
  const caption = TYPE_CAPTION[beacon.type] ?? 'press G to enter';
  const chipBg = BG_BY_TYPE[beacon.type] ?? '';
  const lengthHint = LENGTH_BY_TYPE[beacon.type] ?? '';

  // TP5-007 — order indicator. context is a freeform string today, so the total
  // falls back to a hardcoded count until the schema grows a typed totalCount.
  const totalCount = 10;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center pointer-events-none">
      <style>{PANEL_STYLE}</style>
      <div
        ref={containerRef}
        tabIndex={-1}
        className={`group pointer-events-auto relative max-w-md w-[90vw] md:max-w-[480px] bg-noesis-void/70 backdrop-blur-md border rounded-lg p-6 text-noesis-parchment cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-noesis-gold/60 ${stateClasses} ${transition}`}
        style={entryStyle}
        role="dialog"
        aria-label={`${beacon.label} discovery panel`}
        onClick={() => onOpen?.()}
      >
        {/* TP5-025 — polite live region for screen-reader cues. */}
        <span className="sr-only" aria-live="polite">
          {liveMessage}
        </span>

        {/* TP5-008 — visited indicator (top-right) */}
        {visited && (
          <span
            className="absolute top-2 right-2 font-display text-noesis-gold text-sm leading-none"
            aria-label="visited"
            title="visited"
          >
            ◆
          </span>
        )}

        {/* Type chip + glyph + order */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="font-display text-noesis-gold text-base leading-none"
            aria-hidden="true"
          >
            {glyph}
          </span>
          {/* TP5-004 — per-type background tint on the chip */}
          <span
            className={`text-[10px] font-mono uppercase tracking-[0.2em] px-2 py-0.5 rounded border border-noesis-gold/40 text-noesis-gold/90 ${chipBg}`}
          >
            {beacon.type}
          </span>
          {beacon.order !== undefined && (
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-noesis-parchment/50">
              {beacon.order} · {totalCount}
            </span>
          )}
        </div>

        {/* Display title in Panchang / Sacred Gold */}
        <h2 className="font-display text-2xl uppercase tracking-wider text-noesis-gold mb-2 leading-tight">
          {beacon.label}
        </h2>

        {/* Italic context line */}
        {beacon.context && (
          <p className="text-xs italic text-noesis-parchment/60 mb-3 font-sans">
            {beacon.context}
          </p>
        )}

        {/* Summary — TP5-003 fades to 50% after 2s active (reduced-motion still
            fades; the change is opacity-only, not animated). */}
        <p
          className={`text-sm font-sans leading-relaxed mb-5 ${transition} ${
            summaryFaded ? 'text-noesis-parchment/50' : 'text-noesis-parchment/90'
          }`}
        >
          {beacon.summary}
        </p>

        {/* TP5-009 — estimated content length hint */}
        {lengthHint && (
          <p className="font-mono text-xs text-noesis-parchment/50 mb-3">
            {lengthHint}
          </p>
        )}

        {/* [G] glyph + caption — active only */}
        {isActive && (
          <div className="flex flex-col items-center mb-5">
            {/* TP5-019 — tooltip wrapper around [G] glyph */}
            <div
              className="relative"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onFocus={() => setShowTooltip(true)}
              onBlur={() => setShowTooltip(false)}
            >
              <div
                className={`w-16 h-16 grid place-items-center rounded-md border-2 border-noesis-gold opacity-100 group-hover:text-noesis-emerald ${pulseClass} ${transition}`}
                aria-hidden="true"
              >
                <span className="font-display text-4xl text-noesis-gold leading-none">
                  G
                </span>
              </div>
              {showTooltip && (
                <div
                  role="tooltip"
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded bg-noesis-void/95 border border-noesis-gold/40 font-mono text-xs text-noesis-parchment/80 whitespace-nowrap z-50"
                >
                  Press G or Enter — remap in settings
                </div>
              )}
            </div>
            <span className="mt-2 text-[10px] font-mono uppercase tracking-[0.25em] text-noesis-parchment/60">
              {caption}
            </span>
          </div>
        )}

        {/* Coherence progress bar */}
        <div
          className="h-1 w-full rounded-full bg-noesis-parchment/10 overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-label="approach coherence"
        >
          <div
            className={`h-full ${barColor} ${transition}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* TP5-006 — distance readout */}
        <div className="mt-2 font-mono text-[10px] text-noesis-parchment/50 uppercase tracking-widest">
          {distance.toFixed(1)}m
        </div>
      </div>
    </div>
  );
}
