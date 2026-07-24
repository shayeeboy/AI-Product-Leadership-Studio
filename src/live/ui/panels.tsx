import {
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, LineChart, Line,
} from "recharts";
import { Card, SectionTitle, KpiTile, EmptyState, SeverityBadge } from "@/shared/components/ui";
import { pct, usd, shortDate } from "@/lib/format";
import type {
  LiveReadiness, LiveRagHealth, LiveFinancial, LiveGenericHealth,
} from "../liveAdapters";

// --- Readiness (AI-Native Diagnostic) ---------------------------------------
export function ReadinessPanel({ d }: { d: LiveReadiness }) {
  if (!d.sessionCount) {
    return (
      <EmptyState
        title="No assessments recorded yet"
        hint="This product is live, but its diagnostic has no saved sessions. Complete an assessment on the live tool to populate real readiness data."
      />
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="grid grid-cols-3 gap-3 lg:col-span-2">
        <KpiTile label="AI Readiness" value={d.aiReadinessScore != null ? `${d.aiReadinessScore}` : "—"} footnote={`${d.sessionCount} assessment(s)`} />
        <KpiTile label="Team Maturity" value={d.teamMaturityScore != null ? `${d.teamMaturityScore}` : "—"} />
        <KpiTile label="Adoption" value={d.adoptionScore != null ? `${d.adoptionScore}` : "—"} footnote="AI-integration proxy" />
      </div>
      <Card className="p-4">
        <SectionTitle hint="live aggregate">Capability profile</SectionTitle>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={d.capabilityAssessment}>
              <PolarGrid />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: "#475569" }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
              <Radar dataKey="score" stroke="#3b6fed" fill="#3b6fed" fillOpacity={0.35} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-4">
        <SectionTitle>Risk indicators & recommendations</SectionTitle>
        {d.riskIndicators.length > 0 && (
          <ul className="mb-3 space-y-1.5 text-sm">
            {d.riskIndicators.map((r) => (
              <li key={r.label} className="flex items-center justify-between">
                <span className="text-ink-700">{r.label}</span>
                <SeverityBadge severity={r.severity} />
              </li>
            ))}
          </ul>
        )}
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-600">
          {d.recommendations.map((r) => <li key={r}>{r}</li>)}
        </ul>
      </Card>
    </div>
  );
}

// --- RAG knowledge health ----------------------------------------------------
export function RagHealthPanel({ d }: { d: LiveRagHealth }) {
  const o = d.observability;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
        <span className="rounded bg-ink-100 px-2 py-0.5">provider: <b>{d.provider}</b></span>
        <span className="rounded bg-ink-100 px-2 py-0.5">model: <b>{d.model}</b></span>
        <span className={`rounded px-2 py-0.5 ${d.db === "connected" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>db: {d.db}</span>
        <span className={`rounded px-2 py-0.5 ${d.llm === "reachable" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>llm: {d.llm}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile label="Groundedness" value={d.groundedness != null ? pct(d.groundedness) : "—"} footnote="live from logs" />
        <KpiTile label="Retrieval quality" value={d.retrievalQuality != null ? pct(d.retrievalQuality) : "—"} />
        <KpiTile label="Citation accuracy" value={d.citationAccuracy != null ? pct(d.citationAccuracy) : "—"} />
        <KpiTile label="Hallucination" value={d.hallucinationRate != null ? pct(d.hallucinationRate) : "—"} intent="down" />
        <KpiTile label="Latency p50" value={d.latencyMsP50 != null ? `${(d.latencyMsP50 / 1000).toFixed(1)}s` : "—"} />
        <KpiTile label="Latency p95" value={d.latencyMsP95 != null ? `${(d.latencyMsP95 / 1000).toFixed(1)}s` : "—"} />
        <KpiTile label="Freshness" value={d.knowledgeFreshnessDays != null ? `${d.knowledgeFreshnessDays}d` : "—"} />
        <KpiTile label="Cost / query" value={usd(d.costPerQuery)} footnote="Groq free tier" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <SectionTitle hint={`last eval ${d.evalRunAt ?? "—"}`}>Evaluation metrics</SectionTitle>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.evaluationMetrics} margin={{ left: 4, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="metric" tick={{ fontSize: 9, fill: "#64748b" }} interval={0} angle={-15} textAnchor="end" height={54} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {d.evaluationMetrics.map((m, i) => <Cell key={i} fill={m.pass ? "#16a34a" : "#dc2626"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <SectionTitle hint="live observability">Query volume</SectionTitle>
          <dl className="space-y-1.5 text-sm">
            <Row k="Total queries" v={`${o.total}`} />
            <Row k="Live / benchmark" v={`${o.liveCount ?? "—"} / ${o.benchmarkCount ?? "—"}`} />
            <Row k="Grounded rate" v={o.groundedRate != null ? pct(o.groundedRate) : "—"} />
            <Row k="Errors" v={`${o.errorCount ?? "—"}`} />
            <Row k="Avg latency" v={o.avgLatencyMs != null ? `${(o.avgLatencyMs / 1000).toFixed(1)}s` : "—"} />
            <Row k="Total cost" v={o.totalCostUsd != null ? usd(o.totalCostUsd) : "—"} />
            <Row k="Window" v={o.firstAt && o.lastAt ? `${shortDate(o.firstAt)} – ${shortDate(o.lastAt)}` : "—"} />
          </dl>
        </Card>
      </div>
    </div>
  );
}

// --- Financial intelligence --------------------------------------------------
export function FinancialPanel({ d }: { d: LiveFinancial }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-600">
        <span className="font-medium text-ink-800">{d.target.demographic}</span> · {d.target.product} · {d.target.geography}
      </p>
      <Card className="border-l-4 border-l-brand-500 p-4">
        <SectionTitle>Executive summary</SectionTitle>
        <p className="text-sm leading-relaxed text-ink-700">{stripMd(d.executiveSummary)}</p>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {d.indicators.map((ind) => (
          <Card key={ind.key} className="p-3">
            <div className="text-[11px] uppercase tracking-wide text-ink-400">{ind.label}</div>
            <div className="mt-1 text-xl font-semibold text-ink-900">
              {ind.value != null ? ind.value : "—"}<span className="ml-1 text-xs font-normal text-ink-400">{ind.unit}</span>
            </div>
            {ind.trend.length > 1 && (
              <div className="mt-1 h-10">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ind.trend}>
                    <Line type="monotone" dataKey="value" stroke="#3b6fed" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-1 truncate text-[10px] text-ink-400" title={ind.source}>{ind.source}{ind.refPeriod ? ` · ${ind.refPeriod}` : ""}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <SectionTitle>Strategic recommendations</SectionTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-700">
            {d.strategicRecommendations.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </Card>
        <Card className="p-4">
          <SectionTitle>Decision traces</SectionTitle>
          <ul className="space-y-2 text-sm">
            {d.decisionTraces.map((t) => (
              <li key={t.step}><span className="font-medium text-ink-800">{t.step}:</span> <span className="text-ink-600">{t.rationale}</span></li>
            ))}
          </ul>
          {d.briefUrl && <a href={d.briefUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-brand-600 hover:underline">Full strategic brief →</a>}
        </Card>
      </div>
    </div>
  );
}

// --- Generic health probe ----------------------------------------------------
export function HealthPanel({ d }: { d: LiveGenericHealth }) {
  const entries = Object.entries(d).filter(([, v]) => typeof v !== "object");
  return (
    <Card className="p-4">
      <SectionTitle hint="generic /health probe">Live status</SectionTitle>
      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        {entries.map(([k, v]) => <Row key={k} k={k} v={String(v)} />)}
      </dl>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-100 py-1">
      <dt className="capitalize text-ink-500">{k}</dt>
      <dd className="font-medium text-ink-800">{v}</dd>
    </div>
  );
}

// The FI executive summary carries **markdown** emphasis; strip it for plain display.
function stripMd(s: string) {
  return s.replace(/\*\*/g, "").replace(/`/g, "");
}
