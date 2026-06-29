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

// CORS: allow local dev + production Vercel + custom domain
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

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    worker: 'noesis-api',
  });
});

// Apply auth middleware to /api/* routes
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
