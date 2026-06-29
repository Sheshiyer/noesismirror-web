# Dynamic Readings API Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace static `world-config.json` files with a Cloudflare Worker API that serves readings dynamically from R2, protected by CF Access email OTP auth.

**Architecture:** 
- Vercel hosts React frontend
- Cloudflare Worker serves `/api/world-config/:personId` and `/api/assets/:personId/*`
- R2 stores premium assets uploaded via `noesis sync` CLI
- D1 stores email→personId access grants
- CF Access provides email OTP authentication, issues JWT

**Tech Stack:** Cloudflare Workers, R2, D1, Access, Hono (Worker framework), wrangler CLI, React, TypeScript

---

## Parallel Workstreams

This plan has **4 independent workstreams** that can be executed in parallel:

| Workstream | Description | Dependencies |
|------------|-------------|--------------|
| **WS1: Infrastructure** | Create R2 bucket, D1 database, CF Access app | None |
| **WS2: Worker API** | Build the API that serves world-config and assets | WS1 (needs bindings) |
| **WS3: Sync CLI** | Build `noesis sync` to upload assets to R2 | WS1 (needs bucket) |
| **WS4: Frontend Auth** | Add auth hooks, guards, update fetch URLs | WS1 (needs Access app) |

**Recommended parallel dispatch:**
- Agent 1: WS1 (Infrastructure) → then WS2 (Worker API)
- Agent 2: WS3 (Sync CLI) — fully independent
- Agent 3: WS4 (Frontend Auth) — can start immediately, mock API until WS2 ready

---

## Workstream 1: Infrastructure Setup

### Task 1.1: Create R2 Bucket

**Files:**
- Create: `api/wrangler.toml`

**Step 1: Create the R2 bucket**

Run:
```bash
cd /Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/noesismirror-web-falseearth
mkdir -p api
wrangler r2 bucket create noesis-packs
```

Expected: "Created bucket noesis-packs"

**Step 2: Create initial wrangler.toml with R2 binding**

```toml
name = "noesis-api"
main = "src/index.ts"
compatibility_date = "2024-12-01"

[[r2_buckets]]
binding = "PACKS"
bucket_name = "noesis-packs"
```

**Step 3: Commit**

```bash
git add api/wrangler.toml
git commit -m "infra: create R2 bucket and wrangler config"
```

---

### Task 1.2: Create D1 Database

**Files:**
- Modify: `api/wrangler.toml`
- Create: `api/schema.sql`

**Step 1: Create the D1 database**

Run:
```bash
wrangler d1 create noesis-auth
```

Expected: Output includes database_id. Copy it.

**Step 2: Add D1 binding to wrangler.toml**

Add to `api/wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "noesis-auth"
database_id = "<paste-database-id-here>"
```

**Step 3: Create schema.sql**

```sql
-- api/schema.sql
CREATE TABLE IF NOT EXISTS access_grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  person_id TEXT NOT NULL,
  granted_at TEXT DEFAULT (datetime('now')),
  granted_by TEXT,
  UNIQUE(email, person_id)
);

CREATE INDEX idx_grants_email ON access_grants(email);
CREATE INDEX idx_grants_person ON access_grants(person_id);

-- Seed with initial grant for testing
INSERT INTO access_grants (email, person_id, granted_by)
VALUES ('harshita@example.com', 'harshita', 'system');
```

**Step 4: Apply schema to D1**

Run:
```bash
wrangler d1 execute noesis-auth --file=api/schema.sql
```

Expected: "Executed ... statements"

**Step 5: Commit**

```bash
git add api/wrangler.toml api/schema.sql
git commit -m "infra: create D1 database with access_grants schema"
```

---

### Task 1.3: Configure Cloudflare Access

**Files:**
- Create: `docs/infra/cf-access-setup.md` (documentation)

**Step 1: Document the manual CF Access setup**

This is done in the Cloudflare dashboard. Create documentation:

```markdown
# Cloudflare Access Setup

## 1. Create Access Application

1. Go to Cloudflare Dashboard → Zero Trust → Access → Applications
2. Click "Add an application" → Self-hosted
3. Configure:
   - Application name: "Noesis Mirror"
   - Session duration: 24 hours
   - Application domain: `api.noesismirror.com` (or your domain)
   - Path: leave empty (protects entire domain)

## 2. Configure Identity Provider

1. In the application, go to "Authentication"
2. Enable "One-time PIN" (email OTP)
3. Optionally add other providers later

## 3. Create Access Policy

1. Policy name: "Email Allowlist"
2. Action: Allow
3. Include rule: "Emails" → add allowed emails
   - For beta: add emails from your invite list

## 4. Get Application Audience (AUD)

1. After creating, go to application settings
2. Copy the "Application Audience (AUD)" tag
3. Add to wrangler.toml as:
   ```toml
   [vars]
   CF_ACCESS_AUD = "your-aud-tag-here"
   CF_ACCESS_TEAM = "your-team-name"
   ```

## 5. Test

Visit your domain → should redirect to CF Access login → enter email → receive OTP → login works.
```

**Step 2: Commit documentation**

```bash
mkdir -p docs/infra
git add docs/infra/cf-access-setup.md
git commit -m "docs: add Cloudflare Access setup guide"
```

---

## Workstream 2: Worker API

### Task 2.1: Scaffold Worker Project

**Files:**
- Create: `api/package.json`
- Create: `api/tsconfig.json`
- Create: `api/src/index.ts`

**Step 1: Create package.json**

```json
{
  "name": "noesis-api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "hono": "^4.6.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241205.0",
    "typescript": "^5.7.0",
    "wrangler": "^3.99.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 3: Create minimal index.ts**

```typescript
// api/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  PACKS: R2Bucket;
  DB: D1Database;
  CF_ACCESS_AUD: string;
  CF_ACCESS_TEAM: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS for Vercel frontend
app.use('*', cors({
  origin: ['http://localhost:5174', 'https://noesismirror.vercel.app'],
  credentials: true,
}));

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }));

export default app;
```

**Step 4: Install dependencies**

Run:
```bash
cd api && npm install
```

**Step 5: Test locally**

Run:
```bash
npm run dev
```

Visit `http://localhost:8787/api/health` → should return `{"status":"ok"}`

**Step 6: Commit**

```bash
git add api/package.json api/tsconfig.json api/src/index.ts
git commit -m "feat(api): scaffold Worker with Hono"
```

---

### Task 2.2: Add JWT Validation Middleware

**Files:**
- Create: `api/src/middleware/auth.ts`
- Modify: `api/src/index.ts`

**Step 1: Create auth middleware**

```typescript
// api/src/middleware/auth.ts
import { Context, Next } from 'hono';

interface CFAccessJWTPayload {
  aud: string[];
  email: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  type: string;
}

// CF Access public keys endpoint
const CERTS_URL = (team: string) =>
  `https://${team}.cloudflareaccess.com/cdn-cgi/access/certs`;

let cachedKeys: JsonWebKey[] | null = null;
let cacheExpiry = 0;

async function getPublicKeys(team: string): Promise<JsonWebKey[]> {
  if (cachedKeys && Date.now() < cacheExpiry) {
    return cachedKeys;
  }
  
  const response = await fetch(CERTS_URL(team));
  const data = await response.json() as { keys: JsonWebKey[] };
  cachedKeys = data.keys;
  cacheExpiry = Date.now() + 60 * 60 * 1000; // Cache for 1 hour
  return data.keys;
}

async function verifyJWT(token: string, aud: string, team: string): Promise<CFAccessJWTPayload | null> {
  try {
    const keys = await getPublicKeys(team);
    
    // Parse JWT header to get kid
    const [headerB64] = token.split('.');
    const header = JSON.parse(atob(headerB64));
    const kid = header.kid;
    
    // Find matching key
    const key = keys.find((k: any) => k.kid === kid);
    if (!key) return null;
    
    // Import key and verify
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      key,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const [, payloadB64, signatureB64] = token.split('.');
    const signatureBuffer = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const dataBuffer = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signatureBuffer,
      dataBuffer
    );
    
    if (!valid) return null;
    
    const payload = JSON.parse(atob(payloadB64)) as CFAccessJWTPayload;
    
    // Verify audience and expiry
    if (!payload.aud.includes(aud)) return null;
    if (payload.exp < Date.now() / 1000) return null;
    
    return payload;
  } catch {
    return null;
  }
}

export async function authMiddleware(c: Context<{ Bindings: { CF_ACCESS_AUD: string; CF_ACCESS_TEAM: string } }>, next: Next) {
  // Skip auth in development
  if (c.env.CF_ACCESS_AUD === 'development') {
    c.set('userEmail', 'dev@localhost');
    return next();
  }
  
  const token = c.req.header('CF-Access-JWT-Assertion') || 
                c.req.cookie('CF_Authorization');
  
  if (!token) {
    return c.json({ error: 'Unauthorized - no token' }, 401);
  }
  
  const payload = await verifyJWT(token, c.env.CF_ACCESS_AUD, c.env.CF_ACCESS_TEAM);
  
  if (!payload) {
    return c.json({ error: 'Unauthorized - invalid token' }, 401);
  }
  
  c.set('userEmail', payload.email);
  return next();
}
```

**Step 2: Update index.ts to use auth middleware**

```typescript
// api/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth';

type Bindings = {
  PACKS: R2Bucket;
  DB: D1Database;
  CF_ACCESS_AUD: string;
  CF_ACCESS_TEAM: string;
};

type Variables = {
  userEmail: string;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// CORS for Vercel frontend
app.use('*', cors({
  origin: ['http://localhost:5174', 'https://noesismirror.vercel.app'],
  credentials: true,
}));

// Health check (no auth)
app.get('/api/health', (c) => c.json({ status: 'ok' }));

// Protected routes
app.use('/api/*', authMiddleware);

// Placeholder for routes
app.get('/api/me', (c) => {
  return c.json({ email: c.get('userEmail') });
});

export default app;
```

**Step 3: Update wrangler.toml with dev vars**

Add to `api/wrangler.toml`:
```toml
[vars]
CF_ACCESS_AUD = "development"
CF_ACCESS_TEAM = "your-team"
```

**Step 4: Commit**

```bash
git add api/src/middleware/auth.ts api/src/index.ts api/wrangler.toml
git commit -m "feat(api): add CF Access JWT validation middleware"
```

---

### Task 2.3: Add Access Grants Check

**Files:**
- Create: `api/src/db/grants.ts`
- Modify: `api/src/index.ts`

**Step 1: Create grants helper**

```typescript
// api/src/db/grants.ts

export interface AccessGrant {
  id: number;
  email: string;
  person_id: string;
  granted_at: string;
  granted_by: string | null;
}

export async function getGrantsForEmail(db: D1Database, email: string): Promise<AccessGrant[]> {
  const result = await db
    .prepare('SELECT * FROM access_grants WHERE email = ?')
    .bind(email)
    .all<AccessGrant>();
  
  return result.results;
}

export async function hasAccess(db: D1Database, email: string, personId: string): Promise<boolean> {
  const result = await db
    .prepare('SELECT 1 FROM access_grants WHERE email = ? AND person_id = ?')
    .bind(email, personId)
    .first();
  
  return result !== null;
}

export async function grantAccess(
  db: D1Database, 
  email: string, 
  personId: string, 
  grantedBy: string
): Promise<void> {
  await db
    .prepare('INSERT OR IGNORE INTO access_grants (email, person_id, granted_by) VALUES (?, ?, ?)')
    .bind(email, personId, grantedBy)
    .run();
}
```

**Step 2: Add /api/me/grants endpoint**

Add to `api/src/index.ts`:
```typescript
import { getGrantsForEmail, hasAccess } from './db/grants';

// ... existing code ...

// Get user's granted packs
app.get('/api/me/grants', async (c) => {
  const email = c.get('userEmail');
  const grants = await getGrantsForEmail(c.env.DB, email);
  return c.json({ 
    email,
    grants: grants.map(g => ({
      personId: g.person_id,
      grantedAt: g.granted_at
    }))
  });
});
```

**Step 3: Commit**

```bash
git add api/src/db/grants.ts api/src/index.ts
git commit -m "feat(api): add access grants database helpers"
```

---

### Task 2.4: Add World Config Endpoint

**Files:**
- Create: `api/src/routes/world-config.ts`
- Modify: `api/src/index.ts`

**Step 1: Create world-config route**

```typescript
// api/src/routes/world-config.ts
import { Hono } from 'hono';
import { hasAccess } from '../db/grants';

type Bindings = {
  PACKS: R2Bucket;
  DB: D1Database;
};

type Variables = {
  userEmail: string;
};

interface ManifestArtifact {
  status: string;
  outputPath: string;
  artifactId?: string;
}

interface Manifest {
  personId: string;
  personName: string;
  notebooklm?: {
    artifacts: Record<string, ManifestArtifact>;
  };
}

interface Beacon {
  id: string;
  label: string;
  summary: string;
  type: 'reading' | 'audio' | 'video' | 'slides' | 'study';
  position: { x: number; z: number };
  assetUrl: string;
  order: number;
  context: string;
}

// Map artifact keys to beacon config
const ARTIFACT_MAP: Record<string, Omit<Beacon, 'id' | 'position' | 'assetUrl' | 'order'>> = {
  audio_deep_dive_long: {
    label: 'Deep Dive Audio',
    summary: 'A long-form audio companion to the witness pack.',
    type: 'audio',
    context: 'For the ears - absorb through listening.',
  },
  video_brief: {
    label: 'Video Brief',
    summary: 'A visual exploration of the witness dossier themes.',
    type: 'video',
    context: 'Watch - see the concepts in motion.',
  },
  study_guide: {
    label: 'Study Guide',
    summary: 'A structured study guide to deepen your engagement.',
    type: 'study',
    context: 'After reading - structure your learning path.',
  },
  briefing_doc: {
    label: 'Briefing Notes',
    summary: 'Executive summary and key takeaways.',
    type: 'study',
    context: 'Quick synthesis - when time is short.',
  },
  slide_deck_detailed: {
    label: 'Detailed Slides',
    summary: 'A comprehensive slide deck covering all topics.',
    type: 'slides',
    context: 'Present - share the work with others.',
  },
  slide_deck_preview: {
    label: 'Preview Slides',
    summary: 'A concise preview slide deck.',
    type: 'slides',
    context: 'Quick overview - hit the high points.',
  },
  quiz: {
    label: 'Knowledge Quiz',
    summary: 'Test your recall and understanding.',
    type: 'study',
    context: 'Prove it - what have you absorbed?',
  },
  flashcards: {
    label: 'Flashcards',
    summary: 'Spaced-repetition flashcards for key concepts.',
    type: 'study',
    context: 'Remember - drill the vocabulary.',
  },
  mind_map: {
    label: 'Mind Map',
    summary: 'A visual mind map - see how concepts connect.',
    type: 'study',
    context: 'Connect - trace the concept lattice.',
  },
};

// Generate beacon positions in a spiral pattern
function generatePositions(count: number): { x: number; z: number }[] {
  const positions: { x: number; z: number }[] = [];
  const spacing = 8;
  let angle = 0;
  let radius = 10;
  
  for (let i = 0; i < count; i++) {
    positions.push({
      x: Math.round(Math.cos(angle) * radius),
      z: Math.round(Math.sin(angle) * radius),
    });
    angle += 0.8;
    radius += 1.5;
  }
  
  return positions;
}

// Convert R2 path to API asset URL
function toAssetUrl(personId: string, outputPath: string): string {
  // outputPath is absolute local path, extract relative part
  const match = outputPath.match(/\.premium-assets\/[^/]+\/(.+)$/);
  if (match) {
    return `/api/assets/${personId}/${match[1]}`;
  }
  // Fallback: use filename
  const filename = outputPath.split('/').pop() || 'unknown';
  return `/api/assets/${personId}/${filename}`;
}

export const worldConfigRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

worldConfigRoutes.get('/:personId', async (c) => {
  const personId = c.req.param('personId');
  const email = c.get('userEmail');
  
  // Check access
  const granted = await hasAccess(c.env.DB, email, personId);
  if (!granted) {
    return c.json({ error: 'Access denied to this reading' }, 403);
  }
  
  // Fetch manifest from R2
  const manifestKey = `${personId}/manifest.json`;
  const manifestObj = await c.env.PACKS.get(manifestKey);
  
  if (!manifestObj) {
    return c.json({ error: 'Reading not found' }, 404);
  }
  
  const manifest: Manifest = await manifestObj.json();
  
  // Build beacons from artifacts
  const beacons: Beacon[] = [];
  const artifacts = manifest.notebooklm?.artifacts || {};
  
  // Add reading beacon first (always present)
  beacons.push({
    id: 'reading',
    label: 'Premium Witness Pack',
    summary: 'The full reading - a complete witness dossier.',
    type: 'reading',
    position: { x: 0, z: 0 }, // Will be replaced
    assetUrl: `/api/assets/${personId}/local/reading.html`,
    order: 0,
    context: 'Start here - the core witness text.',
  });
  
  // Add beacons from artifacts
  for (const [key, artifact] of Object.entries(artifacts)) {
    if (artifact.status !== 'ready') continue;
    
    const config = ARTIFACT_MAP[key];
    if (!config) continue;
    
    beacons.push({
      id: key.replace(/_/g, '-'),
      ...config,
      position: { x: 0, z: 0 }, // Will be replaced
      assetUrl: toAssetUrl(personId, artifact.outputPath),
      order: beacons.length,
    });
  }
  
  // Assign positions
  const positions = generatePositions(beacons.length);
  beacons.forEach((beacon, i) => {
    beacon.position = positions[i];
  });
  
  return c.json({
    personId: manifest.personId,
    personName: manifest.personName,
    beacons,
  });
});
```

**Step 2: Register route in index.ts**

Add to `api/src/index.ts`:
```typescript
import { worldConfigRoutes } from './routes/world-config';

// ... existing code ...

// World config route
app.route('/api/world-config', worldConfigRoutes);
```

**Step 3: Commit**

```bash
git add api/src/routes/world-config.ts api/src/index.ts
git commit -m "feat(api): add world-config endpoint with manifest transform"
```

---

### Task 2.5: Add Assets Proxy Endpoint

**Files:**
- Create: `api/src/routes/assets.ts`
- Modify: `api/src/index.ts`

**Step 1: Create assets route**

```typescript
// api/src/routes/assets.ts
import { Hono } from 'hono';
import { hasAccess } from '../db/grants';

type Bindings = {
  PACKS: R2Bucket;
  DB: D1Database;
};

type Variables = {
  userEmail: string;
};

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.md': 'text/markdown',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function getContentType(path: string): string {
  const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
  return CONTENT_TYPES[ext] || 'application/octet-stream';
}

export const assetsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

assetsRoutes.get('/:personId/*', async (c) => {
  const personId = c.req.param('personId');
  const email = c.get('userEmail');
  
  // Check access
  const granted = await hasAccess(c.env.DB, email, personId);
  if (!granted) {
    return c.json({ error: 'Access denied' }, 403);
  }
  
  // Get asset path (everything after personId)
  const url = new URL(c.req.url);
  const fullPath = url.pathname;
  const assetPath = fullPath.replace(`/api/assets/${personId}/`, '');
  
  if (!assetPath) {
    return c.json({ error: 'No asset path provided' }, 400);
  }
  
  // Fetch from R2
  const key = `${personId}/${assetPath}`;
  const object = await c.env.PACKS.get(key);
  
  if (!object) {
    return c.json({ error: 'Asset not found', key }, 404);
  }
  
  const contentType = getContentType(assetPath);
  
  // Return with appropriate headers
  return new Response(object.body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Content-Length': object.size.toString(),
    },
  });
});
```

**Step 2: Register route in index.ts**

Add to `api/src/index.ts`:
```typescript
import { assetsRoutes } from './routes/assets';

// ... existing code ...

// Assets proxy route
app.route('/api/assets', assetsRoutes);
```

**Step 3: Commit**

```bash
git add api/src/routes/assets.ts api/src/index.ts
git commit -m "feat(api): add assets proxy endpoint with access control"
```

---

## Workstream 3: Sync CLI

### Task 3.1: Create Sync Script

**Files:**
- Create: `witness-agents/scripts/noesis-sync.ts`

**Step 1: Create the sync script**

```typescript
// witness-agents/scripts/noesis-sync.ts
/**
 * noesis-sync: Upload a person's premium assets to R2
 * 
 * Usage: npx tsx scripts/noesis-sync.ts <personId>
 * 
 * Requires: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN env vars
 * Or: Run `wrangler login` first
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const BUCKET_NAME = 'noesis-packs';
const PREMIUM_ASSETS_DIR = '.premium-assets';

function usage() {
  console.log(`
Usage: npx tsx scripts/noesis-sync.ts <personId>

Uploads the premium assets for a person to the R2 bucket.

Example:
  npx tsx scripts/noesis-sync.ts harshita

Prerequisites:
  - Run 'wrangler login' or set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN
  - Person's assets must exist in ${PREMIUM_ASSETS_DIR}/<personId>/
`);
  process.exit(1);
}

function getAllFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];
  
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir));
    } else {
      files.push(relative(baseDir, fullPath));
    }
  }
  
  return files;
}

async function main() {
  const personId = process.argv[2];
  
  if (!personId) {
    usage();
  }
  
  const assetsDir = join(process.cwd(), PREMIUM_ASSETS_DIR, personId);
  
  if (!existsSync(assetsDir)) {
    console.error(`Error: Assets directory not found: ${assetsDir}`);
    process.exit(1);
  }
  
  console.log(`\n📦 Syncing ${personId} to R2 bucket: ${BUCKET_NAME}\n`);
  
  // Get all files to upload
  const files = getAllFiles(assetsDir);
  console.log(`Found ${files.length} files to upload\n`);
  
  let uploaded = 0;
  let failed = 0;
  
  for (const file of files) {
    const localPath = join(assetsDir, file);
    const r2Key = `${personId}/${file}`;
    
    try {
      // Use wrangler r2 object put
      const cmd = `wrangler r2 object put "${BUCKET_NAME}/${r2Key}" --file="${localPath}" --content-type="auto"`;
      execSync(cmd, { stdio: 'pipe' });
      console.log(`  ✓ ${r2Key}`);
      uploaded++;
    } catch (err) {
      console.error(`  ✗ ${r2Key}: ${err}`);
      failed++;
    }
  }
  
  console.log(`\n✅ Sync complete: ${uploaded} uploaded, ${failed} failed\n`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
```

**Step 2: Test the script**

Run:
```bash
cd /Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents
npx tsx scripts/noesis-sync.ts harshita
```

Expected: Files upload to R2 with progress output.

**Step 3: Commit**

```bash
cd /Volumes/madara/2026/twc-vault/01-Projects/tryambakam-noesis/witness-agents
git add scripts/noesis-sync.ts
git commit -m "feat: add noesis-sync CLI to upload assets to R2"
```

---

### Task 3.2: Add npm script alias

**Files:**
- Modify: `witness-agents/package.json`

**Step 1: Add script to package.json**

Add to scripts section:
```json
"noesis:sync": "tsx scripts/noesis-sync.ts"
```

**Step 2: Test**

Run:
```bash
npm run noesis:sync harshita
```

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add noesis:sync npm script alias"
```

---

## Workstream 4: Frontend Auth

### Task 4.1: Create Auth Hook

**Files:**
- Create: `src/hooks/useAuth.ts`

**Step 1: Create the auth hook**

```typescript
// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  email: string | null;
  grants: { personId: string; grantedAt: string }[];
  error: string | null;
}

interface UseAuthResult extends AuthState {
  checkAuth: () => Promise<void>;
  login: () => void;
  logout: () => void;
}

export function useAuth(): UseAuthResult {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    email: null,
    grants: [],
    error: null,
  });

  const checkAuth = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    
    try {
      const response = await fetch(`${API_BASE}/api/me/grants`, {
        credentials: 'include',
      });
      
      if (response.status === 401) {
        setState({
          isAuthenticated: false,
          isLoading: false,
          email: null,
          grants: [],
          error: null,
        });
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Auth check failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      setState({
        isAuthenticated: true,
        isLoading: false,
        email: data.email,
        grants: data.grants,
        error: null,
      });
    } catch (err) {
      setState({
        isAuthenticated: false,
        isLoading: false,
        email: null,
        grants: [],
        error: err instanceof Error ? err.message : 'Auth check failed',
      });
    }
  }, []);

  const login = useCallback(() => {
    // Redirect to CF Access login
    // The API domain triggers the CF Access challenge
    window.location.href = `${API_BASE}/api/me/grants`;
  }, []);

  const logout = useCallback(() => {
    // CF Access logout
    window.location.href = `${API_BASE}/cdn-cgi/access/logout`;
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    ...state,
    checkAuth,
    login,
    logout,
  };
}
```

**Step 2: Commit**

```bash
git add src/hooks/useAuth.ts
git commit -m "feat: add useAuth hook for CF Access authentication"
```

---

### Task 4.2: Create Auth Guard Component

**Files:**
- Create: `src/components/AuthGuard.tsx`

**Step 1: Create the component**

```typescript
// src/components/AuthGuard.tsx
import { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, error, login } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--noesis-void) 0%, var(--noesis-witness) 55%)',
        fontFamily: 'var(--noesis-font-body)',
        color: 'var(--noesis-parchment)',
      }}>
        <img
          src="/noesis-sigil.png"
          alt=""
          style={{
            width: '64px', height: 'auto', marginBottom: '1rem',
            opacity: 0.85, animation: 'khaBreath 3s infinite ease-in-out',
          }}
        />
        <div style={{
          fontFamily: 'var(--noesis-font-display)', fontSize: '0.9rem',
          fontWeight: 600, letterSpacing: '0.3rem',
          color: 'var(--noesis-gold)',
        }}>
          AUTHENTICATING
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--noesis-void) 0%, var(--noesis-witness) 55%)',
        fontFamily: 'var(--noesis-font-body)',
        color: 'var(--noesis-parchment)',
      }}>
        <img
          src="/noesis-sigil.png"
          alt=""
          style={{ width: '88px', height: 'auto', marginBottom: '1.5rem', opacity: 0.9 }}
        />
        <div style={{
          fontFamily: 'var(--noesis-font-display)', fontSize: '1.6rem',
          fontWeight: 700, letterSpacing: '0.55rem', marginBottom: '0.5rem',
          color: 'var(--noesis-gold)',
        }}>
          TRYAMBAKAM NOESIS
        </div>
        <div style={{
          fontFamily: 'var(--noesis-font-body)', fontSize: '0.75rem',
          letterSpacing: '0.18em', color: 'var(--noesis-silver)',
          marginBottom: '2rem', textTransform: 'uppercase',
        }}>
          Private Witness Experience
        </div>
        
        {error && (
          <p style={{ color: 'var(--noesis-terracotta)', marginBottom: '1rem', fontSize: '0.8rem' }}>
            {error}
          </p>
        )}
        
        <button
          onClick={login}
          style={{
            color: 'var(--noesis-gold)',
            backgroundColor: 'transparent',
            border: '1px solid var(--noesis-gold)',
            padding: '0.75rem 2rem',
            letterSpacing: '4px',
            cursor: 'pointer',
            fontFamily: 'var(--noesis-font-display)',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          [ ENTER WITH EMAIL ]
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
```

**Step 2: Commit**

```bash
git add src/components/AuthGuard.tsx
git commit -m "feat: add AuthGuard component for protected routes"
```

---

### Task 4.3: Update useWorldConfig to Use API

**Files:**
- Modify: `src/hooks/useWorldConfig.ts`

**Step 1: Update the hook**

```typescript
// src/hooks/useWorldConfig.ts
import { useEffect, useState } from 'react';
import { WorldConfig } from '../types/world';
import { buildWorldConfig } from '../utils/buildWorldConfig';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

interface UseWorldConfigResult {
  config: WorldConfig | null;
  loading: boolean;
  error: Error | null;
}

export function useWorldConfig(personId: string | undefined): UseWorldConfigResult {
  const [config, setConfig] = useState<WorldConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!personId) {
      setError(new Error('No personId provided'));
      setLoading(false);
      return;
    }

    const id = personId;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setConfig(null);

      try {
        // Fetch from API instead of static file
        const response = await fetch(
          `${API_BASE}/api/world-config/${encodeURIComponent(id)}`,
          { credentials: 'include' }
        );
        
        if (response.status === 401) {
          throw new Error('Please log in to view this reading');
        }
        
        if (response.status === 403) {
          throw new Error('You do not have access to this reading');
        }
        
        if (!response.ok) {
          throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
        }
        
        const raw = await response.json();
        if (cancelled) return;
        
        const parsed = buildWorldConfig(raw);
        setConfig(parsed);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [personId]);

  return { config, loading, error };
}
```

**Step 2: Commit**

```bash
git add src/hooks/useWorldConfig.ts
git commit -m "feat: update useWorldConfig to fetch from API"
```

---

### Task 4.4: Update Main Router with AuthGuard

**Files:**
- Modify: `src/main.tsx`
- Create: `src/components/AuthenticatedHome.tsx`

**Step 1: Create authenticated home that redirects to user's reading**

```typescript
// src/components/AuthenticatedHome.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AuthenticatedHome() {
  const { isAuthenticated, grants, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated && grants.length > 0) {
      // Redirect to first granted reading
      navigate(`/p/${grants[0].personId}`, { replace: true });
    }
  }, [isAuthenticated, grants, isLoading, navigate]);

  if (isLoading) {
    return null; // AuthGuard shows loading
  }

  if (grants.length === 0) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--noesis-void) 0%, var(--noesis-witness) 55%)',
        fontFamily: 'var(--noesis-font-body)',
        color: 'var(--noesis-parchment)',
      }}>
        <img
          src="/noesis-sigil.png"
          alt=""
          style={{ width: '88px', height: 'auto', marginBottom: '1.5rem', opacity: 0.9 }}
        />
        <div style={{
          fontFamily: 'var(--noesis-font-display)', fontSize: '1.2rem',
          fontWeight: 600, letterSpacing: '0.3rem',
          color: 'var(--noesis-gold)', marginBottom: '1rem',
        }}>
          NO READINGS AVAILABLE
        </div>
        <p style={{ color: 'var(--noesis-silver)', fontSize: '0.8rem', textAlign: 'center', maxWidth: '400px' }}>
          Your account does not have access to any readings yet.
          Contact the administrator to request access.
        </p>
      </div>
    );
  }

  return null; // Will redirect
}
```

**Step 2: Update main.tsx**

```typescript
// src/main.tsx
import './style.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthGuard } from './components/AuthGuard';
import AuthenticatedHome from './components/AuthenticatedHome';
import WorldPage from './components/WorldPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthGuard>
        <Routes>
          <Route path="/" element={<AuthenticatedHome />} />
          <Route path="/p/:personId" element={<WorldPage />} />
        </Routes>
      </AuthGuard>
    </BrowserRouter>
  </StrictMode>
);
```

**Step 3: Add environment variable**

Create `.env.example`:
```
VITE_API_URL=http://localhost:8787
```

**Step 4: Commit**

```bash
git add src/main.tsx src/components/AuthenticatedHome.tsx .env.example
git commit -m "feat: add AuthGuard to router, redirect to user's reading"
```

---

### Task 4.5: Update Asset Renderers to Use API URLs

**Files:**
- Modify: `src/components/assetRenderers/renderers.tsx`

**Step 1: Update renderers to handle API URLs**

The renderers already use relative URLs from `beacon.assetUrl`. Since the API returns URLs like `/api/assets/harshita/audio/deep-dive-long.mp3`, we need to prefix with API_BASE.

Add helper at top of file:
```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

function resolveAssetUrl(url: string): string {
  // If it's an API path, prefix with API_BASE
  if (url.startsWith('/api/')) {
    return `${API_BASE}${url}`;
  }
  return url;
}
```

Update each renderer to use `resolveAssetUrl(beacon.assetUrl)` instead of `beacon.assetUrl`.

**Step 2: Commit**

```bash
git add src/components/assetRenderers/renderers.tsx
git commit -m "feat: update renderers to resolve API asset URLs"
```

---

## Workstream 5: Deployment

### Task 5.1: Deploy Worker to Cloudflare

**Files:**
- Modify: `api/wrangler.toml`

**Step 1: Update wrangler.toml for production**

```toml
name = "noesis-api"
main = "src/index.ts"
compatibility_date = "2024-12-01"
account_id = "<your-account-id>"

[[r2_buckets]]
binding = "PACKS"
bucket_name = "noesis-packs"

[[d1_databases]]
binding = "DB"
database_name = "noesis-auth"
database_id = "<your-database-id>"

[vars]
CF_ACCESS_AUD = "<your-access-aud>"
CF_ACCESS_TEAM = "<your-team-name>"
```

**Step 2: Deploy**

Run:
```bash
cd api
npm run deploy
```

Expected: Deployed to `noesis-api.<account>.workers.dev`

**Step 3: Commit**

```bash
git add api/wrangler.toml
git commit -m "chore(api): configure production wrangler settings"
```

---

### Task 5.2: Deploy Frontend to Vercel

**Files:**
- Create: `vercel.json`

**Step 1: Create vercel.json**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Step 2: Set environment variable in Vercel**

In Vercel dashboard, add:
- `VITE_API_URL` = `https://noesis-api.<account>.workers.dev`

**Step 3: Deploy**

Run:
```bash
vercel --prod
```

Or connect repo to Vercel for auto-deploy.

**Step 4: Commit**

```bash
git add vercel.json
git commit -m "chore: add Vercel deployment config"
```

---

## Verification Checklist

After all tasks complete:

- [ ] `wrangler r2 bucket list` shows `noesis-packs`
- [ ] `wrangler d1 list` shows `noesis-auth`
- [ ] `npm run noesis:sync harshita` uploads files to R2
- [ ] `curl https://noesis-api.xxx.workers.dev/api/health` returns `{"status":"ok"}`
- [ ] Visiting production URL triggers CF Access login
- [ ] After login, user is redirected to their reading
- [ ] 3D world loads with beacons from API
- [ ] Asset viewers load audio/video/PDFs through API proxy

---

## Summary

| Workstream | Tasks | Est. Time | Can Parallelize |
|------------|-------|-----------|-----------------|
| WS1: Infrastructure | 1.1-1.3 | 30 min | Start first |
| WS2: Worker API | 2.1-2.5 | 2-3 hrs | After WS1 basics |
| WS3: Sync CLI | 3.1-3.2 | 45 min | Fully parallel |
| WS4: Frontend Auth | 4.1-4.5 | 1.5 hrs | Fully parallel |
| WS5: Deployment | 5.1-5.2 | 30 min | After WS2, WS4 |

**Recommended parallel dispatch:**
- **Agent 1:** WS1 → WS2 → WS5.1 (Infrastructure + API + Deploy API)
- **Agent 2:** WS3 (Sync CLI) — independent
- **Agent 3:** WS4 → WS5.2 (Frontend Auth + Deploy Frontend)
