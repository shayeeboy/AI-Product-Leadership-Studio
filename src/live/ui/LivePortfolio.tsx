import { Link } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import { useLiveStore } from "../store";
import { useLiveSnapshot, LiveBadge } from "./common";
import { Card, PageHeader, KpiTile } from "@/shared/components/ui";
import { ADAPTER_LABELS, type Registration } from "../types";
import type { LiveReadiness, LiveRagHealth, LiveFinancial } from "../liveAdapters";
import { pct } from "@/lib/format";

export function LivePortfolio() {
  const registrations = useLiveStore((s) => s.registrations);
  const backend = useLiveStore((s) => s.backend);

  return (
    <div>
      <PageHeader
        title="Live AI Portfolio"
        subtitle="Every registered AI product, integrated live from its own snapshot endpoint. No seeded values — a source that's down says so."
        actions={
          <Link to="/register" className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700">
            <PlusCircle className="h-4 w-4" /> Register a product
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <KpiTile label="Registered products" value={registrations.length} />
        <KpiTile label="Persistence" value={backend ? "Shared (Neon)" : "Local (this browser)"} footnote={backend ? "backend configured" : "set VITE_PERSISTENCE_API to share"} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {registrations.map((reg) => <ProductCard key={reg.id} reg={reg} />)}
      </div>
    </div>
  );
}

function ProductCard({ reg }: { reg: Registration }) {
  const q = useLiveSnapshot(reg);
  const result = q.data;
  const headline = deriveHeadline(reg, result?.ok ? result.data : undefined);

  return (
    <Link to={`/product/${reg.id}`}>
      <Card className="h-full p-4 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-semibold text-ink-900">{reg.name}</div>
            <div className="text-xs text-ink-400">{reg.businessUnit} · {ADAPTER_LABELS[reg.adapterType]}</div>
          </div>
          {reg.isDefault && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">core</span>}
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold text-ink-900">{headline.value}</div>
            <div className="text-xs text-ink-400">{headline.label}</div>
          </div>
          <LiveBadge result={result} loading={q.isLoading} />
        </div>
      </Card>
    </Link>
  );
}

function deriveHeadline(reg: Registration, data: unknown): { value: string; label: string } {
  if (!data) return { value: "—", label: "awaiting live data" };
  switch (reg.adapterType) {
    case "readiness": {
      const d = data as LiveReadiness;
      return d.sessionCount
        ? { value: d.aiReadinessScore != null ? `${d.aiReadinessScore}` : "—", label: `AI readiness · ${d.sessionCount} assessment(s)` }
        : { value: "0", label: "assessments recorded" };
    }
    case "rag-health": {
      const d = data as LiveRagHealth;
      return { value: d.groundedness != null ? pct(d.groundedness) : "—", label: `grounded · ${d.observability?.total ?? 0} queries` };
    }
    case "financial": {
      const d = data as LiveFinancial;
      const debt = d.indicators?.find((i) => i.key === "debt");
      return { value: debt?.value != null ? `${debt.value}%` : `${d.indicators?.length ?? 0}`, label: debt ? "debt-to-income" : "live indicators" };
    }
    default:
      return { value: "live", label: "health probe" };
  }
}
