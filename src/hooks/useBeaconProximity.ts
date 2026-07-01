import { useState, useEffect, useRef } from 'react';
import { Beacon } from '../types/world';
import { useGameStore } from '../core/store/gameStore';

export type BeaconState = 'dormant' | 'approachable' | 'active';

export const ACTIVE_DISTANCE = 3;
export const APPROACH_DISTANCE = 6;

interface UseBeaconProximityResult {
  states: Record<string, BeaconState>;
  activeBeaconId: string | null;
  distances: Record<string, number>;
}

export function useBeaconProximity(beacons: Beacon[]): UseBeaconProximityResult {
  const characterRef = useGameStore((state) => state.characterRef);
  const [states, setStates] = useState<Record<string, BeaconState>>({});
  const [activeBeaconId, setActiveBeaconId] = useState<string | null>(null);
  const [distances, setDistances] = useState<Record<string, number>>({});

  const beaconsRef = useRef(beacons);
  beaconsRef.current = beacons;

  useEffect(() => {
    let rafId: number;

    const tick = () => {
      const group = characterRef?.current;
      const nextStates: Record<string, BeaconState> = {};
      const nextDistances: Record<string, number> = {};
      let nearestActiveId: string | null = null;
      let nearestActiveDistance = Infinity;

      if (group) {
        const charPos = group.position;

        for (const beacon of beaconsRef.current) {
          const dx = beacon.position.x - charPos.x;
          const dz = beacon.position.z - charPos.z;
          const distance = Math.sqrt(dx * dx + dz * dz);

          nextDistances[beacon.id] = distance;

          let state: BeaconState = 'dormant';
          if (distance <= ACTIVE_DISTANCE) {
            state = 'active';
            if (distance < nearestActiveDistance) {
              nearestActiveDistance = distance;
              nearestActiveId = beacon.id;
            }
          } else if (distance <= APPROACH_DISTANCE) {
            state = 'approachable';
          }

          nextStates[beacon.id] = state;
        }
      }

      setStates(nextStates);
      setDistances(nextDistances);
      setActiveBeaconId(nearestActiveId);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [characterRef]);

  return { states, activeBeaconId, distances };
}
