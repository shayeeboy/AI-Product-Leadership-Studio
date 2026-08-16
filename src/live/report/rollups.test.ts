import { describe, it, expect } from "vitest";
import { computeRollups, computeTopOpps, computeProductRows, executiveSummaryText, type RollupInputs } from "./rollups";

// A reachable snapshot with an optional health payload.
const live = (data: unknown = {}) => ({ data: { ok: true, data }, isLoading: false });
const down = () => ({ data: { ok: false, data: null }, isLoading: false });
const loading = () => ({ data: undefined, isLoading: true });

const base: RollupInputs = {
  registrations: [
    { id: "a", name: "A", businessUnit: "BU1", monthlySpend: 1000, roiTarget: 120 },
    { id: "b", name: "B", businessUnit: "BU2", monthlySpend: 500, roiTarget: 0 },
  ],
  assessments: [{ title: "Opp", opportunityScore: 80 }],
  risks: [{ productId: "a", data: { status: "open" } }],
  reviews: [{ data: { status: "pending" } }],
  workflow: [{ productId: "a", status: "blocked" }],
  snapshots: [live(), down()],
};

describe("computeRollups", () => {
  it("counts registered products and reachable live sources", () => {
    const r = computeRollups(base);
    expect(r.registered).toBe(2);
    expect(r.reachable).toBe(1); // one live, one down
  });

  it("sums monthly spend and averages only positive ROI targets", () => {
    const r = computeRollups(base);
    expect(r.spend).toBe(1500);
    expect(r.blendedRoi).toBe(120); // only A's 120 counts (B is 0)
  });

  it("counts open risks, pending governance, and at-risk products", () => {
    const r = computeRollups(base);
    expect(r.openRisks).toBe(1); // A's risk is not closed
    expect(r.pendingGovernance).toBe(2); // 1 pending review + 1 blocked stage
    expect(r.atRisk).toBe(1); // A has an open risk and a blocked stage
  });

  it("derives eval pass rate from snapshots that expose evaluationMetrics", () => {
    const r = computeRollups({
      ...base,
      snapshots: [live({ evaluationMetrics: [{ pass: true }, { pass: false }, { pass: true }] }), down()],
    });
    expect(r.evalPass).toBe(67); // 2/3
  });

  it("returns null eval pass rate when no snapshot exposes metrics", () => {
    expect(computeRollups(base).evalPass).toBeNull();
  });

  it("computes avg p95 and live inference cost from exposing snapshots", () => {
    const r = computeRollups({
      ...base,
      snapshots: [
        live({ latencyMsP95: 2000, costPerQuery: 0.01, observability: { total: 100 } }),
        live({ latencyMsP95: 4000 }),
      ],
    });
    expect(r.avgP95).toBe(3000); // (2000+4000)/2
    expect(r.liveCost).toBeCloseTo(1.0); // 0.01 * 100
  });

  it("reports checking while a snapshot is loading", () => {
    expect(computeRollups({ ...base, snapshots: [loading(), down()] }).checking).toBe(true);
  });

  it("closed risks do not count as open or at-risk", () => {
    const r = computeRollups({ ...base, risks: [{ productId: "a", data: { status: "closed" } }], workflow: [] });
    expect(r.openRisks).toBe(0);
    expect(r.atRisk).toBe(0);
  });
});

describe("computeTopOpps", () => {
  it("sorts by score desc, caps at 6, and truncates long titles", () => {
    const opps = computeTopOpps([
      { title: "Low", opportunityScore: 10 },
      { title: "This is a very long opportunity title", opportunityScore: 90 },
      { title: "Mid", opportunityScore: 50 },
      { title: "Null one", opportunityScore: null },
    ]);
    expect(opps.map((o) => o.score)).toEqual([90, 50, 10]); // null excluded, sorted desc
    expect(opps[0].name).toBe("This is a very lo…"); // first 17 chars + ellipsis
  });
});

describe("computeProductRows", () => {
  it("maps live/down status, p95 and open risks per product", () => {
    const rows = computeProductRows(
      base.registrations,
      base.risks,
      [live({ latencyMsP95: 1500 }), down()],
    );
    expect(rows[0]).toMatchObject({ id: "a", sourceStatus: "live", p95Ms: 1500, openRisks: 1, monthlySpend: 1000 });
    expect(rows[1]).toMatchObject({ id: "b", sourceStatus: "down", p95Ms: null, openRisks: 0 });
  });
});

describe("executiveSummaryText", () => {
  it("reads naturally and always flags adoption as a deliberate deferral", () => {
    const text = executiveSummaryText(computeRollups(base));
    expect(text).toContain("2 registered products");
    expect(text).toContain("1 open risk");
    expect(text).toMatch(/Adoption remains Not reported/);
  });
});
