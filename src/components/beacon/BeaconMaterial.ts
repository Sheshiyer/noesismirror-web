// @ts-nocheck
// Fix H.1 — Unified BeaconMaterial.
//
// Brand-aligned NodeMaterial that replaces every mesh material on a loaded
// beacon GLB. Handles both legacy PBR-textured bakes and new geometry-only
// bakes uniformly — same brass base, same Coherence-Emerald bioluminescent
// emissive, same breath rhythm. State-driven emissive intensity is driven by
// a uniform updated each frame from the BeaconArtifact component.
//
// Per the brand vault: bioluminescent principle — light originates from
// within the figure, never projected onto it. No mystical clichés.

import * as THREE from 'three/webgpu';
import { Fn, vec3, float, sin } from 'three/tsl';
import { uTime } from '../../core/shaders/uniforms';

// Brand colors in linear-ish RGB (sRGB / 255):
//   Brass patina  ~#2A1F0E  — warm dark base derived from Sacred Gold + Void Black
const BRASS_LINEAR = vec3(0.165, 0.122, 0.055);

// Fix H.7 — Brand spectrum colors for per-section emissive. Each beacon
// glows with one of the 4 visible spectrum tones (Void Black is not used
// as emissive — too dark to read). Sections map to colors via their
// archetype meaning; see SECTION_EMISSIVE in BeaconArtifact.
export const WITNESS_VIOLET = vec3(0.176, 0.0, 0.314);   // #2D0050 — Kha / observer
export const FLOW_INDIGO    = vec3(0.043, 0.314, 0.984); // #0B50FB — Kha→Ba / flow
export const SACRED_GOLD    = vec3(0.773, 0.627, 0.090); // #C5A017 — Ba / activation
export const COHERENCE_EMERALD = vec3(0.063, 0.71, 0.655); // #10B5A7 — Ba↔La / resolution

/**
 * Build a beacon material driven by an external uniform for state intensity
 * and a per-instance emissive color (one of the 4 brand spectrum tones).
 *
 * Caller is responsible for creating the uniform and updating its `.value`
 * each frame (lerp toward target based on current Beacon proximity state).
 * Using a single uniform + single material instance shared across every
 * mesh in the GLB is more efficient than rebuilding materials per frame.
 *
 * @param uStateIntensity A `three/tsl` uniform node holding 0..1 emissive
 *   intensity (typically 0.2 dormant, 0.5 approachable, 0.9 active).
 * @param emissiveColor One of WITNESS_VIOLET / FLOW_INDIGO / SACRED_GOLD
 *   / COHERENCE_EMERALD — the bioluminescent core color for this beacon.
 *   Defaults to COHERENCE_EMERALD.
 */
export function makeBeaconMaterial(
  uStateIntensity: any,
  emissiveColor: any = COHERENCE_EMERALD,
): THREE.MeshStandardNodeMaterial {
  const mat = new THREE.MeshStandardNodeMaterial({
    metalness: 0.85,
    roughness: 0.35,
  });

  // Brass base — the geometry's own creases (iris blades, vesica circles, etc.)
  // catch ambient light and read as Sacred-Gold highlights at the silhouette
  // via the PBR pipeline's environment reflection. No procedural rim shader
  // needed; metalness + brass color does the work.
  mat.colorNode = BRASS_LINEAR;

  // Per-section emissive: bioluminescent core that breathes (slow 6s period
  // sine matching the brand's 4:7:8 rhythm) and scales with the proximity
  // state uniform. Dormant beacons read as still-present-but-asleep;
  // approachable wakes them; active pulses fully.
  mat.emissiveNode = Fn(() => {
    const breath = sin(uTime.mul(float(0.6))).mul(float(0.15)).add(float(0.85));
    return emissiveColor.mul(uStateIntensity).mul(breath);
  })();

  return mat;
}

export type BeaconState = 'dormant' | 'approachable' | 'active';

export const BEACON_STATE_INTENSITY: Record<BeaconState, number> = {
  dormant: 0.2,
  approachable: 0.5,
  active: 0.9,
};
