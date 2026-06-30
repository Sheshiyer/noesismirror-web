import { WorldConfig } from '../types/world';
import { useBeaconProximity } from '../hooks/useBeaconProximity';
import { Beacon } from './Beacon';
import { BeaconDrone } from './cosmic/BeaconDrone';

interface BeaconGardenProps {
  config: WorldConfig;
  // Optional click-through: WorldPage may wire this to open the AssetViewer.
  // If absent, beacon clicks are no-ops (existing keyboard flow still works).
  onBeaconClick?: (beaconId: string) => void;
}

export function BeaconGarden({ config, onBeaconClick }: BeaconGardenProps) {
  const { states, distances } = useBeaconProximity(config.beacons);

  return (
    <>
      {config.beacons.map((beacon) => (
        <Beacon
          key={beacon.id}
          beacon={beacon}
          state={states[beacon.id] ?? 'dormant'}
          distance={distances[beacon.id] ?? Infinity}
          personId={config.personId}
          onClick={onBeaconClick}
        />
      ))}
      {config.beacons.map((beacon) => (
        <BeaconDrone
          key={`drone-${beacon.id}`}
          beacon={beacon}
          personId={config.personId}
        />
      ))}
    </>
  );
}
