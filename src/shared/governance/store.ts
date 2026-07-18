import { create } from "zustand";
import type { AuditEvent, ProductWorkflow, StageStatus, WorkflowStageName } from "@/types/domain";
import { WORKFLOWS, AUDIT_EVENTS } from "@/seed/governance";

// The shared, reusable governance workflow engine (Section 7). One store owns
// workflow state + the audit trail; the Human Approval Center, Responsible AI
// Center and Portfolio Governance all read/write through it — no per-module
// copies of the logic, no cross-module component state.
interface GovernanceState {
  workflows: ProductWorkflow[];
  audit: AuditEvent[];
  advanceStage: (
    productId: string,
    stage: WorkflowStageName,
    status: StageStatus,
    actor: string,
    note?: string,
  ) => void;
}

export const useGovernanceStore = create<GovernanceState>((set) => ({
  workflows: WORKFLOWS,
  audit: AUDIT_EVENTS,
  advanceStage: (productId, stage, status, actor, note) =>
    set((state) => {
      const workflows = state.workflows.map((wf) => {
        if (wf.productId !== productId) return wf;
        return {
          ...wf,
          stages: wf.stages.map((s) =>
            s.name === stage
              ? { ...s, status, reviewer: actor, updatedAt: new Date().toISOString(), comment: note ?? s.comment }
              : s,
          ),
        };
      });
      const event: AuditEvent = {
        id: `a${Date.now()}`,
        productId,
        actor,
        action: `${statusVerb(status)} ${stage}`,
        stage,
        timestamp: new Date().toISOString(),
        note,
      };
      return { workflows, audit: [event, ...state.audit] };
    }),
}));

function statusVerb(status: StageStatus): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "blocked":
      return "Blocked";
    case "in-progress":
      return "Started";
    default:
      return "Updated";
  }
}

export const pendingWorkflowItems = (workflows: ProductWorkflow[]) =>
  workflows.flatMap((wf) =>
    wf.stages
      .filter((s) => s.status === "in-progress" || s.status === "blocked")
      .map((s) => ({ productId: wf.productId, stage: s })),
  );
