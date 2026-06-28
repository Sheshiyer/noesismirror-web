import { Suspense, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { WorldConfig } from '../types/world';
import { uTime, uDeltaTime } from '../core/shaders/uniforms';
import { Terrain } from './Terrain';
import { StarrySky } from './background/StarrySky';
import GrassWebGPU from './grass/GrassWebGPU';
import { Character } from './character';

export interface WorldControllerProps {
  config: WorldConfig;
}

export function WorldController({ config }: WorldControllerProps) {
  const beacons = useMemo(() => config.beacons, [config]);
  void beacons;

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    uTime.value += delta;
    uDeltaTime.value = delta;
  });

  return (
    <Suspense fallback={null}>
      <StarrySky />
      <Terrain />
      <GrassWebGPU />
      <Character position={[0, 0, 0]} scale={1} />
    </Suspense>
  );
}
