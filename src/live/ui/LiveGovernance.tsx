import { useState } from "react";
import { Link } from "react-router-dom";
import { useLiveStore } from "../store";
import { useAuthStore } from "../auth/authStore";
import { canApprove, ROLE_LABEL } from "../auth/roles";
import type { Role } from "../auth/roles";
import { WorkflowTimeline } from "@/shared/governance/WorkflowTimeline";
import { Card, PageHeader, SectionTitle, EmptyState } from "@/shared/components/ui";
import { WORKFLOW_STAGES } from "@/types/domain";
import type { ProductWorkflow, StageStatus, WorkflowStageName } from "@/types/domain";
import { shortDate } from "@/lib/format";

export function LiveGovernance() {
  const registrations = useLiveStore((s) => s.registrations);
  const workflowRows = useLiveStore((s) => s.workflow);
  const audit = useLiveStore((s) => s.audit);
  const advance = useLiveStore((s) => s.advance);
  const identity = useLiveStore((s) => s.identity);
  const ACTOR = identity.trim() || "You"; // reviewer name when auth is off

  // R6b — governance is gated. With auth on, only an approver/admin may advance a
  // stage (the Worker enforces this too); with auth off it stays open.
  const authConfigured = useAuthStore((s) => s.configured);
  const authUser = useAuthStore((s) => s.user);
  const canAct = !authConfigured || canApprove(authUser?.role);
  const [error, setError] = useState<string | null>(null);

  async function act(productId: string, stage: WorkflowStageName, status: StageStatus) {
    setError(null);
    try {
      await advance({ productId, stage, status, reviewer: ACTOR, actor: ACTOR });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record the decision.");
    }
  }

  function workflowFor(id: string): ProductWorkflow {
    return {
      productId: id,
      stages: WORKFLOW_STAGES.map((name) => {
        const row = workflowRows.find((w) => w.productId === id && w.stage === name);
        return {
          name: name as WorkflowStageName,
          status: (row?.status as StageStatus) ?? "not-started",
          reviewer: row?.reviewer ?? undefined,
          updatedAt: row?.updatedAt,
        };
      }),
    };
  }

  function nextStage(id: string): WorkflowStageName | null {
    const wf = workflowFor(id);
    const next = wf.stages.find((s) => s.status !== "approved");
    return next ? next.name : null;
  }

  return (
    <div>
      <PageHeader
        title="Governance & Approvals"
        subtitle="The shared governance workflow, persisted. Advancing a stage writes to the audit trail and updates the timeline everywhere."
      />

      {authConfigured && !canAct && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          {authUser
            ? <>Your role (<strong>{ROLE_LABEL[(authUser.role as Role) ?? "viewer"] ?? authUser.role}</strong>) can view the workflow but can’t record approvals — an <strong>Approver</strong> is required.</>
            : <>Sign in as an <strong>Approver</strong> to record governance decisions. You can still review everything anonymously.</>}
        </div>
      )}
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {registrations.length === 0 && <EmptyState title="No products registered" />}
          {registrations.map((reg) => {
            const next = nextStage(reg.id);
            return (
              <Card key={reg.id} className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <Link to={`/product/${reg.id}`} className="font-semibold text-brand-600 hover:underline">{reg.name}</Link>
                  {next ? (
                    canAct ? (
                      <div className="flex gap-2">
                        <button onClick={() => act(reg.id, next, "approved")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">Approve “{next}”</button>
                        <button onClick={() => act(reg.id, next, "blocked")} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600">Block</button>
                      </div>
                    ) : (
                      <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-medium text-ink-400" title="Approver role required">Approver required</span>
                    )
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">In production</span>
                  )}
                </div>
                <WorkflowTimeline workflow={workflowFor(reg.id)} />
              </Card>
            );
          })}
        </div>

        <Card className="p-5">
          <SectionTitle hint="persisted">Audit trail</SectionTitle>
          {audit.length === 0 ? (
            <p className="text-sm text-ink-400">No governance actions yet.</p>
          ) : (
            <ul className="max-h-[32rem] space-y-2 overflow-y-auto text-sm">
              {audit.map((a) => (
                <li key={a.id} className="border-b border-ink-100 pb-2">
                  <div className="font-medium text-ink-800">{a.action}</div>
                  <div className="text-xs text-ink-500">{a.actor} · {shortDate(a.createdAt)}{a.note ? ` · ${a.note}` : ""}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
