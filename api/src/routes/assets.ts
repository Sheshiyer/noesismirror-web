/**
 * Assets Routes
 * Streams asset files from R2 with proper content types.
 */
import { Hono } from 'hono';
import type { Bindings, Variables } from '../index';

export const assetsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/** MIME type mappings for common file extensions */
const MIME_TYPES: Record<string, string> = {
  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  
  // Images
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  
  // Video
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  
  // Documents
  '.pdf': 'application/pdf',
  '.json': 'application/json',
  '.xml': 'application/xml',
  
  // Text
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
};

const MEDIA_SNIFF_EXTENSIONS = new Set(['.mp3', '.m4a', '.aac', '.mp4', '.mov']);

/**
 * Gets the MIME type for a file based on its extension.
 */
function getMimeType(path: string): string {
  const ext = path.toLowerCase().match(/\.[^.]+$/)?.[0] ?? '';
  return MIME_TYPES[ext] ?? 'application/octet-stream';
}

export function sniffMediaMimeType(path: string, bytes: Uint8Array, fallback = getMimeType(path)): string {
  const ext = path.toLowerCase().match(/\.[^.]+$/)?.[0] ?? '';
  const isAudioPath = path.toLowerCase().includes('/audio/');
  const isVideoPath = path.toLowerCase().includes('/video/');

  if (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return 'audio/mpeg';
  }

  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    return 'audio/mpeg';
  }

  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    if (isAudioPath || ext === '.m4a' || ext === '.aac' || ext === '.mp3') {
      return 'audio/mp4';
    }
    if (isVideoPath || ext === '.mp4' || ext === '.mov') {
      return 'video/mp4';
    }
  }

  return fallback;
}

async function resolveContentType(bucket: R2Bucket, objectKey: string, assetPath: string): Promise<string> {
  const fallback = getMimeType(assetPath);
  const ext = assetPath.toLowerCase().match(/\.[^.]+$/)?.[0] ?? '';

  if (!MEDIA_SNIFF_EXTENSIONS.has(ext)) {
    return fallback;
  }

  try {
    const sample = await bucket.get(objectKey, { range: { offset: 0, length: 16 } });
    if (!sample) return fallback;
    const bytes = new Uint8Array(await sample.arrayBuffer());
    return sniffMediaMimeType(assetPath, bytes, fallback);
  } catch (err) {
    console.error('MIME sniff error:', err);
    return fallback;
  }
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
 * GET /api/assets/:personId/*
 * Streams the requested asset file from R2.
 */
assetsRoutes.get('/assets/:personId/*', async (c) => {
  const personId = c.req.param('personId');
  let assetPath: string;
  try {
    assetPath = decodeURIComponent(c.req.path.replace(`/api/assets/${personId}/`, ''));
  } catch {
    return c.json({ error: 'Invalid asset path encoding' }, 400);
  }
  const email = c.get('email');

  // Validate path - prevent directory traversal
  if (assetPath.includes('..') || assetPath.startsWith('/')) {
    return c.json({ error: 'Invalid asset path' }, 400);
  }

  // Check access grant
  try {
    const granted = await hasGrant(c.env.DB, email, personId);
    if (!granted) {
      return c.json({ error: 'Access denied' }, 403);
    }
  } catch (err) {
    console.error('Grant check error:', err);
    return c.json({ error: 'Failed to verify access' }, 500);
  }

  // Fetch asset from R2
  const objectKey = `${personId}/${assetPath}`;
  try {
    // Parse Range header (e.g. "bytes=0-1023" or "bytes=1024-").
    // <video>/<audio> elements need 206 partial responses to seek without
    // downloading the full file. Malformed Range is treated as "no range"
    // (lenient — we don't return 416).
    const rangeHeader = c.req.header('Range');
    let rangeOpt: { offset: number; length?: number } | undefined;
    let parsedRange: { start: number; end?: number } | undefined;
    if (rangeHeader) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader.trim());
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] === '' ? undefined : parseInt(match[2], 10);
        if (!Number.isNaN(start) && (end === undefined || (!Number.isNaN(end) && end >= start))) {
          parsedRange = { start, end };
          rangeOpt = end === undefined
            ? { offset: start }
            : { offset: start, length: end - start + 1 };
        }
      }
    }

    // For range requests we need the total object size for Content-Range;
    // do a cheap head() first since R2ObjectBody.size reports the slice length,
    // not the full object length, when a range was supplied.
    let totalSize: number | undefined;
    if (rangeOpt) {
      const head = await c.env.PACKS.head(objectKey);
      if (!head) {
        return c.json({ error: 'Asset not found' }, 404);
      }
      totalSize = head.size;
    }

    const object = rangeOpt
      ? await c.env.PACKS.get(objectKey, { range: rangeOpt })
      : await c.env.PACKS.get(objectKey);

    if (!object) {
      return c.json({ error: 'Asset not found' }, 404);
    }

    const contentType = await resolveContentType(c.env.PACKS, objectKey, assetPath);
    const headers = new Headers({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Accept-Ranges': 'bytes',
    });

    if (parsedRange && totalSize !== undefined) {
      const sliceSize = object.size;
      const endByte = parsedRange.end !== undefined
        ? parsedRange.end
        : parsedRange.start + sliceSize - 1;
      headers.set('Content-Range', `bytes ${parsedRange.start}-${endByte}/${totalSize}`);
      headers.set('Content-Length', sliceSize.toString());
      return new Response(object.body, { status: 206, headers });
    }

    // Full response.
    if (object.size) {
      headers.set('Content-Length', object.size.toString());
    }
    return new Response(object.body, { status: 200, headers });
  } catch (err) {
    console.error('R2 fetch error:', err);
    return c.json({ error: 'Failed to load asset' }, 500);
  }
});
