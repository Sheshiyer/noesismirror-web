import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group, Mesh } from 'three';
import * as THREE from 'three/webgpu';
import { Beacon as BeaconType } from '../types/world';
import { useVisitedStore } from '../core/store/visitedStore';

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

// TP3-002 — per-state emissive intensity targets driving the crystal shell.
const EMISSIVE_INTENSITY: Record<BeaconMarkerState, number> = {
  dormant: 0.2,
  approachable: 0.5,
  active: 0.9,
};

// TP3-020 — 200ms smoothing window. At 60fps, lerp factor ≈ 1 - exp(-dt/0.2).
// We compute it per-frame from actual delta so the interpolation is framerate-independent.
const LERP_TAU = 0.2; // seconds

// TP3-003 — Sacred-Gold visited ring (brand token #C5A017).
const VISITED_RING_COLOR = new THREE.Color('#C5A017');

interface BeaconProps {
  beacon: BeaconType;
  state: BeaconMarkerState;
  distance?: number;
  personId: string;
}

const APPROACH_DISTANCE = 6;

export function Beacon({ beacon, state, distance = Infinity, personId }: BeaconProps) {
  const groupRef = useRef<Group>(null);
  const crystalRef = useRef<Mesh>(null);
  const coreRef = useRef<Mesh>(null);
  const ringRef = useRef<Group>(null);
  const pointLightRef = useRef<THREE.PointLight>(null);
  const color = useMemo(() => COLORS[state], [state]);

  // TP3-003 — visited lookup. Contract: useVisitedStore() returns the full store.
  const visitedStore = useVisitedStore();
  const visited = visitedStore.isVisited(personId, beacon.id);

  // TP3-020 — store live (interpolated) values in refs; targets come from `state`.
  const currentEmissive = useRef(EMISSIVE_INTENSITY[state]);
  const currentLightIntensity = useRef(
    state === 'dormant' ? 0.3 : state === 'active' ? 3.5 : 1.8,
  );
  const currentColor = useRef(color.clone());

  useFrame(({ clock }, delta) => {
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

    // TP3-020 — frame-rate-independent lerp toward state-driven targets.
    const alpha = 1 - Math.exp(-delta / LERP_TAU);

    // Emissive intensity ramp (TP3-002 target).
    const targetEmissive = EMISSIVE_INTENSITY[state];
    currentEmissive.current += (targetEmissive - currentEmissive.current) * alpha;
    const mat = crystal.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = currentEmissive.current;

    // PointLight intensity smoothing.
    const targetLight = state === 'dormant' ? 0.3 : state === 'active' ? 3.5 : 1.8;
    currentLightIntensity.current += (targetLight - currentLightIntensity.current) * alpha;
    if (pointLightRef.current) {
      pointLightRef.current.intensity = currentLightIntensity.current;
    }

    // Color lerp (point light + emissive tint).
    currentColor.current.lerp(color, alpha);
    if (pointLightRef.current) {
      pointLightRef.current.color.copy(currentColor.current);
    }
    mat.emissive.copy(currentColor.current);
  });

  const typeColor = useMemo(() => TYPE_COLORS[beacon.type] ?? new THREE.Color('#94a3b8'), [beacon.type]);
  const label = useMemo(() => {
    const order = beacon.order ? `${beacon.order}. ` : '';
    return `${order}${beacon.label}`;
  }, [beacon]);

  return (
    <group position={[beacon.position.x, 0, beacon.position.z]}>
      {/* TP3-003 — Sacred-Gold ground ring marking visited beacons.
          Sits at y=0.05 (just above ground), radius 1.2m. Thin torus. */}
      {visited && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <torusGeometry args={[1.2, 0.025, 8, 64]} />
          <meshBasicMaterial color={VISITED_RING_COLOR} transparent opacity={0.85} />
        </mesh>
      )}

      <group ref={groupRef}>
        <pointLight
          ref={pointLightRef}
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

        {/* Outer crystal shell — emissiveIntensity driven by useFrame lerp (TP3-002, TP3-020) */}
        <mesh ref={crystalRef}>
          <octahedronGeometry args={[0.55, 0]} />
          <meshStandardMaterial
            color={new THREE.Color('#1e293b')}
            emissive={color}
            emissiveIntensity={EMISSIVE_INTENSITY[state]}
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

        {/* Floating label — proximity-faded; invisible from afar.
            TP3-015: font-display (Panchang).
            TP3-016: 0.5m above beacon top (crystal radius ~0.55 → top ~0.55, +0.5 ≈ 1.05) with 0.1m forward Z.
            TP3-017: bg-noesis-void/60, backdrop-blur-sm, border-noesis-gold/20, px-3 py-1, no rounding. */}
        {(() => {
          const proximityOpacity = Math.max(
            0,
            Math.min(1, (APPROACH_DISTANCE + 2 - distance) / 2),
          );
          if (proximityOpacity <= 0.001) return null;
          return (
            <group position={[0, 1.05, 0.1]}>
              <Html center transform={false}>
                <div
                  className="font-display bg-noesis-void/60 backdrop-blur-sm border border-noesis-gold/20 px-3 py-1"
                  style={{
                    fontSize: '0.75rem',
                    letterSpacing: '0.12em',
                    color: state === 'dormant' ? '#94a3b8' : '#F0EDE3',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    textTransform: 'uppercase',
                    opacity: proximityOpacity,
                    transition: 'opacity 0.2s ease, border-color 0.2s ease, color 0.2s ease',
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
