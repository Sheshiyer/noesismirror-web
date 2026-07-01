/**
 * World Routes
 * Serves transformed world-config from R2 manifest files.
 */
import { Hono } from 'hono';
import type { Bindings, Variables } from '../index';
import { transformManifestToWorldConfig } from '../lib/worldConfig';
import { listPersonAssetPaths } from '../lib/personAssets';

export const worldRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

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

    const assetPaths = await listPersonAssetPaths(c.env.PACKS, personId);
    const worldConfig = transformManifestToWorldConfig(manifest, assetPaths);

    return c.json(worldConfig);
  } catch (err) {
    console.error('R2 fetch error:', err);
    return c.json({ error: 'Failed to load world' }, 500);
  }
});
