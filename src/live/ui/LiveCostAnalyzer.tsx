import { useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { useLiveStore } from "../store";
import { useLiveSnapshot, LiveBadge } from "./common";
import { Card, PageHeader, SectionTitle, KpiTile } from "@/shared/components/ui";
import { usd } from "@/lib/format";
import type { LiveRagHealth } from "../liveAdapters";

export function LiveCostAnalyzer() {
  const registrations = useLiveStore((s) => s.registrations);
  const saveEntity = useLiveStore((s) => s.saveEntity);

  const [productId, setProductId] = useState(registrations.find((r) => r.adapterType === "rag-health")?.id ?? "");
  const [monthlyQueries, setMonthlyQueries] = useState(50000);
  const [manualCpq, setManualCpq] = useState(0.002);
  const [fixed, setFixed] = useState({ vectorDb: 900, infra: 1400, monitoring: 350, evaluation: 500 });
  const [saving, setSaving] = useState(false);

  const reg = registrations.find((r) => r.id === productId);
  const q = useLiveSnapshot(reg?.adapterType === "rag-health" ? reg : undefined);
  const live = q.data?.ok ? (q.data.data as LiveRagHealth) : undefined;
  const anchored = live?.costPerQuery != null;
  const cpq = anchored ? live!.costPerQuery : manualCpq;

  const lines = useMemo(() => {
    const inference = Math.round(cpq * monthlyQueries);
    return [
      { line: "Inference", cost: inference },
      { line: "Embeddings", cost: Math.round(monthlyQueries * 0.00002 * 1000) },
      { line: "Vector DB", cost: fixed.vectorDb },
      { line: "Infra / hosting", cost: fixed.infra },
      { line: "Monitoring", cost: fixed.monitoring },
      { line: "Evaluation", cost: fixed.evaluation },
    ];
  }, [cpq, monthlyQueries, fixed]);

  const total = lines.reduce((s, l) => s + l.cost, 0);

  async function save() {
    setSaving(true);
    try {
      await saveEntity("cost_input", { id: productId || crypto.randomUUID(), productId: productId || null, data: { monthlyQueries, cpq, anchored, fixed, total } });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="AI Cost Analyzer"
        subtitle="Forecast monthly cost. Pick a product to anchor the inference line on its real cost/query from the live snapshot; other lines are your Studio-managed assumptions."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <SectionTitle>Inputs</SectionTitle>
          <label className="mb-1 block text-sm font-medium text-ink-700">Anchor product</label>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className="mb-2 w-full rounded-lg border border-ink-200 px-3 py-2 text-sm">
            <option value="">— none (enter cost/query)</option>
            {registrations.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          {reg?.adapterType === "rag-health" && (
            <div className="mb-3 flex items-center justify-between text-xs">
              <span className="text-ink-500">real cost/query: <b className="text-ink-800">{anchored ? usd(cpq) : "—"}</b></span>
              <LiveBadge result={q.data} loading={q.isLoading} />
            </div>
          )}
          {!anchored && (
            <div className="mb-3">
              <div className="mb-1 flex justify-between text-sm"><span className="font-medium text-ink-700">Cost / query</span><span className="text-ink-500">{usd(manualCpq)}</span></div>
              <input type="range" min={0} max={0.02} step={0.0005} value={manualCpq} onChange={(e) => setManualCpq(Number(e.target.value))} className="w-full accent-brand-500" />
            </div>
          )}
          <div className="mb-3">
            <div className="mb-1 flex justify-between text-sm"><span className="font-medium text-ink-700">Monthly queries</span><span className="text-ink-500">{monthlyQueries.toLocaleString()}</span></div>
            <input type="range" min={1000} max={500000} step={1000} value={monthlyQueries} onChange={(e) => setMonthlyQueries(Number(e.target.value))} className="w-full accent-brand-500" />
          </div>
          {(["vectorDb", "infra", "monitoring", "evaluation"] as const).map((k) => (
            <label key={k} className="mb-2 flex items-center justify-between text-sm">
              <span className="capitalize text-ink-600">{k === "vectorDb" ? "Vector DB / mo" : `${k} / mo`}</span>
              <input type="number" min={0} value={fixed[k]} onChange={(e) => setFixed((f) => ({ ...f, [k]: Number(e.target.value) }))} className="w-24 rounded border border-ink-200 px-2 py-1 text-right text-xs" />
            </label>
          ))}
          <button onClick={save} disabled={saving} className="mt-2 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">{saving ? "Saving…" : "Save cost model"}</button>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-3 gap-4">
            <KpiTile label="Projected monthly" value={usd(total, true)} />
            <KpiTile label="Annualized" value={usd(total * 12, true)} />
            <KpiTile label="Inference source" value={anchored ? "Live" : "Manual"} footnote={anchored ? reg?.name : "cost/query slider"} intent={anchored ? "up" : "neutral"} />
          </div>
          <Card className="p-4">
            <SectionTitle hint={anchored ? `anchored on ${reg?.name}` : "manual cost/query"}>Monthly cost by line</SectionTitle>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lines} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="line" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-15} textAnchor="end" height={56} />
                  <YAxis tickFormatter={(v) => usd(v, true)} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip formatter={(v) => usd(Number(v))} />
                  <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                    {lines.map((l, i) => <Cell key={i} fill={l.line === "Inference" ? "#3b6fed" : "#94a3b8"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
