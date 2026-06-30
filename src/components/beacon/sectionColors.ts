// Shared section→color mapping. Used by:
//   - BeaconArtifact      (per-beacon emissive)
//   - BeaconGarden        (emits color on proximity, drives gameStore)
//   - Rose vatMaterial    (global hue shift toward closest beacon)
//   - CosmicBeams         (uGlowColor uniform toward closest beacon)
//
// Single source of truth so the four surfaces never drift out of sync.

import * as THREE from 'three';

export const SECTION_IDS = [
  'cover',
  'witness-layer',
  'compendium',
  'part-1', 'part-2', 'part-3', 'part-4', 'part-5',
  'part-6', 'part-7', 'part-8', 'part-9', 'part-10', 'part-11',
  'closing',
  'quine',
] as const;

export type SectionId = typeof SECTION_IDS[number];

// Brand spectrum (visible-emissive set — Void Black is omitted, too dark)
export const WITNESS_VIOLET_HEX = '#2D0050'; // Kha / observer
export const FLOW_INDIGO_HEX    = '#0B50FB'; // Kha→Ba / flow
export const SACRED_GOLD_HEX    = '#C5A017'; // Ba / activation
export const COHERENCE_EMERALD_HEX = '#10B5A7'; // Ba↔La / resolution

// Per-section assignment per the sankalpa README archetype meanings:
// 5 Gold + 4 Violet + 3 Indigo + 4 Emerald across 16 sections.
export const SECTION_TO_HEX: Record<string, string> = {
  'cover':         SACRED_GOLD_HEX,        // ∴ Trinity sigil — apex / activation
  'witness-layer': WITNESS_VIOLET_HEX,     // 0 Open eye / threshold — observer
  'compendium':    FLOW_INDIGO_HEX,        // · Cartography — information moving
  'part-1':        COHERENCE_EMERALD_HEX,  // I Convergence — resolution
  'part-2':        SACRED_GOLD_HEX,        // II Vedic Foundation
  'part-3':        WITNESS_VIOLET_HEX,     // III Karmic Architecture
  'part-4':        SACRED_GOLD_HEX,        // IV Compass
  'part-5':        SACRED_GOLD_HEX,        // V Wealth — activated value
  'part-6':        FLOW_INDIGO_HEX,        // VI Love — flow between
  'part-7':        COHERENCE_EMERALD_HEX,  // VII Health — body coherence
  'part-8':        WITNESS_VIOLET_HEX,     // VIII Family — ancestral observation
  'part-9':        COHERENCE_EMERALD_HEX,  // IX Master Timeline
  'part-10':       SACRED_GOLD_HEX,        // X Practices — active
  'part-11':       FLOW_INDIGO_HEX,        // XI Final Synthesis
  'closing':       WITNESS_VIOLET_HEX,     // → Return to observer
  'quine':         COHERENCE_EMERALD_HEX,  // ∞ Ouroboros — the resolution
};

// Natural rose petal hue (approximate — petals lean pink/magenta in source).
// HSV hue shift = target hue - natural, wrapped to -0.5..0.5 for shortest path.
const NATURAL_ROSE_HUE = 0.95;

function hexToHueShift(hex: string): number {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  let delta = hsl.h - NATURAL_ROSE_HUE;
  if (delta > 0.5) delta -= 1.0;
  if (delta < -0.5) delta += 1.0;
  return delta;
}

// Pre-computed hue-shift delta per section. Plug into Rose material's existing
// `uHueShift` uniform; it composes with the shiftHSV utility already in place.
export const SECTION_TO_HUE_SHIFT: Record<string, number> = Object.fromEntries(
  Object.entries(SECTION_TO_HEX).map(([id, hex]) => [id, hexToHueShift(hex)]),
);

// djb2 string hash — used as a stable fallback section index when
// beacon.order is missing. Same algorithm as BeaconArtifact's earlier fix.
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function resolveSectionId(beaconId: string, order?: number): SectionId {
  if ((SECTION_IDS as readonly string[]).includes(beaconId)) return beaconId as SectionId;
  const seed = order ?? hashString(beaconId);
  const idx = ((seed % SECTION_IDS.length) + SECTION_IDS.length) % SECTION_IDS.length;
  return SECTION_IDS[idx];
}

export function getBeaconColor(beaconId: string, order?: number): THREE.Color {
  const sectionId = resolveSectionId(beaconId, order);
  return new THREE.Color(SECTION_TO_HEX[sectionId]);
}

export function getBeaconColorHex(beaconId: string, order?: number): string {
  return SECTION_TO_HEX[resolveSectionId(beaconId, order)];
}

export function getBeaconHueShift(beaconId: string, order?: number): number {
  return SECTION_TO_HUE_SHIFT[resolveSectionId(beaconId, order)];
}
