# Noesis Mirror — Admin CLI Quick Reference

## Status: Production Ready

### Services

| Service | URL | Status |
|---|---|---|
| **Frontend** | `https://314.tryambakam.space` | Canonical app origin |
| **Vercel preview/prod** | `https://noesismirror-web-falseearth.vercel.app` | Frontend deployment |
| **Worker API** | `https://immersiveapi.tryambakam.space` | Source-configured API default |

### Admin CLI Commands

All commands output JSON for piping.

```bash
# List all person IDs in R2
npm run admin:persons

# Fetch generated world config for any person
npm run admin:world -- <personId>

# Check grants for an email
npm run admin:grants -- <email>

# Add grant (email -> personId)
npm run admin:grant -- <email> <personId>

# Show help
npm run admin:help

# Show JSON schema for programmatic use
npx tsx scripts/admin.ts --reference
```

### Quick Start For Deployed Testing

```bash
# 1. Point CLI at the deployed Worker
export API_URL=https://immersiveapi.tryambakam.space
export ADMIN_SECRET=<secret>

# 2. List available readings
npm run admin:persons
# -> {"persons":["harshita"]}

# 3. View world config for a person
npm run admin:world -- harshita | jq '.beacons[] | {id, label, type, assetUrl}'

# 4. Check who has access
npm run admin:grants -- sheshnarayan.iyer@gmail.com
# -> {"grants":["harshita"]}

# 5. Grant access to someone new
npm run admin:grant -- friend@email.com harshita
# -> {"success":true}
```

### Configuration

| File | Purpose |
|---|---|
| `.env` | Local CLI config (`API_URL`, `ADMIN_SECRET`) — **gitignored** |
| `api/.dev.vars` | Worker local dev secrets — **gitignored** |
| `api/wrangler.toml` | Worker bindings: custom domain, R2, D1, CF Access vars |

### Security

- Admin endpoints require `X-Admin-Token` matching `ADMIN_SECRET`.
- Production secret is set with `wrangler secret put ADMIN_SECRET`.
- Local dev secret lives in `api/.dev.vars`.
- If `ADMIN_SECRET` is not set, admin endpoints return `404`.
- Admin bypass is checked before CF Access JWT validation.

### Architecture

```text
Frontend /p/:personId
  -> Worker /api/world/:personId
  -> CF Access JWT validation
  -> D1 access_grants check
  -> R2 manifest fetch
  -> generated WorldConfig

AssetViewer
  -> Worker /api/assets/:personId/*
  -> same grant check
  -> R2 object stream with Range support

Admin CLI
  -> Worker /api/admin/*
  -> X-Admin-Token
  -> R2 / D1 administrative reads and grant writes
```

### Add A New Person

1. Generate premium assets into the external premium-assets tree with `manifest.json`.
2. Upload them with `npm run sync -- <personId>`.
3. Confirm with `npm run admin:world -- <personId>`.
4. Grant access with `npm run admin:grant -- <email> <personId>`.
5. Visit `https://314.tryambakam.space/p/<personId>`.
