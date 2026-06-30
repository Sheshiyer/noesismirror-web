import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group, Mesh, Vector3 } from 'three';
import * as THREE from 'three/webgpu';
import { Beacon as BeaconType } from '../types/world';
import { useVisitedStore } from '../core/store/visitedStore';
import { useGameStore } from '../core/store/gameStore';
// Fix H — Meshy-baked beacon artifact loaded per section, painted with the
// brand-aligned BeaconMaterial. Replaces the placeholder TypeShape inside
// the existing AOE shell + ring stack.
import { BeaconArtifact } from './beacon/BeaconArtifact';
import { resolveSectionId, getBeaconColorHex } from './beacon/sectionColors';

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

// TP3-012 — group-level scale targets by proximity state.
const PROXIMITY_SCALE: Record<BeaconMarkerState, number> = {
  dormant: 1.0,
  approachable: 1.05,
  active: 1.15,
};

// TP3-020 — 200ms smoothing window. At 60fps, lerp factor ≈ 1 - exp(-dt/0.2).
// We compute it per-frame from actual delta so the interpolation is framerate-independent.
const LERP_TAU = 0.2; // seconds

// TP3-003 — Sacred-Gold visited ring (brand token #C5A017).
const VISITED_RING_COLOR = new THREE.Color('#C5A017');

// Shader-based AOE indicator: a 12m-diameter disc (matching APPROACH_DISTANCE=6
// radius) with radial falloff, a soft inner glow, and a sharp ring at the
// ACTIVE threshold (3m). Replaces the previous flat circleGeometry that read
// as a UI selector. Additive blending + breath modulation per state.
const AOE_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const AOE_FRAGMENT_SHADER = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uActiveRatio;  // ACTIVE / APPROACH (e.g. 3/6 = 0.5)
  uniform float uState;        // 0=dormant, 0.5=approachable, 1=active
  uniform vec3 uEmerald;
  uniform vec3 uGold;

  void main() {
    vec2 center = vec2(0.5);
    float dist = distance(vUv, center) * 2.0; // 0 at center, 1 at edge
    if (dist > 1.0) discard;

    // Soft outer falloff — fade from approach edge inward
    float aoeBase = 1.0 - smoothstep(0.55, 1.0, dist);
    // Faint inner bloom near beacon center
    float innerBloom = (1.0 - smoothstep(0.0, 0.35, dist)) * 0.4;

    // Sharp active-threshold ring — brighter as state climbs
    float ringWidth = 0.018;
    float activeRing = smoothstep(uActiveRatio - ringWidth, uActiveRatio, dist)
                     - smoothstep(uActiveRatio, uActiveRatio + ringWidth, dist);

    // Subtle breath modulation (long slow cycle)
    float breath = 0.65 + 0.35 * (0.5 + 0.5 * sin(uTime * 0.33));

    // State weighting: dormant barely visible; active full presence
    float presence = mix(0.25, 1.0, uState);

    float aoeAlpha = (aoeBase * 0.18 + innerBloom * 0.20) * presence * breath;
    float ringAlpha = activeRing * (0.45 + 0.55 * uState) * breath;

    // Color: emerald base, shift toward gold on active
    vec3 color = mix(uEmerald, uGold, uState * 0.6);
    float alpha = clamp(aoeAlpha + ringAlpha, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
  }
`;

// TP3-006 / Fix H.6 — beacons levitate above the grass canopy. Grass
// bladeHeightMax = 0.8m (see grass/core/grassControls.ts). 1.6m hover gives
// the GLB artifact clear sky behind it from any approach angle.
const BASE_Y = 1.6;
// TP3-025 — character collision push-back radius.
const COLLISION_RADIUS = 0.5;

interface BeaconProps {
  beacon: BeaconType;
  state: BeaconMarkerState;
  distance?: number;
  personId: string;
  onClick?: (beaconId: string) => void;
}

const APPROACH_DISTANCE = 6;

// Shared scratch vectors reused across frames (per render but cheap enough).
const TMP_TARGET = new Vector3();

export function Beacon({ beacon, state, distance = Infinity, personId, onClick }: BeaconProps) {
  const groupRef = useRef<Group>(null);
  const meshGroupRef = useRef<Group>(null); // contains type-specific mesh
  const innerMeshRef = useRef<Group>(null); // breath-scale target (TP3-019)
  const shadowRef = useRef<Mesh>(null);
  const ringRef = useRef<Group>(null);
  const pointLightRef = useRef<THREE.PointLight>(null);
  const color = useMemo(() => COLORS[state], [state]);

  // TP3-003 — visited lookup. Contract: useVisitedStore() returns the full store.
  const visitedStore = useVisitedStore();
  const visited = visitedStore.isVisited(personId, beacon.id);

  // TP3-018 — hover-dwell tooltip.
  const [hovered, setHovered] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // TP3-020 — store live (interpolated) values in refs; targets come from `state`.
  const currentEmissive = useRef(EMISSIVE_INTENSITY[state]);
  const currentLightIntensity = useRef(
    state === 'dormant' ? 0.3 : state === 'active' ? 3.5 : 1.8,
  );
  const currentColor = useRef(color.clone());
  const currentScale = useRef(PROXIMITY_SCALE[state]);

  // AOE shader material — owned once per beacon, animated via uniforms.
  const aoeMaterial = useMemo(() => {
    const ACTIVE_DISTANCE_LOCAL = 3;
    return new THREE.ShaderMaterial({
      vertexShader: AOE_VERTEX_SHADER,
      fragmentShader: AOE_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uActiveRatio: { value: ACTIVE_DISTANCE_LOCAL / APPROACH_DISTANCE },
        uState: { value: state === 'active' ? 1.0 : state === 'approachable' ? 0.5 : 0.0 },
        uEmerald: { value: new THREE.Color('#10B5A7') },
        uGold: { value: new THREE.Color('#C5A017') },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // TP3-004 — time-in-active accumulator (seconds).
  const timeInActive = useRef(0);
  // TP3-004 — track whether we've already emitted the tonal "settled" pulse.
  const emittedSettledPulse = useRef(false);
  const prevStateRef = useRef<BeaconMarkerState>(state);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const group = groupRef.current;
    const meshGroup = meshGroupRef.current;
    const inner = innerMeshRef.current;
    const ring = ringRef.current;
    if (!group || !meshGroup) return;

    // TP3-006 / Fix H.6 — suspended position. Sine float around BASE_Y.
    // Bob amplitude raised from 5cm to 15cm for more presence at the new
    // 1.6m hover height. Period kept at ~5s for the same meditative cadence.
    const float = Math.sin(t * 1.2) * 0.15;
    group.position.y = BASE_Y + float;

    // TP3-013 — look-at character (only yaw — keep beacon upright).
    const characterRef = useGameStore.getState().characterRef;
    const character = characterRef?.current;
    if (character) {
      TMP_TARGET.copy(character.position);
      TMP_TARGET.y = group.position.y;
      meshGroup.lookAt(TMP_TARGET);
    }

    // TP3-004 — settled rotation when active >3s. Adds a gentle Y spin on top
    // of the lookAt (composed via the inner mesh group).
    if (state === 'active') {
      timeInActive.current += delta;
    } else {
      timeInActive.current = 0;
      emittedSettledPulse.current = false;
    }
    if (inner) {
      if (state === 'active' && timeInActive.current > 3) {
        inner.rotation.y += 0.3 * delta; // 0.3 rad/s gentle rotation
        if (!emittedSettledPulse.current) {
          emittedSettledPulse.current = true;
          // Single tonal pulse — best-effort, mute-aware. Kept inline to avoid
          // a new store wiring; BeaconDrone handles persistent audio.
          try {
            // Lightweight one-shot via shared AudioContext on window.
            const w = window as unknown as { __noesisBeaconPulse?: AudioContext };
            if (!w.__noesisBeaconPulse) {
              const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
              w.__noesisBeaconPulse = new AC();
            }
            const ctx = w.__noesisBeaconPulse;
            if (ctx) {
              const osc = ctx.createOscillator();
              const g = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.value = 660;
              const now = ctx.currentTime;
              g.gain.setValueAtTime(0, now);
              g.gain.linearRampToValueAtTime(0.04, now + 0.02);
              g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
              osc.connect(g).connect(ctx.destination);
              osc.start(now);
              osc.stop(now + 0.65);
            }
          } catch {
            // sound is non-essential
          }
        }
      } else {
        // TP3-019 — 4-7-8 breath cycle scale on inner mesh.
        // ~19s cycle: 4s inhale (grow), 7s hold (peak), 8s exhale (shrink).
        const cycle = 19;
        const phase = (t % cycle) / cycle;
        let scale = 1;
        if (phase < 4 / 19) {
          // inhale 0..1
          const p = phase / (4 / 19);
          scale = 1 + 0.03 * p;
        } else if (phase < 11 / 19) {
          // hold at peak
          scale = 1.03;
        } else {
          // exhale back to 1
          const p = (phase - 11 / 19) / (8 / 19);
          scale = 1.03 - 0.03 * p;
        }
        inner.scale.setScalar(scale);
      }
    }

    if (ring) {
      ring.rotation.y = t * 0.15;
      ring.rotation.x = Math.sin(t * 0.1) * 0.1;
    }

    // TP3-020 — frame-rate-independent lerp toward state-driven targets.
    const alpha = 1 - Math.exp(-delta / LERP_TAU);

    // TP3-012 — proximity scale lerp on the outer beacon group.
    const targetScale = PROXIMITY_SCALE[state];
    currentScale.current += (targetScale - currentScale.current) * alpha;
    group.scale.setScalar(currentScale.current);

    // Emissive intensity ramp on every standard material in the type mesh.
    const targetEmissive = EMISSIVE_INTENSITY[state];
    currentEmissive.current += (targetEmissive - currentEmissive.current) * alpha;

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

    // Walk the mesh-group descendants and update emissive on standard materials.
    meshGroup.traverse((obj) => {
      const m = obj as Mesh;
      const mat = m.material as THREE.MeshStandardMaterial | undefined;
      if (mat && (mat as THREE.MeshStandardMaterial).isMaterial && 'emissive' in mat) {
        mat.emissive.copy(currentColor.current);
        mat.emissiveIntensity = currentEmissive.current;
      }
    });

    // Shader-AOE — drive uniforms each frame. State lerps smoothly toward
    // its target so transitions read as breathing, not snapping.
    const targetStateVal = state === 'active' ? 1.0 : state === 'approachable' ? 0.5 : 0.0;
    const u = aoeMaterial.uniforms;
    u.uTime.value = t;
    const curStateVal = u.uState.value as number;
    u.uState.value = curStateVal + (targetStateVal - curStateVal) * alpha;

    // TP3-025 — soft collision: push the character out to COLLISION_RADIUS.
    if (character) {
      const dx = character.position.x - beacon.position.x;
      const dz = character.position.z - beacon.position.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d > 0.0001 && d < COLLISION_RADIUS) {
        const k = COLLISION_RADIUS / d;
        character.position.x = beacon.position.x + dx * k;
        character.position.z = beacon.position.z + dz * k;
      }
    }

    prevStateRef.current = state;
  });

  const typeColor = useMemo(() => TYPE_COLORS[beacon.type] ?? new THREE.Color('#94a3b8'), [beacon.type]);
  const label = useMemo(() => {
    const order = beacon.order ? `${beacon.order}. ` : '';
    return `${order}${beacon.label}`;
  }, [beacon]);

  // Hover-dwell handling for tooltip (TP3-018).
  const onPointerOver = () => {
    setHovered(true);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setTooltipVisible(true), 1000);
  };
  const onPointerOut = () => {
    setHovered(false);
    setTooltipVisible(false);
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  // TP3-023 — click handler. Stops event propagation so terrain clicks don't fire.
  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onClick?.(beacon.id);
  };

  return (
    <group position={[beacon.position.x, 0, beacon.position.z]}>
      {/* Shader-based AOE — 12m disc (APPROACH_DISTANCE * 2) with radial
          falloff + active-radius ring at 3m. Replaces the flat
          circleGeometry that read as a UI selector. Additive-blended,
          breath-modulated, state-aware. */}
      <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[APPROACH_DISTANCE * 2, APPROACH_DISTANCE * 2]} />
        <primitive object={aoeMaterial} attach="material" />
      </mesh>

      {/* TP3-003 — Sacred-Gold ground ring marking visited beacons. */}
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

        {/* Floating ring — always present as a type accent. */}
        <group ref={ringRef}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.0, 0.015, 8, 48]} />
            <meshBasicMaterial color={typeColor} transparent opacity={state === 'dormant' ? 0.15 : 0.55} />
          </mesh>
        </group>

        {/* Type-specific mesh group. lookAt + click target. */}
        <group
          ref={meshGroupRef}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
          onClick={handleClick}
        >
          <group ref={innerMeshRef}>
            {/* Fix H — Meshy-baked section artifact painted with BeaconMaterial.
                Sits inside the existing AOE shell + ring (untouched). The
                TypeShape placeholder is removed in favor of the brand-aligned
                sacred-geometry GLB per section. */}
            <BeaconArtifact
              beaconId={beacon.id}
              order={beacon.order}
              state={state}
            />
          </group>
        </group>

        {/* Fix D — Dev/debug overlay: show resolved section id + color hex
            above each beacon when Game.Dev → "Beacon labels" is toggled on.
            Helps verify the section→color mapping at a glance. */}
        {useGameStore((s) => s.showBeaconDebug) && (() => {
          const sectionId = resolveSectionId(beacon.id, beacon.order);
          const hex = getBeaconColorHex(beacon.id, beacon.order);
          return (
            <group position={[0, 2.4, 0]}>
              <Html center transform={false}>
                <div
                  className="font-mono uppercase text-[10px] tracking-[0.2em] border bg-noesis-void/85 backdrop-blur-sm px-2 py-1"
                  style={{
                    borderColor: hex,
                    color: hex,
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {sectionId} · {hex}
                </div>
              </Html>
            </group>
          );
        })()}

        {/* Floating label — proximity-faded; invisible from afar.
            TP3-015: font-display (Panchang).
            TP3-016: 0.5m above beacon top (~1.05) with 0.1m forward Z.
            TP3-017: bg-noesis-void/60, backdrop-blur-sm, border-noesis-gold/20, px-3 py-1, no rounding.
            TP3-018: type chip + Sacred-Gold `i` glyph; long-dwell shows summary tooltip. */}
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>{label}</span>
                  <span
                    style={{
                      fontFamily: 'var(--font-display, inherit)',
                      color: '#C5A017',
                      fontSize: '0.7rem',
                      fontStyle: 'italic',
                      fontWeight: 600,
                      opacity: hovered ? 1 : 0.65,
                      borderLeft: '1px solid rgba(197,160,23,0.35)',
                      paddingLeft: '0.4rem',
                    }}
                  >
                    i
                  </span>
                </div>
                {tooltipVisible && beacon.summary && (
                  <div
                    className="font-display bg-noesis-void/80 backdrop-blur-sm border border-noesis-gold/20 px-3 py-2 mt-1"
                    style={{
                      fontSize: '0.7rem',
                      letterSpacing: '0.06em',
                      color: '#F0EDE3',
                      maxWidth: '240px',
                      pointerEvents: 'none',
                      textTransform: 'none',
                      lineHeight: 1.4,
                    }}
                  >
                    {beacon.summary}
                  </div>
                )}
              </Html>
            </group>
          );
        })()}
      </group>
    </group>
  );
}


// ============================================================================
// Fix H — Dead-code removal.
//
// The TypeShape dispatcher + Audio/Video/Reading/Slides/Study/Default subcomponents
// that previously rendered placeholder-colored primitives per beacon type have
// been removed. They were replaced by the Meshy-baked sacred-geometry GLBs
// loaded via BeaconArtifact (src/components/beacon/BeaconArtifact.tsx). Git
// history preserves them if a per-type fallback is ever needed again.
// ============================================================================
