# Admin CLI

Token-gated administrative interface for the Noesis Worker. It can target a local Worker or a deployed Worker, depending on `API_URL`.

Admin routes are available only when `ADMIN_SECRET` is configured. If the Worker has no `ADMIN_SECRET`, `/api/admin/*` returns `404`.

## Setup

1. Copy the local Worker secret template:

   ```bash
   cp api/.dev.vars.example api/.dev.vars
   ```

2. Add matching CLI values to a root `.env` or export them in your shell:

   ```bash
   API_URL=http://localhost:8787
   ADMIN_SECRET=your-local-admin-secret
   ```

3. Start the Worker:

   ```bash
   cd api
   npx wrangler dev
   ```

## Environment Variables

| File | Variable | Purpose |
|---|---|---|
| `api/.dev.vars` | `ADMIN_SECRET` | Secret the local Worker checks for admin requests |
| `.env` or shell | `API_URL` | CLI target, default `http://localhost:8787` |
| `.env` or shell | `ADMIN_SECRET` | Secret the CLI sends in the `X-Admin-Token` header |

Both `.dev.vars` and `.env` are gitignored and must never be committed.

## Commands

Run commands from the repo root. All successful commands print JSON.

### List all persons

```bash
npm run admin:persons
```

### Fetch a world config

```bash
npm run admin:world -- <personId>
```

### List grants for an email

```bash
npm run admin:grants -- <email>
```

### Create or assign a grant

```bash
npm run admin:grant -- <email> <personId>
```

### Show help

```bash
npm run admin:help
```

## Runtime Diagnostics

The browser installs a small client diagnostic reporter at startup. Uncaught
runtime errors and unhandled promise rejections are stored locally in
`localStorage.noesis_diag_events` and posted to the Worker `/client-events`
endpoint. The Worker writes them as `client-event` log lines.

Tail those logs while reproducing a field issue:

```bash
npm run logs:client
```

This lets an operator watch field crashes from the terminal instead of relying
on screenshots or pasted console output.

## Production Safety

- Admin routes check `c.env.ADMIN_SECRET`.
- Missing `ADMIN_SECRET` disables admin routes with `404`.
- Invalid or missing `X-Admin-Token` returns `401`.
- Admin token bypass is checked before CF Access JWT validation so local CLI work does not require a browser login.
- Never commit `api/.dev.vars` or `.env`; both are blocked by `.gitignore`.
