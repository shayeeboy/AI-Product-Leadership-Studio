import { Link } from "react-router-dom";
import { useLiveStore } from "../store";
import { WorkflowTimeline } from "@/shared/governance/WorkflowTimeline";
import { Card, PageHeader, SectionTitle, EmptyState } from "@/shared/components/ui";
import { WORKFLOW_STAGES } from "@/types/domain";
import type { ProductWorkflow, StageStatus, WorkflowStageName } from "@/types/domain";
import { shortDate } from "@/lib/format";

const ACTOR = "S. Adeyemi (You)";

export function LiveGovernance() {
  const registrations = useLiveStore((s) => s.registrations);
  const workflowRows = useLiveStore((s) => s.workflow);
  const audit = useLiveStore((s) => s.audit);
  const advance = useLiveStore((s) => s.advance);

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
                    <div className="flex gap-2">
                      <button onClick={() => advance({ productId: reg.id, stage: next, status: "approved", reviewer: ACTOR, actor: ACTOR })} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">Approve “{next}”</button>
                      <button onClick={() => advance({ productId: reg.id, stage: next, status: "blocked", reviewer: ACTOR, actor: ACTOR })} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600">Block</button>
                    </div>
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
