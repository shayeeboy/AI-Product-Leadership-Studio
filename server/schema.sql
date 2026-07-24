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
