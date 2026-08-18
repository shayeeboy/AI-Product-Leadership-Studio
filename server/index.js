// AI Product & Leadership Studio — R1 persistence Worker (Cloudflare + Neon).
// Mirrors the Worker+Neon pattern used by the Financial Intelligence project.
//
// Routes:
//   GET  /api/health                        → liveness + db check
//   GET  /api/state                         → { registrations, assessments, workflow, audit }  (one-shot load)
//   POST /api/registrations {registration}  → register a product (+ seed 'Registered' stage + audit)
//   DELETE /api/registrations/:id           → remove a registration
//   POST /api/assessments {assessment}      → persist an opportunity assessment
//   POST /api/workflow {productId,stage,status,reviewer,comment,actor} → advance a stage (+ audit)
//   POST /api/entity/:name {id?,productId?,data}       → upsert a Studio-managed entity (R10)
//   DELETE /api/entity/:name/:id                       → delete a Studio-managed entity (R10)
//   POST /api/assist {prompt}                          → optional LLM assist (R5); 501 if unconfigured
//   POST /api/auth/request {email}                     → email a magic sign-in link (R6a); 501 if unconfigured
//   POST /api/auth/verify {token}                      → consume the link → session JWT (R6a)
//   GET  /api/auth/me                                  → validate Bearer JWT → { user + role } (R6a/b)
//   GET  /api/users                                    → list users + roles (R6b; admin only)
//   POST /api/users/role {id,role}                     → set a user's role (R6b; admin only)
//   (R6b) POST /api/workflow now requires an approver/admin when auth is enabled
//
// Secrets/vars (wrangler.toml [vars] + `wrangler secret put`):
//   DATABASE_URL     Neon connection string                 (secret)
//   ALLOWED_ORIGIN   Pages origin allowed to call it         (var)
//   ASSIST_API_KEY   optional LLM key for /api/assist         (secret)
//   ASSIST_BASE_URL  optional OpenAI-compatible base URL      (var, default Groq)
//   ASSIST_MODEL     optional model id                        (var)
//   AUTH_JWT_SECRET  optional HMAC secret enabling R6a auth    (secret)
//   RESEND_API_KEY   optional Resend key for magic-link email  (secret)
//   MAIL_FROM        verified sender address for sign-in email (var)
//   APP_URL          Pages URL used to build the magic link    (var)
//   ADMIN_EMAILS     comma-separated emails bootstrapped as admin (var, R6b)
import { neon } from "@neondatabase/serverless";

const WORKFLOW_STAGES = [
  "Registered",
  "Risk Review",
  "Security Review",
  "Responsible AI Review",
  "Human Approval",
  "Deployment Approval",
  "In Production",
];

// Allowlisted Phase 3 (R10) Studio-managed entity kinds, stored in studio_entities.
const ENTITY_TYPES = [
  "risk",
  "policy",
  "review",
  "model_card",
  "cost_input",
  "roi_scenario",
  "maturity_score",
  "prioritization_input",
  "dependency",
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    try {
      const sql = neon(env.DATABASE_URL);
      const p = url.pathname;

      if (p === "/api/health") {
        let db = "unreachable";
        try {
          await sql`SELECT 1`;
          db = "connected";
        } catch {}
        return json({ ok: true, db }, 200, cors);
      }

      // R6a — passwordless magic-link auth. Self-contained; returns 501 until
      // AUTH_JWT_SECRET (+ Resend vars) are configured, so the app degrades to
      // the device-local "Acting as" identity when auth isn't deployed yet.
      if (p.startsWith("/api/auth/")) {
        return await handleAuth(p, request, env, sql, cors);
      }

      // R6b — admin-only user management (list users, set roles).
      if (p.startsWith("/api/users")) {
        return await handleUsers(p, request, env, sql, cors);
      }

      if (p === "/api/state" && request.method === "GET") {
        const [registrations, assessments, workflow, audit, entityRows] = await Promise.all([
          sql`SELECT * FROM registrations ORDER BY created_at DESC`,
          sql`SELECT * FROM assessments ORDER BY created_at DESC`,
          sql`SELECT * FROM workflow_stages`,
          sql`SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 200`,
          sql`SELECT entity, id, product_id, data, created_at, updated_at FROM studio_entities ORDER BY created_at DESC`,
        ]);
        const entities = Object.fromEntries(ENTITY_TYPES.map((t) => [t, []]));
        for (const r of entityRows) (entities[r.entity] ||= []).push(r);
        return json({ registrations, assessments, workflow, audit, entities }, 200, cors);
      }

      if (p.startsWith("/api/entity/")) {
        const parts = p.split("/").filter(Boolean); // ["api","entity",name,(id)]
        const name = parts[2];
        if (!ENTITY_TYPES.includes(name)) return json({ error: "unknown entity type" }, 400, cors);
        if (request.method === "POST") {
          const b = await request.json().catch(() => ({}));
          const id = b.id || crypto.randomUUID();
          const [row] = await sql`
            INSERT INTO studio_entities (entity, id, product_id, data, updated_at)
            VALUES (${name}, ${id}, ${b.productId || null}, ${JSON.stringify(b.data || {})}, now())
            ON CONFLICT (entity, id) DO UPDATE SET
              product_id = EXCLUDED.product_id, data = EXCLUDED.data, updated_at = now()
            RETURNING *`;
          return json({ ok: true, entity: row }, 201, cors);
        }
        if (request.method === "DELETE") {
          const id = decodeURIComponent(parts[3] || "");
          const del = await sql`DELETE FROM studio_entities WHERE entity = ${name} AND id = ${id} RETURNING id`;
          return json({ ok: true, deleted: del[0]?.id ?? null }, 200, cors);
        }
      }

      if (p === "/api/registrations" && request.method === "POST") {
        const b = await request.json().catch(() => ({}));
        const v = validateRegistration(b);
        if (!v.ok) return json({ error: v.error }, 400, cors);
        const r = v.value;
        const [row] = await sql`
          INSERT INTO registrations
            (id, name, business_unit, owner, sponsor, architecture, adapter_type, endpoint_url, status,
             lifecycle, annual_budget, monthly_spend, roi_target)
          VALUES
            (${r.id}, ${r.name}, ${r.businessUnit}, ${r.owner}, ${r.sponsor}, ${r.architecture}, ${r.adapterType}, ${r.endpointUrl}, ${r.status},
             ${r.lifecycle}, ${r.annualBudget}, ${r.monthlySpend}, ${r.roiTarget})
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name, business_unit = EXCLUDED.business_unit, owner = EXCLUDED.owner,
            sponsor = EXCLUDED.sponsor, architecture = EXCLUDED.architecture,
            adapter_type = EXCLUDED.adapter_type, endpoint_url = EXCLUDED.endpoint_url,
            lifecycle = EXCLUDED.lifecycle, annual_budget = EXCLUDED.annual_budget,
            monthly_spend = EXCLUDED.monthly_spend, roi_target = EXCLUDED.roi_target
          RETURNING *`;
        await sql`
          INSERT INTO workflow_stages (product_id, stage, status, reviewer)
          VALUES (${r.id}, 'Registered', 'approved', ${r.owner || "Registrar"})
          ON CONFLICT (product_id, stage) DO NOTHING`;
        await sql`INSERT INTO audit_events (product_id, actor, action, stage, note)
          VALUES (${r.id}, ${r.owner || "Registrar"}, ${"Registered " + r.name}, 'Registered', ${r.endpointUrl || null})`;
        return json({ ok: true, registration: row }, 201, cors);
      }

      if (p.startsWith("/api/registrations/") && request.method === "DELETE") {
        const id = decodeURIComponent(p.split("/").pop() || "");
        await sql`DELETE FROM workflow_stages WHERE product_id = ${id}`;
        const del = await sql`DELETE FROM registrations WHERE id = ${id} RETURNING id`;
        return json({ ok: true, deleted: del[0]?.id ?? null }, 200, cors);
      }

      if (p === "/api/assessments" && request.method === "POST") {
        const b = await request.json().catch(() => ({}));
        if (!b.title) return json({ error: "title is required" }, 400, cors);
        const id = b.id || crypto.randomUUID();
        const [row] = await sql`
          INSERT INTO assessments (id, product_id, title, scores, opportunity_score, strategic_fit, estimated_roi, confidence, recommendation)
          VALUES (${id}, ${b.productId || null}, ${b.title}, ${JSON.stringify(b.scores || {})},
                  ${b.opportunityScore ?? null}, ${b.strategicFit || null}, ${b.estimatedRoi ?? null},
                  ${b.confidence || null}, ${b.recommendation || null})
          RETURNING *`;
        return json({ ok: true, assessment: row }, 201, cors);
      }

      if (p === "/api/workflow" && request.method === "POST") {
        const b = await request.json().catch(() => ({}));
        if (!b.productId || !b.stage || !WORKFLOW_STAGES.includes(b.stage)) {
          return json({ error: "productId and a valid stage are required" }, 400, cors);
        }
        // R6b — governance gate. When auth is enabled, advancing a stage requires
        // a signed-in approver/admin, and the actor/reviewer is the VERIFIED user
        // (never client-supplied). When auth is off, behavior is unchanged.
        let actor = b.actor || b.reviewer || "Reviewer";
        let reviewer = b.reviewer || null;
        if (env.AUTH_JWT_SECRET) {
          const me = await authedUser(request, env, sql);
          if (!me) return json({ error: "sign in to record a governance decision" }, 401, cors);
          if (me.role !== "approver" && me.role !== "admin") {
            return json({ error: `your role (${me.role}) can't record approvals — an approver is required` }, 403, cors);
          }
          actor = me.name || me.email;
          reviewer = me.name || me.email;
        }
        const status = b.status || "in-progress";
        const [row] = await sql`
          INSERT INTO workflow_stages (product_id, stage, status, reviewer, comment, updated_at)
          VALUES (${b.productId}, ${b.stage}, ${status}, ${reviewer}, ${b.comment || null}, now())
          ON CONFLICT (product_id, stage) DO UPDATE SET
            status = EXCLUDED.status, reviewer = EXCLUDED.reviewer, comment = EXCLUDED.comment, updated_at = now()
          RETURNING *`;
        await sql`INSERT INTO audit_events (product_id, actor, action, stage, note)
          VALUES (${b.productId}, ${actor}, ${statusVerb(status) + " " + b.stage}, ${b.stage}, ${b.comment || null})`;
        return json({ ok: true, stage: row }, 200, cors);
      }

      // --- Optional LLM assist (R5, Product Discovery) ---
      // Opt-in: set the ASSIST_API_KEY secret (+ optional ASSIST_BASE_URL / ASSIST_MODEL).
      // Unconfigured → 501, and the client falls back to its template. The LLM key
      // stays server-side; the browser never sees it.
      if (p === "/api/assist" && request.method === "POST") {
        if (!env.ASSIST_API_KEY) return json({ error: "assist not configured" }, 501, cors);
        const b = await request.json().catch(() => ({}));
        const prompt = String(b.prompt || "").slice(0, 2000);
        if (!prompt.trim()) return json({ error: "prompt required" }, 400, cors);
        const base = (env.ASSIST_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, "");
        const model = env.ASSIST_MODEL || "llama-3.3-70b-versatile";
        try {
          const r = await fetch(`${base}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.ASSIST_API_KEY}` },
            body: JSON.stringify({
              model,
              max_tokens: 450,
              temperature: 0.4,
              messages: [
                { role: "system", content: "You are a product-discovery assistant for an AI product leader. Given a user and a problem/JTBD, respond with a crisp one-paragraph problem statement, then three numbered opportunity hypotheses. Be concrete and brief." },
                { role: "user", content: prompt },
              ],
            }),
          });
          if (!r.ok) return json({ error: `assist upstream ${r.status}` }, 502, cors);
          const d = await r.json();
          const text = d?.choices?.[0]?.message?.content ?? "";
          return json({ text, mode: "llm" }, 200, cors);
        } catch (e) {
          return json({ error: String(e.message || e) }, 502, cors);
        }
      }

      return json({ error: "Not found" }, 404, cors);
    } catch (err) {
      return json({ error: "Server error", detail: String(err.message || err) }, 500, cors);
    }
  },
};

function validateRegistration(b) {
  if (!b || typeof b !== "object") return { ok: false, error: "Body required" };
  if (!b.name || !String(b.name).trim()) return { ok: false, error: "name is required" };
  const adapterType = b.adapterType || "health";
  if (!["readiness", "rag-health", "financial", "health"].includes(adapterType)) {
    return { ok: false, error: "adapterType must be readiness | rag-health | financial | health" };
  }
  const slug = (b.id || String(b.name)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    ok: true,
    value: {
      id: slug,
      name: String(b.name).trim(),
      businessUnit: b.businessUnit || null,
      owner: b.owner || null,
      sponsor: b.sponsor || null,
      architecture: b.architecture || null,
      adapterType,
      endpointUrl: b.endpointUrl || null,
      status: b.status || "pending",
      lifecycle: b.lifecycle || null,
      annualBudget: b.annualBudget ?? null,
      monthlySpend: b.monthlySpend ?? null,
      roiTarget: b.roiTarget ?? null,
    },
  };
}

function statusVerb(status) {
  return (
    { approved: "Approved", rejected: "Rejected", blocked: "Blocked", "in-progress": "Started" }[status] || "Updated"
  );
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allow = env.ALLOWED_ORIGIN || "";
  const ok = allow && (allow === "*" || origin === allow);
  return {
    "Access-Control-Allow-Origin": ok ? origin : allow || "null",
    "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

const json = (obj, status, cors) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...(cors || {}) } });

// ---------------------------------------------------------------------------
// R6a — passwordless magic-link auth. The Worker emails a one-time link, then
// issues a short-TTL HMAC-signed session JWT (verified on GET /api/auth/me).
// Everything is optional: without AUTH_JWT_SECRET (+ Resend vars) the endpoints
// return 501 and the SPA stays on its device-local identity.
// ---------------------------------------------------------------------------

async function handleAuth(p, request, env, sql, cors) {
  const secret = env.AUTH_JWT_SECRET;

  if (p === "/api/auth/me" && request.method === "GET") {
    if (!secret) return json({ error: "auth not configured" }, 501, cors);
    const me = await authedUser(request, env, sql); // verifies JWT + reads the current role
    if (!me) return json({ error: "unauthorized" }, 401, cors);
    return json({ user: { id: me.id, email: me.email, name: me.name ?? null, role: me.role } }, 200, cors);
  }

  if (p === "/api/auth/request" && request.method === "POST") {
    if (!secret || !env.RESEND_API_KEY || !env.MAIL_FROM || !env.APP_URL) {
      return json({ error: "auth not configured" }, 501, cors);
    }
    const body = await readJson(request);
    const email = String(body.email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "valid email required" }, 400, cors);

    const token = randomToken();
    const hash = await sha256hex(token);
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes
    await sql`INSERT INTO login_tokens (token_hash, email, expires_at) VALUES (${hash}, ${email}, ${expires})`;
    const link = `${env.APP_URL.replace(/\/$/, "")}/?token=${token}`;
    try {
      await sendMagicLink(env, email, link);
    } catch (e) {
      // Surface the upstream reason (Resend status + message) to help configure
      // the sender/key; contains no secrets.
      return json({ error: "email send failed", detail: String(e.message || e) }, 502, cors);
    }
    return json({ ok: true }, 200, cors); // never reveal whether the address exists
  }

  if (p === "/api/auth/verify" && request.method === "POST") {
    if (!secret) return json({ error: "auth not configured" }, 501, cors);
    const body = await readJson(request);
    const token = String(body.token || "");
    if (!token) return json({ error: "token required" }, 400, cors);

    const hash = await sha256hex(token);
    const rows = await sql`SELECT email, expires_at, used_at FROM login_tokens WHERE token_hash = ${hash}`;
    const row = rows[0];
    if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
      return json({ error: "invalid or expired link" }, 400, cors);
    }
    await sql`UPDATE login_tokens SET used_at = now() WHERE token_hash = ${hash}`;

    const email = row.email;
    const isAdmin = adminEmails(env).includes(email); // R6b — bootstrap admins by email
    const existing = await sql`SELECT id, name, role FROM users WHERE email = ${email}`;
    let user = existing[0];
    if (user) {
      const role = isAdmin ? "admin" : user.role; // never demote below an admin allowlist
      await sql`UPDATE users SET last_login_at = now(), role = ${role} WHERE id = ${user.id}`;
      user = { ...user, role };
    } else {
      const id = crypto.randomUUID();
      const name = email.split("@")[0];
      const role = isAdmin ? "admin" : "contributor";
      await sql`INSERT INTO users (id, email, name, role, last_login_at) VALUES (${id}, ${email}, ${name}, ${role}, now())`;
      user = { id, name, role };
    }
    const now = Math.floor(Date.now() / 1000);
    const jwt = await signJwt({ sub: user.id, email, name: user.name, role: user.role, iat: now, exp: now + 7 * 24 * 3600 }, secret);
    return json({ token: jwt, user: { id: user.id, email, name: user.name ?? null, role: user.role } }, 200, cors);
  }

  return json({ error: "Not found" }, 404, cors);
}

// R6b — admin-only user management.
async function handleUsers(p, request, env, sql, cors) {
  if (!env.AUTH_JWT_SECRET) return json({ error: "auth not configured" }, 501, cors);
  const me = await authedUser(request, env, sql);
  if (!me) return json({ error: "unauthorized" }, 401, cors);
  if (me.role !== "admin") return json({ error: "admin only" }, 403, cors);

  if (p === "/api/users" && request.method === "GET") {
    const users = await sql`SELECT id, email, name, role, last_login_at, created_at FROM users ORDER BY created_at DESC`;
    return json({ users }, 200, cors);
  }

  if (p === "/api/users/role" && request.method === "POST") {
    const b = await readJson(request);
    const id = String(b.id || "");
    const role = String(b.role || "");
    if (!id || !["viewer", "contributor", "approver", "admin"].includes(role)) {
      return json({ error: "id and a valid role are required" }, 400, cors);
    }
    // Don't let an admin strip their own admin (avoid self-lockout).
    if (id === me.id && role !== "admin") return json({ error: "you can't change your own admin role" }, 400, cors);
    const [row] = await sql`UPDATE users SET role = ${role} WHERE id = ${id} RETURNING id, email, name, role`;
    if (!row) return json({ error: "user not found" }, 404, cors);
    return json({ ok: true, user: row }, 200, cors);
  }

  return json({ error: "Not found" }, 404, cors);
}

// Verify the Bearer JWT and read the user's CURRENT role from Neon (authoritative
// — role changes take effect immediately, not on next sign-in). null if unauthed.
async function authedUser(request, env, sql) {
  if (!env.AUTH_JWT_SECRET) return null;
  const payload = await verifyBearer(request, env.AUTH_JWT_SECRET);
  if (!payload || !payload.sub) return null;
  const rows = await sql`SELECT id, email, name, role FROM users WHERE id = ${payload.sub}`;
  return rows[0] || null;
}

function adminEmails(env) {
  return (env.ADMIN_EMAILS || "")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function verifyBearer(request, secret) {
  const m = (request.headers.get("Authorization") || "").match(/^Bearer\s+(.+)$/i);
  return m ? verifyJwt(m[1], secret) : Promise.resolve(null);
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const TE = new TextEncoder();

async function sha256hex(s) {
  const buf = await crypto.subtle.digest("SHA-256", TE.encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function b64urlBytes(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const b64urlStr = (str) => b64urlBytes(TE.encode(str));
function b64urlDecodeToString(str) {
  const pad = str.length % 4 ? 4 - (str.length % 4) : 0;
  return atob(str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad));
}

async function hmacSign(data, secret) {
  const key = await crypto.subtle.importKey("raw", TE.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, TE.encode(data));
  return b64urlBytes(new Uint8Array(sig));
}

async function signJwt(payload, secret) {
  const header = b64urlStr(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64urlStr(JSON.stringify(payload));
  const sig = await hmacSign(`${header}.${body}`, secret);
  return `${header}.${body}.${sig}`;
}

async function verifyJwt(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, b, s] = parts;
  const expected = await hmacSign(`${h}.${b}`, secret);
  if (!timingSafeEqual(s, expected)) return null;
  let payload;
  try {
    payload = JSON.parse(b64urlDecodeToString(b));
  } catch {
    return null;
  }
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
  return payload;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sendMagicLink(env, email, link) {
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;color:#0f172a">
    <h2 style="color:#1d3faf;margin:0 0 12px">Sign in to the AI Product &amp; Leadership Studio</h2>
    <p style="line-height:1.6">Click below to sign in. This link expires in 15 minutes and can be used once.</p>
    <p><a href="${link}" style="display:inline-block;background:#1d3faf;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600">Sign in →</a></p>
    <p style="color:#64748b;font-size:12px;line-height:1.6">If you didn't request this, you can safely ignore this email.</p>
  </div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [email], subject: "Your sign-in link — AI Product & Leadership Studio", html }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`resend ${res.status}: ${detail.slice(0, 300)}`);
  }
}
