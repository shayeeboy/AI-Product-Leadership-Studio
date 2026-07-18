// ---------------------------------------------------------------------------
// Shared domain contracts for the AI Product & Leadership Studio.
// These are the schemas the whole app agrees on. Adapters translate each
// portfolio project's raw output into these shapes; modules only ever read
// these types — never another module's internals.
// ---------------------------------------------------------------------------

export type Severity = "low" | "medium" | "high";

export type ProductStatus =
  | "healthy"
  | "at-risk"
  | "over-budget"
  | "pending"
  | "blocked"
  | "archived";

export type LifecycleStage =
  | "discovery"
  | "build"
  | "pilot"
  | "production"
  | "archived";

export type ArchitectureType =
  | "SaaS"
  | "RAG"
  | "Fine-Tuning"
  | "Foundation Model"
  | "Agentic"
  | "Hybrid";

export interface Product {
  id: string;
  name: string;
  status: ProductStatus;
  lifecycle: LifecycleStage;
  architecture: ArchitectureType;
  businessUnit: string;
  owner: string;
  engLead: string;
  sponsor: string;
  monthlySpend: number; // USD
  annualBudget: number; // USD
  roi: number; // %
  adoption: number; // 0-100 active-user index
  sourceEngine?: "ai-native-diagnostic" | "enterprise-rag" | "financial-intelligence";
  summary: string;
}

// --- Section 5.1: AI Native Diagnostic Adapter --------------------------------
export interface ReadinessSnapshot {
  productId: string;
  teamMaturityScore: number; // 0-100
  aiReadinessScore: number; // 0-100
  capabilityAssessment: { dimension: string; score: number }[];
  adoptionScore: number; // 0-100
  riskIndicators: { label: string; severity: Severity }[];
  recommendations: string[];
  lastUpdated: string; // ISO date
}

// --- Section 5.2: Enterprise RAG Assistant Adapter ----------------------------
export interface RagHealthSnapshot {
  productId: string;
  retrievalQuality: number; // 0-100
  groundedness: number; // 0-100
  citationAccuracy: number; // 0-100
  hallucinationRate: number; // %, lower is better
  costPerQuery: number; // USD
  latencyMsP50: number;
  latencyMsP95: number;
  knowledgeFreshnessDays: number;
  evaluationMetrics: {
    metric: string;
    score: number;
    passThreshold: number;
    pass: boolean;
  }[];
  lastEvaluatedAt: string;
}

// --- Section 5.3: Financial Intelligence Strategy Agent Adapter ----------------
export interface FinancialScenario {
  name: "Base" | "Upside" | "Downside" | string;
  projectedRevenueImpact: number;
  projectedCostSavings: number;
  npv: number;
  paybackMonths: number;
}

export interface FinancialIntelligenceSnapshot {
  productId: string;
  scenarios: FinancialScenario[];
  strategicRecommendations: string[];
  investmentSimulations: { input: string; output: string }[];
  executiveSummary: string;
  decisionTraces: { step: string; rationale: string }[];
  lastUpdated: string;
}

// --- Section 7: Governance workflow engine ------------------------------------
export type StageStatus =
  | "not-started"
  | "in-progress"
  | "approved"
  | "rejected"
  | "blocked";

export const WORKFLOW_STAGES = [
  "Registered",
  "Risk Review",
  "Security Review",
  "Responsible AI Review",
  "Human Approval",
  "Deployment Approval",
  "In Production",
] as const;

export type WorkflowStageName = (typeof WORKFLOW_STAGES)[number];

export interface WorkflowStage {
  name: WorkflowStageName;
  status: StageStatus;
  reviewer?: string;
  dueDate?: string;
  updatedAt?: string;
  comment?: string;
}

export interface ProductWorkflow {
  productId: string;
  stages: WorkflowStage[];
}

export interface AuditEvent {
  id: string;
  productId: string;
  actor: string;
  action: string;
  stage?: WorkflowStageName;
  timestamp: string; // ISO
  note?: string;
}

// --- Decision layer -----------------------------------------------------------
export interface OpportunityAssessment {
  id: string;
  productId?: string;
  title: string;
  scores: Record<string, number>; // dimension -> 0-100
  opportunityScore: number; // rolled up 0-100
  strategicFit: "Low" | "Moderate" | "High";
  estimatedRoi: number; // %
  confidence: "Low" | "Medium" | "High";
  recommendation: "Fund now" | "Needs discovery" | "Defer" | "Reject";
  createdAt: string;
}

export interface RiskEntry {
  id: string;
  productId: string;
  risk: string;
  likelihood: Severity;
  impact: Severity;
  owner: string;
  mitigation: string;
  status: "open" | "mitigating" | "closed";
}
