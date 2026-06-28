import type { Beacon, BeaconState } from '../types/world';

export interface DiscoveryPanelProps {
  beacon: Beacon;
  state: BeaconState;
  onOpen: () => void;
  reducedMotion: boolean;
}

export default function DiscoveryPanel({
  beacon,
  state,
  onOpen,
  reducedMotion,
}: DiscoveryPanelProps) {
  if (state === 'dormant') return null;

  const motionClasses = reducedMotion
    ? ''
    : 'transition-opacity transition-transform duration-300 ease-out';

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-xs bg-black/40 backdrop-blur-md border border-white/10 rounded-lg p-4 text-white shadow-lg ${motionClasses}`}
      role="dialog"
      aria-label={`${beacon.label} discovery panel`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/70">
          {beacon.type}
        </span>
        {beacon.order && (
          <span className="text-[10px] uppercase tracking-wider text-white/50">
            {beacon.order} of 2
          </span>
        )}
      </div>
      <h2 className="text-lg font-semibold mb-1">{beacon.label}</h2>
      {beacon.context && (
        <p className="text-xs text-white/60 italic mb-2">{beacon.context}</p>
      )}
      <p className="text-sm text-white/80 mb-3">{beacon.summary}</p>
      <button
        type="button"
        onClick={onOpen}
        className={`px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 rounded ${
          reducedMotion ? '' : 'transition-colors'
        }`}
      >
        Open
      </button>
    </div>
  );
}
