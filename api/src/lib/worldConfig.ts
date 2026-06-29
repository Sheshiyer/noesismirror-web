/**
 * World Config Transformation
 * Shared utility for transforming R2 manifest files into world-config JSON.
 */

/** Asset entry for beacons */
export interface BeaconAsset {
  path: string;
  type: 'audio' | 'image' | 'video' | 'document' | 'text' | 'mind-map';
  title: string;
  description?: string;
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

/** Beacon in the world-config */
export interface Beacon {
  id: string;
  position: { x: number; y: number; z: number };
  asset: {
    path: string;
    type: string;
    title?: string;
    description?: string;
  };
}

/** World-config structure returned to client */
export interface WorldConfig {
  personId: string;
  personName: string;
  beacons: Beacon[];
  metadata: {
    generatedAt: string;
    assetCount: number;
  };
}

/**
 * Known asset paths in the premium-assets structure.
 * These are derived from the directory structure created by the generator.
 */
export const KNOWN_ASSETS: BeaconAsset[] = [
  { path: 'audio/deep-dive-long.mp3', type: 'audio', title: 'Deep Dive Audio', description: 'Comprehensive audio exploration' },
  { path: 'video/video-brief.mp4', type: 'video', title: 'Video Brief', description: 'Visual introduction' },
  { path: "mind-map/Harshita's Personal Companion Dossier.json", type: 'mind-map', title: 'Mind Map', description: 'Interactive knowledge map' },
  { path: 'reports/briefing.md', type: 'document', title: 'Briefing Report', description: 'Executive summary' },
  { path: 'reports/study-guide.md', type: 'document', title: 'Study Guide', description: 'Detailed learning material' },
  { path: 'quiz/quiz.md', type: 'text', title: 'Quiz', description: 'Knowledge check' },
  { path: 'flashcards/flashcards.md', type: 'text', title: 'Flashcards', description: 'Quick review cards' },
  { path: 'slide-decks/detailed.pdf', type: 'document', title: 'Detailed Slides', description: 'Full presentation' },
  { path: 'slide-decks/preview.pdf', type: 'document', title: 'Preview Slides', description: 'Quick overview presentation' },
  { path: 'slide-decks/vimshottari-timeline.pdf', type: 'document', title: 'Vimshottari Timeline', description: 'Temporal analysis' },
];

/**
 * Generates beacon positions in a spiral pattern.
 * Creates visually interesting distribution for VR/3D environments.
 */
export function generateSpiralPosition(index: number, total: number): { x: number; y: number; z: number } {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5 degrees
  const radius = 5 + (index / total) * 15; // Expanding radius from 5 to 20
  const angle = index * goldenAngle;

  // Spiral in XZ plane with slight Y variation
  const x = radius * Math.cos(angle);
  const z = radius * Math.sin(angle);
  const y = 1.5 + Math.sin(index * 0.5) * 0.5; // Gentle wave between 1-2 meters

  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    z: Math.round(z * 100) / 100,
  };
}

/**
 * Transforms an R2 manifest into a world-config with positioned beacons.
 * Uses KNOWN_ASSETS since the manifest doesn't contain an assets array.
 */
export function transformManifestToWorldConfig(manifest: Manifest): WorldConfig {
  const beacons: Beacon[] = KNOWN_ASSETS.map((asset, index) => ({
    id: `beacon-${index}`,
    position: generateSpiralPosition(index, KNOWN_ASSETS.length),
    asset: {
      path: `/api/assets/${manifest.personId}/${asset.path}`,
      type: asset.type,
      title: asset.title,
      description: asset.description,
    },
  }));

  return {
    personId: manifest.personId,
    personName: manifest.personName,
    beacons,
    metadata: {
      generatedAt: manifest.generatedAt,
      assetCount: KNOWN_ASSETS.length,
    },
  };
}
