-- AI Product & Leadership Studio — R1 persistence schema (Neon Postgres).
-- Apply once against your Neon branch:
--   psql "$DATABASE_URL" -f server/schema.sql
-- (or paste into the Neon SQL editor). Safe to re-run.

-- Registered AI products. The three real portfolio apps are seeded as default
-- registrations by the client; anything registered through the UI lands here too.
CREATE TABLE IF NOT EXISTS registrations (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  business_unit TEXT,
  owner         TEXT,
  sponsor       TEXT,
  architecture  TEXT,
  adapter_type  TEXT NOT NULL,                 -- 'readiness' | 'rag-health' | 'financial' | 'health'
  endpoint_url  TEXT,                          -- live snapshot endpoint (nullable for manual entries)
  status        TEXT NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Opportunity assessments created in the Studio.
CREATE TABLE IF NOT EXISTS assessments (
  id                TEXT PRIMARY KEY,
  product_id        TEXT,
  title             TEXT NOT NULL,
  scores            JSONB NOT NULL DEFAULT '{}',
  opportunity_score INTEGER,
  strategic_fit     TEXT,
  estimated_roi     INTEGER,
  confidence        TEXT,
  recommendation    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Governance workflow state per product/stage (the shared state machine).
CREATE TABLE IF NOT EXISTS workflow_stages (
  product_id TEXT NOT NULL,
  stage      TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'not-started',
  reviewer   TEXT,
  comment    TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, stage)
);

-- Immutable-style audit log of every governance action.
CREATE TABLE IF NOT EXISTS audit_events (
  id         BIGSERIAL PRIMARY KEY,
  product_id TEXT,
  actor      TEXT,
  action     TEXT,
  stage      TEXT,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_events (created_at DESC);

-- ---------------------------------------------------------------------------
-- R10 (Phase 3 foundation) — additive, safe to re-run.
-- ---------------------------------------------------------------------------

-- Extra Studio-managed registration metadata (funding, lifecycle, ROI target).
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS lifecycle     TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS annual_budget NUMERIC;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS monthly_spend NUMERIC;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS roi_target    INTEGER;

-- Generic store for all Phase 3 Studio-managed governance/decision entities:
-- risk · policy · review · model_card · cost_input · roi_scenario ·
-- maturity_score · prioritization_input. One table, keyed by entity name, so
-- new entity kinds need no further migration — just a new allowlisted name.
CREATE TABLE IF NOT EXISTS studio_entities (
  entity     TEXT NOT NULL,
  id         TEXT NOT NULL,
  product_id TEXT,
  data       JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entity, id)
);
CREATE INDEX IF NOT EXISTS studio_entities_lookup  ON studio_entities (entity, product_id);
CREATE INDEX IF NOT EXISTS studio_entities_created ON studio_entities (created_at DESC);

-- ---------------------------------------------------------------------------
-- R6a (auth) — passwordless magic-link sign-in. Additive, safe to re-run.
-- The Worker is the auth authority: it emails a one-time link, then issues a
-- short-TTL Bearer JWT. Only a SHA-256 hash of each one-time token is stored.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,               -- uuid
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- One-time magic-link tokens (hashed). Rows are single-use and short-lived.
CREATE TABLE IF NOT EXISTS login_tokens (
  token_hash TEXT PRIMARY KEY,                  -- sha-256(hex) of the emailed token
  email      TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_tokens_expiry ON login_tokens (expires_at);

-- R6b (roles/RBAC) — a role per user. viewer < contributor < approver < admin.
-- New users default to 'contributor'; admins are bootstrapped via the Worker's
-- ADMIN_EMAILS var. Governance approvals require approver/admin (enforced in the
-- Worker's /api/workflow route).
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'contributor';

-- Admin can disable a user: blocks sign-in and rejects existing sessions.
-- Break-glass: an ADMIN_EMAILS email is re-enabled on its next sign-in.
ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- R6c-a (multi-tenant foundation) — org concept + backfill. ADDITIVE and safe
-- to re-run; NO isolation is enforced yet (that's R6c-b). Everything continues
-- to run as one 'default' org until then. See docs/R6C-PLAN.md.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS orgs (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE,
  suspended  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO orgs (id, name, slug) VALUES ('default', 'Default Organization', 'default')
  ON CONFLICT (id) DO NOTHING;

-- Users belong to an org (role is within it) + a platform-level super-admin flag.
ALTER TABLE users ADD COLUMN IF NOT EXISTS org_id      TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS super_admin BOOLEAN NOT NULL DEFAULT false;

-- Every tenant table gets an org_id (kept as plain TEXT, matching the existing
-- id style). Composite-PK changes (workflow_stages, studio_entities) are deferred
-- to R6c-b, before real multi-org — single 'default' org can't collide yet.
ALTER TABLE registrations   ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE assessments     ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE workflow_stages ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE audit_events    ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE studio_entities ADD COLUMN IF NOT EXISTS org_id TEXT;

-- Backfill everything that predates orgs into 'default'.
UPDATE users            SET org_id = 'default' WHERE org_id IS NULL;
UPDATE registrations    SET org_id = 'default' WHERE org_id IS NULL;
UPDATE assessments      SET org_id = 'default' WHERE org_id IS NULL;
UPDATE workflow_stages  SET org_id = 'default' WHERE org_id IS NULL;
UPDATE audit_events     SET org_id = 'default' WHERE org_id IS NULL;
UPDATE studio_entities  SET org_id = 'default' WHERE org_id IS NULL;

CREATE INDEX IF NOT EXISTS registrations_org   ON registrations (org_id);
CREATE INDEX IF NOT EXISTS assessments_org     ON assessments (org_id);
CREATE INDEX IF NOT EXISTS workflow_org        ON workflow_stages (org_id);
CREATE INDEX IF NOT EXISTS audit_org           ON audit_events (org_id);
CREATE INDEX IF NOT EXISTS studio_entities_org ON studio_entities (org_id);
