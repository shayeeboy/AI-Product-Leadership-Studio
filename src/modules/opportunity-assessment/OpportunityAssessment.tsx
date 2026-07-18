import { useMemo, useState } from "react";
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { OPPORTUNITY_ASSESSMENTS } from "@/seed/governance";
import { Card, PageHeader, SectionTitle, RecommendationBadge } from "@/shared/components/ui";
import { pct } from "@/lib/format";
import type { OpportunityAssessment as OA } from "@/types/domain";

// Weighted scoring dimensions (Section 6.4). Higher weight = more influence.
// "Technical Complexity" and "Risk" are inverse: high value there lowers the score.
const DIMENSIONS: { key: string; weight: number; inverse?: boolean }[] = [
  { key: "Business Value", weight: 1.4 },
  { key: "Customer Impact", weight: 1.2 },
  { key: "AI Suitability", weight: 1.2 },
  { key: "Data Readiness", weight: 1.0 },
  { key: "Technical Complexity", weight: 0.8, inverse: true },
  { key: "Risk", weight: 1.0, inverse: true },
  { key: "ROI", weight: 1.3 },
  { key: "Strategic Alignment", weight: 1.1 },
];

function rollup(scores: Record<string, number>) {
  let weighted = 0;
  let totalWeight = 0;
  for (const d of DIMENSIONS) {
    const raw = scores[d.key] ?? 50;
    const effective = d.inverse ? 100 - raw : raw;
    weighted += effective * d.weight;
    totalWeight += d.weight;
  }
  return Math.round(weighted / totalWeight);
}

function classify(score: number): { rec: OA["recommendation"]; fit: OA["strategicFit"]; conf: OA["confidence"] } {
  if (score >= 75) return { rec: "Fund now", fit: "High", conf: "High" };
  if (score >= 60) return { rec: "Needs discovery", fit: "Moderate", conf: "Medium" };
  if (score >= 45) return { rec: "Defer", fit: "Moderate", conf: "Low" };
  return { rec: "Reject", fit: "Low", conf: "Low" };
}

export function OpportunityAssessment() {
  const [title, setTitle] = useState("New AI Opportunity");
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(DIMENSIONS.map((d) => [d.key, 60])),
  );

  const score = useMemo(() => rollup(scores), [scores]);
  const { rec, fit, conf } = classify(score);
  const estRoi = Math.round(40 + score * 2.4);

  const radarData = DIMENSIONS.map((d) => ({ dimension: d.key, score: scores[d.key] }));

  return (
    <div>
      <PageHeader
        title="AI Opportunity Assessment"
        subtitle="Score an idea across weighted dimensions to get an Opportunity Score, strategic fit and a fund/defer recommendation. Inputs drive the outputs live."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Inputs */}
        <Card className="p-5 lg:col-span-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mb-4 w-full rounded-lg border border-ink-200 px-3 py-2 text-lg font-semibold text-ink-900 outline-none focus:border-brand-500"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {DIMENSIONS.map((d) => (
              <div key={d.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink-700">
                    {d.key}
                    {d.inverse && <span className="ml-1 text-[10px] uppercase text-ink-400">inverse</span>}
                  </span>
                  <span className="tabular-nums text-ink-500">{scores[d.key]}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={scores[d.key]}
                  onChange={(e) => setScores((s) => ({ ...s, [d.key]: Number(e.target.value) }))}
                  className="w-full accent-brand-500"
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Output */}
        <div className="space-y-4">
          <Card className="p-5 text-center">
            <div className="text-xs uppercase tracking-wide text-ink-400">Opportunity Score</div>
            <div className="my-2 text-5xl font-bold text-ink-900">{score}</div>
            <RecommendationBadge label={rec} />
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
              <div><div className="text-ink-400">Fit</div><div className="font-semibold">{fit}</div></div>
              <div><div className="text-ink-400">Est. ROI</div><div className="font-semibold">{pct(estRoi)}</div></div>
              <div><div className="text-ink-400">Confidence</div><div className="font-semibold">{conf}</div></div>
            </div>
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

      {/* Persisted assessments (feed Investment Prioritization + governance) */}
      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-ink-200 px-5 py-3">
          <SectionTitle hint="persist → feeds Investment Prioritization">Saved assessments</SectionTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr><th className="px-5 py-2.5">Assessment</th><th className="px-3 py-2.5">Score</th><th className="px-3 py-2.5">Fit</th><th className="px-3 py-2.5">Est. ROI</th><th className="px-3 py-2.5">Recommendation</th></tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {OPPORTUNITY_ASSESSMENTS.map((a) => (
                <tr key={a.id} className="hover:bg-ink-50">
                  <td className="px-5 py-2.5 font-medium text-ink-800">{a.title}</td>
                  <td className="px-3 py-2.5 font-semibold">{a.opportunityScore}</td>
                  <td className="px-3 py-2.5">{a.strategicFit}</td>
                  <td className="px-3 py-2.5">{pct(a.estimatedRoi)}</td>
                  <td className="px-3 py-2.5"><RecommendationBadge label={a.recommendation} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
