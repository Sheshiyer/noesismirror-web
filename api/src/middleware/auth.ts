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

/** Converts base64url to standard base64 with proper '=' padding for atob(). */
function b64urlDecode(input: string): string {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  return atob(pad ? b64 + '='.repeat(4 - pad) : b64);
}

/**
 * Decodes a JWT segment (header or payload) without verification.
 */
function decodeJWTSegment<T>(segment: string): T | null {
  try {
    return JSON.parse(b64urlDecode(segment)) as T;
  } catch {
    return null;
  }
}

function decodeJWTPayload(token: string): JWTPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  return decodeJWTSegment<JWTPayload>(parts[1]);
}

/** Normalizes the team domain so callers can pass either "team" or "team.cloudflareaccess.com". */
function normalizeTeamDomain(teamDomain: string): string {
  return teamDomain.replace(/\.cloudflareaccess\.com$/, '');
}

interface JWK {
  kid: string;
  kty: string;
  alg?: string;
  use?: string;
  e: string;
  n: string;
}

/**
 * Fetches Cloudflare Access JWKs for JWT verification. Uses the `keys` array
 * (JWK format) rather than the X.509 `public_certs` array — JWKs import cleanly
 * via crypto.subtle.importKey('jwk', ...) without ASN.1 parsing.
 */
async function getCFAccessJWKs(teamDomain: string): Promise<JWK[]> {
  const team = normalizeTeamDomain(teamDomain);
  const certsUrl = `https://${team}.cloudflareaccess.com/cdn-cgi/access/certs`;
  const response = await fetch(certsUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch CF Access JWKs: ${response.status}`);
  }
  const data = await response.json() as { keys?: JWK[] };
  if (!data.keys?.length) {
    throw new Error('CF Access JWKS returned no keys');
  }
  return data.keys;
}

async function importJWK(jwk: JWK): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
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
  const header = decodeJWTSegment<{ kid?: string; alg?: string }>(headerB64);
  if (!header) {
    throw new Error('Invalid JWT header');
  }

  const signature = Uint8Array.from(
    b64urlDecode(signatureB64),
    c => c.charCodeAt(0)
  );
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

  const jwks = await getCFAccessJWKs(teamDomain);
  // Prefer the JWK whose kid matches the JWT header; fall back to trying all.
  const candidates = header.kid
    ? [...jwks.filter(k => k.kid === header.kid), ...jwks.filter(k => k.kid !== header.kid)]
    : jwks;

  let verified = false;
  for (const jwk of candidates) {
    try {
      const key = await importJWK(jwk);
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

  // Validate issuer matches our CF Access team
  const expectedIss = `https://${normalizeTeamDomain(teamDomain)}.cloudflareaccess.com`;
  if (payload.iss !== expectedIss) {
    throw new Error('JWT issuer mismatch');
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
