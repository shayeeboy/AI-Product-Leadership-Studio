import type {
  ProductWorkflow,
  AuditEvent,
  RiskEntry,
  OpportunityAssessment,
  WorkflowStage,
  StageStatus,
  WorkflowStageName,
} from "@/types/domain";
import { WORKFLOW_STAGES } from "@/types/domain";

// Helper to build a workflow at a given "progress" point.
function workflowUpTo(
  productId: string,
  approvedThrough: number, // index of last approved stage
  current?: { index: number; status: StageStatus; reviewer?: string; comment?: string },
): ProductWorkflow {
  const stages: WorkflowStage[] = WORKFLOW_STAGES.map((name, i) => {
    let status: StageStatus = "not-started";
    if (i <= approvedThrough) status = "approved";
    if (current && i === current.index) status = current.status;
    return {
      name: name as WorkflowStageName,
      status,
      reviewer: i <= approvedThrough ? "Governance Office" : current?.index === i ? current?.reviewer : undefined,
      updatedAt: i <= approvedThrough ? "2026-07-05" : current?.index === i ? "2026-07-16" : undefined,
      comment: current?.index === i ? current?.comment : undefined,
    };
  });
  return { productId, stages };
}

export const WORKFLOWS: ProductWorkflow[] = [
  workflowUpTo("ai-native-diagnostic", 6),
  workflowUpTo("enterprise-rag", 6),
  workflowUpTo("financial-intelligence", 6),
  workflowUpTo("contract-copilot", 6),
  workflowUpTo("demand-forecaster", 4, { index: 5, status: "in-progress", reviewer: "M. Rivera", comment: "Re-validating accuracy after seasonality shift." }),
  workflowUpTo("support-triage", 6),
  workflowUpTo("sales-agent", 3, { index: 4, status: "blocked", reviewer: "Responsible AI Office", comment: "Human-oversight checkpoints not yet defined." }),
  workflowUpTo("doc-summarizer", 6),
  workflowUpTo("vision-qc", 4, { index: 5, status: "in-progress", reviewer: "VP Ops", comment: "Deployment approval pending cost remediation." }),
  workflowUpTo("hr-policy-bot", 1, { index: 3, status: "in-progress", reviewer: "Responsible AI Office", comment: "Privacy + Responsible AI review underway." }),
];

export const AUDIT_EVENTS: AuditEvent[] = [
  { id: "a1", productId: "hr-policy-bot", actor: "Responsible AI Office", action: "Started Responsible AI review", stage: "Responsible AI Review", timestamp: "2026-07-16T09:12:00Z", note: "Privacy DPIA requested." },
  { id: "a2", productId: "sales-agent", actor: "Responsible AI Office", action: "Blocked at Human Approval", stage: "Human Approval", timestamp: "2026-07-14T14:03:00Z", note: "Oversight checkpoints missing." },
  { id: "a3", productId: "demand-forecaster", actor: "M. Rivera", action: "Reopened Deployment Approval", stage: "Deployment Approval", timestamp: "2026-07-12T11:40:00Z", note: "Accuracy regression under review." },
  { id: "a4", productId: "enterprise-rag", actor: "Governance Office", action: "Approved for Production", stage: "In Production", timestamp: "2026-07-05T16:20:00Z" },
  { id: "a5", productId: "vision-qc", actor: "VP Ops", action: "Flagged over budget", stage: "Deployment Approval", timestamp: "2026-07-11T08:55:00Z", note: "GPU inference above pilot envelope." },
  { id: "a6", productId: "financial-intelligence", actor: "CFO Office", action: "Approved for Production", stage: "In Production", timestamp: "2026-07-05T10:05:00Z" },
];

export const RISKS: RiskEntry[] = [
  { id: "r1", productId: "hr-policy-bot", risk: "PII exposure in policy responses", likelihood: "medium", impact: "high", owner: "Privacy Office", mitigation: "DPIA + PII redaction guardrail", status: "mitigating" },
  { id: "r2", productId: "sales-agent", risk: "Unsupervised outbound messaging", likelihood: "high", impact: "high", owner: "Responsible AI Office", mitigation: "Mandatory human approval before send", status: "open" },
  { id: "r3", productId: "demand-forecaster", risk: "Forecast drift after seasonality change", likelihood: "high", impact: "medium", owner: "J. Alvarez", mitigation: "Rolling re-train + drift monitor", status: "mitigating" },
  { id: "r4", productId: "doc-summarizer", risk: "Premium-model cost overrun", likelihood: "high", impact: "medium", owner: "Chief of Staff", mitigation: "Model-tier routing by document length", status: "open" },
  { id: "r5", productId: "vision-qc", risk: "GPU inference cost above envelope", likelihood: "high", impact: "high", owner: "VP Ops", mitigation: "Batch inference + quantization", status: "mitigating" },
  { id: "r6", productId: "enterprise-rag", risk: "Stale knowledge base content", likelihood: "low", impact: "medium", owner: "M. Okafor", mitigation: "Freshness SLA + re-index cadence", status: "closed" },
  { id: "r7", productId: "support-triage", risk: "Category drift eroding routing precision", likelihood: "medium", impact: "medium", owner: "T. Bello", mitigation: "Monthly label audit + re-train", status: "mitigating" },
];

export const OPPORTUNITY_ASSESSMENTS: OpportunityAssessment[] = [
  {
    id: "op1",
    productId: "hr-policy-bot",
    title: "HR Policy Assistant",
    scores: { "Business Value": 72, "Customer Impact": 68, "AI Suitability": 80, "Data Readiness": 60, "Technical Complexity": 45, Risk: 55, ROI: 64, "Strategic Alignment": 70 },
    opportunityScore: 66,
    strategicFit: "Moderate",
    estimatedRoi: 120,
    confidence: "Medium",
    recommendation: "Needs discovery",
    createdAt: "2026-07-14",
  },
  {
    id: "op2",
    productId: "financial-intelligence",
    title: "Strategy Agent — Newcomer Credit Expansion",
    scores: { "Business Value": 88, "Customer Impact": 82, "AI Suitability": 84, "Data Readiness": 78, "Technical Complexity": 55, Risk: 40, ROI: 90, "Strategic Alignment": 86 },
    opportunityScore: 82,
    strategicFit: "High",
    estimatedRoi: 260,
    confidence: "High",
    recommendation: "Fund now",
    createdAt: "2026-07-15",
  },
  {
    id: "op3",
    productId: "sales-agent",
    title: "Sales Outreach Agent — GA rollout",
    scores: { "Business Value": 70, "Customer Impact": 62, "AI Suitability": 66, "Data Readiness": 58, "Technical Complexity": 60, Risk: 78, ROI: 48, "Strategic Alignment": 64 },
    opportunityScore: 54,
    strategicFit: "Moderate",
    estimatedRoi: 60,
    confidence: "Low",
    recommendation: "Defer",
    createdAt: "2026-07-13",
  },
];
