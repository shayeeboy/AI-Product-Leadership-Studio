# AI Product and Leadership Studio

> An **executive operating platform** for governing, prioritizing, funding, evaluating and optimizing an enterprise AI **portfolio** — not another AI app, but the layer a Director / VP of AI Product uses to run many AI products at once.

![status](https://img.shields.io/badge/build-passing-brightgreen) ![stack](https://img.shields.io/badge/React%2018-Vite%205-blue) ![hosting](https://img.shields.io/badge/GitHub%20Pages-%240%2Fmo-success) ![license](https://img.shields.io/badge/license-MIT-black)

The Studio is the fourth member of a portfolio whose first three projects are real execution engines — the [AI-Native Diagnostic](https://github.com/shayeeboy/ai-native-diagnostic), [Enterprise RAG Assistant](https://github.com/shayeeboy/Enterprise-RAG-Assistant) and [Financial Intelligence Strategy Agent](https://github.com/shayeeboy/Financial-Intelligence-Strategy-Agent). Rather than rebuild them, the Studio **consumes their outputs** through typed adapters and adds the executive layer they lack: opportunity scoring, build-vs-buy, governance, scorecards, responsible-AI ops, cost/ROI, prioritization and maturity.

---

## Executive summary

| | |
|---|---|
| **Problem** | Enterprises run *many* AI products at once, but the judgment work — which to fund, which to govern, which to kill, what it costs, whether it's safe — happens in scattered decks and spreadsheets. There's no single operating surface for the portfolio. |
| **User** | Senior/Principal PM, Director of Product, Head of AI Product, or AI Strategy leader running an enterprise AI portfolio — plus the governance, finance and risk partners they review with. |
| **Objective** | Demonstrate the *judgment* of an AI product leader: govern, evaluate, fund and scale multiple AI products as one portfolio, with storytelling and decision support on every screen. |
| **Enterprise applicability** | The three-layer model (Executive / Governance / Decision) over adapters + shared services mirrors how a real platform team structures a multi-tenant internal tool. Adapters mean any real AI product — not just the three seeded here — plugs in by populating one snapshot contract. |
| **Success metric** | A reviewer can walk the [demo script](#demo-script) end-to-end and, at each screen, answer *"so what should I decide?"* — with interactive inputs that change outputs, not static mockups. |
| **Acceptance criteria** | All 13 modules live and routable · 3 adapters serving §5 schemas · one governance engine reused in 3 modules · every KPI charted · 3 modules genuinely interactive · Responsible AI Center complete · no inline cross-module data · static build deploys to Pages. Full checklist in [`docs/REVISED-BUILD-BRIEF.md`](docs/REVISED-BUILD-BRIEF.md). |
| **Key trade-off decisions** | See below. |

### Key trade-off decisions

1. **Client-first, not Cloud Run + Neon.** The draft brief mandated a Node API + serverless Postgres. For *stable, seeded demo data* that's infrastructure with no payoff — so the Studio bundles seed data as typed fixtures behind the adapter contract and ships fully static for **$0**, exactly as the Financial Intelligence project did. A live API is a drop-in later because modules depend on the contract, not the source. ([why](docs/REVISED-BUILD-BRIEF.md#what-changed-and-why))
2. **Adapter contract is sacred.** `getSnapshot / getHistory / listProducts` return the §5 schemas whether the data comes from a fixture today or an API tomorrow. Swapping the source touches ~3 files and zero modules.
3. **Breadth with honest depth.** All 13 routes ship live rather than 5 polished screens + 8 stubs. Depth is front-loaded on the executive/governance/decision modules that carry the story; Product Discovery uses templated assists (as the brief permits).
4. **HashRouter over a `404.html` hack** for zero-config deep-linking on Pages.
5. **`npm run build` (tsc + vite) is the green-gate now**; component/e2e tests are sequenced as Roadmap R4, not pretended.

---

## See it live

- **Local:** `npm install && npm run dev` → the dev server prints a `…/AI-Product-Leadership-Studio/` URL.
- **Hosted:** once Pages is enabled (owner: *Settings → Pages → Source: GitHub Actions*), the committed workflow publishes to `https://shayeeboy.github.io/AI-Product-Leadership-Studio/`.

---

## How it works

- [Architecture](#architecture)
- [The three layers](#the-three-layers)
- [Product adapters](#product-adapters)
- [Governance workflow engine](#governance-workflow-engine)
- [Feature modules](#feature-modules)
- [Run it locally](#run-it-locally)
- [Demo script](#demo-script)

### Architecture

Three executive layers sit over the three real execution engines, bound by a shared-services spine. Every module reads **shared services** and **adapters** — never another module's internals (the boundary contract).

![Architecture](assets/architecture.svg)

### The three layers

- **Executive Layer** — Executive Dashboard, Cross-Product Intelligence, Evaluation Dashboard. Optimized for storytelling and drill-down.
- **Governance Layer** — Portfolio Governance, Responsible AI Center, Human Approval Center. Registration → review → approval → audit.
- **Decision Layer** — Opportunity Assessment, Build vs Buy, Cost Analyzer, ROI Simulator, Investment Prioritization, Maturity Assessment. The analytical engines.
- **Shared Services** — evaluation, observability, the governance workflow engine, tracing and cost, so the app behaves like one platform, not ten screens.

### Product adapters

Each portfolio project is an execution engine behind a thin, typed adapter (`src/adapters/`) that returns a common schema (`src/types/domain.ts`):

| Adapter | Feeds | Contract |
|---|---|---|
| AI Native Diagnostic | Executive Readiness | `ReadinessSnapshot` — maturity, capability radar, risk indicators |
| Enterprise RAG Assistant | Knowledge Health + Evaluation | `RagHealthSnapshot` — groundedness, citations, eval metrics, latency |
| Financial Intelligence | Executive Financial | `FinancialIntelligenceSnapshot` — scenarios, NPV, payback, decision traces |

Today these read `src/seed/*`; tomorrow they call a live endpoint. **Nothing downstream changes.**

### Governance workflow engine

One reusable state machine (`src/shared/governance/`) — `Registered → Risk → Security → Responsible AI → Human Approval → Deployment → In Production` — with per-stage status, reviewer, comment and timestamped history. It is implemented **once** and reused on the Product Detail page, the Responsible AI Center and the Human Approval Center. Approvals in the Approval Center mutate the shared store, which updates every timeline and appends to the audit trail live.

![Governance workflow](assets/workflow.svg)

### Feature modules

All 13 ship live under the app shell:

**Executive** — Executive Dashboard · Cross-Product Intelligence
**Governance** — Portfolio Governance · Responsible AI Center · Human Approval Center · Evaluation Dashboard
**Decision** — Opportunity Assessment · Build vs Buy Advisor · Cost Analyzer · ROI Simulator · Investment Prioritization · Maturity Assessment
**Products** — Product Discovery Workspace (+ Product Detail drill-down)

The interactive ones — Opportunity Assessment, Build vs Buy, Cost Analyzer, ROI Simulator, Investment Prioritization, Maturity — recompute outputs from your inputs live. Opportunity scores flow into Investment Prioritization with no re-entry.

### Run it locally

```bash
npm install
npm run dev          # dev server with HMR
npm run build        # tsc typecheck + static production bundle to dist/
npm run preview      # serve the built bundle
```

No `.env`, no database, no keys. See [`.env.example`](.env.example) for the *optional* live-API upgrade.

### Demo script

1. **Executive Dashboard** — portfolio health is *At Risk · 40%*; 10 active products, $45.4K/mo, blended ROI. Read the auto-generated executive summary: two over-budget pilots + a blocked HR bot.
2. **Portfolio Governance** — filter to *Over Budget*; open the risk heatmap; click **Visual QC Inspector** → Product Detail.
3. **Product Detail** — see the adapter data, the governance timeline mid-flow, risks and audit trail in one place.
4. **Opportunity Assessment** — drag the sliders; watch the Opportunity Score, recommendation and radar recompute. Note the inverse dimensions (Risk, Complexity).
5. **Build vs Buy** — set high IP sensitivity + low team maturity → the recommended path flips to RAG/Hybrid with a written rationale.
6. **ROI Simulator** — switch Base/Upside/Downside; watch payback and NPV move.
7. **Human Approval Center** — approve the blocked *Sales Outreach Agent* stage → the audit trail updates instantly (shared engine).
8. **Cross-Product Intelligence** — the Executive Scorecard with traffic lights; segment by business unit.

---

## Lessons learned

- **The infrastructure the brief asked for wasn't the infrastructure the product needed.** A VP-facing demo over *stable seed data* gains nothing from Cloud Run + Neon and loses the $0/zero-secrets property the rest of the portfolio is known for. The valuable part of the brief's backend story was the **adapter contract**, not the backend — so I kept the contract and dropped the servers.
- **Breadth is a feature for this audience.** A portfolio reviewer clicking into a dead "coming soon" stub reads as *unfinished*; a live-but-simpler screen reads as *scoped*. Shipping all 13 routes, honestly labeled, beat polishing five.
- **A shared state machine is what makes ten screens feel like one platform.** The single moment the app stops looking like a mockup is when an approval in one module visibly changes an audit trail in another. That came from one Zustand store, not from any individual screen.
- **`noUnusedLocals` + `tsc` caught the only real defect** (a stray import) before it ever ran — cheap, high-signal correctness for the time budget.
- **Status vocabulary is a design system.** One `lib/status.ts` map for colors/labels is why the whole portfolio reads as one system across badges, heatmaps and timelines.

## Improvement roadmap

**Near-term**
- **R1 — Persistence backend.** Optional Node/Express + Neon behind the *unchanged* adapter contract, so assessments/approvals survive reloads and are shareable.
- **R2 — Live engine integration.** Point the three adapters at each portfolio project's real snapshot endpoint.
- **R3 — Code-split** the Recharts-heavy bundle (735 kB → lazy per route) to cut first-load.
- **R4 — Tests.** Vitest + RTL for the scoring/rollup logic; a Playwright smoke suite over primary nav + one workflow per module.

**Stretch**
- **R5 — Optional live LLM assist** in Product Discovery (graceful template fallback with no key).
- **R6 — Auth + multi-tenant** portfolios (per-org seed → per-org data).
- **R7 — Export** board-ready PDF/deck from the Executive Dashboard and Cross-Product scorecard.
- **R8 — Real observability** feed (traces/cost) replacing the seeded trend series.

---

## Positioning

This reads as a coherent **AI Product Leadership platform**, not "three AI projects plus a dashboard." The three engines are real and already built; the Studio is the governance, decision and executive layer a Director/VP needs to run all of them — and future products — as a portfolio. It demonstrates product judgment, governance, investment decision-making and executive storytelling, not just implementation.

Build details and the full revised brief: [`docs/PLAN.md`](docs/PLAN.md) · [`docs/REVISED-BUILD-BRIEF.md`](docs/REVISED-BUILD-BRIEF.md).
