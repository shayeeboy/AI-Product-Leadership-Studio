import { useMemo, useState } from "react";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, CartesianGrid, ReferenceLine, Cell } from "recharts";
import { PRODUCTS } from "@/seed/products";
import { OPPORTUNITY_ASSESSMENTS } from "@/seed/governance";
import { Card, PageHeader, SectionTitle } from "@/shared/components/ui";

// Candidate = a product plus prioritization inputs. Opportunity scores are
// pulled from the Opportunity Assessment module rather than re-entered.
interface Candidate {
  id: string;
  name: string;
  reach: number; // users/qtr (00s)
  impact: number; // 0.5..3
  confidence: number; // 0..1
  effort: number; // person-months
  value: number; // business value 0-100
  jobSize: number; // WSJF cost of delay proxy
  opportunity: number; // 0-100 from assessment
}

const OPP = Object.fromEntries(OPPORTUNITY_ASSESSMENTS.map((a) => [a.productId, a.opportunityScore]));

const CANDIDATES: Candidate[] = PRODUCTS.filter((p) => p.status !== "archived").map((p, i) => ({
  id: p.id,
  name: p.name,
  reach: 20 + ((i * 37) % 80),
  impact: [0.5, 1, 2, 3][(i * 3) % 4],
  confidence: [0.5, 0.8, 1][(i * 2) % 3],
  effort: 2 + ((i * 5) % 10),
  value: 40 + ((i * 17) % 55),
  jobSize: 3 + ((i * 4) % 8),
  opportunity: OPP[p.id] ?? 50 + ((i * 11) % 40),
}));

type Framework = "RICE" | "WSJF" | "Value vs Effort" | "Opportunity";

function scoreOf(c: Candidate, fw: Framework): number {
  switch (fw) {
    case "RICE":
      return Math.round((c.reach * c.impact * c.confidence) / c.effort);
    case "WSJF":
      return Math.round((c.value + c.jobSize * 8) / c.effort);
    case "Value vs Effort":
      return Math.round((c.value / c.effort) * 10);
    case "Opportunity":
      return c.opportunity;
  }
}

export function InvestmentPrioritization() {
  const [fw, setFw] = useState<Framework>("RICE");

  const ranked = useMemo(
    () => CANDIDATES.map((c) => ({ ...c, score: scoreOf(c, fw) })).sort((a, b) => b.score - a.score),
    [fw],
  );

  const scatter = ranked.map((c) => ({ x: c.effort, y: c.value, z: c.score, name: c.name, opportunity: c.opportunity }));
  const midEffort = 7;
  const midValue = 65;

  return (
    <div>
      <PageHeader
        title="Investment Prioritization"
        subtitle="Rank the portfolio under multiple frameworks. Opportunity scores flow in from the Assessment module — no re-entry."
        actions={
          <div className="flex flex-wrap gap-1.5">
            {(["RICE", "WSJF", "Value vs Effort", "Opportunity"] as Framework[]).map((f) => (
              <button key={f} onClick={() => setFw(f)} className={`rounded-full px-3 py-1 text-xs font-medium ${fw === f ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"}`}>{f}</button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <SectionTitle hint="value × effort — bubble = score">Prioritization matrix</SectionTitle>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 16, bottom: 12, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" dataKey="x" name="Effort" tick={{ fontSize: 11, fill: "#64748b" }} label={{ value: "Effort (person-mo) →", position: "insideBottom", offset: -4, fontSize: 11, fill: "#94a3b8" }} />
                <YAxis type="number" dataKey="y" name="Value" domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} label={{ value: "Value", angle: -90, position: "insideLeft", fontSize: 11, fill: "#94a3b8" }} />
                <ZAxis type="number" dataKey="z" range={[60, 400]} />
                <ReferenceLine x={midEffort} stroke="#cbd5e1" />
                <ReferenceLine y={midValue} stroke="#cbd5e1" />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(v, n) => [v, n]} labelFormatter={() => ""} content={<CustomTip />} />
                <Scatter data={scatter}>
                  {scatter.map((d, i) => (
                    <Cell key={i} fill={d.x <= midEffort && d.y >= midValue ? "#16a34a" : d.y >= midValue ? "#3b6fed" : "#94a3b8"} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-xs text-ink-400">Top-left quadrant (high value, low effort) = <span className="font-medium text-emerald-600">Fund First</span>.</p>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-ink-200 px-5 py-3"><SectionTitle hint={`${fw} ranking`}>Ranked backlog</SectionTitle></div>
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-ink-50 text-left text-xs uppercase text-ink-500"><tr><th className="px-5 py-2">#</th><th className="px-3 py-2">Product</th><th className="px-3 py-2 text-right">Opp.</th><th className="px-3 py-2 text-right">{fw}</th></tr></thead>
              <tbody className="divide-y divide-ink-100">
                {ranked.map((c, i) => (
                  <tr key={c.id} className={i < 3 ? "bg-emerald-50/50" : ""}>
                    <td className="px-5 py-2 text-ink-400">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-ink-800">{c.name}</td>
                    <td className="px-3 py-2 text-right text-ink-500">{c.opportunity}</td>
                    <td className="px-3 py-2 text-right font-semibold text-ink-900">{c.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function CustomTip({ active, payload }: { active?: boolean; payload?: { payload: { name: string; y: number; x: number; z: number } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-2 text-xs shadow">
      <div className="font-semibold text-ink-800">{d.name}</div>
      <div className="text-ink-500">Value {d.y} · Effort {d.x} · Score {d.z}</div>
    </div>
  );
}
