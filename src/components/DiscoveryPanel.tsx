import type { Beacon, BeaconState } from '../types/world';
import { ACTIVE_DISTANCE, APPROACH_DISTANCE } from '../hooks/useBeaconProximity';

export interface DiscoveryPanelProps {
  beacon: Beacon;
  state: BeaconState;
  distance: number;
  reducedMotion: boolean;
}

export default function DiscoveryPanel({
  beacon,
  state,
  distance,
  reducedMotion,
}: DiscoveryPanelProps) {
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

  const pulseClass = reducedMotion ? '' : 'motion-safe:animate-pulse';

  const barColor = isActive ? 'bg-noesis-gold' : 'bg-noesis-emerald';

  return (
    <div className="fixed inset-0 z-40 grid place-items-center pointer-events-none">
      <div
        className={`pointer-events-auto max-w-md w-[28rem] bg-noesis-void/70 backdrop-blur-md border rounded-lg p-6 text-noesis-parchment ${stateClasses} ${transition}`}
        role="dialog"
        aria-label={`${beacon.label} discovery panel`}
      >
        {/* Type chip + order */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] px-2 py-0.5 rounded border border-noesis-gold/40 text-noesis-gold/90">
            {beacon.type}
          </span>
          {beacon.order && (
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-noesis-parchment/50">
              {beacon.order} of 2
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
              className={`w-16 h-16 grid place-items-center rounded-md border-2 border-noesis-gold ${pulseClass}`}
              aria-hidden="true"
            >
              <span className="font-display text-4xl text-noesis-gold leading-none">
                G
              </span>
            </div>
            <span className="mt-2 text-[10px] font-mono uppercase tracking-[0.25em] text-noesis-parchment/60">
              press G to enter
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
      </div>
    </div>
  );
}
