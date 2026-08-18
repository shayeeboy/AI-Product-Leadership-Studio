# Auth (R6a) — passwordless magic-link sign-in

Optional, progressive sign-in for the live Studio. Anyone can keep exploring
anonymously (with the device-local **"Acting as"** name); signing in upgrades
that to a **verified identity**, and governance actions attribute to the
signed-in user. Built on the existing Cloudflare Worker + Neon, **$0**.

**How it works.** The SPA never handles a password. You enter an email → the
Worker emails a one-time link (via Resend) → clicking it hits `/api/auth/verify`,
which issues a short-TTL **HMAC-signed JWT** the SPA holds in `localStorage` and
sends as `Authorization: Bearer …`. Only a SHA-256 hash of each one-time token is
stored; tokens are single-use and expire in 15 minutes.

Until the steps below are done the auth endpoints return **501** and the app
silently stays on the device-local identity — nothing breaks.

## One-time setup (account-gated — you run these)

**1. Migrate Neon** (adds `users` + `login_tokens`; additive, safe to re-run):

```bash
psql "$DATABASE_URL" -f server/schema.sql
```

**2. Set the Worker secrets + vars.** A random JWT secret and your Resend key:

```bash
wrangler secret put AUTH_JWT_SECRET   # paste a long random string (e.g. `openssl rand -base64 48`)
wrangler secret put RESEND_API_KEY    # your Resend API key
```

Add the two non-secret vars to `wrangler.toml` (already stubbed there):

```toml
[vars]
MAIL_FROM = "Studio <noreply@your-verified-domain>"   # a Resend-verified sender
APP_URL   = "https://shayeeboy.github.io/AI-Product-Leadership-Studio"
```

**3. Deploy the Worker:**

```bash
npm run worker:deploy
```

That's it — the **Sign in** button (already shipped in the SPA) starts working
on the deployed site. No frontend redeploy is needed; the SPA calls the same
`VITE_PERSISTENCE_API` base it already uses.

## Verify

```bash
curl -s -X POST https://ai-studio-persistence.shayzone.workers.dev/api/auth/request \
  -H 'content-type: application/json' -d '{"email":"you@example.com"}'
# → {"ok":true}  and an email arrives with a working sign-in link
```

## Endpoints (Worker)

| Route | Purpose |
|---|---|
| `POST /api/auth/request {email}` | email a one-time sign-in link (always returns `{ok:true}` — never reveals whether an address exists) |
| `POST /api/auth/verify {token}` | consume the link, upsert the user, return `{ token: <jwt>, user }` |
| `GET  /api/auth/me` | validate the `Authorization: Bearer` JWT → `{ user }` |

## Scope

This is **R6a** (identity). Still to come: **R6b** — roles/RBAC (server-enforced
approval gating), and **R6c** — per-org multi-tenant data isolation. See
[`docs/STRETCH-PLAN.md`](STRETCH-PLAN.md).
