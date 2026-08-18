// R6c-b — cross-org isolation test (the security core). Imports the real Worker
// and drives it against a real Neon DB with two orgs, proving org B cannot see or
// mutate org A's data. Runs only when DATABASE_URL + AUTH_JWT_SECRET are set
// (skips cleanly otherwise), so it never touches prod by accident:
//
//   DATABASE_URL=... AUTH_JWT_SECRET=... npm run test:isolation
//
// It creates namespaced `iso-test-*` orgs/users/rows and deletes them in a
// finally block. Mints HS256 tokens the Worker's verifyJwt accepts (same secret).
import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import worker from "./index.js";

const READY = !!process.env.DATABASE_URL && !!process.env.AUTH_JWT_SECRET;
const env = { DATABASE_URL: process.env.DATABASE_URL, AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET, ALLOWED_ORIGIN: "*" };

const b64url = (s) => Buffer.from(s).toString("base64url");
function signJwt(payload) {
  const h = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const b = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", env.AUTH_JWT_SECRET).update(`${h}.${b}`).digest("base64url");
  return `${h}.${b}.${sig}`;
}
const req = (path, { method = "GET", token, body } = {}) =>
  worker.fetch(
    new Request(`https://iso.test${path}`, {
      method,
      headers: { "content-type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    }),
    env,
  );

test("org B cannot see or delete org A's data", { skip: READY ? false : "set DATABASE_URL + AUTH_JWT_SECRET to run" }, async () => {
  const sql = neon(env.DATABASE_URL);
  const A = "iso-test-a";
  const B = "iso-test-b";
  const uaId = randomUUID();
  const ubId = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const tokenA = signJwt({ sub: uaId, email: "a@iso.test", name: "A", role: "admin", org: A, sa: false, exp: now + 3600 });
  const tokenB = signJwt({ sub: ubId, email: "b@iso.test", name: "B", role: "admin", org: B, sa: false, exp: now + 3600 });

  try {
    // Seed two orgs + one admin user each.
    await sql`INSERT INTO orgs (id, name, slug) VALUES (${A}, 'Iso A', ${A}), (${B}, 'Iso B', ${B}) ON CONFLICT (id) DO NOTHING`;
    await sql`INSERT INTO users (id, email, name, role, org_id) VALUES
      (${uaId}, 'a@iso.test', 'A', 'admin', ${A}), (${ubId}, 'b@iso.test', 'B', 'admin', ${B})
      ON CONFLICT (id) DO NOTHING`;

    // Org A registers a product.
    const reg = await req("/api/registrations", { method: "POST", token: tokenA, body: { name: "Iso Secret Product", adapterType: "health" } });
    assert.equal(reg.status, 201);
    const prodId = (await reg.json()).registration.id;

    // Org B's state must NOT include it.
    const stateB = await (await req("/api/state", { token: tokenB })).json();
    assert.ok(!stateB.registrations.some((r) => r.id === prodId), "org B leaked org A's registration");

    // Org A's state MUST include it.
    const stateA = await (await req("/api/state", { token: tokenA })).json();
    assert.ok(stateA.registrations.some((r) => r.id === prodId), "org A can't see its own registration");

    // Org B cannot delete org A's registration (scoped DELETE affects 0 rows).
    const delB = await (await req(`/api/registrations/${prodId}`, { method: "DELETE", token: tokenB })).json();
    assert.equal(delB.deleted, null, "org B deleted org A's registration");

    // It's still there for org A.
    const stateA2 = await (await req("/api/state", { token: tokenA })).json();
    assert.ok(stateA2.registrations.some((r) => r.id === prodId), "org A's registration was wrongly removed");
  } finally {
    // Cleanup — remove all iso-test rows.
    for (const t of ["registrations", "assessments", "workflow_stages", "audit_events", "studio_entities"]) {
      await sql.query(`DELETE FROM ${t} WHERE org_id = $1 OR org_id = $2`, [A, B]);
    }
    await sql`DELETE FROM users WHERE id = ${uaId} OR id = ${ubId}`;
    await sql`DELETE FROM orgs WHERE id = ${A} OR id = ${B}`;
  }
});
