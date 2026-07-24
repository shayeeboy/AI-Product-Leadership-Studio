import type { Registration } from "./types";
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
}

const LS_KEY = "studio.state.v1";

function readLocal(): StudioState {
  const empty: StudioState = { registrations: [], assessments: [], workflow: [], audit: [] };
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

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`persistence ${path} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function loadState(): Promise<StudioState> {
  if (hasBackend) {
    try {
      const s = await api<StudioState>("/api/state");
      return { ...s, registrations: mergeRegistrations(s.registrations || []) };
    } catch {
      // fall through to local on any backend error
    }
  }
  const local = readLocal();
  return { ...local, registrations: mergeRegistrations(local.registrations) };
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
