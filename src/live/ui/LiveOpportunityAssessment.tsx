import { useMemo, useState } from "react";
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { useLiveStore } from "../store";
import { Card, PageHeader, SectionTitle, RecommendationBadge, EmptyState } from "@/shared/components/ui";
import { pct, shortDate } from "@/lib/format";
import type { AssessmentRow } from "../persistence";
import { OPPORTUNITY_DIMENSIONS as DIMENSIONS, rollupOpportunity as rollup } from "@/lib/scoring";

function classify(score: number): { rec: AssessmentRow["recommendation"]; fit: string; conf: string } {
  if (score >= 75) return { rec: "Fund now", fit: "High", conf: "High" };
  if (score >= 60) return { rec: "Needs discovery", fit: "Moderate", conf: "Medium" };
  if (score >= 45) return { rec: "Defer", fit: "Moderate", conf: "Low" };
  return { rec: "Reject", fit: "Low", conf: "Low" };
}

export function LiveOpportunityAssessment() {
  const registrations = useLiveStore((s) => s.registrations);
  const assessments = useLiveStore((s) => s.assessments);
  const addAssessment = useLiveStore((s) => s.addAssessment);

  const [title, setTitle] = useState("New AI Opportunity");
  const [productId, setProductId] = useState("");
  const [scores, setScores] = useState<Record<string, number>>(Object.fromEntries(DIMENSIONS.map((d) => [d.key, 60])));
  const [saving, setSaving] = useState(false);

  const score = useMemo(() => rollup(scores), [scores]);
  const { rec, fit, conf } = classify(score);
  const estRoi = Math.round(40 + score * 2.4);
  const radarData = DIMENSIONS.map((d) => ({ dimension: d.key, score: scores[d.key] }));

  async function save() {
    setSaving(true);
    try {
      await addAssessment({
        id: crypto.randomUUID(),
        productId: productId || null,
        title: title.trim() || "Untitled opportunity",
        scores,
        opportunityScore: score,
        strategicFit: fit,
        estimatedRoi: estRoi,
        confidence: conf,
        recommendation: rec,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="AI Opportunity Assessment"
        subtitle="Score an idea across weighted dimensions, then save it — persisted to your portfolio and fed into Investment Prioritization. No seeded data."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1 rounded-lg border border-ink-200 px-3 py-2 text-lg font-semibold text-ink-900 outline-none focus:border-brand-500" />
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="rounded-lg border border-ink-200 px-3 py-2 text-sm">
              <option value="">— link a product (optional)</option>
              {registrations.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {DIMENSIONS.map((d) => (
              <div key={d.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink-700">{d.key}{d.inverse && <span className="ml-1 text-[10px] uppercase text-ink-400">inverse</span>}</span>
                  <span className="tabular-nums text-ink-500">{scores[d.key]}</span>
                </div>
                <input type="range" min={0} max={100} value={scores[d.key]} onChange={(e) => setScores((s) => ({ ...s, [d.key]: Number(e.target.value) }))} className="w-full accent-brand-500" />
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5 text-center">
            <div className="text-xs uppercase tracking-wide text-ink-400">Opportunity Score</div>
            <div className="my-2 text-5xl font-bold text-ink-900">{score}</div>
            <RecommendationBadge label={rec ?? "Defer"} />
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
              <div><div className="text-ink-400">Fit</div><div className="font-semibold">{fit}</div></div>
              <div><div className="text-ink-400">Est. ROI</div><div className="font-semibold">{pct(estRoi)}</div></div>
              <div><div className="text-ink-400">Confidence</div><div className="font-semibold">{conf}</div></div>
            </div>
            <button onClick={save} disabled={saving} className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
              {saving ? "Saving…" : "Save assessment"}
            </button>
          </Card>
          <Card className="p-4">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 9, fill: "#475569" }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar dataKey="score" stroke="#3b6fed" fill="#3b6fed" fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-ink-200 px-5 py-3"><SectionTitle hint="persisted · feeds Investment Prioritization">Saved assessments</SectionTitle></div>
        {assessments.length === 0 ? (
          <div className="p-6"><EmptyState title="No assessments yet" hint="Score an opportunity above and hit Save — it persists and appears here." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr><th className="px-5 py-2.5">Assessment</th><th className="px-3 py-2.5">Score</th><th className="px-3 py-2.5">Fit</th><th className="px-3 py-2.5">Est. ROI</th><th className="px-3 py-2.5">Recommendation</th><th className="px-3 py-2.5">Saved</th></tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {assessments.map((a) => (
                  <tr key={a.id} className="hover:bg-ink-50">
                    <td className="px-5 py-2.5 font-medium text-ink-800">{a.title}</td>
                    <td className="px-3 py-2.5 font-semibold">{a.opportunityScore ?? "—"}</td>
                    <td className="px-3 py-2.5">{a.strategicFit ?? "—"}</td>
                    <td className="px-3 py-2.5">{a.estimatedRoi != null ? pct(a.estimatedRoi) : "—"}</td>
                    <td className="px-3 py-2.5">{a.recommendation ? <RecommendationBadge label={a.recommendation} /> : "—"}</td>
                    <td className="px-3 py-2.5 text-ink-400">{a.createdAt ? shortDate(a.createdAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
