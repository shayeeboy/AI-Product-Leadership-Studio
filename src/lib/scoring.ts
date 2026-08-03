// Pure decision-scoring & rollup math, extracted from the decision modules so
// the seeded and live copies share one implementation (no drift) and the logic
// is unit-testable in isolation (R4). Nothing here touches React, the DOM, the
// store or the network — inputs in, numbers out.

// ---------------------------------------------------------------------------
// Investment Prioritization — RICE / WSJF / Value-vs-Effort / Opportunity
// ---------------------------------------------------------------------------

export type Framework = "RICE" | "WSJF" | "Value vs Effort" | "Opportunity";

export const FRAMEWORKS: Framework[] = ["RICE", "WSJF", "Value vs Effort", "Opportunity"];

export interface PrioritizationCandidate {
  reach: number; // users/qtr (00s)
  impact: number; // 0.5..3
  confidence: number; // 0..1
  effort: number; // person-months (divisor — callers guarantee > 0)
  value: number; // business value 0-100
  jobSize: number; // WSJF cost-of-delay proxy
  opportunity: number; // 0-100, from the Opportunity Assessment
}

// Higher is always better, regardless of framework, so a single sort works.
export function scoreOf(c: PrioritizationCandidate, fw: Framework): number {
  switch (fw) {
    case "RICE":
      return Math.round((c.reach * c.impact * c.confidence) / c.effort);
    case "WSJF":
      return Math.round((c.value + c.jobSize * 8) / c.effort);
    case "Value vs Effort":
      return Math.round((c.value / c.effort) * 10);
    case "Opportunity":
      return c.opportunity;
  }
}

// ---------------------------------------------------------------------------
// Opportunity Assessment — weighted multi-dimension score (0-100)
// ---------------------------------------------------------------------------

export interface OpportunityDimension {
  key: string;
  weight: number; // higher weight = more influence
  inverse?: boolean; // a high raw value here should lower the score
}

// "Technical Complexity" and "Risk" are inverse: high there hurts the score.
export const OPPORTUNITY_DIMENSIONS: OpportunityDimension[] = [
  { key: "Business Value", weight: 1.4 },
  { key: "Customer Impact", weight: 1.2 },
  { key: "AI Suitability", weight: 1.2 },
  { key: "Data Readiness", weight: 1.0 },
  { key: "Technical Complexity", weight: 0.8, inverse: true },
  { key: "Risk", weight: 1.0, inverse: true },
  { key: "ROI", weight: 1.3 },
  { key: "Strategic Alignment", weight: 1.1 },
];

// Missing dimensions default to a neutral 50 so a partial score is still sane.
export function rollupOpportunity(
  scores: Record<string, number>,
  dimensions: OpportunityDimension[] = OPPORTUNITY_DIMENSIONS,
): number {
  let weighted = 0;
  let totalWeight = 0;
  for (const d of dimensions) {
    const raw = scores[d.key] ?? 50;
    const effective = d.inverse ? 100 - raw : raw;
    weighted += effective * d.weight;
    totalWeight += d.weight;
  }
  return totalWeight ? Math.round(weighted / totalWeight) : 0;
}

// ---------------------------------------------------------------------------
// ROI Simulator — 24-month adoption-ramp model
// ---------------------------------------------------------------------------

export const ROI_MONTHS = 24;
const MONTHLY_DISCOUNT = 1.008; // ~10%/yr, applied per month for NPV

export interface RoiInputs {
  investment: number; // upfront, month 0
  engCostMonthly: number;
  licensingMonthly: number;
  infraMonthly: number;
  peakBenefitMonthly: number; // benefit at full adoption
  rampMonths: number; // months to reach peak (linear ramp)
}

export interface RoiPoint {
  month: number;
  benefit: number;
  cost: number;
  cumulative: number;
}

export interface RoiResult {
  series: RoiPoint[];
  roi: number; // % over the horizon
  payback: number | null; // first month cumulative >= 0, else null
  npv: number;
  netSavings: number;
}

export function simulateRoi(inp: RoiInputs, adoptionMult = 1, months = ROI_MONTHS): RoiResult {
  const monthlyCost = inp.engCostMonthly + inp.licensingMonthly + inp.infraMonthly;
  let cumulative = -inp.investment;
  let payback: number | null = null;
  let totalBenefit = 0;
  const series: RoiPoint[] = [];
  for (let m = 1; m <= months; m++) {
    const ramp = Math.min(1, m / inp.rampMonths);
    const benefit = inp.peakBenefitMonthly * ramp * adoptionMult;
    totalBenefit += benefit;
    cumulative += benefit - monthlyCost;
    if (payback === null && cumulative >= 0) payback = m;
    series.push({ month: m, benefit: Math.round(benefit), cost: Math.round(monthlyCost), cumulative: Math.round(cumulative) });
  }
  const totalCost = inp.investment + monthlyCost * months;
  const roi = Math.round(((totalBenefit - totalCost) / totalCost) * 100);
  const npv = Math.round(
    series.reduce((acc, s, i) => acc + (s.benefit - s.cost) / Math.pow(MONTHLY_DISCOUNT, i + 1), -inp.investment),
  );
  return { series, roi, payback, npv, netSavings: Math.round(totalBenefit - monthlyCost * months) };
}

// ---------------------------------------------------------------------------
// Maturity Assessment — average level + prioritized gaps
// ---------------------------------------------------------------------------

// Average current level across the given dimensions (0-5 scale), rounded to 1dp.
export function maturityOverall(current: Record<string, number>, dimensions: string[]): number {
  if (!dimensions.length) return 0;
  const sum = dimensions.reduce((a, d) => a + (current[d] ?? 0), 0);
  return Math.round((sum / dimensions.length) * 10) / 10;
}

// Positive target-minus-current gaps, largest first (nothing where already met).
export function maturityGaps(
  current: Record<string, number>,
  target: Record<string, number>,
  dimensions: string[],
): { d: string; gap: number }[] {
  return dimensions
    .map((d) => ({ d, gap: (target[d] ?? 0) - (current[d] ?? 0) }))
    .filter((g) => g.gap > 0)
    .sort((a, b) => b.gap - a.gap);
}
