// @ts-nocheck
// Fix H.2 — BeaconArtifact.
//
// Loads the section-specific Meshy-baked GLB for a beacon, clones it (so the
// same GLB can serve multiple beacons), traverses every mesh, and replaces
// the embedded material with a shared brand-aligned BeaconMaterial. Drives
// a state-intensity uniform that lerps toward the current Beacon proximity
// state each frame — produces a smooth dormant → approachable → active
// emissive transition instead of a hard color flip.

import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
// @ts-expect-error — JS module from three's addons, no types shipped
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';
import {
  makeBeaconMaterial,
  BEACON_STATE_INTENSITY,
  WITNESS_VIOLET,
  FLOW_INDIGO,
  SACRED_GOLD,
  COHERENCE_EMERALD,
  type BeaconState,
} from './BeaconMaterial';
import {
  SECTION_TO_HEX,
  WITNESS_VIOLET_HEX,
  FLOW_INDIGO_HEX,
  SACRED_GOLD_HEX,
  COHERENCE_EMERALD_HEX,
  resolveSectionId as resolveSectionIdShared,
} from './sectionColors';

// Map shared hex → the TSL vec3 nodes used by BeaconMaterial. Single source
// of truth (sectionColors.ts) for the section→hex assignment.
const HEX_TO_TSL: Record<string, any> = {
  [WITNESS_VIOLET_HEX]: WITNESS_VIOLET,
  [FLOW_INDIGO_HEX]: FLOW_INDIGO,
  [SACRED_GOLD_HEX]: SACRED_GOLD,
  [COHERENCE_EMERALD_HEX]: COHERENCE_EMERALD,
};

const SECTION_EMISSIVE: Record<string, any> = Object.fromEntries(
  Object.entries(SECTION_TO_HEX).map(([id, hex]) => [id, HEX_TO_TSL[hex]]),
);

// Section resolution + section-id list + hash all live in sectionColors.ts —
// single source of truth shared across BeaconArtifact / BeaconGarden / Rose /
// CosmicBeams. Alias for in-file readability.
const resolveSectionId = resolveSectionIdShared;

interface BeaconArtifactProps {
  beaconId: string;
  order?: number;
  state: BeaconState;
}

export function BeaconArtifact({ beaconId, order, state }: BeaconArtifactProps) {
  const sectionId = useMemo(() => resolveSectionId(beaconId, order), [beaconId, order]);
  const gltfPath = `/models/beacons/${sectionId}.glb`;
  const gltf = useGLTF(gltfPath);

  // One uniform per BeaconArtifact instance — drives the emissive intensity
  // of every mesh in the cloned scene through the shared material.
  const uStateIntensity = useMemo(() => uniform(BEACON_STATE_INTENSITY[state]), []);

  const emissiveColor = SECTION_EMISSIVE[sectionId] ?? COHERENCE_EMERALD;

  const scene = useMemo(() => {
    const cloned = SkeletonUtils.clone(gltf.scene);
    const mat = makeBeaconMaterial(uStateIntensity, emissiveColor);
    cloned.traverse((child: any) => {
      if (child instanceof THREE.Mesh) {
        child.frustumCulled = false;
        child.material = mat;
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
    return cloned;
  }, [gltf.scene, uStateIntensity, emissiveColor]);

  // 200ms-tau lerp toward target intensity. Framerate-independent.
  useFrame((_, delta) => {
    const target = BEACON_STATE_INTENSITY[state];
    const lerp = 1 - Math.exp(-delta / 0.2);
    uStateIntensity.value += (target - uStateIntensity.value) * lerp;
  });

  return <primitive object={scene} />;
}
