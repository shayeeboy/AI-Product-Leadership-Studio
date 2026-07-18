import { useParams, Link } from "react-router-dom";
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { ArrowLeft } from "lucide-react";
import { productById } from "@/seed/products";
import { READINESS_SNAPSHOTS, RAG_HEALTH_SNAPSHOTS, FINANCIAL_SNAPSHOTS } from "@/seed/snapshots";
import { RISKS } from "@/seed/governance";
import { useGovernanceStore } from "@/shared/governance/store";
import { WorkflowTimeline } from "@/shared/governance/WorkflowTimeline";
import { Card, PageHeader, SectionTitle, StatusBadge, SeverityBadge, EmptyState } from "@/shared/components/ui";
import { usd, pct, shortDate } from "@/lib/format";

export function ProductDetail() {
  const { id = "" } = useParams();
  const product = productById(id);
  const workflow = useGovernanceStore((s) => s.workflows.find((w) => w.productId === id));
  const audit = useGovernanceStore((s) => s.audit.filter((a) => a.productId === id));

  if (!product) {
    return <EmptyState title="Product not found" hint="Return to Portfolio Governance to pick a product." />;
  }

  const readiness = READINESS_SNAPSHOTS.find((s) => s.productId === id);
  const rag = RAG_HEALTH_SNAPSHOTS.find((s) => s.productId === id);
  const fin = FINANCIAL_SNAPSHOTS.find((s) => s.productId === id);
  const risks = RISKS.filter((r) => r.productId === id);

  return (
    <div>
      <Link to="/governance" className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Portfolio Governance
      </Link>
      <PageHeader
        title={product.name}
        subtitle={product.summary}
        actions={<StatusBadge status={product.status} />}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="Business Unit" value={product.businessUnit} />
        <Metric label="Architecture" value={product.architecture} />
        <Metric label="Monthly Spend" value={product.monthlySpend ? usd(product.monthlySpend, true) : "—"} />
        <Metric label="ROI" value={product.roi ? pct(product.roi) : "—"} />
        <Metric label="Owner" value={product.owner} />
        <Metric label="Eng Lead" value={product.engLead} />
        <Metric label="Sponsor" value={product.sponsor} />
        <Metric label="Lifecycle" value={product.lifecycle} />
      </div>

      {/* Governance workflow */}
      <Card className="mt-6 p-5">
        <SectionTitle hint="shared governance engine">Governance workflow</SectionTitle>
        {workflow ? <WorkflowTimeline workflow={workflow} /> : <p className="text-sm text-ink-400">No workflow registered.</p>}
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Adapter data — whichever applies */}
        {readiness && (
          <Card className="p-5">
            <SectionTitle hint="AI Native Diagnostic adapter">Readiness assessment</SectionTitle>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={readiness.capabilityAssessment}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: "#475569" }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar dataKey="score" stroke="#3b6fed" fill="#3b6fed" fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-600">
              {readiness.recommendations.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </Card>
        )}

        {rag && (
          <Card className="p-5">
            <SectionTitle hint="Enterprise RAG adapter">Knowledge health</SectionTitle>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Metric label="Retrieval quality" value={pct(rag.retrievalQuality)} />
              <Metric label="Groundedness" value={pct(rag.groundedness)} />
              <Metric label="Citation accuracy" value={pct(rag.citationAccuracy)} />
              <Metric label="Hallucination rate" value={pct(rag.hallucinationRate, 1)} />
              <Metric label="Latency p95" value={`${(rag.latencyMsP95 / 1000).toFixed(1)}s`} />
              <Metric label="Freshness" value={`${rag.knowledgeFreshnessDays}d`} />
            </div>
          </Card>
        )}

        {fin && (
          <Card className="p-5 lg:col-span-2">
            <SectionTitle hint="Financial Intelligence adapter">Financial scenarios</SectionTitle>
            <p className="mb-3 text-sm text-ink-600">{fin.executiveSummary}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-ink-500">
                  <tr><th className="py-1.5">Scenario</th><th>Revenue impact</th><th>Cost savings</th><th>NPV</th><th>Payback</th></tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {fin.scenarios.map((s) => (
                    <tr key={s.name}>
                      <td className="py-1.5 font-medium">{s.name}</td>
                      <td>{usd(s.projectedRevenueImpact, true)}</td>
                      <td>{usd(s.projectedCostSavings, true)}</td>
                      <td>{usd(s.npv, true)}</td>
                      <td>{s.paybackMonths} mo</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Risks */}
        <Card className="p-5">
          <SectionTitle>Risk register</SectionTitle>
          {risks.length ? (
            <ul className="space-y-2 text-sm">
              {risks.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 border-b border-ink-100 pb-2">
                  <div>
                    <div className="font-medium text-ink-800">{r.risk}</div>
                    <div className="text-xs text-ink-500">{r.owner} · {r.mitigation}</div>
                  </div>
                  <div className="flex shrink-0 gap-1"><SeverityBadge severity={r.likelihood} /><SeverityBadge severity={r.impact} /></div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-400">No open risks logged.</p>
          )}
        </Card>

        {/* Audit trail */}
        <Card className="p-5">
          <SectionTitle>Audit trail</SectionTitle>
          {audit.length ? (
            <ul className="space-y-2 text-sm">
              {audit.map((a) => (
                <li key={a.id} className="border-b border-ink-100 pb-2">
                  <div className="font-medium text-ink-800">{a.action}</div>
                  <div className="text-xs text-ink-500">{a.actor} · {shortDate(a.timestamp)}{a.note ? ` · ${a.note}` : ""}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-400">No audit events yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-3">
      <div className="text-[11px] uppercase tracking-wide text-ink-400">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold capitalize text-ink-900">{value}</div>
    </div>
  );
}
