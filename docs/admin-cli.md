# Admin CLI

Local-only administrative interface for managing the Noesis Worker.

> ⚠️ **Security Warning:** The admin CLI is strictly for local development. All admin endpoints are disabled in production builds.

---

## Setup

1. **Copy the dev vars template:**
   ```bash
   cp api/.dev.vars.example api/.dev.vars
   ```

2. **Start the Worker locally:**
   ```bash
   cd api
   npx wrangler dev
   ```
   The Worker will read `ADMIN_SECRET` from `api/.dev.vars`.

---

## Environment Variables

| File | Variable | Purpose |
|------|----------|---------|
| `api/.dev.vars` | `ADMIN_SECRET` | Secret the Worker checks for admin requests |
| `.env` (root) | `API_URL` | URL the CLI targets (default: `http://localhost:8787`) |
| `.env` (root) | `ADMIN_SECRET` | Secret the CLI sends in the `X-Admin-Secret` header |

Both `.dev.vars` and `.env` are gitignored and must never be committed.

---

## Commands

All commands are run from the repo root.

### List all persons
```bash
npm run admin:persons
```

### Generate the world
```bash
npm run admin:world
```

### List all grants
```bash
npm run admin:grants
```

### Create or assign a grant
```bash
npm run admin:grant -- --person <person_id> --type <grant_type> --tier <tier>
```

### Show help
```bash
npm run admin:help
```

---

## Production Safety

- Admin routes check `c.env.ADMIN_SECRET`. In production this variable is intentionally omitted, so all admin handlers return `403 Forbidden`.
- Never commit `api/.dev.vars` or `.env`. Both are blocked by `.gitignore`.
- Rotate your local secret if you ever share the repo.
