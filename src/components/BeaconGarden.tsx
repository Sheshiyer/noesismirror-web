import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { WorldConfig } from '../types/world';
import { useBeaconProximity, APPROACH_DISTANCE } from '../hooks/useBeaconProximity';
import { Beacon } from './Beacon';
import { BeaconDrone } from './cosmic/BeaconDrone';
import { gameEvents } from '../core/events';
import { useGameStore } from '../core/store/gameStore';
import { getBeaconColorHex, getBeaconHueShift } from './beacon/sectionColors';

interface BeaconGardenProps {
  config: WorldConfig;
  // Optional click-through: WorldPage may wire this to open the AssetViewer.
  // If absent, beacon clicks are no-ops (existing keyboard flow still works).
  onBeaconClick?: (beaconId: string) => void;
}

export function BeaconGarden({ config, onBeaconClick }: BeaconGardenProps) {
  const { states, distances } = useBeaconProximity(config.beacons);
  const setCurrentBeaconColor = useGameStore((s) => s.setCurrentBeaconColor);

  // Track previous state per beacon so we only fire the rose "area of interest"
  // bloom ONCE per approach (dormant -> approachable/active transition). Walking
  // back and forth across the threshold doesn't keep re-spawning.
  const prevStatesRef = useRef<Record<string, string>>({});
  useEffect(() => {
    for (const beacon of config.beacons) {
      const cur = states[beacon.id] ?? 'dormant';
      const prev = prevStatesRef.current[beacon.id] ?? 'dormant';
      if (prev === 'dormant' && cur !== 'dormant') {
        // Emit the same payload shape Rose was previously listening for, but
        // on a dedicated channel: roses bloom at the beacon, not under the
        // astronaut's feet. APPROACH_DISTANCE drives the bloom radius so the
        // petal ring matches the proximity zone.
        gameEvents.emit('beacon:approach', {
          position: new THREE.Vector3(beacon.position.x, 0, beacon.position.z),
          radius: APPROACH_DISTANCE,
          beaconId: beacon.id,
        });
      }
    }
    prevStatesRef.current = { ...states };

    // Tier 1 — proximity-driven world tint. Find the closest in-range
    // beacon (active OR approachable) and push its color into gameStore so
    // Rose + CosmicBeams can lerp toward it. If nothing is in range,
    // clear the tint (null) — Rose/Beams fade back to their defaults.
    let closestId: string | null = null;
    let closestOrder: number | undefined;
    let closestDist = Infinity;
    for (const beacon of config.beacons) {
      const s = states[beacon.id];
      if (s !== 'approachable' && s !== 'active') continue;
      const d = distances[beacon.id] ?? Infinity;
      if (d < closestDist) {
        closestDist = d;
        closestId = beacon.id;
        closestOrder = beacon.order;
      }
    }
    if (closestId) {
      setCurrentBeaconColor(
        getBeaconColorHex(closestId, closestOrder),
        getBeaconHueShift(closestId, closestOrder),
      );
    } else {
      setCurrentBeaconColor(null, 0);
    }
  }, [states, distances, config.beacons, setCurrentBeaconColor]);

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
