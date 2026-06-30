import { WorldConfig } from '../types/world';
import { useBeaconProximity } from '../hooks/useBeaconProximity';
import { Beacon } from './Beacon';

interface BeaconGardenProps {
  config: WorldConfig;
}

export function BeaconGarden({ config }: BeaconGardenProps) {
  const { states, distances } = useBeaconProximity(config.beacons);

  return (
    <>
      {config.beacons.map((beacon) => (
        <Beacon
          key={beacon.id}
          beacon={beacon}
          state={states[beacon.id] ?? 'dormant'}
          distance={distances[beacon.id] ?? Infinity}
        />
      ))}
    </>
  );
}
