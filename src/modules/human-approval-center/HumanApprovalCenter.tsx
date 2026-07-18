import { useState } from "react";
import { Link } from "react-router-dom";
import { useGovernanceStore, pendingWorkflowItems } from "@/shared/governance/store";
import { productById } from "@/seed/products";
import { Card, PageHeader, SectionTitle, EmptyState } from "@/shared/components/ui";
import { shortDate } from "@/lib/format";
import { clsx } from "clsx";

// The operational inbox. Every action writes through the shared governance
// store, which updates the workflow timeline everywhere and appends to the
// audit trail — one engine, many views (Section 6.12 + Section 7).
export function HumanApprovalCenter() {
  const workflows = useGovernanceStore((s) => s.workflows);
  const audit = useGovernanceStore((s) => s.audit);
  const advanceStage = useGovernanceStore((s) => s.advanceStage);
  const [comments, setComments] = useState<Record<string, string>>({});

  const items = pendingWorkflowItems(workflows);
  const actor = "S. Adeyemi (You)";

  return (
    <div>
      <PageHeader
        title="Human Oversight & Decision Management"
        subtitle="Every item across the portfolio awaiting a human decision. Approve, reject or request changes — actions update the workflow and audit trail live."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {items.length === 0 ? (
            <EmptyState title="Queue clear" hint="No workflow stages are in progress or blocked." />
          ) : (
            items.map(({ productId, stage }) => {
              const product = productById(productId);
              const key = `${productId}:${stage.name}`;
              return (
                <Card key={key} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link to={`/product/${productId}`} className="font-semibold text-brand-600 hover:underline">{product?.name}</Link>
                      <div className="mt-0.5 text-sm text-ink-600">
                        Stage: <span className="font-medium">{stage.name}</span>
                        <span className={clsx("ml-2 rounded-full px-2 py-0.5 text-xs font-medium", stage.status === "blocked" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>{stage.status}</span>
                      </div>
                      {stage.comment && <p className="mt-1 text-xs text-ink-500">“{stage.comment}”</p>}
                    </div>
                    <div className="text-xs text-ink-400">{stage.reviewer}</div>
                  </div>
                  <input
                    value={comments[key] ?? ""}
                    onChange={(e) => setComments((c) => ({ ...c, [key]: e.target.value }))}
                    placeholder="Add a decision comment…"
                    className="mt-3 w-full rounded-lg border border-ink-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
                  />
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => advanceStage(productId, stage.name, "approved", actor, comments[key])} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">Approve</button>
                    <button onClick={() => advanceStage(productId, stage.name, "blocked", actor, comments[key])} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600">Request changes</button>
                    <button onClick={() => advanceStage(productId, stage.name, "rejected", actor, comments[key])} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">Reject</button>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        <Card className="p-5">
          <SectionTitle hint="immutable log">Audit trail</SectionTitle>
          <ul className="max-h-[28rem] space-y-2 overflow-y-auto text-sm">
            {audit.map((a) => {
              const product = productById(a.productId);
              return (
                <li key={a.id} className="border-b border-ink-100 pb-2">
                  <div className="font-medium text-ink-800">{a.action}</div>
                  <div className="text-xs text-ink-500">{product?.name} · {a.actor} · {shortDate(a.timestamp)}</div>
                  {a.note && <div className="text-xs text-ink-400">“{a.note}”</div>}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}
