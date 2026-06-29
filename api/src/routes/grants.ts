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
 */
grantsRoutes.get('/grants', async (c) => {
  const email = c.get('email');
  
  try {
    const result = await c.env.DB.prepare(
      'SELECT person_id FROM access_grants WHERE email = ?'
    ).bind(email).all();

    const grants = result.results.map((row) => (row as { person_id: string }).person_id);
    
    // Detect if this is a browser navigation (not an API fetch)
    const accept = c.req.header('Accept') || '';
    const isBrowser = accept.includes('text/html') && !accept.includes('application/json');
    
    if (isBrowser) {
      // Redirect to frontend with token in URL hash
      const token = c.req.header('CF-Access-JWT-Assertion');
      const redirectPath = grants.length === 1 
        ? `/p/${grants[0]}` 
        : '/home';
      
      // Redirect to frontend with token
      const redirectUrl = `https://314.tryambakam.space${redirectPath}${token ? '#token=' + encodeURIComponent(token) : ''}`;
      return c.redirect(redirectUrl, 302);
    }
    
    return c.json({ grants });
  } catch (err) {
    console.error('Database error:', err);
    return c.json({ error: 'Failed to fetch grants' }, 500);
  }
});
