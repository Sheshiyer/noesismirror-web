/**
 * Noesis API - Cloudflare Worker
 * Serves world configurations and assets from R2 with D1-based access control.
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth';
import { grantsRoutes } from './routes/grants';
import { worldRoutes } from './routes/world';
import { assetsRoutes } from './routes/assets';
import { adminRoutes } from './routes/admin';

/** Cloudflare Worker bindings */
export interface Bindings {
  PACKS: R2Bucket;
  DB: D1Database;
  CF_ACCESS_AUD: string;
  CF_ACCESS_TEAM: string;
  ADMIN_SECRET?: string;
}

/** Variables set by middleware */
export interface Variables {
  email: string;
  isAdmin?: boolean;
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// CORS: allow local dev + production frontend + API domain
app.use('*', cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4321',
    'https://noesismirror-web-falseearth.vercel.app',
    'https://314.tryambakam.space',
  ],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Admin-Token', 'X-Requested-With'],
  maxAge: 86400,
}));

// Health check endpoints (public, no auth)
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    worker: 'noesis-api',
  });
});
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    worker: 'noesis-api',
  });
});

app.post('/client-events', async (c) => {
  let event: unknown;
  try {
    event = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  console.error('client-event', JSON.stringify(event));
  return c.json({ ok: true }, 202);
});

// Hosts allowed as ?redirect= targets on /auth/callback.
// Anything else falls back to the canonical SPA origin to prevent JWT exfiltration.
const ALLOWED_REDIRECT_HOSTS = new Set([
  '314.tryambakam.space',
  'localhost:5173',
  'localhost:5174',
  'localhost:4321',
]);
const DEFAULT_REDIRECT = 'https://314.tryambakam.space';

function resolveRedirect(raw: string | undefined): string {
  if (!raw) return DEFAULT_REDIRECT;
  try {
    const u = new URL(raw);
    if (ALLOWED_REDIRECT_HOSTS.has(u.host)) {
      return `${u.protocol}//${u.host}${u.pathname.replace(/\/$/, '')}`;
    }
  } catch {
    // fall through
  }
  return DEFAULT_REDIRECT;
}

// Auth callback - returns JWT token to frontend via redirect.
// CF Access path-scoped to this route only; if the header is missing the scope is wrong.
app.get('/auth/callback', async (c) => {
  const token = c.req.header('CF-Access-JWT-Assertion');
  if (!token) {
    return c.json({ error: 'Missing CF Access assertion. Check Access app scope.' }, 401);
  }

  const redirectUrl = resolveRedirect(c.req.query('redirect'));
  return c.redirect(`${redirectUrl}/#token=${encodeURIComponent(token)}`, 302);
});

// Debug endpoint to trace headers (public, no auth)
app.get('/debug-headers', (c) => {
  const headers: Record<string, string> = {};
  c.req.raw.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return c.json({ headers });
});

// Apply auth middleware to /api/* routes (protected)
app.use('/api/*', authMiddleware);

// Mount route modules
app.route('/api', grantsRoutes);
app.route('/api', worldRoutes);
app.route('/api', assetsRoutes);
app.route('/api/admin', adminRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Worker error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
