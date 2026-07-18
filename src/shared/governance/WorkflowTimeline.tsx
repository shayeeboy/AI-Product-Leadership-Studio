import { clsx } from "clsx";
import type { ProductWorkflow } from "@/types/domain";
import { STAGE_STATUS_META } from "@/lib/status";

// Horizontal, status-colored workflow timeline. Reused on the Product Detail
// drawer, Responsible AI Center and Human Approval Center — one component, one
// visual language for governance progress everywhere it appears.
export function WorkflowTimeline({ workflow, compact = false }: { workflow: ProductWorkflow; compact?: boolean }) {
  return (
    <div className="flex w-full items-start overflow-x-auto pb-2">
      {workflow.stages.map((stage, i) => {
        const meta = STAGE_STATUS_META[stage.status];
        const last = i === workflow.stages.length - 1;
        return (
          <div key={stage.name} className="flex min-w-0 flex-1 items-start">
            <div className="flex flex-col items-center" style={{ minWidth: compact ? 64 : 96 }}>
              <div className={clsx("flex h-6 w-6 items-center justify-center rounded-full ring-2", meta.ring)}>
                {stage.status === "approved" && <CheckIcon />}
                {stage.status === "blocked" && <span className="text-[11px] font-bold text-red-700">!</span>}
                {stage.status === "in-progress" && <span className="h-2 w-2 rounded-full bg-amber-500" />}
              </div>
              <div className={clsx("mt-1.5 text-center text-[11px] font-medium leading-tight", meta.color)} style={{ maxWidth: compact ? 72 : 100 }}>
                {stage.name}
              </div>
              {!compact && stage.updatedAt && (
                <div className="text-[10px] text-ink-400">{new Date(stage.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
              )}
            </div>
            {!last && (
              <div
                className={clsx(
                  "mt-3 h-0.5 flex-1",
                  stage.status === "approved" ? "bg-emerald-400" : "bg-ink-200",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3}>
      <path d="M5 10l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
