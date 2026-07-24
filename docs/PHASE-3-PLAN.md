# Phase 3 Plan — Full module parity, live

**Goal.** Bring every left-nav module from the seeded demo into the **live copy** as a
working, real-data app — so the live Studio matches the seeded demo's executive breadth
without any seeded values.

**Guiding decision (2026-07-24).** Phase 3 runs on **Studio-managed data**: real data that is
captured at registration or entered by the user and **persisted to the R1 Neon backend** —
*not* product telemetry. This means R10–R13 need **no further changes to the source apps** and
rely only on the persistence backend that is already deployed. Real product telemetry (live
cost, usage, adoption, reliability) is deferred to **R14, later**.

**Invariant (unchanged from Phase 2).** A live module renders only real / persisted /
registration data plus honest empty states — **never seed**. A number with no source shows
"not reported," not a fabricated value.

---

## Data sources feeding Phase 3

1. **Registration metadata** — captured at register time, editable, persisted (business unit,
   owner, sponsor, lifecycle, architecture, funding/budget, ROI target).
2. **User-entered / decision data** — assessments, prioritization inputs, build-vs-buy
   decisions, ROI scenarios, maturity self-scores, risks, policies, reviews, model cards,
   approvals — all persisted via the Worker + Neon.
3. **Derived rollups** — portfolio health, blended ROI, spend rollup, governance status,
   scorecards — computed from 1 + 2.
4. **Already-live product snapshots** *(free anchors, no new work)* — RAG eval + cost/query,
   Diagnostic readiness, FI indicators. Used where they naturally slot in (e.g. seed the
   Maturity radar from the Diagnostic, anchor the Cost Analyzer on RAG's real cost/query).

Everything a Phase 3 module shows resolves to one of these — otherwise it shows an empty state.

---

## Per-module target (Studio-managed)

| Module | Data (Studio-managed) | Optional real anchor | Phase |
|---|---|---|---|
| Opportunity Assessment | user scoring → persisted assessments | — | 3A |
| Build vs Buy | user inputs → persisted decision | — | 3A |
| ROI Simulator | user inputs → persisted named scenarios | — | 3A |
| Cost Analyzer | user cost assumptions → persisted | RAG real cost/query | 3A |
| Maturity Assessment | self-assessment → persisted | Diagnostic readiness seeds the radar | 3A |
| Investment Prioritization | persisted assessments + registration | — | 3A |
| Human Approval Center | ✅ already live (R1 workflow + audit) | — | done |
| Evaluation Dashboard | ✅ live for products exposing eval; generalize the shape | RAG eval metrics | 3B |
| Portfolio Governance | registry + funding (registration) + persisted risk register + R1 workflow | — | 3B |
| Responsible AI Center | persisted policies / reviews / model cards / compliance + audit | model cards auto-filled from registration + snapshot | 3B |
| Executive Dashboard | rollups from registry + governance + persisted decisions | eval pass-rate, governance status | 3C |
| Cross-Product Intelligence | per-product compare from registration + persisted metrics | live scorecard (exists) | 3C |
| Product Discovery | templated (today) → optional LLM assist | — | R5 (stretch) |
| Dependency graph, real cost/usage/adoption | — | **product telemetry** | R14 (later) |

---

## Phases

### R10 — Data-model foundation *(prerequisite for 3B/3C)*
Extend the registry + backend so Studio-managed governance/decision data has a home.
- **Registration fields:** businessUnit, owner, sponsor, lifecycle, architecture, annualBudget,
  monthlySpend, roiTarget (extend the form + `registrations` table).
- **New Neon entities** (extend `server/schema.sql` + Worker routes): `risks`, `policies`,
  `reviews` (bias/privacy/security), `model_cards`, `cost_inputs`, `roi_scenarios`,
  `maturity_scores`, `prioritization_inputs`.
- **Client:** extend `src/live/persistence.ts` + store with typed CRUD for each entity
  (localStorage fallback preserved).
- **Acceptance:** each entity round-trips (POST → `/api/state` → DELETE) against Neon; localStorage
  parity verified offline.

### R11 — Phase 3A: Decision modules live
Port the six interactive modules into the live app, sourced from persistence.
- Reuse the seeded modules' UI; swap seed reads for the live store + persistence.
- Opportunity scores flow into Investment Prioritization (no re-entry). Cost Analyzer anchors on
  RAG's real cost/query; Maturity radar seeds from the Diagnostic's live readiness.
- **Acceptance:** creating an assessment persists and appears in Prioritization; a saved ROI
  scenario survives reload; no seeded numbers on any 3A screen.

### R12 — Phase 3B: Governance modules live
- **Portfolio Governance:** registry + funding (registration) + a **real risk register** (entered,
  persisted) driving the risk heatmap; live workflow from R1. Dependency graph deferred to R14.
- **Responsible AI Center:** policy library, review queues, model cards, compliance mapping as
  persisted Studio data; audit already live; model cards auto-seed from registration + snapshot.
- **Evaluation Dashboard:** generalize the live RAG panel to any registered product that exposes
  eval metrics.
- **Acceptance:** a risk entered on one screen shows in the heatmap and the product detail; a
  review advanced in the RAI Center writes to the audit trail; all persisted.

### R13 — Phase 3C: Executive rollups live
- **Executive Dashboard:** KPIs computed live from registry + governance + persisted decisions
  (portfolio health, blended ROI target, governance status, eval pass-rate). KPIs with no source
  (e.g. real spend/adoption) show **"not reported"** until R14.
- **Cross-Product Intelligence:** extend the live scorecard with the now-available metrics +
  business-unit segmentation.
- **Acceptance:** every Executive Dashboard tile is either a real rollup or an explicit
  "not reported"; no seeded KPI.

### R14 — Deeper source enrichment *(later — real product telemetry)*
Deferred per the 2026-07-24 decision. Real cost/usage endpoints on the apps (or cloud-billing
integration), adoption/reliability telemetry, and the product **dependency graph**. Fills the
"not reported" gaps left by R13 with real product data.

---

## Architecture approach

- Adopt the seeded app's **left-rail shell** for the live app (it currently uses a top nav), so
  the live Studio's navigation grows to full parity as modules land.
- Migrate **one module at a time**: reuse the seeded module's presentation, replace its data hook
  with a live/persisted source. The seeded demo stays intact at `/seeded/` the whole time.
- Keep the two builds behind `VITE_DATA_MODE` (live default; seeded → `/seeded/`).
- Preserve the invariant: real/persisted/registration data + honest empty states, never seed.

## Sequencing rationale
3A first — fastest, highest-value, and it *generates* the decision data that 3B/3C roll up, all on
the already-deployed R1 backend. 3B adds the governance data model. 3C is pure rollup once A/B data
flows. R14 (telemetry) is independent and deferred.

## Effort shape (rough)
R10 small-to-medium (schema + CRUD) · R11 medium (six modules, mostly re-wiring) · R12 medium-large
(new governance data + UIs) · R13 medium (rollups + empty-state discipline) · R14 large + external.
