import { useEffect, useState } from 'react';
import type { Beacon, BeaconState, BeaconType } from '../types/world';
import { ACTIVE_DISTANCE, APPROACH_DISTANCE } from '../hooks/useBeaconProximity';
import { useVisitedStore } from '../core/store/visitedStore';

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
  useEffect(() => {
    if (state === 'dormant') {
      setMounted(false);
      return;
    }
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [state]);

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

  const stateClasses = isActive
    ? 'opacity-100 scale-100 border-noesis-gold/80 shadow-[0_0_40px_rgba(52,211,153,0.25)]'
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

  // TP5-007 — order indicator. context is a freeform string today, so the total
  // falls back to a hardcoded count until the schema grows a typed totalCount.
  const totalCount = 10;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center pointer-events-none">
      <div
        className={`group pointer-events-auto relative max-w-md w-[90vw] md:max-w-[480px] bg-noesis-void/70 backdrop-blur-md border rounded-lg p-6 text-noesis-parchment cursor-pointer ${stateClasses} ${transition}`}
        style={entryStyle}
        role="dialog"
        aria-label={`${beacon.label} discovery panel`}
        onClick={() => onOpen?.()}
      >
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
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] px-2 py-0.5 rounded border border-noesis-gold/40 text-noesis-gold/90">
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

        {/* Summary */}
        <p className="text-sm text-noesis-parchment/90 font-sans leading-relaxed mb-5">
          {beacon.summary}
        </p>

        {/* [G] glyph + caption — active only */}
        {isActive && (
          <div className="flex flex-col items-center mb-5">
            <div
              className={`w-16 h-16 grid place-items-center rounded-md border-2 border-noesis-gold opacity-90 group-hover:opacity-100 group-hover:text-noesis-emerald ${pulseClass} ${transition}`}
              aria-hidden="true"
            >
              <span className="font-display text-4xl text-noesis-gold leading-none">
                G
              </span>
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
