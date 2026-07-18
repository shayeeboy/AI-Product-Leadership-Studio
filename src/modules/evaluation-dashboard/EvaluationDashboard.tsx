import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { RAG_HEALTH_SNAPSHOTS } from "@/seed/snapshots";
import { productById } from "@/seed/products";
import { Card, PageHeader, SectionTitle, KpiTile } from "@/shared/components/ui";
import { pct } from "@/lib/format";

// Surfaces evaluation metrics fed by the Enterprise RAG adapter + shared eval
// service, but structured to accept metrics from any product (Section 6.7).
export function EvaluationDashboard() {
  const all = RAG_HEALTH_SNAPSHOTS.flatMap((s) =>
    s.evaluationMetrics.map((m) => ({ ...m, productId: s.productId })),
  );
  const passRate = Math.round((all.filter((m) => m.pass).length / all.length) * 100);

  return (
    <div>
      <PageHeader
        title="AI Evaluation Dashboard"
        subtitle="Pass/fail against thresholds across products. This is where the Executive Dashboard's Evaluation Pass Rate drills into detail."
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiTile label="Overall pass rate" value={pct(passRate)} intent={passRate >= 70 ? "up" : "down"} />
        <KpiTile label="Metrics tracked" value={all.length} footnote={`${RAG_HEALTH_SNAPSHOTS.length} products`} />
        <KpiTile label="Failing metrics" value={all.filter((m) => !m.pass).length} intent="down" />
        <KpiTile label="Products evaluated" value={RAG_HEALTH_SNAPSHOTS.length} />
      </div>

      {RAG_HEALTH_SNAPSHOTS.map((s) => (
        <Card key={s.productId} className="mt-4 p-5">
          <SectionTitle hint={`last eval ${s.lastEvaluatedAt}`}>{productById(s.productId)?.name ?? s.productId}</SectionTitle>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={s.evaluationMetrics} margin={{ left: 4, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="metric" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-12} textAnchor="end" height={50} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                      {s.evaluationMetrics.map((m, i) => (
                        <Cell key={i} fill={m.pass ? "#16a34a" : "#dc2626"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Retrieval" value={pct(s.retrievalQuality)} />
              <Stat label="Groundedness" value={pct(s.groundedness)} />
              <Stat label="Citation acc." value={pct(s.citationAccuracy)} />
              <Stat label="Hallucination" value={pct(s.hallucinationRate, 1)} />
              <Stat label="Latency p95" value={`${(s.latencyMsP95 / 1000).toFixed(1)}s`} />
              <Stat label="Freshness" value={`${s.knowledgeFreshnessDays}d`} />
            </div>
          </div>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs uppercase text-ink-500"><tr><th className="py-1">Metric</th><th>Score</th><th>Threshold</th><th>Result</th></tr></thead>
            <tbody className="divide-y divide-ink-100">
              {s.evaluationMetrics.map((m) => (
                <tr key={m.metric}>
                  <td className="py-1 font-medium text-ink-700">{m.metric}</td>
                  <td>{m.score}</td>
                  <td className="text-ink-400">{m.passThreshold}</td>
                  <td><span className={`rounded px-1.5 py-0.5 text-xs font-medium ${m.pass ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{m.pass ? "PASS" : "FAIL"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-200 p-2.5">
      <div className="text-[11px] uppercase tracking-wide text-ink-400">{label}</div>
      <div className="text-lg font-semibold text-ink-900">{value}</div>
    </div>
  );
}
