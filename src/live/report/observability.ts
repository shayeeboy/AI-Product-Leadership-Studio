import type { AdapterType } from "../types";
import type { LiveRagHealth, LiveReadiness, LiveFinancial } from "../liveAdapters";

// Unified per-product observability (R8). Each source exposes a different depth,
// so this normalizes them into one honest shape: universal signals (reachability
// + measured endpoint latency) are always present; rich runtime metrics and data
// freshness/lineage are filled only where a source actually reports them, and are
// `null` (→ "Not reported" in the UI) otherwise. Never fabricated. Pure — inputs
// in, plain data out.

export interface ProductObservability {
  id: string;
  name: string;
  adapterType: AdapterType;
  status: "live" | "checking" | "down";
  reachable: boolean;
  endpointLatencyMs: number | null; // universal — measured fetch round-trip
  // Runtime metrics (only sources that expose them, e.g. RAG):
  p50Ms: number | null;
  p95Ms: number | null;
  costPerQuery: number | null;
  volume: number | null;
  groundedRate: number | null; // %
  errorRate: number | null; // %
  // Data freshness + lineage (the honest observability dimension for static sources):
  freshnessDays: number | null;
  lastUpdated: string | null;
  lineage: string | null;
}

// Whole days since an ISO timestamp; null if absent/invalid (never a guess).
export function daysSince(iso: string | null | undefined, now: number = Date.now()): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now - t) / 86_400_000));
}

export interface ObsSnapshot {
  data?: { ok: boolean; reachable?: boolean; data?: unknown; latencyMs?: number };
  isLoading?: boolean;
}

export function deriveObservability(
  reg: { id: string; name: string; adapterType: AdapterType },
  snap: ObsSnapshot | undefined,
  now: number = Date.now(),
): ProductObservability {
  const res = snap?.data;
  const ok = !!res?.ok;
  const base: ProductObservability = {
    id: reg.id,
    name: reg.name,
    adapterType: reg.adapterType,
    status: ok ? "live" : snap?.isLoading ? "checking" : "down",
    reachable: !!res?.reachable,
    endpointLatencyMs: typeof res?.latencyMs === "number" ? res.latencyMs : null,
    p50Ms: null,
    p95Ms: null,
    costPerQuery: null,
    volume: null,
    groundedRate: null,
    errorRate: null,
    freshnessDays: null,
    lastUpdated: null,
    lineage: null,
  };
  if (!ok || res?.data == null) return base;

  if (reg.adapterType === "rag-health") {
    const rag = res.data as LiveRagHealth;
    const total = rag.observability?.total ?? null;
    const errCount = rag.observability?.errorCount ?? null;
    return {
      ...base,
      p50Ms: rag.latencyMsP50 ?? null,
      p95Ms: rag.latencyMsP95 ?? null,
      costPerQuery: typeof rag.costPerQuery === "number" ? rag.costPerQuery : null,
      volume: total,
      groundedRate: rag.observability?.groundedRate ?? null,
      errorRate: total && errCount != null ? Math.round((errCount / total) * 100) : null,
      freshnessDays: rag.knowledgeFreshnessDays ?? null,
      lastUpdated: rag.observability?.lastAt ?? rag.evalRunAt ?? null,
      lineage: [rag.provider, rag.model].filter(Boolean).join(" · ") || null,
    };
  }
  if (reg.adapterType === "financial") {
    const fin = res.data as LiveFinancial;
    return {
      ...base,
      freshnessDays: daysSince(fin.lastUpdated ?? fin.runAt, now),
      lastUpdated: fin.lastUpdated ?? fin.runAt ?? null,
      lineage: fin.provenance ?? null,
    };
  }
  if (reg.adapterType === "readiness") {
    const rd = res.data as LiveReadiness;
    return {
      ...base,
      freshnessDays: daysSince(rd.lastUpdated, now),
      lastUpdated: rd.lastUpdated ?? null,
      lineage: "Assessment sessions",
    };
  }
  return base;
}

export interface ObservabilitySummary {
  total: number;
  reachable: number;
  avgEndpointLatencyMs: number | null;
  avgP95Ms: number | null;
  liveCost: number | null; // Σ cost/query × volume, where both are reported
  oldestFreshnessDays: number | null; // the stalest product's data age
}

export function summarizeObservability(items: ProductObservability[]): ObservabilitySummary {
  const reachable = items.filter((i) => i.reachable);
  const latencies = reachable.map((i) => i.endpointLatencyMs).filter((n): n is number => n != null);
  const p95s = items.map((i) => i.p95Ms).filter((n): n is number => n != null);
  const freshness = items.map((i) => i.freshnessDays).filter((n): n is number => n != null);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

  let liveCost = 0;
  let costSeen = false;
  for (const i of items) {
    if (i.costPerQuery != null && i.volume != null) {
      liveCost += i.costPerQuery * i.volume;
      costSeen = true;
    }
  }

  return {
    total: items.length,
    reachable: reachable.length,
    avgEndpointLatencyMs: avg(latencies),
    avgP95Ms: avg(p95s),
    liveCost: costSeen ? liveCost : null,
    oldestFreshnessDays: freshness.length ? Math.max(...freshness) : null,
  };
}
