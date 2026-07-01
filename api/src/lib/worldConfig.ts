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

const FALLBACK_MIND_MAP_PATH = "mind-map/Harshita's Personal Companion Dossier.json";

const STATIC_ASSETS: BeaconAsset[] = [
  {
    path: 'audio/deep-dive-long.mp3',
    beaconType: 'audio',
    label: 'Deep Dive Audio',
    summary: 'Comprehensive audio exploration',
  },
  {
    path: 'video/video-brief.mp4',
    beaconType: 'video',
    label: 'Video Brief',
    summary: 'Visual introduction',
  },
  {
    path: 'reports/briefing.md',
    beaconType: 'reading',
    label: 'Briefing Report',
    summary: 'Executive summary',
  },
  {
    path: 'reports/study-guide.md',
    beaconType: 'study',
    label: 'Study Guide',
    summary: 'Detailed learning material',
  },
  {
    path: 'quiz/quiz.md',
    beaconType: 'study',
    label: 'Quiz',
    summary: 'Knowledge check',
  },
  {
    path: 'flashcards/flashcards.md',
    beaconType: 'study',
    label: 'Flashcards',
    summary: 'Quick review cards',
  },
  {
    path: 'slide-decks/detailed.pdf',
    beaconType: 'slides',
    label: 'Detailed Slides',
    summary: 'Full presentation',
  },
  {
    path: 'slide-decks/preview.pdf',
    beaconType: 'slides',
    label: 'Preview Slides',
    summary: 'Quick overview presentation',
  },
  {
    path: 'slide-decks/vimshottari-timeline.pdf',
    beaconType: 'slides',
    label: 'Vimshottari Timeline',
    summary: 'Temporal analysis',
  },
];

const MIND_MAP_ASSET: Omit<BeaconAsset, 'path'> = {
  beaconType: 'study',
  label: 'Mind Map',
  summary: 'Interactive knowledge map',
};

/**
 * Legacy fallback used when a caller cannot list the person's R2 prefix.
 * New code should call resolveBeaconAssets(assetPaths) with the live object
 * list so entry-specific filenames are reflected in generated worlds.
 */
export const KNOWN_ASSETS: BeaconAsset[] = [
  STATIC_ASSETS[0],
  STATIC_ASSETS[1],
  { path: FALLBACK_MIND_MAP_PATH, ...MIND_MAP_ASSET },
  ...STATIC_ASSETS.slice(2),
];

function normalizeAssetPath(path: string): string {
  return path.replace(/^\/+/, '');
}

function findMindMapPath(assetPaths: string[]): string | undefined {
  return assetPaths
    .map(normalizeAssetPath)
    .filter((path) => path.startsWith('mind-map/') && path.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b))[0];
}

function encodeAssetPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

/**
 * Resolves public beacon assets from the actual uploaded object inventory.
 * If no inventory is available, falls back to the original Harshita mapping
 * for backwards compatibility with existing callers.
 */
export function resolveBeaconAssets(assetPaths?: string[]): BeaconAsset[] {
  if (!assetPaths) {
    return KNOWN_ASSETS;
  }

  const available = new Set(assetPaths.map(normalizeAssetPath));
  const resolved: BeaconAsset[] = [];

  for (const asset of STATIC_ASSETS.slice(0, 2)) {
    if (available.has(asset.path)) {
      resolved.push(asset);
    }
  }

  const mindMapPath = findMindMapPath(assetPaths);
  if (mindMapPath) {
    resolved.push({ path: mindMapPath, ...MIND_MAP_ASSET });
  }

  for (const asset of STATIC_ASSETS.slice(2)) {
    if (available.has(asset.path)) {
      resolved.push(asset);
    }
  }

  return resolved;
}

/**
 * Generates beacon positions on a golden-angle spiral in the XZ plane.
 * Beacons spread 25–80 units from origin; the central garden radius 0–25
 * is reserved for spawn arrival so the player walks to discover them.
 * Y is intentionally omitted — the frontend renders on a 2D ground plane.
 */
export function generateSpiralPosition(index: number, total: number): { x: number; z: number } {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const radius = 25 + (index / total) * 55;
  const angle = index * goldenAngle;
  return {
    x: Math.round(radius * Math.cos(angle) * 100) / 100,
    z: Math.round(radius * Math.sin(angle) * 100) / 100,
  };
}

/**
 * Transforms an R2 manifest into a world-config with positioned beacons.
 * Passing assetPaths lets callers reflect entry-specific filenames from R2.
 */
export function transformManifestToWorldConfig(manifest: Manifest, assetPaths?: string[]): WorldConfig {
  const assets = resolveBeaconAssets(assetPaths);
  const beacons: Beacon[] = assets.map((asset, index) => ({
    id: `beacon-${index}`,
    label: asset.label,
    summary: asset.summary,
    type: asset.beaconType,
    position: generateSpiralPosition(index, assets.length),
    assetUrl: `/api/assets/${encodeURIComponent(manifest.personId)}/${encodeAssetPath(asset.path)}`,
  }));

  return {
    personId: manifest.personId,
    personName: manifest.personName,
    beacons,
  };
}
