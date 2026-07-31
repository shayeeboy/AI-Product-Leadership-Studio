import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { useLiveStore } from "../store";
import { useLiveSnapshot, LiveBadge } from "./common";
import { Card, PageHeader, SectionTitle, EmptyState } from "@/shared/components/ui";
import { pct } from "@/lib/format";
import type { Registration } from "../types";
import type { LiveRagHealth } from "../liveAdapters";

interface EvalMetric { metric: string; score: number; passThreshold: number; pass: boolean }

export function LiveEvaluationDashboard() {
  const registrations = useLiveStore((s) => s.registrations);
  return (
    <div>
      <PageHeader
        title="AI Evaluation Dashboard"
        subtitle="Pass/fail against thresholds for every registered product whose live snapshot exposes evaluation metrics. Read live; no seeded values."
      />
      {registrations.length === 0 ? (
        <EmptyState title="No products registered" />
      ) : (
        <div className="space-y-4">
          {registrations.map((reg) => <EvalCard key={reg.id} reg={reg} />)}
        </div>
      )}
    </div>
  );
}

function EvalCard({ reg }: { reg: Registration }) {
  const q = useLiveSnapshot(reg);
  const result = q.data;
  const data = result?.ok ? (result.data as LiveRagHealth) : undefined;
  const metrics: EvalMetric[] = data?.evaluationMetrics ?? [];
  const passRate = metrics.length ? Math.round((metrics.filter((m) => m.pass).length / metrics.length) * 100) : null;

  return (
    <Card className="p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <SectionTitle hint={data?.evalRunAt ? `last eval ${data.evalRunAt}` : undefined}>{reg.name}</SectionTitle>
        <div className="flex items-center gap-2 text-xs text-ink-500">
          {passRate != null && <span>pass rate <b className="text-ink-800">{pct(passRate)}</b></span>}
          <LiveBadge result={result} loading={q.isLoading} />
        </div>
      </div>

      {q.isLoading ? (
        <div className="py-6 text-center text-sm text-ink-400">Fetching live snapshot…</div>
      ) : !result?.ok ? (
        <p className="text-sm text-ink-400">Source not reachable — {result?.error ?? "no data"} (no seeded fallback).</p>
      ) : metrics.length === 0 ? (
        <p className="text-sm text-ink-400">This product's snapshot exposes no evaluation metrics.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics} margin={{ left: 4, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="metric" tick={{ fontSize: 9, fill: "#64748b" }} interval={0} angle={-15} textAnchor="end" height={54} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>{metrics.map((m, i) => <Cell key={i} fill={m.pass ? "#16a34a" : "#dc2626"} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <table className="text-sm">
            <thead className="text-left text-xs uppercase text-ink-500"><tr><th className="py-1">Metric</th><th>Score</th><th>Thr.</th><th></th></tr></thead>
            <tbody className="divide-y divide-ink-100">
              {metrics.map((m) => (
                <tr key={m.metric}>
                  <td className="py-1 font-medium text-ink-700">{m.metric}</td>
                  <td>{m.score}</td>
                  <td className="text-ink-400">{m.passThreshold}</td>
                  <td><span className={`rounded px-1.5 py-0.5 text-xs font-medium ${m.pass ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{m.pass ? "PASS" : "FAIL"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
