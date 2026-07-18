import { useMemo, useState } from "react";
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from "recharts";
import { Card, PageHeader, SectionTitle, KpiTile } from "@/shared/components/ui";

const DIMENSIONS = [
  "Strategy", "Governance", "Data", "Talent", "AI Engineering", "MLOps",
  "Product Delivery", "Agent Systems", "Responsible AI", "Executive Leadership",
];

const CURRENT: Record<string, number> = {
  Strategy: 3, Governance: 4, Data: 2, Talent: 3, "AI Engineering": 3, MLOps: 2,
  "Product Delivery": 4, "Agent Systems": 2, "Responsible AI": 4, "Executive Leadership": 3,
};
const TARGET: Record<string, number> = {
  Strategy: 4, Governance: 4, Data: 4, Talent: 4, "AI Engineering": 4, MLOps: 4,
  "Product Delivery": 4, "Agent Systems": 3, "Responsible AI": 5, "Executive Leadership": 4,
};

export function MaturityAssessment() {
  const [current, setCurrent] = useState(CURRENT);
  const data = DIMENSIONS.map((d) => ({ dimension: d, Current: current[d], Target: TARGET[d] }));

  const gaps = useMemo(
    () => DIMENSIONS.map((d) => ({ d, gap: TARGET[d] - current[d] })).filter((g) => g.gap > 0).sort((a, b) => b.gap - a.gap),
    [current],
  );
  const overall = (Object.values(current).reduce((a, b) => a + b, 0) / DIMENSIONS.length).toFixed(1);

  return (
    <div>
      <PageHeader
        title="AI Maturity Assessment"
        subtitle="Score the organization across ten dimensions (0–5), see the gap to target, and get a sequenced roadmap that closes the biggest gaps first."
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiTile label="Overall maturity" value={`${overall} / 5`} />
        <KpiTile label="Dimensions below target" value={gaps.length} intent="down" />
        <KpiTile label="Largest gap" value={gaps[0]?.d ?? "—"} footnote={gaps[0] ? `+${gaps[0].gap} to close` : ""} />
        <KpiTile label="At/above target" value={DIMENSIONS.length - gaps.length} intent="up" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <SectionTitle hint="current vs target">Maturity radar</SectionTitle>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: "#475569" }} />
                <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 9 }} />
                <Radar dataKey="Target" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.1} />
                <Radar dataKey="Current" stroke="#3b6fed" fill="#3b6fed" fillOpacity={0.35} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle>Adjust current scores</SectionTitle>
          <div className="max-h-80 space-y-2.5 overflow-y-auto pr-1">
            {DIMENSIONS.map((d) => (
              <div key={d}>
                <div className="mb-0.5 flex justify-between text-xs"><span className="font-medium text-ink-700">{d}</span><span className="text-ink-400">{current[d]} → {TARGET[d]}</span></div>
                <input type="range" min={0} max={5} value={current[d]} onChange={(e) => setCurrent((c) => ({ ...c, [d]: Number(e.target.value) }))} className="w-full accent-brand-500" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <SectionTitle hint="close biggest gaps first">Recommended roadmap</SectionTitle>
        <ol className="space-y-2 text-sm">
          {gaps.map((g, i) => (
            <li key={g.d} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">{i + 1}</span>
              <span className="text-ink-700"><strong>{g.d}</strong> — raise {current[g.d]} → {TARGET[g.d]} (+{g.gap}). {roadmapHint(g.d)}</span>
            </li>
          ))}
          {gaps.length === 0 && <li className="text-ink-500">All dimensions at or above target.</li>}
        </ol>
      </Card>
    </div>
  );
}

function roadmapHint(d: string): string {
  const map: Record<string, string> = {
    Data: "Stand up a data-quality SLA and a governed feature/knowledge store.",
    MLOps: "Add model monitoring, drift detection and automated re-training.",
    "AI Engineering": "Codify eval-gated CI and a shared prompt/agent framework.",
    "Agent Systems": "Introduce guardrailed agent patterns with human-in-the-loop checkpoints.",
    Talent: "Close skills gaps via enablement and targeted hiring.",
    Strategy: "Tie the AI portfolio to measurable business outcomes.",
    "Executive Leadership": "Establish an AI steering committee with funding authority.",
    "Responsible AI": "Mature the review queues into an always-on governance office.",
  };
  return map[d] ?? "Sequence targeted initiatives to close the gap.";
}
