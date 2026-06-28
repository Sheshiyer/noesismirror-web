import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useWorldConfig } from '../hooks/useWorldConfig';
import { useBeaconProximity } from '../hooks/useBeaconProximity';
import { useBeaconKeyboard } from '../hooks/useBeaconKeyboard';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { WorldConfig } from '../types/world';
import App from '../app/App';
import DiscoveryPanel from './DiscoveryPanel';
import AssetViewer from './AssetViewer';
import BeaconAnnouncer from './BeaconAnnouncer';

const BADGE_CLASSES: Record<string, string> = {
  dormant: 'bg-neutral-700 text-white',
  approachable: 'bg-yellow-600 text-black',
  active: 'bg-emerald-600 text-white',
};

export default function WorldPage() {
  const { personId } = useParams<{ personId: string }>();
  const { config, loading, error } = useWorldConfig(personId);
  const reducedMotion = useReducedMotion();
  const [selectedBeaconId, setSelectedBeaconId] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const { states, activeBeaconId } = useBeaconProximity(config?.beacons ?? []);

  const displayBeaconId = selectedBeaconId ?? activeBeaconId;
  const displayBeacon = useMemo(
    () => config?.beacons.find((beacon) => beacon.id === displayBeaconId) ?? null,
    [config, displayBeaconId]
  );

  useBeaconKeyboard({
    beacons: config?.beacons ?? [],
    activeBeaconId: displayBeaconId,
    onSelect: setSelectedBeaconId,
    onOpen: (id) => {
      setSelectedBeaconId(id);
      setViewerOpen(true);
    },
    viewerOpen,
    onCloseViewer: () => setViewerOpen(false),
  });

  if (loading) {
    return <div className="text-white p-8">Loading world…</div>;
  }

  if (error || !config) {
    return (
      <div className="text-red-400 p-8">
        Error loading world: {error?.message ?? 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <App config={config} />
      <BeaconAnnouncer activeBeacon={displayBeacon} />
      <HUD config={config} states={states} />
      {displayBeacon && (
        <DiscoveryPanel
          beacon={displayBeacon}
          state={states[displayBeacon.id] ?? 'dormant'}
          onOpen={() => setViewerOpen(true)}
          reducedMotion={reducedMotion}
        />
      )}
      {viewerOpen && displayBeacon && (
        <AssetViewer
          beacon={displayBeacon}
          onClose={() => setViewerOpen(false)}
          reducedMotion={reducedMotion}
        />
      )}
    </div>
  );
}

interface HUDProps {
  config: WorldConfig;
  states: Record<string, string>;
}

function HUD({ config, states }: HUDProps) {
  return (
    <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-xs rounded-lg border border-white/10 bg-black/40 p-4 backdrop-blur-sm">
      <h1 className="mb-2 text-xl font-light tracking-wide text-white">
        {config.personName}'s World
      </h1>
      <div className="space-y-2">
        {config.beacons.map((beacon) => {
          const state = states[beacon.id] ?? 'dormant';
          return (
            <div
              key={beacon.id}
              className="rounded border border-white/10 bg-white/5 p-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">{beacon.label}</span>
                <span
                  className={`rounded px-1.5 py-0 text-[10px] uppercase ${BADGE_CLASSES[state]}`}
                >
                  {state}
                </span>
              </div>
              <p className="text-xs text-neutral-400">{beacon.summary}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
