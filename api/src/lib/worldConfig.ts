/**
 * World Config Transformation
 * Shared utility for transforming R2 manifest files into world-config JSON.
 *
 * Output shape MUST match the frontend's src/types/world.ts Beacon/WorldConfig.
 */

/** BeaconType — mirrors src/types/world.ts on the frontend. */
export type BeaconType = 'reading' | 'audio' | 'video' | 'slides' | 'study';

/** Asset entry for beacons — backend-internal source of truth for asset metadata. */
export interface BeaconAsset {
  path: string;
  beaconType: BeaconType;
  label: string;
  summary: string;
}

/** Actual R2 manifest structure from premium-assets generator */
export interface Manifest {
  personId: string;
  personName: string;
  generatedAt: string;
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  quality: Array<{ name: string; status: string; detail: string }>;
  gate?: { passed: boolean };
  notebooklm?: Record<string, unknown>;
}

/** Beacon in the world-config — flat shape consumed by the React renderer. */
export interface Beacon {
  id: string;
  label: string;
  summary: string;
  type: BeaconType;
  position: { x: number; z: number };
  assetUrl: string;
}

/** World-config structure returned to client. */
export interface WorldConfig {
  personId: string;
  personName: string;
  beacons: Beacon[];
}

/**
 * Known asset paths in the premium-assets structure.
 * Derived from the directory structure created by the generator.
 * beaconType maps each asset onto the frontend's BeaconType enum.
 */
export const KNOWN_ASSETS: BeaconAsset[] = [
  { path: 'audio/deep-dive-long.mp3',                              beaconType: 'audio',   label: 'Deep Dive Audio',     summary: 'Comprehensive audio exploration' },
  { path: 'video/video-brief.mp4',                                 beaconType: 'video',   label: 'Video Brief',         summary: 'Visual introduction' },
  { path: "mind-map/Harshita's Personal Companion Dossier.json",   beaconType: 'study',   label: 'Mind Map',            summary: 'Interactive knowledge map' },
  { path: 'reports/briefing.md',                                   beaconType: 'reading', label: 'Briefing Report',     summary: 'Executive summary' },
  { path: 'reports/study-guide.md',                                beaconType: 'study',   label: 'Study Guide',         summary: 'Detailed learning material' },
  { path: 'quiz/quiz.md',                                          beaconType: 'study',   label: 'Quiz',                summary: 'Knowledge check' },
  { path: 'flashcards/flashcards.md',                              beaconType: 'study',   label: 'Flashcards',          summary: 'Quick review cards' },
  { path: 'slide-decks/detailed.pdf',                              beaconType: 'slides',  label: 'Detailed Slides',     summary: 'Full presentation' },
  { path: 'slide-decks/preview.pdf',                               beaconType: 'slides',  label: 'Preview Slides',      summary: 'Quick overview presentation' },
  { path: 'slide-decks/vimshottari-timeline.pdf',                  beaconType: 'slides',  label: 'Vimshottari Timeline', summary: 'Temporal analysis' },
];

/**
 * Generates beacon positions on a golden-angle spiral in the XZ plane.
 * Y is intentionally omitted — the frontend renders on a 2D ground plane.
 */
export function generateSpiralPosition(index: number, total: number): { x: number; z: number } {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const radius = 5 + (index / total) * 15;
  const angle = index * goldenAngle;
  return {
    x: Math.round(radius * Math.cos(angle) * 100) / 100,
    z: Math.round(radius * Math.sin(angle) * 100) / 100,
  };
}

/**
 * Transforms an R2 manifest into a world-config with positioned beacons.
 * Uses KNOWN_ASSETS since the manifest doesn't contain an assets array.
 */
export function transformManifestToWorldConfig(manifest: Manifest): WorldConfig {
  const beacons: Beacon[] = KNOWN_ASSETS.map((asset, index) => ({
    id: `beacon-${index}`,
    label: asset.label,
    summary: asset.summary,
    type: asset.beaconType,
    position: generateSpiralPosition(index, KNOWN_ASSETS.length),
    assetUrl: `/api/assets/${manifest.personId}/${asset.path}`,
  }));

  return {
    personId: manifest.personId,
    personName: manifest.personName,
    beacons,
  };
}
