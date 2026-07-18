import type {
  ReadinessSnapshot,
  RagHealthSnapshot,
  FinancialIntelligenceSnapshot,
} from "@/types/domain";

// Stable, hand-authored snapshots (not randomized) so a live walkthrough shows
// the same numbers every time. In a live integration these tables would be
// populated by each portfolio project rather than by this seed file.

export const READINESS_SNAPSHOTS: ReadinessSnapshot[] = [
  {
    productId: "ai-native-diagnostic",
    teamMaturityScore: 78,
    aiReadinessScore: 74,
    adoptionScore: 82,
    capabilityAssessment: [
      { dimension: "Strategy", score: 80 },
      { dimension: "Data", score: 68 },
      { dimension: "MLOps", score: 62 },
      { dimension: "Talent", score: 76 },
      { dimension: "Governance", score: 85 },
      { dimension: "Product Delivery", score: 79 },
    ],
    riskIndicators: [
      { label: "Data pipeline coverage", severity: "medium" },
      { label: "Model monitoring gaps", severity: "low" },
    ],
    recommendations: [
      "Close the MLOps observability gap before scaling to new business units.",
      "Formalize a data-quality SLA with the source systems team.",
    ],
    lastUpdated: "2026-07-10",
  },
  {
    productId: "hr-policy-bot",
    teamMaturityScore: 61,
    aiReadinessScore: 58,
    adoptionScore: 0,
    capabilityAssessment: [
      { dimension: "Strategy", score: 64 },
      { dimension: "Data", score: 55 },
      { dimension: "MLOps", score: 48 },
      { dimension: "Talent", score: 60 },
      { dimension: "Governance", score: 52 },
      { dimension: "Product Delivery", score: 66 },
    ],
    riskIndicators: [
      { label: "Privacy review incomplete", severity: "high" },
      { label: "Responsible AI sign-off pending", severity: "high" },
    ],
    recommendations: [
      "Complete privacy and Responsible AI review before opening a pilot.",
      "Define human-in-the-loop checkpoints for sensitive policy queries.",
    ],
    lastUpdated: "2026-07-14",
  },
];

export const RAG_HEALTH_SNAPSHOTS: RagHealthSnapshot[] = [
  {
    productId: "enterprise-rag",
    retrievalQuality: 83,
    groundedness: 76,
    citationAccuracy: 88,
    hallucinationRate: 6.5,
    costPerQuery: 0.0,
    latencyMsP50: 4200,
    latencyMsP95: 11000,
    knowledgeFreshnessDays: 12,
    evaluationMetrics: [
      { metric: "Faithfulness", score: 76, passThreshold: 70, pass: true },
      { metric: "Answer Correctness", score: 61, passThreshold: 60, pass: true },
      { metric: "Semantic Hit@5", score: 71, passThreshold: 70, pass: true },
      { metric: "Out-of-scope Refusal", score: 100, passThreshold: 90, pass: true },
      { metric: "Citation Accuracy", score: 88, passThreshold: 80, pass: true },
    ],
    lastEvaluatedAt: "2026-07-17",
  },
  {
    productId: "hr-policy-bot",
    retrievalQuality: 64,
    groundedness: 58,
    citationAccuracy: 70,
    hallucinationRate: 14.0,
    costPerQuery: 0.0009,
    latencyMsP50: 3800,
    latencyMsP95: 9200,
    knowledgeFreshnessDays: 3,
    evaluationMetrics: [
      { metric: "Faithfulness", score: 58, passThreshold: 70, pass: false },
      { metric: "Answer Correctness", score: 52, passThreshold: 60, pass: false },
      { metric: "Semantic Hit@5", score: 66, passThreshold: 70, pass: false },
      { metric: "Out-of-scope Refusal", score: 80, passThreshold: 90, pass: false },
      { metric: "Citation Accuracy", score: 70, passThreshold: 80, pass: false },
    ],
    lastEvaluatedAt: "2026-07-15",
  },
];

export const FINANCIAL_SNAPSHOTS: FinancialIntelligenceSnapshot[] = [
  {
    productId: "financial-intelligence",
    scenarios: [
      { name: "Base", projectedRevenueImpact: 480000, projectedCostSavings: 120000, npv: 410000, paybackMonths: 11 },
      { name: "Upside", projectedRevenueImpact: 760000, projectedCostSavings: 190000, npv: 720000, paybackMonths: 7 },
      { name: "Downside", projectedRevenueImpact: 210000, projectedCostSavings: 60000, npv: 120000, paybackMonths: 19 },
    ],
    strategicRecommendations: [
      "Prioritize the GTA newcomer credit segment; highest NPV-to-effort ratio.",
      "Sequence expansion behind the base-case payback threshold of 12 months.",
    ],
    investmentSimulations: [
      { input: "Adoption ramp 18mo, licensing flat", output: "NPV $410k · payback 11mo" },
      { input: "Adoption ramp 12mo, +15% infra", output: "NPV $520k · payback 9mo" },
    ],
    executiveSummary:
      "The strategy agent's base case clears the investment hurdle with an 11-month payback; upside is gated on faster cohort expansion, downside remains NPV-positive.",
    decisionTraces: [
      { step: "Segment selection", rationale: "Newcomer credit shows widest debt-service-ratio gap vs. product coverage." },
      { step: "Confidence flag", rationale: "Series with <3yr history flagged Low Confidence per guardrail policy." },
    ],
    lastUpdated: "2026-07-15",
  },
];

// Portfolio-level monthly trend series (last 8 months) for the exec dashboard.
export const PORTFOLIO_TRENDS = [
  { month: "Dec", spend: 41000, adoption: 44, roi: 96, evalPass: 71 },
  { month: "Jan", spend: 43500, adoption: 47, roi: 101, evalPass: 73 },
  { month: "Feb", spend: 46000, adoption: 49, roi: 108, evalPass: 74 },
  { month: "Mar", spend: 48200, adoption: 52, roi: 112, evalPass: 76 },
  { month: "Apr", spend: 47000, adoption: 55, roi: 118, evalPass: 79 },
  { month: "May", spend: 49500, adoption: 58, roi: 121, evalPass: 80 },
  { month: "Jun", spend: 51200, adoption: 60, roi: 126, evalPass: 82 },
  { month: "Jul", spend: 52400, adoption: 61, roi: 129, evalPass: 83 },
];
