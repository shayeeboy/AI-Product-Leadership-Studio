import { useMemo, useState } from "react";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, CartesianGrid, ReferenceLine, Cell } from "recharts";
import { useLiveStore } from "../store";
import { Card, PageHeader, SectionTitle, EmptyState } from "@/shared/components/ui";
import type { AssessmentRow } from "../persistence";

type Framework = "RICE" | "WSJF" | "Value vs Effort" | "Opportunity";
const FRAMEWORKS: Framework[] = ["RICE", "WSJF", "Value vs Effort", "Opportunity"];

interface Candidate {
  id: string;
  name: string;
  value: number;
  reach: number;
  impact: number;
  confidence: number;
  jobSize: number;
  effort: number;
  opportunity: number;
}

function scoreOf(c: Candidate, fw: Framework): number {
  switch (fw) {
    case "RICE": return Math.round((c.reach * c.impact * c.confidence) / c.effort);
    case "WSJF": return Math.round((c.value + c.jobSize * 8) / c.effort);
    case "Value vs Effort": return Math.round((c.value / c.effort) * 10);
    case "Opportunity": return c.opportunity;
  }
}

export function LiveInvestmentPrioritization() {
  const assessments = useLiveStore((s) => s.assessments);
  const inputs = useLiveStore((s) => s.entities.prioritization_input);
  const saveEntity = useLiveStore((s) => s.saveEntity);
  const [fw, setFw] = useState<Framework>("RICE");

  const storedEffort = (id: string): number | undefined => {
    const row = inputs.find((i) => i.id === id);
    const e = row?.data?.effort;
    return typeof e === "number" ? e : undefined;
  };

  const defaultEffort = (a: AssessmentRow) => Math.max(1, Math.round(2 + ((a.scores?.["Technical Complexity"] ?? 50) / 100) * 10));

  const candidates: Candidate[] = useMemo(
    () =>
      assessments.map((a) => ({
        id: a.id,
        name: a.title,
        value: a.opportunityScore ?? 50,
        reach: a.scores?.["Customer Impact"] ?? 50,
        impact: ((a.scores?.["Business Value"] ?? 50) / 100) * 3,
        confidence: a.confidence === "High" ? 1 : a.confidence === "Medium" ? 0.8 : 0.5,
        jobSize: (a.estimatedRoi ?? 100) / 50,
        effort: storedEffort(a.id) ?? defaultEffort(a),
        opportunity: a.opportunityScore ?? 50,
      })),
    [assessments, inputs],
  );

  const ranked = useMemo(() => candidates.map((c) => ({ ...c, score: scoreOf(c, fw) })).sort((a, b) => b.score - a.score), [candidates, fw]);
  const scatter = ranked.map((c) => ({ x: c.effort, y: c.value, z: c.score, name: c.name }));
  const midEffort = 7;
  const midValue = 65;

  async function setEffort(c: Candidate, effort: number) {
    if (!Number.isFinite(effort) || effort < 1) return;
    await saveEntity("prioritization_input", { id: c.id, productId: null, data: { effort } });
  }

  if (assessments.length === 0) {
    return (
      <div>
        <PageHeader title="Investment Prioritization" subtitle="Rank saved opportunities under multiple frameworks. Opportunity scores flow in from the Assessment module — no re-entry." />
        <EmptyState title="No opportunities to prioritize yet" hint="Save one or more assessments in Opportunity Assessment; they appear here as candidates." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Investment Prioritization"
        subtitle="Rank your saved opportunities under multiple frameworks. Effort edits persist (prioritization_input); scores come from your assessments."
        actions={
          <div className="flex flex-wrap gap-1.5">
            {FRAMEWORKS.map((f) => (
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
                <YAxis type="number" dataKey="y" name="Value" domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} />
                <ZAxis type="number" dataKey="z" range={[60, 400]} />
                <ReferenceLine x={midEffort} stroke="#cbd5e1" />
                <ReferenceLine y={midValue} stroke="#cbd5e1" />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<Tip />} />
                <Scatter data={scatter}>
                  {scatter.map((d, i) => <Cell key={i} fill={d.x <= midEffort && d.y >= midValue ? "#16a34a" : d.y >= midValue ? "#3b6fed" : "#94a3b8"} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-xs text-ink-400">Top-left (high value, low effort) = <span className="font-medium text-emerald-600">Fund First</span>.</p>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-ink-200 px-5 py-3"><SectionTitle hint={`${fw} ranking`}>Ranked backlog</SectionTitle></div>
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-ink-50 text-left text-xs uppercase text-ink-500"><tr><th className="px-4 py-2">#</th><th className="px-3 py-2">Opportunity</th><th className="px-3 py-2">Effort</th><th className="px-3 py-2 text-right">Opp.</th><th className="px-3 py-2 text-right">{fw}</th></tr></thead>
              <tbody className="divide-y divide-ink-100">
                {ranked.map((c, i) => (
                  <tr key={c.id} className={i < 3 ? "bg-emerald-50/50" : ""}>
                    <td className="px-4 py-2 text-ink-400">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-ink-800">{c.name}</td>
                    <td className="px-3 py-2">
                      <input type="number" min={1} defaultValue={c.effort} onBlur={(e) => setEffort(c, Number(e.target.value))} className="w-16 rounded border border-ink-200 px-1.5 py-0.5 text-xs" />
                    </td>
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

function Tip({ active, payload }: { active?: boolean; payload?: { payload: { name: string; y: number; x: number; z: number } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-2 text-xs shadow">
      <div className="font-semibold text-ink-800">{d.name}</div>
      <div className="text-ink-500">Value {d.y} · Effort {d.x} · Score {d.z}</div>
    </div>
  );
}
