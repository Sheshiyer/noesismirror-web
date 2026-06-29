# Cloudflare Access Setup

This document describes how to configure Cloudflare Access for email OTP authentication.

## Prerequisites

- Cloudflare account with Zero Trust enabled
- Domain configured in Cloudflare (or use workers.dev subdomain)

## 1. Create Access Application

1. Go to **Cloudflare Dashboard → Zero Trust → Access → Applications**
2. Click **"Add an application"** → **Self-hosted**
3. Configure:
   - **Application name:** Noesis Mirror
   - **Session duration:** 24 hours
   - **Application domain:** `noesis-api.<account>.workers.dev` (or your custom domain)
   - **Path:** leave empty (protects entire domain)

## 2. Configure Identity Provider

1. In the application, go to **"Authentication"**
2. Enable **"One-time PIN"** (email OTP)
3. Optionally add other providers later (Google, GitHub, etc.)

## 3. Create Access Policy

1. **Policy name:** Email Allowlist
2. **Action:** Allow
3. **Include rule:** "Emails" → add allowed emails
   - For beta: add emails from your invite list
   - Example: `harshita@example.com`

### Alternative: Email Domain Rule

For allowing all emails from a domain:
- **Include rule:** "Email ending in" → `@yourdomain.com`

## 4. Get Application Audience (AUD)

1. After creating the application, go to its settings
2. Copy the **"Application Audience (AUD)"** tag
3. Update `api/wrangler.toml`:

```toml
[vars]
CF_ACCESS_AUD = "your-aud-tag-here"
CF_ACCESS_TEAM = "your-team-name"
```

The team name is your Zero Trust organization name (visible in the URL: `https://<team>.cloudflareaccess.com`).

## 5. Test

1. Visit your protected domain
2. Should redirect to CF Access login page
3. Enter email → receive OTP → enter OTP
4. Should redirect back to your app with JWT cookie set

## 6. JWT Validation

The Worker validates the JWT from CF Access:
- Checks signature against CF Access public keys
- Verifies audience matches `CF_ACCESS_AUD`
- Extracts `email` claim for access control

The JWT is sent in:
- `CF-Access-JWT-Assertion` header (API calls)
- `CF_Authorization` cookie (browser)

## Development Mode

For local development, set in `wrangler.toml`:

```toml
[vars]
CF_ACCESS_AUD = "development"
```

This skips JWT validation and uses `dev@localhost` as the email.

## Resources

- [CF Access Docs](https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/)
- [Zero Trust Dashboard](https://one.dash.cloudflare.com/)
