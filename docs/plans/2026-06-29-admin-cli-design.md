# Admin CLI Design

## Date: 2026-06-29
## Status: Validated

## Overview

A terminal-first admin tool for local debugging of Noesis Mirror readings. Provides non-interactive, JSON-first, agentic-friendly commands to inspect and manage user grants and world configurations.

## Architecture

**Security Model:**
- `ADMIN_SECRET` stored in local `.dev.vars` (never committed)
- Worker checks `X-Admin-Token` header against `env.ADMIN_SECRET`
- Production Workers have no `ADMIN_SECRET` → admin routes return 404
- Local dev: `wrangler dev` loads `.dev.vars` automatically

**Modes:**
1. Normal mode: Standard CF Access auth flow
2. Admin mode: CLI tool bypasses auth via admin token

## CLI Commands

### `persons`
List all personIds in the system by scanning R2 bucket prefixes.

```bash
npx tsx scripts/admin.ts persons
# → {"persons":["harshita"]}
```

### `world <personId>`
Fetch world-config for any personId (bypasses grant checks).

```bash
npx tsx scripts/admin.ts world harshita
# → {"personId":"harshita","personName":"Harshita","beacons":[...]}
```

### `grants <email>`
List grants for any email address.

```bash
npx tsx scripts/admin.ts grants sheshnarayan.iyer@gmail.com
# → {"grants":["harshita"]}
```

### `grant <email> <personId>`
Add a grant (email → personId) to D1 database.

```bash
npx tsx scripts/admin.ts grant sheshnarayan.iyer@gmail.com harshita
# → {"success":true}
```

### `--help`
Print all commands with descriptions and examples.

```bash
npx tsx scripts/admin.ts --help
```

### `--reference`
Print JSON schema of all commands for programmatic use.

```bash
npx tsx scripts/admin.ts --reference
```

## Worker Admin Routes

```typescript
// api/src/routes/admin.ts
GET  /api/admin/persons       → List all personIds from R2
GET  /api/admin/world/:id     → World config for any person
GET  /api/admin/grants/:email → Grants for any email
POST /api/admin/grants        → {email, personId} → Insert grant
```

All routes require `X-Admin-Token` header matching `ADMIN_SECRET`.

## Files

| File | Purpose |
|------|---------|
| `scripts/admin.ts` | CLI entry point |
| `api/src/routes/admin.ts` | Worker admin routes |
| `api/src/middleware/admin.ts` | Admin token validation middleware |
| `.dev.vars` | Local admin secret (gitignored) |

## npm Scripts

```json
{
  "admin:persons": "npx tsx scripts/admin.ts persons",
  "admin:world": "npx tsx scripts/admin.ts world",
  "admin:grants": "npx tsx scripts/admin.ts grants",
  "admin:grant": "npx tsx scripts/admin.ts grant"
}
```

## Next Steps

1. Implement `scripts/admin.ts` with command parser and HTTP client
2. Add `api/src/routes/admin.ts` with admin-only endpoints
3. Create `api/src/middleware/admin.ts` for token validation
4. Add `.dev.vars` template to `.gitignore` and document setup
