import { useParams, Link } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useLiveStore } from "../store";
import { useLiveSnapshot, LiveBadge } from "./common";
import { ReadinessPanel, RagHealthPanel, FinancialPanel, HealthPanel } from "./panels";
import { WorkflowTimeline } from "@/shared/governance/WorkflowTimeline";
import { Card, PageHeader, SectionTitle, EmptyState } from "@/shared/components/ui";
import { WORKFLOW_STAGES } from "@/types/domain";
import type { ProductWorkflow, StageStatus, WorkflowStageName } from "@/types/domain";
import type { LiveReadiness, LiveRagHealth, LiveFinancial, LiveGenericHealth } from "../liveAdapters";
import { ADAPTER_LABELS } from "../types";

export function LiveProductDetail() {
  const { id = "" } = useParams();
  const reg = useLiveStore((s) => s.productById(id));
  const workflowRows = useLiveStore((s) => s.workflow);
  const q = useLiveSnapshot(reg);

  if (!reg) return <EmptyState title="Product not registered" hint="Return to the portfolio to pick a product." />;

  const workflow: ProductWorkflow = {
    productId: id,
    stages: WORKFLOW_STAGES.map((name) => {
      const row = workflowRows.find((w) => w.productId === id && w.stage === name);
      return {
        name: name as WorkflowStageName,
        status: (row?.status as StageStatus) ?? "not-started",
        reviewer: row?.reviewer ?? undefined,
        updatedAt: row?.updatedAt,
        comment: row?.comment ?? undefined,
      };
    }),
  };

  const result = q.data;
  const data = result?.ok ? result.data : undefined;

  return (
    <div>
      <Link to="/" className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Portfolio
      </Link>
      <PageHeader
        title={reg.name}
        subtitle={`${reg.businessUnit ?? ""}${reg.architecture ? ` · ${reg.architecture}` : ""} · ${ADAPTER_LABELS[reg.adapterType]}`}
        actions={
          <div className="flex items-center gap-2">
            <LiveBadge result={result} loading={q.isLoading} />
            <button onClick={() => q.refetch()} className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1 text-xs text-ink-600 hover:bg-ink-50" disabled={q.isFetching}>
              <RefreshCw className={q.isFetching ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} /> Refresh
            </button>
          </div>
        }
      />

      {reg.endpointUrl && (
        <p className="mb-4 break-all font-mono text-xs text-ink-400">{reg.endpointUrl}</p>
      )}

      {/* Live panel */}
      {q.isLoading ? (
        <Card className="p-10 text-center text-ink-400">Fetching live snapshot…</Card>
      ) : !result?.ok ? (
        <EmptyState
          title={result?.reachable ? "Source responded with an error" : "Source not reachable"}
          hint={`${result?.error ?? "no data"} — no seeded values are shown in the live copy. Try Refresh; free-tier services can cold-start.`}
        />
      ) : (
        <div className="mb-6">
          {reg.adapterType === "readiness" && <ReadinessPanel d={data as LiveReadiness} />}
          {reg.adapterType === "rag-health" && <RagHealthPanel d={data as LiveRagHealth} />}
          {reg.adapterType === "financial" && <FinancialPanel d={data as LiveFinancial} />}
          {reg.adapterType === "health" && <HealthPanel d={data as LiveGenericHealth} />}
        </div>
      )}

      {/* Governance workflow (persisted) */}
      <Card className="p-5">
        <SectionTitle hint="persisted governance state">Governance workflow</SectionTitle>
        <WorkflowTimeline workflow={workflow} />
      </Card>
    </div>
  );
}
