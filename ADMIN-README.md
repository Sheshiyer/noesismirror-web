# Noesis Mirror — Admin CLI Quick Reference

## Status: Production Ready

### Services

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | https://noesismirror-web-falseearth.vercel.app | Live |
| **Worker API** | https://noesis-api.sheshnarayan-iyer.workers.dev | Live |
| **Custom Domain** | 314.tryambakam.space | Pending DNS setup |

### Admin CLI Commands

All commands output JSON for piping.

```bash
# List all person IDs in the system
npx tsx scripts/admin.ts persons

# Fetch world config for any person (bypasses grant checks)
npx tsx scripts/admin.ts world <personId>

# Check grants for an email
npx tsx scripts/admin.ts grants <email>

# Add grant (email → personId)
npx tsx scripts/admin.ts grant <email> <personId>

# Show help
npx tsx scripts/admin.ts --help

# Show JSON schema for programmatic use
npx tsx scripts/admin.ts --reference
```

### Quick Start for Testing

```bash
# 1. List available readings
API_URL=https://noesis-api.sheshnarayan-iyer.workers.dev npx tsx scripts/admin.ts persons
# → {"persons":["harshita"]}

# 2. View world config for a person
API_URL=https://noesis-api.sheshnarayan-iyer.workers.dev npx tsx scripts/admin.ts world harshita | jq '.beacons[] | {id, title: .asset.title}'

# 3. Check who has access
API_URL=https://noesis-api.sheshnarayan-iyer.workers.dev npx tsx scripts/admin.ts grants sheshnarayan.iyer@gmail.com
# → {"grants":["harshita"]}

# 4. Grant access to someone new
API_URL=https://noesis-api.sheshnarayan-iyer.workers.dev npx tsx scripts/admin.ts grant friend@email.com harshita
# → {"success":true}
```

### Configuration

| File | Purpose |
|------|---------|
| `.env` | Local CLI config (API_URL, ADMIN_SECRET) — **gitignored** |
| `api/.dev.vars` | Worker local dev secrets — **gitignored** |
| `api/wrangler.toml` | Worker bindings (R2, D1) — **no secrets here** |

### Security

- Admin endpoints require `X-Admin-Token` header matching `ADMIN_SECRET`
- Production: `ADMIN_SECRET` set via `wrangler secret put` (encrypted at rest)
- Local dev: `ADMIN_SECRET` in `api/.dev.vars` (never committed)
- If `ADMIN_SECRET` is not set, admin endpoints return **404**
- Admin bypass checked **before** CF Access JWT validation

### Architecture

```
Frontend (Vercel) ←→ Worker API (Cloudflare) ←→ R2 (assets) + D1 (grants)
     ↑                                    ↑
   CF Access                            Admin CLI
   (JWT auth)                           (token auth)
```

### Next Steps

1. **Custom Domain**: Point `314.tryambakam.space` CNAME to `cname.vercel-dns.com`
2. **CF Access Setup**: Configure application URL in Zero Trust dashboard
3. **Add New Person**: Generate premium assets → `npm run sync <personId>` → test via admin CLI
