import { useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { Card, PageHeader, SectionTitle, KpiTile } from "@/shared/components/ui";
import { usd } from "@/lib/format";

// Cost lines (Section 6.8). Model cost scales with the selected model's per-1k
// token price; everything else is fixed monthly infra.
const MODELS = {
  "Claude (frontier)": 0.9,
  "GPT-5": 1.0,
  "Claude Haiku": 0.25,
  "Open-source (self-host)": 0.12,
} as const;
type ModelKey = keyof typeof MODELS;

export function CostAnalyzer() {
  const [model, setModel] = useState<ModelKey>("GPT-5");
  const [monthlyTokensM, setMonthlyTokensM] = useState(120); // millions of tokens/month

  const lines = useMemo(() => {
    const rate = MODELS[model];
    const modelCost = Math.round(monthlyTokensM * 1000 * rate * 0.5); // blended in/out
    const embeddings = Math.round(monthlyTokensM * 12);
    return [
      { line: "Model / inference", cost: modelCost },
      { line: "Token throughput", cost: Math.round(modelCost * 0.15) },
      { line: "Embeddings", cost: embeddings },
      { line: "Vector database", cost: 900 },
      { line: "Infra / hosting", cost: 1400 },
      { line: "Monitoring", cost: 350 },
      { line: "Evaluation", cost: 500 },
    ];
  }, [model, monthlyTokensM]);

  const total = lines.reduce((s, l) => s + l.cost, 0);
  const baseline = useMemo(() => {
    const rate = MODELS["GPT-5"];
    return Math.round(monthlyTokensM * 1000 * rate * 0.5 * 1.15 + monthlyTokensM * 12 + 3150);
  }, [monthlyTokensM]);
  const delta = total - baseline;

  return (
    <div>
      <PageHeader
        title="AI Cost Analyzer"
        subtitle="Forecast monthly cost across every line and run what-if model swaps. The delta vs. the GPT-5 baseline updates live."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <SectionTitle>What-if inputs</SectionTitle>
          <label className="mb-2 block text-sm font-medium text-ink-700">Model</label>
          <div className="mb-4 grid grid-cols-2 gap-1.5">
            {(Object.keys(MODELS) as ModelKey[]).map((m) => (
              <button key={m} onClick={() => setModel(m)} className={`rounded-lg px-2.5 py-2 text-xs font-medium ${model === m ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"}`}>{m}</button>
            ))}
          </div>
          <div className="mb-1 flex justify-between text-sm"><span className="font-medium text-ink-700">Monthly tokens</span><span className="text-ink-500">{monthlyTokensM}M</span></div>
          <input type="range" min={10} max={400} step={10} value={monthlyTokensM} onChange={(e) => setMonthlyTokensM(Number(e.target.value))} className="w-full accent-brand-500" />
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-3 gap-4">
            <KpiTile label="Projected monthly" value={usd(total, true)} />
            <KpiTile label="vs GPT-5 baseline" value={`${delta >= 0 ? "+" : ""}${usd(delta, true)}`} intent={delta > 0 ? "down" : "up"} />
            <KpiTile label="Annualized" value={usd(total * 12, true)} />
          </div>
          <Card className="p-4">
            <SectionTitle hint={model}>Monthly cost by line</SectionTitle>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lines} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="line" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-18} textAnchor="end" height={60} />
                  <YAxis tickFormatter={(v) => usd(v, true)} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip formatter={(v) => usd(Number(v))} />
                  <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                    {lines.map((l, i) => (
                      <Cell key={i} fill={l.line.startsWith("Model") ? "#3b6fed" : "#94a3b8"} />
                    ))}
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
