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
//
// Secrets/vars (wrangler.toml [vars] + `wrangler secret put`):
//   DATABASE_URL     Neon connection string                 (secret)
//   ALLOWED_ORIGIN   Pages origin allowed to call it         (var)
//   ASSIST_API_KEY   optional LLM key for /api/assist         (secret)
//   ASSIST_BASE_URL  optional OpenAI-compatible base URL      (var, default Groq)
//   ASSIST_MODEL     optional model id                        (var)
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
        const status = b.status || "in-progress";
        const [row] = await sql`
          INSERT INTO workflow_stages (product_id, stage, status, reviewer, comment, updated_at)
          VALUES (${b.productId}, ${b.stage}, ${status}, ${b.reviewer || null}, ${b.comment || null}, now())
          ON CONFLICT (product_id, stage) DO UPDATE SET
            status = EXCLUDED.status, reviewer = EXCLUDED.reviewer, comment = EXCLUDED.comment, updated_at = now()
          RETURNING *`;
        await sql`INSERT INTO audit_events (product_id, actor, action, stage, note)
          VALUES (${b.productId}, ${b.actor || b.reviewer || "Reviewer"}, ${statusVerb(status) + " " + b.stage}, ${b.stage}, ${b.comment || null})`;
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
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

const json = (obj, status, cors) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...(cors || {}) } });
