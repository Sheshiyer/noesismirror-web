import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group, Mesh } from 'three';
import * as THREE from 'three/webgpu';
import { Beacon as BeaconType } from '../types/world';

export type BeaconMarkerState = 'dormant' | 'approachable' | 'active';

const COLORS: Record<BeaconMarkerState, THREE.Color> = {
  active: new THREE.Color('#34d399'),
  approachable: new THREE.Color('#facc15'),
  dormant: new THREE.Color('#64748b'),
};

const TYPE_COLORS: Record<string, THREE.Color> = {
  study: new THREE.Color('#60a5fa'),
  reading: new THREE.Color('#f59e0b'),
  audio: new THREE.Color('#a78bfa'),
  video: new THREE.Color('#f472b6'),
  slides: new THREE.Color('#34d399'),
};

interface BeaconProps {
  beacon: BeaconType;
  state: BeaconMarkerState;
  distance?: number;
}

const APPROACH_DISTANCE = 6;

export function Beacon({ beacon, state, distance = Infinity }: BeaconProps) {
  const groupRef = useRef<Group>(null);
  const crystalRef = useRef<Mesh>(null);
  const coreRef = useRef<Mesh>(null);
  const ringRef = useRef<Group>(null);
  const color = useMemo(() => COLORS[state], [state]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const group = groupRef.current;
    const crystal = crystalRef.current;
    const core = coreRef.current;
    const ring = ringRef.current;
    if (!group || !crystal || !core || !ring) return;

    const speed = state === 'active' ? 2.5 : state === 'approachable' ? 1.2 : 0.4;
    const hover = Math.sin(t * speed) * 0.08;
    group.position.y = 0.9 + hover;

    crystal.rotation.y = t * 0.3;
    crystal.rotation.z = Math.sin(t * 0.2) * 0.04;

    core.rotation.y = -t * 0.5;
    core.scale.setScalar(state === 'active' ? 1.3 + 0.15 * Math.sin(t * 5) : 1);

    ring.rotation.y = t * 0.15;
    ring.rotation.x = Math.sin(t * 0.1) * 0.1;
  });

  const emissive = useMemo(() => {
    const c = color.clone();
    return state === 'dormant' ? c.multiplyScalar(0.05) : c.multiplyScalar(state === 'active' ? 1.6 : 0.7);
  }, [color, state]);

  const typeColor = useMemo(() => TYPE_COLORS[beacon.type] ?? new THREE.Color('#94a3b8'), [beacon.type]);
  const label = useMemo(() => {
    const order = beacon.order ? `${beacon.order}. ` : '';
    return `${order}${beacon.label}`;
  }, [beacon]);

  return (
    <group position={[beacon.position.x, 0, beacon.position.z]}>
      <group ref={groupRef}>
        <pointLight
          color={color}
          intensity={state === 'dormant' ? 0.3 : state === 'active' ? 3.5 : 1.8}
          distance={8}
          decay={2}
          position={[0, 0, 0]}
        />

        {/* Floating ring */}
        <group ref={ringRef}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.0, 0.015, 8, 48]} />
            <meshBasicMaterial color={typeColor} transparent opacity={state === 'dormant' ? 0.15 : 0.55} />
          </mesh>
        </group>

        {/* Outer crystal shell */}
        <mesh ref={crystalRef}>
          <octahedronGeometry args={[0.55, 0]} />
          <meshStandardMaterial
            color={new THREE.Color('#1e293b')}
            emissive={emissive}
            emissiveIntensity={state === 'active' ? 0.8 : state === 'approachable' ? 0.4 : 0.05}
            roughness={0.15}
            metalness={0.6}
            transparent
            opacity={0.85}
          />
        </mesh>

        {/* Inner glowing core */}
        <mesh ref={coreRef}>
          <octahedronGeometry args={[0.28, 1]} />
          <meshBasicMaterial color={typeColor} transparent opacity={0.9} />
        </mesh>

        {/* Ground glow decal */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.85, 0]}>
          <circleGeometry args={[1.2, 32]} />
          <meshBasicMaterial color={typeColor} transparent opacity={state === 'dormant' ? 0.04 : 0.12} />
        </mesh>

        {/* Floating label — proximity-faded; invisible from afar */}
        {(() => {
          // Fade in as character approaches: 0 at distance >= 8, 1 at distance <= 6
          const proximityOpacity = Math.max(
            0,
            Math.min(1, (APPROACH_DISTANCE + 2 - distance) / 2)
          );
          if (proximityOpacity <= 0.001) return null;
          return (
            <group position={[0, 1.6, 0]}>
              <Html center transform={false}>
                <div
                  style={{
                    fontFamily: 'Cousine, monospace',
                    fontSize: '0.65rem',
                    letterSpacing: '0.12em',
                    color: state === 'dormant' ? '#94a3b8' : '#ffffff',
                    background: 'rgba(0,0,0,0.45)',
                    border: `1px solid ${state === 'dormant' ? 'rgba(148,163,184,0.25)' : 'rgba(255,255,255,0.35)'}`,
                    borderRadius: '4px',
                    padding: '3px 8px',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    textTransform: 'uppercase',
                    opacity: proximityOpacity,
                    transition: 'opacity 0.3s ease, border-color 0.3s ease, color 0.3s ease',
                  }}
                >
                  {label}
                </div>
              </Html>
            </group>
          );
        })()}
      </group>
    </group>
  );
}
