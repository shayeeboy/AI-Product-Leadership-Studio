import type { Registration, EntityType, EntityRow, EntityMap } from "./types";
import { emptyEntities } from "./types";
import { DEFAULT_REGISTRATIONS } from "./registry";

// ---------------------------------------------------------------------------
// Persistence client (R1). When VITE_PERSISTENCE_API is set it talks to the
// Cloudflare Worker + Neon backend so registrations/assessments/approvals are
// shared across devices; otherwise it falls back to localStorage so the app is
// still fully usable with zero infrastructure. Same interface either way.
// ---------------------------------------------------------------------------

const API = import.meta.env.VITE_PERSISTENCE_API?.replace(/\/$/, "");
export const hasBackend = !!API;

export interface WorkflowStageRow {
  productId: string;
  stage: string;
  status: string;
  reviewer?: string | null;
  comment?: string | null;
  updatedAt?: string;
}
export interface AuditRow {
  id: string | number;
  productId: string;
  actor: string;
  action: string;
  stage?: string | null;
  note?: string | null;
  createdAt: string;
}
export interface AssessmentRow {
  id: string;
  productId?: string | null;
  title: string;
  scores: Record<string, number>;
  opportunityScore?: number;
  strategicFit?: string;
  estimatedRoi?: number;
  confidence?: string;
  recommendation?: string;
  createdAt?: string;
}
export interface StudioState {
  registrations: Registration[];
  assessments: AssessmentRow[];
  workflow: WorkflowStageRow[];
  audit: AuditRow[];
  entities: EntityMap;
}

const LS_KEY = "studio.state.v1";

function readLocal(): StudioState {
  const empty: StudioState = { registrations: [], assessments: [], workflow: [], audit: [], entities: emptyEntities() };
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? { ...empty, ...JSON.parse(raw) } : empty;
  } catch {
    return empty;
  }
}
function writeLocal(state: StudioState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode — non-fatal */
  }
}

// Default registrations are always present; stored/registered ones merge on top
// (a stored row with the same id overrides the default's editable fields).
function mergeRegistrations(stored: Registration[]): Registration[] {
  const byId = new Map<string, Registration>();
  for (const d of DEFAULT_REGISTRATIONS) byId.set(d.id, d);
  for (const s of stored) byId.set(s.id, { ...byId.get(s.id), ...s });
  return [...byId.values()];
}

// Attach the session Bearer token (R6b) so the Worker can enforce roles on
// gated writes (e.g. governance approvals) and attribute the verified actor.
function authHeader(): Record<string, string> {
  try {
    const t = localStorage.getItem("studio.authToken");
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch {
    return {};
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeader(), ...(init?.headers || {}) },
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = ((await res.json()) as { error?: string }).error || "";
    } catch {
      /* non-JSON */
    }
    throw new Error(detail || `persistence ${path} → HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

// Backend rows come back snake_case (business_unit, product_id, created_at);
// the client types are camelCase. Normalize on the way in so every consumer
// (and the localStorage path, which is already camelCase) sees one shape.
const toCamel = (s: string) => s.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());
function camelizeRow<T = Record<string, unknown>>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const k in row) out[toCamel(k)] = row[k];
  return out as T;
}
function normalizeEntities(raw: unknown): EntityMap {
  const e = emptyEntities();
  if (raw && typeof raw === "object") {
    for (const t of Object.keys(e) as EntityType[]) {
      const arr = (raw as Record<string, unknown>)[t];
      if (Array.isArray(arr)) e[t] = arr.map((r) => camelizeRow<EntityRow>(r as Record<string, unknown>));
    }
  }
  return e;
}
const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);

export async function loadState(): Promise<StudioState> {
  if (hasBackend) {
    try {
      const s = await api<Record<string, unknown>>("/api/state");
      return {
        registrations: mergeRegistrations(arr(s.registrations).map((r) => camelizeRow<Registration>(r))),
        assessments: arr(s.assessments).map((r) => camelizeRow<AssessmentRow>(r)),
        workflow: arr(s.workflow).map((r) => camelizeRow<WorkflowStageRow>(r)),
        audit: arr(s.audit).map((r) => camelizeRow<AuditRow>(r)),
        entities: normalizeEntities(s.entities),
      };
    } catch {
      // fall through to local on any backend error
    }
  }
  const local = readLocal();
  return { ...local, registrations: mergeRegistrations(local.registrations), entities: normalizeEntities(local.entities) };
}

export async function registerProduct(reg: Registration): Promise<Registration> {
  if (hasBackend) {
    const r = await api<{ registration: Registration }>("/api/registrations", {
      method: "POST",
      body: JSON.stringify(reg),
    });
    return r.registration;
  }
  const state = readLocal();
  const created: Registration = { ...reg, createdAt: new Date().toISOString() };
  state.registrations = [created, ...state.registrations.filter((x) => x.id !== reg.id)];
  state.audit = [
    { id: Date.now(), productId: reg.id, actor: reg.owner || "Registrar", action: `Registered ${reg.name}`, stage: "Registered", note: reg.endpointUrl, createdAt: new Date().toISOString() },
    ...state.audit,
  ];
  state.workflow = [{ productId: reg.id, stage: "Registered", status: "approved", reviewer: reg.owner || "Registrar", updatedAt: new Date().toISOString() }, ...state.workflow];
  writeLocal(state);
  return created;
}

export async function saveAssessment(a: AssessmentRow): Promise<AssessmentRow> {
  if (hasBackend) {
    const r = await api<{ assessment: AssessmentRow }>("/api/assessments", { method: "POST", body: JSON.stringify(a) });
    return r.assessment;
  }
  const state = readLocal();
  const created = { ...a, createdAt: new Date().toISOString() };
  state.assessments = [created, ...state.assessments];
  writeLocal(state);
  return created;
}

export async function advanceWorkflow(w: WorkflowStageRow & { actor?: string }): Promise<void> {
  if (hasBackend) {
    await api("/api/workflow", { method: "POST", body: JSON.stringify(w) });
    return;
  }
  const state = readLocal();
  state.workflow = [
    { ...w, updatedAt: new Date().toISOString() },
    ...state.workflow.filter((x) => !(x.productId === w.productId && x.stage === w.stage)),
  ];
  state.audit = [
    { id: Date.now(), productId: w.productId, actor: w.actor || w.reviewer || "Reviewer", action: `${w.status} ${w.stage}`, stage: w.stage, note: w.comment, createdAt: new Date().toISOString() },
    ...state.audit,
  ];
  writeLocal(state);
}

// R10 — generic Studio-managed entity CRUD (risks, policies, reviews, model
// cards, cost inputs, ROI scenarios, maturity scores, prioritization inputs).
// Backend when configured, else localStorage. R11/R12 modules use these.
export async function saveEntity(
  name: EntityType,
  row: { id?: string; productId?: string | null; data: Record<string, unknown> },
): Promise<EntityRow> {
  if (hasBackend) {
    const r = await api<{ entity: Record<string, unknown> }>(`/api/entity/${name}`, {
      method: "POST",
      body: JSON.stringify(row),
    });
    return camelizeRow<EntityRow>(r.entity);
  }
  const state = readLocal();
  const now = new Date().toISOString();
  const id = row.id || crypto.randomUUID();
  const created: EntityRow = { id, productId: row.productId ?? null, data: row.data, createdAt: now, updatedAt: now };
  state.entities = normalizeEntities(state.entities);
  state.entities[name] = [created, ...state.entities[name].filter((x) => x.id !== id)];
  writeLocal(state);
  return created;
}

export async function deleteEntity(name: EntityType, id: string): Promise<void> {
  if (hasBackend) {
    await api(`/api/entity/${name}/${encodeURIComponent(id)}`, { method: "DELETE" });
    return;
  }
  const state = readLocal();
  state.entities = normalizeEntities(state.entities);
  state.entities[name] = state.entities[name].filter((x) => x.id !== id);
  writeLocal(state);
}
