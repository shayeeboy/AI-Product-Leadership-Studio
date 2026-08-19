import { clsx } from "clsx";
import { useObservability } from "../report/useObservability";
import { ADAPTER_LABELS } from "../types";
import { Card, PageHeader, SectionTitle, KpiTile, EmptyState } from "@/shared/components/ui";
import { usd, pct, num, shortDate } from "@/lib/format";
import type { ProductObservability } from "../report/observability";

const NR = "Not reported";
const latency = (ms: number | null) => (ms == null ? null : ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`);

// Compact human uptime from seconds (e.g. 3d 4h · 5h 12m · 12m). null → "Not reported".
function uptime(secs: number | null): string | null {
  if (secs == null || secs < 0) return null;
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// Reporting lag as a human hint (e.g. ~7mo lag · 12d lag). null → undefined (no hint).
function lagHint(days: number | null): string | undefined {
  if (days == null) return undefined;
  if (days >= 60) return `~${Math.round(days / 30)}mo lag`;
  return `${days}d lag`;
}

function freshnessColor(days: number | null) {
  if (days == null) return "text-ink-400";
  if (days <= 7) return "text-emerald-600";
  if (days <= 30) return "text-amber-600";
  return "text-red-600";
}

// One metric cell — shows the value or an explicit, muted "Not reported".
function Metric({ label, value, hint }: { label: string; value: string | null; hint?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink-400">{label}</div>
      <div className={clsx("text-sm font-semibold", value == null ? "text-ink-300" : "text-ink-800")}>{value ?? NR}</div>
      {hint && value != null && <div className="text-[10px] text-ink-400">{hint}</div>}
    </div>
  );
}

function ProductCard({ o }: { o: ProductObservability }) {
  const dot = o.status === "live" ? "bg-emerald-500" : o.status === "checking" ? "bg-slate-300" : "bg-red-500";
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="font-semibold text-ink-900">{o.name}</div>
          <div className="text-xs text-ink-500">{ADAPTER_LABELS[o.adapterType]}</div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
          <span className={clsx("h-1.5 w-1.5 rounded-full", dot)} />
          {o.status === "live" ? "Live" : o.status === "checking" ? "Checking…" : "Down"}
          {o.endpointLatencyMs != null && <span className="text-ink-400">· {latency(o.endpointLatencyMs)} endpoint</span>}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {o.adapterType === "readiness" ? (
          // Readiness tools record no request telemetry — show the honest
          // equivalents (assessment volume, activity, completion, uptime).
          <>
            <Metric label="Readiness score" value={o.readinessScore != null ? `${o.readinessScore}/100` : null} />
            <Metric label="Assessments" value={o.sessionCount != null ? num(o.sessionCount) : null} hint="recorded" />
            <Metric label="Completion" value={o.completionRate != null ? pct(o.completionRate) : null} hint="scored" />
            <Metric label="Active · 7d" value={o.activeSessions7d != null ? num(o.activeSessions7d) : null} hint="sessions" />
            <Metric label="Active · 30d" value={o.activeSessions30d != null ? num(o.activeSessions30d) : null} hint="sessions" />
            <Metric label="Uptime" value={uptime(o.uptimeSeconds)} hint="service" />
          </>
        ) : o.adapterType === "financial" ? (
          // A live-data strategy agent has no request telemetry — its honest
          // signals are data coverage, source recency and decision provenance.
          <>
            <Metric label="Data sources" value={o.dataSources != null ? num(o.dataSources) : null} hint="live providers" />
            <Metric label="Indicators" value={o.indicatorCount != null ? num(o.indicatorCount) : null} hint="series tracked" />
            <Metric label="Data as of" value={o.sourceDataAsOf ? shortDate(o.sourceDataAsOf) : null} hint={lagHint(o.sourceDataLagDays)} />
            <Metric label="History depth" value={o.historyPeriods != null ? `${o.historyPeriods}` : null} hint="periods / series" />
            <Metric label="Decision traces" value={o.decisionTraceCount != null ? num(o.decisionTraceCount) : null} hint="logged" />
          </>
        ) : (
          <>
            <Metric label="Latency p95" value={latency(o.p95Ms)} hint="reported" />
            <Metric label="Latency p50" value={latency(o.p50Ms)} />
            <Metric label="Cost / query" value={o.costPerQuery != null ? usd(o.costPerQuery) : null} />
            <Metric label="Volume" value={o.volume != null ? num(o.volume) : null} hint="queries" />
            <Metric label="Grounded rate" value={o.groundedRate != null ? pct(o.groundedRate) : null} />
            <Metric label="Error rate" value={o.errorRate != null ? pct(o.errorRate) : null} />
          </>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-ink-100 pt-3 text-xs">
        <span className="text-ink-500">
          Data freshness:{" "}
          <span className={clsx("font-semibold", freshnessColor(o.freshnessDays))}>
            {o.freshnessDays != null ? `${o.freshnessDays}d old` : NR}
          </span>
          {o.lastUpdated && <span className="text-ink-400"> · updated {shortDate(o.lastUpdated)}</span>}
        </span>
        <span className="text-ink-400">Lineage: {o.lineage ?? NR}</span>
      </div>
    </Card>
  );
}

export function LiveObservability() {
  const { items, summary, checking } = useObservability();

  return (
    <div>
      <PageHeader
        title="Live Observability"
        subtitle="Reliability, cost and data freshness across every product — measured live per request. Rich runtime metrics appear where a source exposes them; everything else reads an honest “Not reported,” never a seeded value."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {/* The top row is portfolio-universal — reachability, endpoint latency and
            data freshness are the three signals every product shares. Product-specific
            metrics (RAG p95, inference cost) live on the per-product cards, not here. */}
        <KpiTile label="Sources reachable" value={`${summary.reachable} / ${summary.total}`} intent={summary.reachable === summary.total ? "up" : "neutral"} footnote={checking ? "checking…" : "live"} />
        <KpiTile label="Avg endpoint latency" value={latency(summary.avgEndpointLatencyMs) ?? NR} footnote="fetch round-trip · all sources" />
        <KpiTile label="Avg data freshness" value={summary.avgFreshnessDays != null ? `${summary.avgFreshnessDays}d` : NR} footnote="mean across products" intent={summary.avgFreshnessDays != null && summary.avgFreshnessDays > 30 ? "down" : "neutral"} />
        <KpiTile label="Oldest data" value={summary.oldestFreshnessDays != null ? `${summary.oldestFreshnessDays}d` : NR} footnote="stalest product" intent={summary.oldestFreshnessDays != null && summary.oldestFreshnessDays > 30 ? "down" : "neutral"} />
        <KpiTile label="Live inference cost" value={summary.liveCost != null ? usd(summary.liveCost) : NR} footnote={summary.liveCost != null ? "Σ where metered" : "no source"} />
      </div>

      <div className="mt-6 space-y-4">
        <SectionTitle hint="live per request">Per-product observability</SectionTitle>
        {items.length === 0 ? (
          <EmptyState title="No products registered" hint="Register a product to see its observability." />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {items.map((o) => <ProductCard key={o.id} o={o} />)}
          </div>
        )}
      </div>
    </div>
  );
}
