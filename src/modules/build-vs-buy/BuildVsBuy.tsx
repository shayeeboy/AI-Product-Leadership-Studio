import { useMemo, useState } from "react";
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from "recharts";
import { Card, PageHeader, SectionTitle } from "@/shared/components/ui";

type Lever = "budget" | "timeToValue" | "teamMaturity" | "security" | "ipSensitivity" | "compliance" | "volume";

const LEVERS: { key: Lever; label: string; low: string; high: string }[] = [
  { key: "budget", label: "Budget", low: "Tight", high: "Ample" },
  { key: "timeToValue", label: "Time-to-value urgency", low: "Relaxed", high: "Urgent" },
  { key: "teamMaturity", label: "Team maturity", low: "Nascent", high: "Advanced" },
  { key: "security", label: "Security requirements", low: "Standard", high: "Strict" },
  { key: "ipSensitivity", label: "IP sensitivity", low: "Low", high: "High" },
  { key: "compliance", label: "Compliance constraints", low: "Light", high: "Heavy" },
  { key: "volume", label: "Expected usage volume", low: "Low", high: "High" },
];

const OPTIONS = ["SaaS Purchase", "Internal Build", "Foundation Model", "RAG", "Fine-Tuning", "Agentic", "Hybrid"] as const;
type Option = (typeof OPTIONS)[number];
const CRITERIA = ["Cost", "Speed", "Flexibility", "Compliance", "Maintenance", "Control"] as const;

// Base profiles per option per criterion (0-100), then adjusted by input levers.
const BASE: Record<Option, Record<string, number>> = {
  "SaaS Purchase": { Cost: 55, Speed: 90, Flexibility: 35, Compliance: 55, Maintenance: 85, Control: 25 },
  "Internal Build": { Cost: 35, Speed: 30, Flexibility: 90, Compliance: 80, Maintenance: 35, Control: 95 },
  "Foundation Model": { Cost: 50, Speed: 80, Flexibility: 70, Compliance: 45, Maintenance: 65, Control: 40 },
  RAG: { Cost: 70, Speed: 70, Flexibility: 75, Compliance: 75, Maintenance: 60, Control: 75 },
  "Fine-Tuning": { Cost: 45, Speed: 50, Flexibility: 80, Compliance: 65, Maintenance: 45, Control: 80 },
  Agentic: { Cost: 40, Speed: 55, Flexibility: 88, Compliance: 50, Maintenance: 40, Control: 70 },
  Hybrid: { Cost: 60, Speed: 65, Flexibility: 82, Compliance: 78, Maintenance: 58, Control: 82 },
};

export function BuildVsBuy() {
  const [levers, setLevers] = useState<Record<Lever, number>>({
    budget: 50, timeToValue: 60, teamMaturity: 45, security: 70, ipSensitivity: 75, compliance: 65, volume: 55,
  });

  const scored = useMemo(() => {
    return OPTIONS.map((opt) => {
      const b = BASE[opt];
      // Weight each option's fit by how well its profile matches the levers.
      let fit = 0;
      fit += b.Speed * (levers.timeToValue / 100) * 1.2;
      fit += b.Cost * (1 - levers.budget / 100) * 1.1; // tighter budget rewards cheaper options
      fit += b.Control * (levers.ipSensitivity / 100) * 1.3;
      fit += b.Compliance * (levers.compliance / 100) * 1.2;
      fit += b.Compliance * (levers.security / 100) * 1.0;
      fit += b.Flexibility * (levers.teamMaturity / 100) * 0.9; // mature teams exploit flexibility
      fit += b.Maintenance * (1 - levers.teamMaturity / 100) * 0.8; // nascent teams value low maintenance
      fit += b.Flexibility * (levers.volume / 100) * 0.6;
      return { option: opt, fit: Math.round(fit) };
    }).sort((a, b) => b.fit - a.fit);
  }, [levers]);

  const winner = scored[0];
  const radarData = CRITERIA.map((c) => {
    const row: Record<string, number | string> = { criterion: c };
    for (const opt of scored.slice(0, 3)) row[opt.option] = BASE[opt.option][c];
    return row;
  });
  const colors = ["#3b6fed", "#16a34a", "#d97706"];

  return (
    <div>
      <PageHeader
        title="Build vs Buy Advisor"
        subtitle="A decision engine, not a static table. Set the constraints and the recommended path recalculates with a rationale."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <SectionTitle>Constraints</SectionTitle>
          <div className="space-y-3.5">
            {LEVERS.map((l) => (
              <div key={l.key}>
                <div className="mb-1 flex justify-between text-sm"><span className="font-medium text-ink-700">{l.label}</span><span className="tabular-nums text-ink-500">{levers[l.key]}</span></div>
                <input type="range" min={0} max={100} value={levers[l.key]} onChange={(e) => setLevers((s) => ({ ...s, [l.key]: Number(e.target.value) }))} className="w-full accent-brand-500" />
                <div className="flex justify-between text-[10px] text-ink-400"><span>{l.low}</span><span>{l.high}</span></div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card className="border-l-4 border-l-brand-500 p-5">
            <SectionTitle>Recommended path</SectionTitle>
            <div className="text-xl font-bold text-ink-900">{winner.option}</div>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Given {levers.ipSensitivity >= 60 ? "high IP sensitivity" : "moderate IP sensitivity"},{" "}
              {levers.teamMaturity >= 60 ? "an advanced team" : "a still-maturing team"} and{" "}
              {levers.compliance >= 60 ? "heavy compliance constraints" : "lighter compliance needs"},{" "}
              <strong>{winner.option}</strong> scores highest ({winner.fit}) — balancing{" "}
              {levers.budget < 50 ? "cost discipline" : "capability"} against{" "}
              {levers.timeToValue >= 60 ? "speed-to-value" : "long-term ownership"}.
            </p>
          </Card>

          <Card className="p-4">
            <SectionTitle hint="top 3 options">Criteria comparison</SectionTitle>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 11, fill: "#475569" }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  {scored.slice(0, 3).map((o, i) => (
                    <Radar key={o.option} dataKey={o.option} stroke={colors[i]} fill={colors[i]} fillOpacity={0.15} />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-xs uppercase text-ink-500"><tr><th className="px-5 py-2">Rank</th><th className="px-3 py-2">Option</th><th className="px-3 py-2 text-right">Fit score</th></tr></thead>
              <tbody className="divide-y divide-ink-100">
                {scored.map((o, i) => (
                  <tr key={o.option} className={i === 0 ? "bg-brand-50" : ""}>
                    <td className="px-5 py-2 text-ink-400">#{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-ink-800">{o.option}</td>
                    <td className="px-3 py-2 text-right font-semibold">{o.fit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </div>
  );
}
