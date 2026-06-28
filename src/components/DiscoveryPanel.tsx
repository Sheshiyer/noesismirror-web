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
      <span className="text-xs uppercase tracking-wider text-white/60 mb-2 block">
        {beacon.type}
      </span>
      <h2 className="text-lg font-semibold mb-1">{beacon.label}</h2>
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
