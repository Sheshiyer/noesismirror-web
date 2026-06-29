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
      // Return HTML page that redirects to the app
      // This is needed because the API is on a different domain than the frontend
      const redirectPath = grants.length === 1 
        ? `/p/${grants[0]}` 
        : '/home';
      
      return c.html(`<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0; url=${redirectPath}">
  <script>window.location.replace('${redirectPath}');</script>
</head>
<body>
  <p>Authenticated. Redirecting...</p>
</body>
</html>`);
    }
    
    return c.json({ grants });
  } catch (err) {
    console.error('Database error:', err);
    return c.json({ error: 'Failed to fetch grants' }, 500);
  }
});
