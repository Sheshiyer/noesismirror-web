/**
 * World Routes
 * Serves transformed world-config from R2 manifest files.
 */
import { Hono } from 'hono';
import type { Bindings, Variables } from '../index';

export const worldRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/** Asset entry for beacons */
interface BeaconAsset {
  path: string;
  type: 'audio' | 'image' | 'video' | 'document' | 'text' | 'mind-map';
  title: string;
  description?: string;
}

/** Actual R2 manifest structure from premium-assets generator */
interface Manifest {
  personId: string;
  personName: string;
  generatedAt: string;
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  quality: Array<{ name: string; status: string; detail: string }>;
  gate?: { passed: boolean };
  notebooklm?: Record<string, unknown>;
}

/**
 * Known asset paths in the premium-assets structure.
 * These are derived from the directory structure created by the generator.
 */
const KNOWN_ASSETS: BeaconAsset[] = [
  { path: 'audio/deep-dive-long.mp3', type: 'audio', title: 'Deep Dive Audio', description: 'Comprehensive audio exploration' },
  { path: 'video/video-brief.mp4', type: 'video', title: 'Video Brief', description: 'Visual introduction' },
  { path: 'mind-map/Harshita\'s Personal Companion Dossier.json', type: 'mind-map', title: 'Mind Map', description: 'Interactive knowledge map' },
  { path: 'reports/briefing.md', type: 'document', title: 'Briefing Report', description: 'Executive summary' },
  { path: 'reports/study-guide.md', type: 'document', title: 'Study Guide', description: 'Detailed learning material' },
  { path: 'quiz/quiz.md', type: 'text', title: 'Quiz', description: 'Knowledge check' },
  { path: 'flashcards/flashcards.md', type: 'text', title: 'Flashcards', description: 'Quick review cards' },
  { path: 'slide-decks/detailed.pdf', type: 'document', title: 'Detailed Slides', description: 'Full presentation' },
  { path: 'slide-decks/preview.pdf', type: 'document', title: 'Preview Slides', description: 'Quick overview presentation' },
  { path: 'slide-decks/vimshottari-timeline.pdf', type: 'document', title: 'Vimshottari Timeline', description: 'Temporal analysis' },
];

/** Beacon in the world-config */
interface Beacon {
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
interface WorldConfig {
  personId: string;
  personName: string;
  beacons: Beacon[];
  metadata: {
    generatedAt: string;
    assetCount: number;
  };
}

/**
 * Generates beacon positions in a spiral pattern.
 * Creates visually interesting distribution for VR/3D environments.
 */
function generateSpiralPosition(index: number, total: number): { x: number; y: number; z: number } {
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
function transformManifestToWorldConfig(manifest: Manifest): WorldConfig {
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

/**
 * Checks if user has access grant for the given personId.
 */
async function hasGrant(db: D1Database, email: string, personId: string): Promise<boolean> {
  const result = await db.prepare(
    'SELECT 1 FROM access_grants WHERE email = ? AND person_id = ? LIMIT 1'
  ).bind(email, personId).first();
  
  return result !== null;
}

/**
 * GET /api/world/:personId
 * Returns the world-config for the specified person.
 */
worldRoutes.get('/world/:personId', async (c) => {
  const personId = c.req.param('personId');
  const email = c.get('email');

  // Check access grant
  try {
    const granted = await hasGrant(c.env.DB, email, personId);
    if (!granted) {
      return c.json({ error: 'Access denied to this world' }, 403);
    }
  } catch (err) {
    console.error('Grant check error:', err);
    return c.json({ error: 'Failed to verify access' }, 500);
  }

  // Fetch manifest from R2
  const manifestKey = `${personId}/manifest.json`;
  try {
    const object = await c.env.PACKS.get(manifestKey);
    
    if (!object) {
      return c.json({ error: 'World not found' }, 404);
    }

    const manifestText = await object.text();
    const manifest: Manifest = JSON.parse(manifestText);

    // Transform and return world-config
    const worldConfig = transformManifestToWorldConfig(manifest);
    
    return c.json(worldConfig);
  } catch (err) {
    console.error('R2 fetch error:', err);
    return c.json({ error: 'Failed to load world' }, 500);
  }
});
