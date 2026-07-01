/**
 * Admin Routes
 * Protected endpoints for administrative operations.
 */
import { Hono } from 'hono';
import type { Bindings, Variables } from '../index';
import { adminAuth } from '../middleware/admin';
import { transformManifestToWorldConfig } from '../lib/worldConfig';
import { listPersonAssetPaths } from '../lib/personAssets';

export const adminRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply admin authentication to all admin routes
adminRoutes.use('*', adminAuth);

/**
 * GET /api/admin/persons
 * Scan R2 bucket for top-level prefixes to list all personIds.
 */
adminRoutes.get('/persons', async (c) => {
  try {
    // List objects with delimiter '/' to get top-level prefixes
    const list = await c.env.PACKS.list({ delimiter: '/' });

    // Extract unique personIds from delimitedPrefixes
    const persons: string[] = (list.delimitedPrefixes || [])
      .map((prefix: string) => {
        // Remove trailing slash if present
        const clean = prefix.replace(/\/$/, '');
        return clean;
      })
      .filter(Boolean);

    return c.json({ persons });
  } catch (err) {
    console.error('R2 list error:', err);
    return c.json({ error: 'Failed to list persons' }, 500);
  }
});

/** R2 manifest structure */
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
 * GET /api/admin/world/:personId
 * Returns world-config for the specified person (admin bypass, no grant check).
 */
adminRoutes.get('/world/:personId', async (c) => {
  const personId = c.req.param('personId');

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

/**
 * GET /api/admin/grants/:email
 * Query D1 for all person_ids granted to the given email.
 */
adminRoutes.get('/grants/:email', async (c) => {
  const email = c.req.param('email');

  try {
    const result = await c.env.DB.prepare(
      'SELECT person_id FROM access_grants WHERE email = ?'
    ).bind(email).all();

    const grants = result.results.map((row) => (row as { person_id: string }).person_id);

    return c.json({ grants });
  } catch (err) {
    console.error('Database error:', err);
    return c.json({ error: 'Failed to fetch grants' }, 500);
  }
});

/**
 * POST /api/admin/grants
 * Insert a new access grant into D1.
 * Body: { email: string, personId: string }
 */
adminRoutes.post('/grants', async (c) => {
  let body: { email?: string; personId?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const email = body.email;
  const personId = body.personId;

  if (!email || typeof email !== 'string') {
    return c.json({ error: 'Missing or invalid email' }, 400);
  }
  if (!personId || typeof personId !== 'string') {
    return c.json({ error: 'Missing or invalid personId' }, 400);
  }

  try {
    // Use INSERT OR IGNORE to handle duplicates gracefully
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO access_grants (email, person_id, granted_by) VALUES (?, ?, ?)'
    ).bind(email, personId, 'admin').run();

    return c.json({ success: true, grant: { email, personId } });
  } catch (err) {
    console.error('Database error:', err);
    return c.json({ error: 'Failed to create grant' }, 500);
  }
});
