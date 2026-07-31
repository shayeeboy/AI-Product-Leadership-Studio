# R1 — Shareable persistence (Neon + Cloudflare Worker)

The Studio works fully without this: writes fall back to `localStorage` when no
API is configured. This backend makes registrations, assessments, approvals and
audit **shared across devices/users** and durable. It mirrors the Worker+Neon
pattern already used by the Financial Intelligence project. Cost: **$0** (Neon
Free + Cloudflare Workers Free).

## One-time deploy runbook

1. **Neon** — create a database (or a branch of an existing project) and copy its
   connection string. Apply the schema:
   ```bash
   psql "$DATABASE_URL" -f server/schema.sql
   ```
   (or paste `server/schema.sql` into the Neon SQL editor).

2. **Cloudflare Worker** — from the repo root:
   ```bash
   npx wrangler login
   npx wrangler secret put DATABASE_URL     # paste the Neon string (never committed)
   npm run worker:deploy
   ```
   `wrangler.toml` already sets `ALLOWED_ORIGIN = https://shayeeboy.github.io`.
   Wrangler prints the Worker URL, e.g. `https://ai-studio-persistence.<subdomain>.workers.dev`.

3. **Point the Studio at it** — set the build-time env var and redeploy Pages:
   ```
   VITE_PERSISTENCE_API=https://ai-studio-persistence.<subdomain>.workers.dev
   ```
   Add it as a repo secret/variable consumed by the Pages workflow (or in
   `.env` for local dev). When unset, the Studio silently uses `localStorage`.

4. **Verify**:
   ```bash
   curl https://ai-studio-persistence.<subdomain>.workers.dev/api/health   # {"ok":true,"db":"connected"}
   curl https://ai-studio-persistence.<subdomain>.workers.dev/api/state     # {registrations:[...],...}
   ```

## API

| Method | Path | Body | Purpose |
|---|---|---|---|
| GET | `/api/health` | — | liveness + db check |
| GET | `/api/state` | — | one-shot load of registrations, assessments, workflow, audit, **entities** |
| POST | `/api/registrations` | `{name, businessUnit, owner, adapterType, endpointUrl, lifecycle, annualBudget, monthlySpend, roiTarget}` | register a product (+ seed `Registered` stage + audit) |
| DELETE | `/api/registrations/:id` | — | remove a registration |
| POST | `/api/assessments` | `{title, scores, opportunityScore, recommendation, ...}` | persist an opportunity assessment |
| POST | `/api/workflow` | `{productId, stage, status, reviewer, comment, actor}` | advance a governance stage (+ audit) |
| POST | `/api/entity/:name` | `{id?, productId?, data}` | upsert a Studio-managed entity (R10) |
| DELETE | `/api/entity/:name/:id` | — | delete a Studio-managed entity (R10) |

`adapterType` ∈ `readiness | rag-health | financial | health`. `endpointUrl` is
the product's live snapshot endpoint (nullable for manual entries).

`:name` (entity kind) ∈ `risk | policy | review | model_card | cost_input |
roi_scenario | maturity_score | prioritization_input` — one generic
`studio_entities` table backs them all, so adding a kind needs no migration.

### Updating an already-deployed backend (R10+)

The schema changes are additive (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF
NOT EXISTS`), so to pick up R10:
1. Re-apply `server/schema.sql` in the Neon SQL editor (safe to re-run).
2. Redeploy the Worker: `npm run worker:deploy`.
