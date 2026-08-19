import { describe, it, expect } from "vitest";
import { deriveObservability, summarizeObservability, daysSince } from "./observability";

const NOW = Date.parse("2026-08-16T00:00:00Z");
const snap = (data: unknown, extra: Record<string, unknown> = {}) => ({ data: { ok: true, reachable: true, latencyMs: 200, data, ...extra }, isLoading: false });

describe("daysSince", () => {
  it("returns whole days since an ISO timestamp", () => {
    expect(daysSince("2026-08-06T00:00:00Z", NOW)).toBe(10);
  });
  it("returns null for missing or invalid input", () => {
    expect(daysSince(null, NOW)).toBeNull();
    expect(daysSince("not-a-date", NOW)).toBeNull();
  });
  it("never returns negative for a future date", () => {
    expect(daysSince("2026-09-01T00:00:00Z", NOW)).toBe(0);
  });
});

describe("deriveObservability — rag-health", () => {
  const ragData = {
    provider: "openai-compatible",
    model: "llama-3.3-70b",
    latencyMsP50: 7400,
    latencyMsP95: 29500,
    costPerQuery: 0,
    knowledgeFreshnessDays: 37,
    evalRunAt: "2026-08-16",
    observability: { total: 113, groundedRate: 82, errorCount: 0, lastAt: "2026-08-15T00:00:00Z" },
  };

  it("pulls the full runtime metric set", () => {
    const o = deriveObservability({ id: "rag", name: "RAG", adapterType: "rag-health" }, snap(ragData), NOW);
    expect(o).toMatchObject({ status: "live", reachable: true, endpointLatencyMs: 200, p50Ms: 7400, p95Ms: 29500, costPerQuery: 0, volume: 113, groundedRate: 82, errorRate: 0, freshnessDays: 37 });
    expect(o.lineage).toBe("openai-compatible · llama-3.3-70b");
  });

  it("derives error rate from errorCount / total", () => {
    const o = deriveObservability({ id: "rag", name: "RAG", adapterType: "rag-health" }, snap({ ...ragData, observability: { total: 200, errorCount: 10 } }), NOW);
    expect(o.errorRate).toBe(5);
  });
});

describe("deriveObservability — financial (static source: freshness + lineage only)", () => {
  it("reports freshness/lineage and leaves runtime metrics Not reported (null)", () => {
    const o = deriveObservability(
      { id: "fi", name: "FI", adapterType: "financial" },
      snap({ runAt: "2026-08-01T00:00:00Z", lastUpdated: "2026-08-10T00:00:00Z", provenance: "StatCan / CMHC / BoC" }),
      NOW,
    );
    expect(o.freshnessDays).toBe(6); // since lastUpdated
    expect(o.lineage).toBe("StatCan / CMHC / BoC");
    expect(o.p95Ms).toBeNull();
    expect(o.costPerQuery).toBeNull();
    expect(o.endpointLatencyMs).toBe(200); // universal signal still present
  });
});

describe("deriveObservability — readiness + unreachable", () => {
  it("readiness reports freshness + score/sessions, no RAG runtime metrics", () => {
    const o = deriveObservability(
      { id: "diag", name: "Diagnostic", adapterType: "readiness" },
      snap({ lastUpdated: "2026-07-17T00:00:00Z", sessionCount: 12, aiReadinessScore: 64 }),
      NOW,
    );
    expect(o.freshnessDays).toBe(30);
    expect(o.readinessScore).toBe(64);
    expect(o.sessionCount).toBe(12);
    expect(o.p95Ms).toBeNull(); // RAG-only metric stays null for a readiness source
    expect(o.lineage).toBe("Assessment sessions");
    // R8 operational block absent until the service exposes it → honest nulls.
    expect(o.uptimeSeconds).toBeNull();
    expect(o.activeSessions7d).toBeNull();
    expect(o.completionRate).toBeNull();
  });

  it("readiness surfaces the R8 observability block when the service reports it", () => {
    const o = deriveObservability(
      { id: "diag", name: "Diagnostic", adapterType: "readiness" },
      snap({
        lastUpdated: "2026-08-10T00:00:00Z",
        sessionCount: 20,
        aiReadinessScore: 71,
        observability: { uptimeSeconds: 90061, activeSessions7d: 3, activeSessions30d: 9, completionRate: 85, freshnessDays: 2 },
      }),
      NOW,
    );
    expect(o.uptimeSeconds).toBe(90061);
    expect(o.activeSessions7d).toBe(3);
    expect(o.activeSessions30d).toBe(9);
    expect(o.completionRate).toBe(85);
    expect(o.freshnessDays).toBe(2); // prefers the service's own freshness over lastUpdated
  });

  it("an unreachable product is 'down' with all metrics null", () => {
    const o = deriveObservability({ id: "x", name: "X", adapterType: "rag-health" }, { data: { ok: false, reachable: false }, isLoading: false }, NOW);
    expect(o.status).toBe("down");
    expect(o.reachable).toBe(false);
    expect(o.p95Ms).toBeNull();
    expect(o.freshnessDays).toBeNull();
  });

  it("a still-loading product reads 'checking'", () => {
    const o = deriveObservability({ id: "x", name: "X", adapterType: "rag-health" }, { data: undefined, isLoading: true }, NOW);
    expect(o.status).toBe("checking");
  });
});

describe("summarizeObservability", () => {
  const items = [
    deriveObservability({ id: "rag", name: "RAG", adapterType: "rag-health" }, snap({ latencyMsP95: 30000, costPerQuery: 0.01, observability: { total: 100 }, knowledgeFreshnessDays: 37 }), NOW),
    deriveObservability({ id: "fi", name: "FI", adapterType: "financial" }, snap({ lastUpdated: "2026-08-11T00:00:00Z", provenance: "x" }), NOW),
    deriveObservability({ id: "x", name: "X", adapterType: "rag-health" }, { data: { ok: false, reachable: false }, isLoading: false }, NOW),
  ];

  it("summarizes reachability, latency, cost and the oldest data age", () => {
    const s = summarizeObservability(items);
    expect(s.total).toBe(3);
    expect(s.reachable).toBe(2);
    expect(s.avgEndpointLatencyMs).toBe(200); // both reachable measured 200
    expect(s.avgP95Ms).toBe(30000); // only RAG reports p95
    expect(s.liveCost).toBeCloseTo(1.0); // 0.01 * 100
    expect(s.oldestFreshnessDays).toBe(37); // RAG 37d vs FI 5d
  });

  it("returns nulls when nothing exposes a signal", () => {
    const s = summarizeObservability([]);
    expect(s).toMatchObject({ total: 0, reachable: 0, avgEndpointLatencyMs: null, avgP95Ms: null, liveCost: null, oldestFreshnessDays: null });
  });
});
