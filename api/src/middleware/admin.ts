/**
 * Admin Authentication Middleware
 * Validates X-Admin-Token header against ADMIN_SECRET.
 * Returns 404 if ADMIN_SECRET is not configured (disabled in production).
 * Returns 401 if token is invalid.
 */
import { createMiddleware } from 'hono/factory';
import type { Bindings, Variables } from '../index';

export const adminAuth = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  const adminSecret = c.env.ADMIN_SECRET;

  // If ADMIN_SECRET is not set, admin endpoints are disabled
  if (!adminSecret) {
    return c.json({ error: 'Not found' }, 404);
  }

  const token = c.req.header('X-Admin-Token');
  if (!token || token !== adminSecret) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('isAdmin', true);
  return next();
});
