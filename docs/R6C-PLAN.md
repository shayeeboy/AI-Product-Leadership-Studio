# R6c — Per-org multi-tenant: full plan

> Status: **planned**, not built. Builds on R6a (auth) + R6b (roles/RBAC), both live.
> This is the heaviest R-item — it touches every Studio table, every Worker route, and the
> client data layer — so it's phased, and a few decisions are yours to make first (§7).

## 0. The one principle that answers most questions

**The org boundary wraps the _Studio's management layer_ — not the source products.**

- **Tenant data (gets `org_id`):** the Studio's own Neon tables — `registrations`, `assessments`,
  `workflow_stages`, `audit_events`, `studio_entities` — plus `users`. This is the governance /
  decision / portfolio data the Studio *manages*.
- **NOT tenant data:** the three source apps (AI-Native Diagnostic, Enterprise RAG, Financial
  Intelligence) are **external, single-instance products**. Their `/snapshot` endpoints are public,
  read-only, and serve **one shared dataset**. Orgs don't change them.

An org's "portfolio" is simply **its set of registrations** — which snapshot endpoints it has
chosen to track. Two orgs can register the same product; they both read the same public snapshot.

## 1. Do we add `org_id` to every app in the portfolio? — **No.**

Only the **Studio's** tables + Worker become org-scoped. The source apps stay org-agnostic:

- Their data (RAG query logs, Diagnostic sessions, FI brief) is a single product dataset, not
  per-customer data. Making each source app itself multi-tenant (per-org knowledge bases, etc.)
  is a **separate, far larger effort** and is explicitly out of R6c scope — they're demonstration
  products the Studio *observes*, not tenant stores.
- What varies per org is **which** endpoints appear (the registration set) and the governance /
  decisions built around them — all Studio-side.

## 2. Super-admin overseeing per-org admins? — **Yes, a 3-tier hierarchy.**

```
platform super-admin   (you — via ADMIN_EMAILS; sees/manages ALL orgs)
        └── org admin  (manages users + roles WITHIN one org)
                └── approver / contributor / viewer  (within one org)
```

- New: an `orgs` table; each `users` row belongs to an org and carries a within-org `role` (R6b),
  plus a platform-level `super_admin BOOLEAN`.
- **Super-admin capabilities:** create / rename / suspend orgs; list all orgs + platform rollups;
  a support "view as org" (audited); (re)assign an org's first admin. Bootstrapped from
  `ADMIN_EMAILS` (so it's break-glass and can't be locked out).
- **Org admin** is R6b's admin, but scoped: they only see/manage users in their own org.

## 3. How does observability work across orgs?

The **underlying signals are global** — the RAG's real p95/cost is the same for everyone, because
it's read live from that product's public snapshot. So:

- Each org's **Live Observability** view = the snapshots for **that org's registered products**
  (same signals, filtered by the org's registration set). Nothing new is stored per org.
- Freshness / lineage / reachability are identical regardless of org.
- **Super-admin** optionally gets a cross-org platform rollup (every org's registered products) —
  a small additive view, not required for R6c core.

## 4. How do the snapshots function with orgs in place? — **Unchanged.**

- Snapshot endpoints stay external, public, read-only, single-dataset. **No `org_id` in the
  snapshot contract.**
- Each org's Studio browser fetches the snapshots for its own registrations (the existing
  `useQueries` fan-out, just over a per-org registration set). Same React Query cache keys
  (`["live", productId, endpointUrl]`) — if two orgs track the same endpoint they share the cache.
- The source apps never learn about orgs. (Cross-org isolation is a Studio concern; the snapshots
  expose no tenant data to isolate.)

## 5. Data model + enforcement

**Schema (additive migration):**
```sql
CREATE TABLE orgs (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(), suspended BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE users            ADD COLUMN org_id TEXT REFERENCES orgs(id);
ALTER TABLE users            ADD COLUMN super_admin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE registrations    ADD COLUMN org_id TEXT;
ALTER TABLE assessments      ADD COLUMN org_id TEXT;
ALTER TABLE workflow_stages  ADD COLUMN org_id TEXT;   -- PK becomes (org_id, product_id, stage)
ALTER TABLE audit_events     ADD COLUMN org_id TEXT;
ALTER TABLE studio_entities  ADD COLUMN org_id TEXT;   -- PK becomes (org_id, entity, id)
-- indexes on org_id for every tenant table
```
- **Backfill:** create a `default` org; stamp every existing row + user with it, so nothing breaks.
- **JWT** carries `org_id` + `role` (+ `super_admin`). The Worker **derives org from the verified
  session — never from a client-supplied value.**
- **Enforcement:** every read filters `WHERE org_id = <session org>`; every insert stamps the
  session org. Route this through one helper so no query can forget it (default-deny). Super-admin
  may pass an explicit `X-Org` to act on a chosen org (audited).
- **workflow_stages / studio_entities** primary keys gain `org_id` (so two orgs can have the same
  product-id/stage without colliding).

**The current hardcoded default registrations** (3 apps in `src/live/registry.ts`) move to being
the **demo org's** data (seeded server-side), rather than global client constants.

## 6. Anonymous / the open demo (don't lose the portfolio's "click to explore")

- Keep a public, **read-only `demo` org** holding the current 3-app portfolio. Anonymous visitors
  see it (read-only); writes require sign-in + membership. This preserves R6a/b's progressive model.
- **Self-signup question (a decision, §7):** a magic-link sign-in from the public dialog — which
  org does that user join? Options: land in the demo org as `viewer`; or disable self-signup so
  only **invites** (which carry the inviter's org) create members.

## 7. Key decisions needed from you (these gate the build)

1. **Membership model:** one-user-one-org (simplest) **[recommended to start]** vs multi-org
   membership + an org switcher (`memberships` table). Single-org first; multi-org is the upgrade.
2. **New-org onboarding:** start blank vs **template-seeded** with the 3 demo apps **[recommended
   template]** so a new org isn't empty.
3. **How users join an org:** invite-into-org (admin invites, user inherits that org) **[recommended]**
   vs email-domain auto-join vs manual super-admin assignment.
4. **Anonymous:** keep a public read-only **demo org [recommended]** vs require sign-in for everything.
5. **Self-signup:** allowed → lands in demo org as viewer, vs **invite-only** membership [recommended
   for a "real" tenant model].
6. **Super-admin surface: ✅ DECIDED — minimal.** Create/rename/suspend orgs; list all orgs (+ user
   / registration counts); audited read-only "view as org"; assign/replace an org's first admin. A
   fuller operator console (usage analytics, cross-org audit search, quotas/billing, org settings)
   is deferred — additive later, and unjustified for a demo without real tenants (same reasoning as
   R14d). Flip to a scoped console only if the goal becomes platform-depth showcase or real orgs.
7. **Org identity transport:** org in the **session/JWT** (single app, static-Pages-friendly)
   **[recommended]** — per-org subdomains aren't feasible on GitHub Pages.

## 8. Phased delivery (each phase shippable)

- **R6c-a — Foundation.** `orgs` table + `org_id`/`super_admin` columns; backfill into a `default`
  org; JWT carries `org_id`; verify/me/invite set org. No behavior change yet (single org).
- **R6c-b — Enforcement.** Route every Worker read/write through an org-scoped helper; stamp inserts;
  filter reads. **Isolation tests** (org A cannot read/write org B). This is the security core.
- **R6c-c — Org & super-admin management.** Super-admin org CRUD + "view as org"; org-admin invites
  scoped to their org; the demo org for anonymous; new-org template seeding.
- **R6c-d — (optional) Multi-org.** `memberships` + an org switcher in the top bar, if you chose #1b.

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| **Cross-org data leak** (a query forgets `WHERE org_id`) | One mandatory org-scoped query helper; default-deny; isolation tests org-A-vs-org-B on every route; code review before deploy. Highest-priority risk. |
| **Backfill/migration** (existing rows have no org) | Create `default` org first; one-shot backfill; test on a Neon branch DB before prod. Additive columns, reversible. |
| **Client trusts an org id** | Org is read only from the verified JWT; any client-sent org is ignored (except super-admin's audited `X-Org`). |
| **Losing the open demo** | Read-only public `demo` org for anonymous; keeps "click to explore." |
| **Accidental scope creep to source apps** | Documented boundary (§0–1): snapshots stay global; do NOT per-org them. |
| **Admin lockout** | `ADMIN_EMAILS` = super-admin break-glass; always re-enabled + cross-org. |
| **workflow/entity PK collisions across orgs** | Add `org_id` to those composite PKs. |
| **Complexity / big blast radius** | Strict phasing; R6c-a/b are safe/small; ship + verify each before the next. |

## 10. What does NOT change

- The source apps and their snapshot endpoints (external, global, read-only).
- The observability/eval/cost signals themselves (global live data).
- R6a auth mechanics + R6b role semantics (role is now *within* an org; everything else stands).
- $0 hosting model: still static Pages + one Worker + Neon.
