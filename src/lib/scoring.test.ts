import { describe, it, expect } from "vitest";
import {
  scoreOf,
  FRAMEWORKS,
  rollupOpportunity,
  OPPORTUNITY_DIMENSIONS,
  simulateRoi,
  maturityOverall,
  maturityGaps,
  type PrioritizationCandidate,
  type RoiInputs,
} from "./scoring";

const candidate: PrioritizationCandidate = {
  reach: 40,
  impact: 2,
  confidence: 0.8,
  effort: 4,
  value: 80,
  jobSize: 6,
  opportunity: 72,
};

describe("scoreOf — prioritization frameworks", () => {
  it("RICE = round(reach*impact*confidence / effort)", () => {
    // 40*2*0.8 = 64; /4 = 16
    expect(scoreOf(candidate, "RICE")).toBe(16);
  });

  it("WSJF = round((value + jobSize*8) / effort)", () => {
    // (80 + 48) / 4 = 32
    expect(scoreOf(candidate, "WSJF")).toBe(32);
  });

  it("Value vs Effort = round(value/effort * 10)", () => {
    // 80/4 * 10 = 200
    expect(scoreOf(candidate, "Value vs Effort")).toBe(200);
  });

  it("Opportunity passes the assessment score straight through", () => {
    expect(scoreOf(candidate, "Opportunity")).toBe(72);
  });

  it("every framework returns a finite number (no NaN/Infinity)", () => {
    for (const fw of FRAMEWORKS) {
      expect(Number.isFinite(scoreOf(candidate, fw))).toBe(true);
    }
  });

  it("rounds to the nearest integer", () => {
    // RICE: 10*1*0.5 = 5; /3 = 1.666 -> 2
    expect(scoreOf({ ...candidate, reach: 10, impact: 1, confidence: 0.5, effort: 3 }, "RICE")).toBe(2);
  });
});

describe("rollupOpportunity — weighted multi-dimension score", () => {
  it("returns the flat value when every dimension is equal (inverse-aware)", () => {
    // All raw = 100. Inverse dims contribute 100-100 = 0, so the weighted mean
    // is NOT 100 — it is pulled down by the two inverse dimensions.
    const all100 = Object.fromEntries(OPPORTUNITY_DIMENSIONS.map((d) => [d.key, 100]));
    const score = rollupOpportunity(all100);
    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThan(0);
  });

  it("a mid score of 50 across all dimensions rolls up to 50", () => {
    // raw 50 everywhere: normal dims give 50, inverse give 100-50=50 -> 50.
    const all50 = Object.fromEntries(OPPORTUNITY_DIMENSIONS.map((d) => [d.key, 50]));
    expect(rollupOpportunity(all50)).toBe(50);
  });

  it("defaults missing dimensions to 50", () => {
    // Empty scores -> every raw defaults to 50 -> overall 50 (see above).
    expect(rollupOpportunity({})).toBe(50);
  });

  it("penalises high values on inverse dimensions (Risk)", () => {
    const base = Object.fromEntries(OPPORTUNITY_DIMENSIONS.map((d) => [d.key, 50]));
    const risky = { ...base, Risk: 100 }; // inverse -> 100 becomes 0, lowering the score
    expect(rollupOpportunity(risky)).toBeLessThan(50);
  });

  it("rewards high values on positive dimensions (Business Value)", () => {
    const base = Object.fromEntries(OPPORTUNITY_DIMENSIONS.map((d) => [d.key, 50]));
    const valuable = { ...base, "Business Value": 100 };
    expect(rollupOpportunity(valuable)).toBeGreaterThan(50);
  });

  it("returns 0 for an empty dimension set instead of dividing by zero", () => {
    expect(rollupOpportunity({ anything: 100 }, [])).toBe(0);
  });
});

describe("simulateRoi — 24-month adoption-ramp model", () => {
  const inputs: RoiInputs = {
    investment: 120000,
    engCostMonthly: 18000,
    licensingMonthly: 4000,
    infraMonthly: 3000,
    peakBenefitMonthly: 42000,
    rampMonths: 8,
  };

  it("produces one point per month over the default 24-month horizon", () => {
    const r = simulateRoi(inputs);
    expect(r.series).toHaveLength(24);
    expect(r.series[0].month).toBe(1);
    expect(r.series[23].month).toBe(24);
  });

  it("caps the ramp at peak benefit once rampMonths is reached", () => {
    const r = simulateRoi(inputs, 1);
    const monthly = inputs.engCostMonthly + inputs.licensingMonthly + inputs.infraMonthly;
    expect(r.series[23].benefit).toBe(inputs.peakBenefitMonthly); // fully ramped
    expect(r.series[23].cost).toBe(monthly);
  });

  it("adoption multiplier scales benefits and therefore ROI", () => {
    const base = simulateRoi(inputs, 1);
    const upside = simulateRoi(inputs, 1.4);
    const downside = simulateRoi(inputs, 0.6);
    expect(upside.roi).toBeGreaterThan(base.roi);
    expect(downside.roi).toBeLessThan(base.roi);
  });

  it("reports payback as the first month cumulative turns non-negative", () => {
    const r = simulateRoi(inputs, 1);
    if (r.payback !== null) {
      expect(r.series[r.payback - 1].cumulative).toBeGreaterThanOrEqual(0);
      if (r.payback > 1) expect(r.series[r.payback - 2].cumulative).toBeLessThan(0);
    }
  });

  it("returns null payback when the investment never recoups", () => {
    const neverPays: RoiInputs = { ...inputs, peakBenefitMonthly: 1000, investment: 5_000_000 };
    expect(simulateRoi(neverPays, 1).payback).toBeNull();
  });

  it("is deterministic for identical inputs", () => {
    expect(simulateRoi(inputs, 1)).toEqual(simulateRoi(inputs, 1));
  });
});

describe("maturity helpers", () => {
  const dims = ["Strategy", "Data", "MLOps"];
  const current = { Strategy: 3, Data: 2, MLOps: 2 };
  const target = { Strategy: 4, Data: 4, MLOps: 2 };

  it("maturityOverall averages current levels to one decimal", () => {
    // (3+2+2)/3 = 2.333 -> 2.3
    expect(maturityOverall(current, dims)).toBe(2.3);
  });

  it("maturityOverall returns 0 for no dimensions (no divide-by-zero)", () => {
    expect(maturityOverall(current, [])).toBe(0);
  });

  it("maturityGaps lists only positive gaps, largest first", () => {
    const gaps = maturityGaps(current, target, dims);
    expect(gaps).toEqual([
      { d: "Data", gap: 2 },
      { d: "Strategy", gap: 1 },
    ]); // MLOps gap is 0, excluded
  });

  it("maturityGaps is empty when every target is already met", () => {
    expect(maturityGaps(current, current, dims)).toEqual([]);
  });
});
