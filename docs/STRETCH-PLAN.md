# Stretch roadmap plan — R7 → R8 → R6

> **Status:** planned 2026-08-02, for execution in a later session. Near-term (R3, R4, R9)
> and Phase 3 (R10–R14a–c) are shipped. This doc scopes the three remaining Stretch items in
> **value-over-effort priority order**. R14d (usage/adoption/billing telemetry) stays
> **deliberately deferred** — on free tiers the real numbers are ≈0, so it's genuine but
> uninformative, and the only way to make it impressive would be to fabricate it.

**Execution order: R7 first, then R8, then R6.** Each is independently shippable; do not start
the next until the prior is committed + pushed + its README roadmap entry moved to Shipped.

**Guardrails that apply to all three (unchanged from the whole project):**
- **$0 hosting.** Static GitHub Pages SPA + one Cloudflare Worker + Neon. No new paid infra.
- **Honest data.** Never fabricate. Missing signal renders an explicit "Not reported", never a
  seeded-looking value. Both data modes (`live` → `dist/`, `seeded` → `dist/seeded/`) keep working.
- **Green gate.** `tsc --noEmit`, `npm test` (Vitest), `npm run build:all`, and the Playwright
  smoke suite must stay green. Add tests for new pure logic.
- **Reproducibility.** Write a `.git_prompts/sessions/…` record per session (local-only).

Key files referenced below:
- Executive rollups: [`src/live/ui/LiveExecutiveDashboard.tsx`](../src/live/ui/LiveExecutiveDashboard.tsx) · seeded [`src/modules/executive-dashboard/ExecutiveDashboard.tsx`](../src/modules/executive-dashboard/ExecutiveDashboard.tsx)
- Cross-Product: [`src/live/ui/CrossProductLive.tsx`](../src/live/ui/CrossProductLive.tsx) · seeded [`src/modules/cross-product-analytics/CrossProductAnalytics.tsx`](../src/modules/cross-product-analytics/CrossProductAnalytics.tsx)
- Persistence Worker + Neon: [`server/index.js`](../server/index.js) (tables `studio_entities`, `registrations`, `workflow_stages`, `audit_events`)
- Live store + identity: [`src/live/store.ts`](../src/live/store.ts) (the device-local **"Acting as"** identity) · registry [`src/live/registry.ts`](../src/live/registry.ts)

---

## R7 — Board-ready export  ✅ SHIPPED 2026-08-06

> Delivered: a client-side **Export PDF** button on the Executive Dashboard + Cross-Product
> scorecard downloads a board-ready report (cover, KPIs, exec summary, top opportunities, products
> table) via jsPDF + html-to-image (lazy-loaded); rollup math extracted to unit-tested
> `src/live/report/rollups.ts` so the PDF matches the screen. 11 Vitest + 1 Playwright download
> test. PPTX deck deferred; a seeded-demo equivalent is a possible follow-on. Original scope below.

**Objective.** One click on the Executive Dashboard and Cross-Product scorecard produces a
**board-ready PDF** (primary) — cover page + KPIs + executive summary + top opportunities +
cross-product table + risk summary — generated entirely client-side ($0, nothing leaves the
browser). A `.pptx` deck is an optional follow-on, not required for "shipped".

**Why this shape.** The Executive/ Cross-Product screens already compute every number; export is
presentation, not new data. It directly serves the executive persona and demos instantly.

**Decisions to make at session start:**
1. **Format:** PDF only (recommended for MVP) vs PDF + PPTX. → default PDF; PPTX as stretch.
2. **Mechanism:** (a) `@media print` stylesheet + `window.print()` (lowest effort, relies on the
   browser's Save-as-PDF), vs (b) client-side **download** via `jsPDF` + `html-to-image`
   (true "Export PDF" button, multi-page). → **recommend (b)** for a real artifact, with (a) as
   a zero-dep fallback. If PPTX: add `pptxgenjs`.
3. **Capture surface:** render a dedicated **fixed-size report view** (e.g. a `/report` route or
   a `?print=1` layout) rather than screenshotting the responsive dashboard — Recharts'
   `ResponsiveContainer` sizes to 0 off-screen and prints unreliably. Give the report view
   fixed chart dimensions.

**Scope / steps:**
1. New `src/live/ui/report/` (and a seeded equivalent): a print-optimized, fixed-width report
   layout — cover (portfolio name, date, prepared-by = the "Acting as" identity, live-source
   count), Executive KPIs (reuse the rollup selectors, **not** the responsive tiles), executive
   summary text, top-opportunity list, cross-product scorecard table, open-risk summary. Honest
   "Not reported" preserved everywhere.
2. `src/lib/export/pdf.ts` — a small pure-ish module: take the report DOM node(s) → multi-page
   A4/Letter PDF (`jsPDF` + `html-to-image`). Keep any number/label formatting in tested helpers.
3. "Export PDF" button on Executive Dashboard + Cross-Product (and a combined "Board report").
4. Lazy-load the export deps (keep them off the main bundle — consistent with R3 code-splitting).
5. Tests: Vitest for the formatting helpers; a Playwright test that clicks Export and asserts a
   download event fires (Playwright `page.waitForEvent('download')`) or that `/report` renders.
6. README: roadmap R7 → Shipped; add an "Export" note.

**Verification.** PDF opens with legible KPIs + charts + tables, honest gaps intact; deps are in
their own lazy chunk; green gate holds.

**Effort:** ~1 session. **Main risk:** chart capture fidelity → mitigated by the fixed-size report view.

---

## R8 — Real observability across all products  ✅ SHIPPED 2026-08-17

> Delivered: a new **Live Observability** view unifying reachability + measured endpoint latency
> (universal), RAG's full runtime metrics, and **data freshness + lineage** for static sources
> (FI provenance / last-updated), with honest "Not reported" gaps; plus a portfolio data-freshness
> KPI on the Executive Dashboard. Derivation extracted to unit-tested
> `src/live/report/observability.ts` (11 Vitest + a Playwright route test). Studio-side only, $0,
> no source redeploys (Diagnostic-endpoint deepening deferred). Original scope below.

**Objective.** Extend the live reliability/observability story (shipped in R14b/c for cost + p95)
to a coherent **per-product observability strip** — honestly, capped by what each source exposes.

**Honest reality per source (audit first, build second):**
- **Enterprise RAG** (Cloud Run `/snapshot`): already rich — live latency, grounded rate,
  cost/query, volume, traces. Nothing to add; surface it fully.
- **AI-Native Diagnostic** (Render service, `/api/snapshot`): can plausibly expose request
  **latency / uptime / recent-activity** — enrich its snapshot endpoint with an `observability`
  block if the runtime has the signal.
- **Financial Intelligence** (static Pages JSON): **no runtime traces** — it's a static
  publication. The honest observability dimension here is **data freshness / lineage** (it now
  auto-refreshes via R9; `runAt`/`lastUpdated`/provenance already exist). Show freshness +
  provenance, explicit "Not reported" for latency/cost.

**Decisions to make at session start:**
1. Treat **freshness/lineage** as a first-class observability dimension (so static sources are
   coherent without fabrication) — yes/no. → recommend yes.
2. How far to enrich the Diagnostic endpoint (latency+uptime only, vs recent-activity too).

**Scope / steps:**
1. Extend the snapshot **contract** with an optional `observability` shape: `{ latencyP50/P95,
   errorRate, volume, costPerQuery, freshnessDays, lineage }` — all optional; render what's
   present, honest gap otherwise. Update the adapter types.
2. Cross-repo: add the `observability` block to the **Diagnostic** snapshot endpoint (its repo);
   add `freshnessDays` + lineage surfacing for **FI** (already has timestamps).
3. Studio: a per-product **Observability panel** (new view or fold into the Evaluation/Executive
   pages) — RAG full traces/latency/cost; others partial + freshness; honest gaps.
4. Roll freshness into the Executive Dashboard as a portfolio "data freshness" signal.
5. Tests (rollup/formatting) + README R8 → Shipped.

**Verification.** Each product shows real signal or an explicit honest gap; no fabricated traces;
green gate holds. **Effort:** Med–High (cross-repo); value capped by honest availability — set
expectations that FI stays freshness/lineage, not traces.

---

## R6 — Auth + user management + multi-tenant  *(do third — heaviest)*

**Objective.** Replace the device-local **"Acting as"** placeholder with real sign-in + per-user
identity, add **role-based approvals**, and **per-org (multi-tenant) portfolios** with
server-enforced data isolation. This is the "real product" step; do it in three separable
sub-milestones so each ships value on its own.

**Architecture constraint.** Frontend stays a **static Pages SPA**; the **Cloudflare Worker is the
auth authority** (issues + verifies sessions); Neon holds users/roles/org scoping. Enforcement
must be **server-side** in the Worker — never trust the client. Keep it $0.

**Decisions to make at session start (these gate the whole item):**
1. **Auth method:** (a) OAuth via the Worker (GitHub/Google callback → Worker issues a session
   JWT), vs (b) **magic-link email** (Worker + Resend — FI already uses Resend, proven $0
   pattern). → recommend (b) magic-link for lowest friction/$0, or (a) if a provider login reads
   more "enterprise". Pick one.
2. **Scope of this item:** ship **R6a (auth) alone first** (real login + real governance actor),
   then decide whether R6b/R6c follow this session or later.
3. **Session transport:** JWT in `localStorage` (simple, SPA-friendly) vs httpOnly cookie
   (safer, needs same-site Worker domain). → note the XSS/CSRF trade-off; recommend a short-TTL
   JWT + refresh, or cookie if the Worker shares the site origin.

**Sub-milestones:**
- **R6a — Identity/auth. ✅ SHIPPED 2026-08-17.** Magic-link (Resend) + short-TTL HMAC JWT on the
  existing Worker + Neon; `POST /api/auth/request|verify`, `GET /api/auth/me`; `users` +
  `login_tokens` tables; SPA auth store + Sign-in dialog; optional/progressive (anonymous browsing
  preserved, endpoints 501 → silent fallback). The signed-in user drives the governance actor.
  Setup: [`docs/AUTH.md`](AUTH.md). 8 Vitest tests on the JWT helpers.
- **R6b — Roles / RBAC.** Role model (`viewer | contributor | approver | admin`), stored per user
  in Neon. **Gate governance actions server-side** (who may approve which stage) in the Worker's
  workflow endpoint, plus client affordances (disable Approve when unauthorized). Audit records
  the real actor + role.
- **R6c — Multi-tenant / per-org.** Add an `org_id` dimension to `studio_entities`,
  `registrations`, `workflow_stages`, `audit_events`. Worker derives org from the session and
  **scopes every read/write**; data isolation enforced server-side. Registrations/entities become
  per-org. Requires a Neon migration + backfilling existing rows to a default org.

**Verification.** Real login works; the governance actor is the authenticated user (no more
device-local name); unauthorized users cannot approve (verified server-side, not just hidden);
two orgs cannot see each other's data. Security-review the Worker (there's a `/security-review`
skill). **Effort:** High, security-sensitive — realistically 2–3 sessions; R6a is the clean first
increment.

---

## Follow-up (tech debt, not a Stretch item) — RAG eval pipeline  ✅ DONE 2026-08-16

> Surfaced 2026-08-15 while debugging a stale RAG dashboard; **fixed 2026-08-16** in the
> Enterprise-RAG-Assistant repo (commit `148fab6`). `scripts/build-eval-summary.js` now generates
> `eval/summary.json` from the eval intermediates and computes `knowledgeFreshnessDays` from the
> newest `documents.created_at` in Neon (revealed the real value is **36d**, not the hardcoded 12);
> `eval.js` persists Keyword Hit@5; `refresh-eval.yml` runs eval → eval:judge → eval:summary and
> commits the result; the `server.js` comment is corrected. **Remaining manual step:** the live
> `/snapshot` reflects it only after a Cloud Run redeploy
> (`gcloud run deploy rag-assistant --source . --region us-central1`). Original scope kept below.

**Problem (three linked defects):**
1. **`eval/summary.json` has no generator.** `server.js` `GET /snapshot` reads it live, but it's
   *hand-maintained*. `npm run eval:judge` writes `eval/judge-results.json` (gitignored), a
   different file — so every eval needs a manual sync. This drifted once already: the 2026-08-15
   `eval:judge` run's numbers were put in the README but not this file, so `/snapshot` served
   stale July numbers until a manual fix (commit `c105d5a`).
2. **`knowledgeFreshnessDays` is a hardcoded constant (12)** — never reflects the real KB age, so
   the Studio's Freshness tile is frozen regardless of evals/redeploys.
3. **`refresh-eval.yml` (shipped in R9) is ineffective** — it runs `eval:judge` (writes the
   gitignored file), commits `summary.json` which never changes, and doesn't redeploy Cloud Run,
   so it never closes the loop. (Also: the live `/snapshot` only updates on a Cloud Run redeploy,
   since the container reads the summary baked at deploy time.)

**Fix:**
1. Add `scripts/build-eval-summary.js` that reads `eval/judge-results.json` (+ keyword-eval /
   citation-validity inputs) and emits `eval/summary.json` in the exact shape `server.js` reads:
   `metrics[]`, `derived{retrievalQuality, citationAccuracy, hallucinationRate}`, `evalRunAt`,
   `knowledgeFreshnessDays`. Mapping: `retrievalQuality ← semantic_hit5`,
   `hallucinationRate ← hallucination_rate`, `evalRunAt ← judge timestamp date`; faithfulness /
   correctness / refusal → `metrics[]`.
2. Compute `knowledgeFreshnessDays` **honestly** — days since the KB's real max ingestion date
   (a Neon query over the chunks/corpus table). If no reliable source, emit `null` → the Studio's
   honest "Not reported", never a constant.
3. Chain it: `eval:judge` (or a new `eval:summary`) runs the generator so `summary.json` is
   always regenerated after an eval and committed in the same step.
4. Fix `refresh-eval.yml` to run the generator + commit `summary.json`; automate the Cloud Run
   redeploy if gcloud creds can live in CI, else document redeploy as the manual last step
   (`gcloud run deploy rag-assistant --source . --region us-central1`).
5. Correct the inaccurate `server.js` comment that says `summary.json` is "refreshed by
   npm run eval:judge" (it isn't).

**Verification:** run the generator locally → `summary.json` matches `judge-results.json` +
computed freshness; commit; redeploy; live `/snapshot` shows fresh values **including a real
freshness number**; Studio RAG page → Refresh reflects it.

---

## Session kickoff checklist (next time)
1. Pull all repos; confirm green gate (`npm test`, `build:all`, smoke).
2. **R7 (2026-08-06) and R8 (2026-08-17) are shipped.** Start **R6a** (auth) as the first R6
   increment — resolve R6's kickoff decisions (auth method, session transport, scope) first.
3. Optional follow-ons if wanted: PPTX deck (R7), a seeded-demo export equivalent, and deepening
   the Diagnostic endpoint's observability block (R8, needs a Render redeploy).
4. One `.git_prompts` session record per item shipped.
