# Plan of Action, Resource Requirements & Dependencies

## 1. Plan of action (phased)

| Phase | Scope | Status |
|---|---|---|
| **P0 — Foundation** | Vite + React + TS + Tailwind scaffold, base path, HashRouter, app shell (nav rail by layer, top bar with live portfolio-health), design tokens + status vocabulary. | ✅ Done |
| **P1 — Data spine** | Domain contracts (`types/domain.ts`), 12-product seed portfolio, three adapter snapshots (§5), three async adapters, portfolio rollups. | ✅ Done |
| **P2 — Executive + Governance** | Executive Dashboard (10 KPIs, trend + donut, exec summary, product table), Portfolio Governance (registry, funding, risk heatmap), Product Detail (adapter data + workflow + risks + audit), shared **workflow engine** + timeline. | ✅ Done |
| **P3 — Decision layer** | Opportunity Assessment (live weighted scoring), Build vs Buy (weighted recommender), Cost Analyzer (model-swap what-if), ROI Simulator (scenarios + NPV/payback), Investment Prioritization (RICE/WSJF/Value·Effort/Opportunity + matrix). | ✅ Done |
| **P4 — Governance layer** | Responsible AI Center (all 10 items), Human Approval Center (mutates the shared engine + audit), Evaluation Dashboard (RAG adapter metrics). | ✅ Done |
| **P5 — Round out** | Maturity Assessment (radar + gap roadmap), Cross-Product Analytics (scorecard + traffic lights), Product Discovery (templated assists). | ✅ Done |
| **P6 — Polish & ship** | SVG diagrams, portfolio-style README, Pages Actions workflow, favicon/LICENSE, `npm run build` green, dev-server smoke check. | ✅ Done |
| **P7 — Roadmap** | Persistence backend, tests, code-split, live engine integrations — see README roadmap. | ⏳ Planned |

## 2. Resource requirements

**To run / develop locally**
- Node.js ≥ 18 (built on 24.17) and npm ≥ 9.
- ~180 npm packages (React 18, Vite 5, Tailwind 3, Recharts 2, React Router 6, TanStack Query 5, Zustand 4, lucide-react). All MIT/permissive. **No API keys, no database, no paid services.**
- Any modern browser.

**To deploy (all free tier)**
- A GitHub repo with **Pages enabled → Source: GitHub Actions** (one-click owner step).
- The committed `deploy-web.yml` workflow. No secrets required.

**To take it live (Roadmap only, optional)**
- Neon free Postgres branch + a Node host (Cloud Run free tier) **only if** runtime persistence or live engine data is wanted. Not needed for the portfolio demo.

**Human/skill resources**
- One full-stack TS/React developer for the roadmap items; no ML or infra specialist needed for the current build.

## 3. Dependencies

**Runtime libraries** — `react`, `react-dom`, `react-router-dom` (HashRouter), `recharts` (all charts/radars/scatter), `@tanstack/react-query` (adapter fetch/caching), `zustand` (governance store), `lucide-react` (icons), `clsx`.

**Build/dev** — `vite`, `@vitejs/plugin-react`, `typescript`, `tailwindcss`, `postcss`, `autoprefixer`, `@types/*`.

**Internal (build order matters)**
- `types/domain.ts` → everything.
- `seed/*` → `adapters/*` → modules.
- `shared/governance/store.ts` + `WorkflowTimeline.tsx` → Product Detail, Responsible AI Center, Human Approval Center.
- `lib/status.ts` (status vocabulary) → all badges/heatmaps.
- Opportunity Assessment scores → Investment Prioritization (consumes, no re-entry).

**External / operational**
- GitHub Pages (hosting) — the only hard external dependency to ship.
- GitHub Actions (CI/deploy).
- **No** external data-source, model-provider, or database dependency in the shipped build.

**Assumptions / risks**
- Seed data is illustrative, not real telemetry (called out in the README exec summary).
- Recharts keeps the bundle ~735 kB (gzip ~205 kB) — acceptable for a portfolio SPA; code-split is Roadmap R3.
- Live engine integration depends on each portfolio project exposing a snapshot endpoint (Roadmap R6).
