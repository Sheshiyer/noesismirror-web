/**
 * Grants Routes
 * Returns the list of person IDs the authenticated user has access to.
 */
import { Hono } from 'hono';
import type { Bindings, Variables } from '../index';

export const grantsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * GET /api/grants
 * Returns all person_ids granted to the authenticated user.
 * JSON-only; /auth/callback is the sole browser redirect entry point.
 */
grantsRoutes.get('/grants', async (c) => {
  const email = c.get('email');

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
