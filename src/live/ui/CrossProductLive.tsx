import { Link } from "react-router-dom";
import { useLiveStore } from "../store";
import { useLiveSnapshot, LiveBadge } from "./common";
import { Card, PageHeader } from "@/shared/components/ui";
import { ADAPTER_LABELS, type Registration } from "../types";
import type { LiveReadiness, LiveRagHealth, LiveFinancial } from "../liveAdapters";
import { pct } from "@/lib/format";

export function CrossProductLive() {
  const registrations = useLiveStore((s) => s.registrations);
  return (
    <div>
      <PageHeader
        title="Cross-Product Live Scorecard"
        subtitle="Live status and a headline metric across every registered product, pulled in real time from each source."
      />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Product</th>
                <th className="px-3 py-2.5 font-medium">Adapter</th>
                <th className="px-3 py-2.5 font-medium">Headline metric</th>
                <th className="px-3 py-2.5 font-medium">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {registrations.map((reg) => <ScorecardRow key={reg.id} reg={reg} />)}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ScorecardRow({ reg }: { reg: Registration }) {
  const q = useLiveSnapshot(reg);
  const result = q.data;
  const metric = deriveMetric(reg, result?.ok ? result.data : undefined);
  return (
    <tr className="hover:bg-ink-50">
      <td className="px-5 py-2.5">
        <Link to={`/product/${reg.id}`} className="font-medium text-brand-600 hover:underline">{reg.name}</Link>
        <div className="text-xs text-ink-400">{reg.businessUnit}</div>
      </td>
      <td className="px-3 py-2.5 text-ink-600">{ADAPTER_LABELS[reg.adapterType]}</td>
      <td className="px-3 py-2.5 text-ink-800">{metric}</td>
      <td className="px-3 py-2.5"><LiveBadge result={result} loading={q.isLoading} /></td>
    </tr>
  );
}

function deriveMetric(reg: Registration, data: unknown): string {
  if (!data) return "—";
  switch (reg.adapterType) {
    case "readiness": {
      const d = data as LiveReadiness;
      return d.sessionCount ? `AI readiness ${d.aiReadinessScore}/100 (${d.sessionCount} assessments)` : "No assessments yet";
    }
    case "rag-health": {
      const d = data as LiveRagHealth;
      return `Grounded ${d.groundedness != null ? pct(d.groundedness) : "—"} · ${d.observability?.total ?? 0} queries · p95 ${d.latencyMsP95 != null ? (d.latencyMsP95 / 1000).toFixed(1) + "s" : "—"}`;
    }
    case "financial": {
      const d = data as LiveFinancial;
      return `${d.indicators?.length ?? 0} live indicators · ${d.strategicRecommendations?.length ?? 0} recommendations`;
    }
    default:
      return "Live health probe";
  }
}
