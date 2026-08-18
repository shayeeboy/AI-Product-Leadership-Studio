import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { useLiveStore } from "../store";
import { fetchLive } from "../liveAdapters";
import { Card, PageHeader, SectionTitle, KpiTile } from "@/shared/components/ui";
import { usd, pct } from "@/lib/format";
import type { LiveRagHealth } from "../liveAdapters";
import { computeRollups, computeTopOpps } from "../report/rollups";
import { deriveObservability, summarizeObservability } from "../report/observability";
import { ExportReportButton } from "./report/ExportReportButton";

const NR = "Not reported"; // shown instead of any seeded/fabricated number

export function LiveExecutiveDashboard() {
  const registrations = useLiveStore((s) => s.registrations);
  const assessments = useLiveStore((s) => s.assessments);
  const risks = useLiveStore((s) => s.entities.risk);
  const reviews = useLiveStore((s) => s.entities.review);
  const workflow = useLiveStore((s) => s.workflow);

  // Fetch every product's live snapshot in parallel (shares React Query cache
  // with the per-product hooks used elsewhere — no double fetch).
  const snapshots = useQueries({
    queries: registrations.map((reg) => ({
      queryKey: ["live", reg.id, reg.endpointUrl],
      queryFn: () => fetchLive(reg),
      enabled: !!reg.endpointUrl,
      staleTime: 60_000,
      retry: 1,
    })),
  });

  // Rollups + top opportunities are computed by the shared, unit-tested module
  // (src/live/report/rollups.ts) so the board-report PDF (R7) shows the same
  // numbers as this screen.
  const roll = useMemo(
    () => computeRollups({ registrations, assessments, risks, reviews, workflow, snapshots }),
    [snapshots, registrations, assessments, risks, reviews, workflow],
  );

  const topOpps = useMemo(() => computeTopOpps(assessments), [assessments]);

  // Portfolio data-freshness signal (R8): the stalest product's data age.
  const dataFreshness = useMemo(
    () => summarizeObservability(registrations.map((r, i) => deriveObservability(r, snapshots[i]))).oldestFreshnessDays,
    [registrations, snapshots],
  );

  const productRisks = (id: string) => risks.filter((r) => r.productId === id && (r.data as { status?: string }).status !== "closed").length;

  return (
    <div>
      <PageHeader
        title="Executive AI Decision Intelligence"
        subtitle="Portfolio-wide rollups computed live from the registry, live snapshots and your persisted governance/decision data. Anything without a real source shows “Not reported.”"
        actions={<ExportReportButton />}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiTile label="Registered products" value={registrations.length} />
        <KpiTile label="Live sources reachable" value={`${roll.reachable} / ${registrations.length}`} intent={roll.reachable === registrations.length ? "up" : "neutral"} footnote={roll.checking ? "checking…" : "live"} />
        <KpiTile label="Products at risk" value={roll.atRisk} intent={roll.atRisk ? "down" : "up"} footnote="open risk / blocked" />
        <KpiTile label="Open risks" value={roll.openRisks} intent={roll.openRisks ? "down" : "up"} />
        <KpiTile label="Pending governance" value={roll.pendingGovernance} footnote="reviews + stages" intent={roll.pendingGovernance ? "down" : "up"} />
        <KpiTile label="Opportunities scored" value={roll.opportunities} footnote="persisted" />
        <KpiTile label="Evaluation pass rate" value={roll.evalPass != null ? pct(roll.evalPass) : NR} intent={roll.evalPass != null && roll.evalPass >= 70 ? "up" : "neutral"} footnote={roll.evalPass != null ? "live" : "no source"} />
        <KpiTile label="Monthly AI spend" value={roll.spend > 0 ? usd(roll.spend, true) : NR} footnote={roll.spend > 0 ? "sum of registrations" : "add on registration"} />
        <KpiTile label="Blended ROI target" value={roll.blendedRoi != null ? pct(roll.blendedRoi) : NR} footnote={roll.blendedRoi != null ? "avg of registrations" : "no target set"} />
        <KpiTile label="Live inference cost" value={roll.liveCost != null ? usd(roll.liveCost) : NR} footnote={roll.liveCost != null ? "cost/query × volume (R14c)" : "no source"} />
        <KpiTile label="Avg latency p95" value={roll.avgP95 != null ? `${(roll.avgP95 / 1000).toFixed(1)}s` : NR} footnote={roll.avgP95 != null ? "live reliability (R14b)" : "no source"} />
        <KpiTile label="Data freshness" value={dataFreshness != null ? `${dataFreshness}d` : NR} footnote={dataFreshness != null ? "oldest source" : "no source"} intent={dataFreshness != null && dataFreshness > 30 ? "down" : "neutral"} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <SectionTitle hint="persisted assessments">Top opportunity scores</SectionTitle>
          {topOpps.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-400">No opportunities scored yet — create some in <Link to="/opportunity" className="text-brand-600 hover:underline">Opportunity Assessment</Link>.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topOpps} margin={{ left: 4, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-12} textAnchor="end" height={54} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>{topOpps.map((o, i) => <Cell key={i} fill={o.score >= 75 ? "#16a34a" : o.score >= 60 ? "#3b6fed" : "#94a3b8"} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="border-l-4 border-l-brand-500 p-5">
          <SectionTitle>Executive summary</SectionTitle>
          <p className="text-sm leading-relaxed text-ink-700">
            The portfolio holds <strong>{registrations.length} registered products</strong>, with{" "}
            <strong>{roll.reachable}</strong> reporting live right now. Governance shows{" "}
            <strong>{roll.openRisks} open risk{roll.openRisks === 1 ? "" : "s"}</strong> and{" "}
            <strong>{roll.pendingGovernance}</strong> item{roll.pendingGovernance === 1 ? "" : "s"} awaiting a decision.{" "}
            {roll.opportunities > 0 ? <>You've scored <strong>{roll.opportunities}</strong> opportunit{roll.opportunities === 1 ? "y" : "ies"}. </> : <>No opportunities scored yet. </>}
            {roll.evalPass != null ? <>Live evaluation pass rate is <strong>{pct(roll.evalPass)}</strong>. </> : <>No product reports evaluation metrics live. </>}
            {roll.avgP95 != null || roll.liveCost != null ? <>Reliability and inference cost are computed live where a source exposes them. </> : null}
            Adoption remains <strong>Not reported</strong> — real usage/billing telemetry is a deliberate deferral (R14d).
          </p>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-ink-200 px-5 py-3"><SectionTitle>Registered products</SectionTitle></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr><th className="px-5 py-2.5">Product</th><th className="px-3 py-2.5">Source</th><th className="px-3 py-2.5">Business unit</th><th className="px-3 py-2.5 text-right">p95</th><th className="px-3 py-2.5 text-right">Open risks</th><th className="px-3 py-2.5 text-right">Monthly</th></tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {registrations.map((p, i) => {
                const ok = snapshots[i]?.data?.ok;
                const loading = snapshots[i]?.isLoading;
                const rd = ok ? (snapshots[i]!.data!.data as Partial<LiveRagHealth>) : undefined;
                const p95 = typeof rd?.latencyMsP95 === "number" ? rd.latencyMsP95 : null;
                return (
                  <tr key={p.id} className="hover:bg-ink-50">
                    <td className="px-5 py-2.5"><Link to={`/product/${p.id}`} className="font-medium text-brand-600 hover:underline">{p.name}</Link></td>
                    <td className="px-3 py-2.5"><span className={`inline-flex items-center gap-1.5 text-xs ${ok ? "text-emerald-600" : loading ? "text-slate-400" : "text-red-500"}`}><span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : loading ? "bg-slate-300" : "bg-red-500"}`} />{ok ? "Live" : loading ? "Checking…" : "Down"}</span></td>
                    <td className="px-3 py-2.5 text-ink-600">{p.businessUnit ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right text-ink-700">{p95 != null ? `${(p95 / 1000).toFixed(1)}s` : "—"}</td>
                    <td className="px-3 py-2.5 text-right text-ink-700">{productRisks(p.id) || "—"}</td>
                    <td className="px-3 py-2.5 text-right text-ink-700">{p.monthlySpend ? usd(Number(p.monthlySpend), true) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
