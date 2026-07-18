# Revised Build Brief — AI Product & Leadership Studio

This revises the original draft prompt (`AI_Product_and_Leadership_Studio_Claude_Code_Prompt_2.md`). The vision, the three-layer model, the 13 modules, the adapter schemas (Section 5) and the governance workflow (Section 7) are **kept intact**. What changes is the delivery architecture and the build sequencing — revised to match how the rest of the portfolio actually shipped ($0, static-first, honest about scope).

## What changed and why

| # | Original brief | Revised decision | Rationale |
|---|---|---|---|
| 1 | Node/Express API on **Google Cloud Run** + **Neon Postgres** as the source of truth for *seeded demo data*. | **Client-first**: bundle the seed data as typed TS fixtures read through the adapters. No backend, no database for the demo. | The Financial Intelligence project deliberately dropped Neon and shipped fully client-side on Pages for $0. Standing up Cloud Run + Neon to serve **stable, non-randomized demo data** is infrastructure with no payoff at the demo stage. The adapter contract is preserved, so a live API is a drop-in later (see #3). |
| 2 | `apps/web` + `apps/api` monorepo with two deploy workflows. | Single Vite app at repo root, one Pages workflow. | One deployable unit matches the sibling repos and removes CI/CORS/secrets surface area that adds risk without demo value. |
| 3 | Adapters call API routes that read Postgres. | Adapters are **async typed clients** over a seed module. `getSnapshot / getHistory / listProducts` unchanged. | Downstream modules depend on the *contract*, not the source. Swapping seed → live API changes ~3 files and zero modules. This is the architecturally important part the brief was protecting, and it is fully honored. |
| 4 | `HashRouter` **or** `404.html` redirect for Pages SPA routing. | **HashRouter**, decisively. | Zero-config, no refresh/deep-link 404s, no `404.html` hack. |
| 5 | 13 modules all "independently routable and extensible." | Same — **all 13 routes ship live** with the shared engine and adapters. Depth is front-loaded on the executive + governance + decision modules that carry the story; Discovery uses templated assists (as the brief itself allows). | Honest scoping: every route renders real, seeded, mostly-interactive content — no dead links — rather than a few polished screens and stubs. |
| 6 | Vitest + Playwright test suites. | `npm run build` (tsc + vite) as the green-gate now; component/e2e tests are Roadmap R4. | Type-checking the whole app is the highest-value correctness signal for the time budget; formal test suites are sequenced, not skipped. |

## Unchanged (still binding)

- Three-layer model (Executive / Governance / Decision) over three execution engines + shared services.
- Module boundary contract (§2.4): modules read shared services + adapters, never another module's internals; cross-module links via route IDs.
- Adapter schemas exactly as in §5.1–5.3.
- Governance state machine (§7) implemented **once** and reused in ≥3 modules.
- Leadership-oriented UI naming (§3 table).
- Executive storytelling over technical complexity (§8): every screen answers "so what do I decide?"

## Revised acceptance criteria

1. All 13 modules routable and live under the shell; no dead links. ✅
2. Three adapters serve stable seeded data matching §5 schemas; Executive Dashboard, Governance, Evaluation and Cross-Product visibly consume them. ✅
3. Governance workflow engine implemented once (`shared/governance`), persists in-session via the store, reused in Product Detail + Responsible AI Center + Human Approval Center. ✅
4. Every Executive Dashboard KPI rendered with seeded numbers and ≥1 interactive chart. ✅
5. Opportunity Assessment, Build vs Buy and Investment Prioritization are genuinely interactive (inputs change outputs). ✅
6. Responsible AI Center includes all ten §6.6 items. ✅
7. No module hardcodes another module's data inline. ✅
8. Frontend builds to a static bundle and deploys to GitHub Pages via Actions; base path + HashRouter verified. ✅ (workflow committed; Pages enable is a one-click owner step)
9. Navigable end-to-end, responsive to laptop/tablet width. ✅
10. README covers architecture, deployment, local run, and a demo script. ✅
