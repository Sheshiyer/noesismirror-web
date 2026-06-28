import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';
import { Beacon as BeaconType } from '../types/world';

export type BeaconMarkerState = 'dormant' | 'approachable' | 'active';

const COLORS: Record<BeaconMarkerState, string> = {
  active: '#34d399',
  approachable: '#facc15',
  dormant: '#52525b',
};

interface BeaconProps {
  beacon: BeaconType;
  state: BeaconMarkerState;
}

export function Beacon({ beacon, state }: BeaconProps) {
  const meshRef = useRef<Mesh>(null);
  const color = COLORS[state];

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const t = clock.getElapsedTime();
    const speed = state === 'active' ? 6 : 3;
    const pulse = state === 'dormant' ? 1 : 1 + 0.15 * Math.sin(t * speed);
    mesh.scale.setScalar(pulse);
  });

  return (
    <group position={[beacon.position.x, 0.5, beacon.position.z]}>
      <mesh ref={meshRef}>
        <cylinderGeometry args={[0.2, 0.2, 1, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
      <pointLight
        color={color}
        intensity={state === 'dormant' ? 0 : state === 'active' ? 2 : 1}
        distance={4}
        decay={2}
        position={[0, 0.5, 0]}
      />
    </group>
  );
}
