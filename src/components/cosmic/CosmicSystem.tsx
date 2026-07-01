// @ts-nocheck
import { useRef, Suspense, useEffect } from 'react';
import { MathUtils } from 'three';
import { useCosmicBeamSpawner } from './hooks/useCosmicBeamSpawner';
import { useCosmicWaves } from './hooks/useCosmicWaves';
import { CosmicBeams, CosmicBeamsRef } from './CosmicBeams';
import { BeamAudio } from './BeamAudio';
import { gameEvents } from '../../core/events';
import { useShortcut } from '@core/hooks/useShortcut';

const WAVE_PARAMS = {
  radiusMin: 5.0,
  radiusMax: 10.0,
  lifetimeMin: 3.0,
  lifetimeMax: 5.0,
  donutMinRadius: 5.0,
  donutMaxRadius: 15.0,
  autoSpawn: true,
  minSpawnInterval: 2.0,
  maxSpawnInterval: 5.0,
  speedThreshold: 0.1,
};

export function CosmicSystem() {
  const beamsRef = useRef<CosmicBeamsRef>(null);
  const waveParams = WAVE_PARAMS;

  useCosmicWaves({ waveParams });

  const { spawnBeam } = useCosmicBeamSpawner({
    beamsRef,
    waveParams,
    onBeamSpawn: (position) => {
      beamsRef.current?.triggerBeam(position, (hitPos) => {
        const radius = MathUtils.lerp(waveParams.radiusMin, waveParams.radiusMax, Math.random());
        gameEvents.emit('beam:hit', { position: hitPos, radius });
      });
    },
  });

  useShortcut('z', () => {
    spawnBeam();
  });

  return (
    <>
      <CosmicBeams ref={beamsRef} />
      <Suspense fallback={null}>
        <BeamAudio />
      </Suspense>
    </>
  );
}
