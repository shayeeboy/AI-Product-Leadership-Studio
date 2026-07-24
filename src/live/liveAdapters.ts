import type { AdapterType, LiveResult, Registration } from "./types";

// ---------------------------------------------------------------------------
// Live adapters. Each fetches a registered product's snapshot endpoint directly
// from the browser (all three sources send CORS headers for the Pages origin)
// and returns a LiveResult with provenance. No seeded fallback — when a source
// is unreachable the UI shows a "not reachable" state, never fake numbers.
// ---------------------------------------------------------------------------

const TIMEOUT_MS = 12000; // Render/Cloud Run can cold-start; give them room.

async function fetchJson<T>(url: string): Promise<LiveResult<T>> {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    const latencyMs = Math.round(performance.now() - started);
    if (!res.ok) {
      return { ok: false, reachable: true, error: `HTTP ${res.status}`, fetchedAt: new Date().toISOString(), latencyMs, endpointUrl: url };
    }
    const data = (await res.json()) as T;
    return { ok: true, reachable: true, data, fetchedAt: new Date().toISOString(), latencyMs, endpointUrl: url };
  } catch (e) {
    return {
      ok: false,
      reachable: false,
      error: e instanceof Error ? (e.name === "AbortError" ? "timeout" : e.message) : "fetch failed",
      fetchedAt: new Date().toISOString(),
      latencyMs: Math.round(performance.now() - started),
      endpointUrl: url,
    };
  } finally {
    clearTimeout(timer);
  }
}

// --- Live snapshot shapes (as emitted by the enriched source apps) ------------
export interface LiveReadiness {
  productId: string;
  sessionCount: number;
  teamMaturityScore: number | null;
  aiReadinessScore: number | null;
  adoptionScore: number | null;
  capabilityAssessment: { dimension: string; score: number }[];
  riskIndicators: { label: string; severity: "low" | "medium" | "high" }[];
  recommendations: string[];
  lastUpdated: string | null;
}

export interface LiveRagHealth {
  productId: string;
  status: string;
  provider: string;
  model: string;
  db: string;
  llm: string;
  retrievalQuality: number | null;
  groundedness: number | null;
  citationAccuracy: number | null;
  hallucinationRate: number | null;
  costPerQuery: number;
  latencyMsP50: number | null;
  latencyMsP95: number | null;
  knowledgeFreshnessDays: number | null;
  evaluationMetrics: { metric: string; score: number; passThreshold: number; pass: boolean }[];
  observability: {
    total: number;
    liveCount: number | null;
    benchmarkCount: number | null;
    groundedRate: number | null;
    errorCount: number | null;
    avgLatencyMs: number | null;
    totalCostUsd: number | null;
    firstAt: string | null;
    lastAt: string | null;
  };
  evalRunAt: string | null;
}

export interface LiveFinancialIndicator {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  source: string;
  sourceUrl: string;
  refPeriod: string | null;
  trend: { period: string; value: number }[];
}

export interface LiveFinancial {
  productId: string;
  target: { demographic?: string; product?: string; geography?: string };
  runAt: string;
  lastUpdated: string;
  provenance: string;
  indicators: LiveFinancialIndicator[];
  executiveSummary: string;
  strategicRecommendations: string[];
  decisionTraces: { step: string; rationale: string }[];
  briefUrl?: string;
}

export interface LiveGenericHealth {
  status?: string;
  db?: string;
  [k: string]: unknown;
}

export const fetchReadiness = (url: string) => fetchJson<LiveReadiness>(url);
export const fetchRagHealth = (url: string) => fetchJson<LiveRagHealth>(url);
export const fetchFinancial = (url: string) => fetchJson<LiveFinancial>(url);
export const fetchGenericHealth = (url: string) => fetchJson<LiveGenericHealth>(url);

// Dispatch by adapter type. Returns the raw LiveResult; callers pick fields.
export function fetchLive(reg: Registration): Promise<LiveResult<unknown>> {
  if (!reg.endpointUrl) {
    return Promise.resolve({ ok: false, reachable: false, error: "no endpoint configured", fetchedAt: new Date().toISOString() });
  }
  const byType: Record<AdapterType, (u: string) => Promise<LiveResult<unknown>>> = {
    readiness: fetchReadiness,
    "rag-health": fetchRagHealth,
    financial: fetchFinancial,
    health: fetchGenericHealth,
  };
  return byType[reg.adapterType](reg.endpointUrl);
}
