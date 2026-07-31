import { useEffect, useMemo, useRef, useState } from "react";
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from "recharts";
import { Sparkles } from "lucide-react";
import { useLiveStore } from "../store";
import { useLiveSnapshot } from "./common";
import { Card, PageHeader, SectionTitle, KpiTile } from "@/shared/components/ui";
import type { LiveReadiness } from "../liveAdapters";

const DIMENSIONS = [
  "Strategy", "Governance", "Data", "Talent", "AI Engineering", "MLOps",
  "Product Delivery", "Agent Systems", "Responsible AI", "Executive Leadership",
];
const TARGET: Record<string, number> = {
  Strategy: 4, Governance: 4, Data: 4, Talent: 4, "AI Engineering": 4, MLOps: 4,
  "Product Delivery": 4, "Agent Systems": 3, "Responsible AI": 5, "Executive Leadership": 4,
};
const zeros = () => Object.fromEntries(DIMENSIONS.map((d) => [d, 0])) as Record<string, number>;
const RECORD_ID = "org";

export function LiveMaturityAssessment() {
  const stored = useLiveStore((s) => s.entities.maturity_score.find((e) => e.id === RECORD_ID));
  const saveEntity = useLiveStore((s) => s.saveEntity);
  const diagnostic = useLiveStore((s) => s.registrations.find((r) => r.adapterType === "readiness"));
  const q = useLiveSnapshot(diagnostic);

  const [current, setCurrent] = useState<Record<string, number>>(zeros());
  const [saving, setSaving] = useState(false);
  const hydrated = useRef(false);

  // Hydrate current scores from the persisted record once it arrives.
  useEffect(() => {
    if (!hydrated.current && stored?.data?.scores) {
      setCurrent({ ...zeros(), ...(stored.data.scores as Record<string, number>) });
      hydrated.current = true;
    }
  }, [stored]);

  const data = DIMENSIONS.map((d) => ({ dimension: d, Current: current[d], Target: TARGET[d] }));
  const gaps = useMemo(() => DIMENSIONS.map((d) => ({ d, gap: TARGET[d] - current[d] })).filter((g) => g.gap > 0).sort((a, b) => b.gap - a.gap), [current]);
  const overall = (Object.values(current).reduce((a, b) => a + b, 0) / DIMENSIONS.length).toFixed(1);

  function seedFromDiagnostic() {
    const live = q.data?.ok ? (q.data.data as LiveReadiness) : undefined;
    if (!live?.capabilityAssessment?.length) return;
    setCurrent((c) => {
      const next = { ...c };
      for (const cap of live.capabilityAssessment) {
        if (cap.dimension in TARGET) next[cap.dimension] = Math.round((cap.score / 100) * 5);
      }
      return next;
    });
    hydrated.current = true;
  }

  async function save() {
    setSaving(true);
    try {
      await saveEntity("maturity_score", { id: RECORD_ID, productId: null, data: { scores: current } });
    } finally {
      setSaving(false);
    }
  }

  const canSeed = !!q.data?.ok && ((q.data.data as LiveReadiness)?.capabilityAssessment?.length ?? 0) > 0;

  return (
    <div>
      <PageHeader
        title="AI Maturity Assessment"
        subtitle="Score the organization across ten dimensions (0–5). Self-assessment is persisted; you can seed the starting scores from the Diagnostic's live readiness."
        actions={
          <button onClick={seedFromDiagnostic} disabled={!canSeed} title={canSeed ? "" : "Complete a Diagnostic assessment to enable"} className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-50 disabled:opacity-50">
            <Sparkles className="h-4 w-4" /> Seed from Diagnostic (live)
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiTile label="Overall maturity" value={`${overall} / 5`} />
        <KpiTile label="Below target" value={gaps.length} intent="down" />
        <KpiTile label="Largest gap" value={gaps[0]?.d ?? "—"} footnote={gaps[0] ? `+${gaps[0].gap} to close` : ""} />
        <KpiTile label="Persisted" value={stored ? "Saved" : "Unsaved"} intent={stored ? "up" : "neutral"} />
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
          <div className="mb-2 flex items-center justify-between">
            <SectionTitle>Current scores</SectionTitle>
            <button onClick={save} disabled={saving} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
          </div>
          <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
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
              <span className="text-ink-700"><strong>{g.d}</strong> — raise {current[g.d]} → {TARGET[g.d]} (+{g.gap}).</span>
            </li>
          ))}
          {gaps.length === 0 && <li className="text-ink-500">All dimensions at or above target.</li>}
        </ol>
      </Card>
    </div>
  );
}
