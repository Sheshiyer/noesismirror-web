/**
 * Authentication Middleware
 * Validates Cloudflare Access JWT in production, skips in development.
 */
import { createMiddleware } from 'hono/factory';
import type { Bindings, Variables } from '../index';

interface JWTPayload {
  email?: string;
  sub?: string;
  aud?: string[];
  iss?: string;
  iat?: number;
  exp?: number;
}

/**
 * Decodes a JWT payload without verification (for dev mode).
 * In production, CF Access has already validated the token.
 */
function decodeJWTPayload(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Fetches Cloudflare Access public keys for JWT verification.
 */
async function getCFAccessPublicKeys(teamDomain: string): Promise<CryptoKey[]> {
  const certsUrl = `https://${teamDomain}.cloudflareaccess.com/cdn-cgi/access/certs`;
  const response = await fetch(certsUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch CF Access certs: ${response.status}`);
  }
  const data = await response.json() as { public_certs: Array<{ cert: string }> };
  
  const keys: CryptoKey[] = [];
  for (const cert of data.public_certs) {
    const pemContents = cert.cert
      .replace('-----BEGIN PUBLIC KEY-----', '')
      .replace('-----END PUBLIC KEY-----', '')
      .replace(/\s/g, '');
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    const key = await crypto.subtle.importKey(
      'spki',
      binaryDer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );
    keys.push(key);
  }
  return keys;
}

/**
 * Verifies a CF Access JWT token.
 */
async function verifyCFAccessToken(
  token: string,
  audience: string,
  teamDomain: string
): Promise<JWTPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const signature = Uint8Array.from(
    atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
    c => c.charCodeAt(0)
  );
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

  const keys = await getCFAccessPublicKeys(teamDomain);
  let verified = false;

  for (const key of keys) {
    try {
      verified = await crypto.subtle.verify(
        { name: 'RSASSA-PKCS1-v1_5' },
        key,
        signature,
        data
      );
      if (verified) break;
    } catch {
      continue;
    }
  }

  if (!verified) {
    throw new Error('JWT signature verification failed');
  }

  const payload = decodeJWTPayload(token);
  if (!payload) {
    throw new Error('Failed to decode JWT payload');
  }

  // Validate audience
  if (!payload.aud?.includes(audience)) {
    throw new Error('JWT audience mismatch');
  }

  // Validate expiration
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    throw new Error('JWT has expired');
  }

  return payload;
}

/**
 * Auth middleware that validates CF Access JWT or uses dev mode bypass.
 */
export const authMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  const audience = c.env.CF_ACCESS_AUD;
  const teamDomain = c.env.CF_ACCESS_TEAM;

  // Admin token bypass (for local CLI debugging) — check BEFORE CF Access
  const adminToken = c.req.header('X-Admin-Token');
  if (adminToken && c.env.ADMIN_SECRET && adminToken === c.env.ADMIN_SECRET) {
    c.set('email', 'admin@localhost');
    c.set('isAdmin', true);
    return next();
  }

  // Development mode bypass
  if (audience === 'development') {
    c.set('email', 'dev@localhost');
    return next();
  }

  // Production: validate CF Access JWT
  // Check CF Access header first (from proxy), then Authorization header (from frontend)
  let token = c.req.header('CF-Access-JWT-Assertion');
  
  // If no CF Access token, check for Authorization: Bearer token
  if (!token) {
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }
  }
  
  if (!token) {
    return c.json({ error: 'Missing authentication token' }, 401);
  }

  try {
    const payload = await verifyCFAccessToken(token, audience, teamDomain);
    const email = payload.email;
    
    if (!email) {
      return c.json({ error: 'No email in token' }, 401);
    }

    c.set('email', email);
    return next();
  } catch (err) {
    console.error('Auth error:', err);
    return c.json({ error: 'Invalid authentication token' }, 401);
  }
});
