// Pure portfolio-rollup math for the executive views + the board report (R7).
// Extracted from LiveExecutiveDashboard so the on-screen dashboard and the
// exported PDF share one implementation (no drift) and the logic is unit-testable.
// Inputs in, plain data out — no React, store, or network.

export interface RollupSnapshot {
  data?: { ok: boolean; data?: unknown };
  isLoading?: boolean;
}

interface RegLike {
  id: string;
  name?: string;
  businessUnit?: string | null;
  monthlySpend?: number | string | null;
  roiTarget?: number | string | null;
}
interface RiskLike {
  productId?: string | null;
  data: unknown; // cast to { status? } internally — decoupled from the store's entity typing
}
interface AssessmentLike {
  title: string;
  opportunityScore?: number | null;
}
const statusOf = (data: unknown): string | undefined => (data as { status?: string } | null)?.status;

export interface RollupInputs {
  registrations: RegLike[];
  assessments: AssessmentLike[];
  risks: RiskLike[];
  reviews: { data: unknown }[];
  workflow: { productId: string; status?: string }[];
  snapshots: RollupSnapshot[]; // aligned by index with registrations
}

export interface Rollup {
  registered: number;
  reachable: number;
  checking: boolean;
  evalPass: number | null;
  spend: number;
  blendedRoi: number | null;
  openRisks: number;
  pendingGovernance: number;
  atRisk: number;
  opportunities: number;
  avgP95: number | null; // ms
  liveCost: number | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const health = (d: { ok: boolean; data?: unknown }): any => (d.ok ? d.data : undefined);

export function computeRollups(inp: RollupInputs): Rollup {
  const { registrations, assessments, risks, reviews, workflow, snapshots } = inp;
  const okResults = snapshots.map((s) => s.data).filter((d): d is { ok: boolean; data?: unknown } => !!d);
  const reachable = okResults.filter((d) => d.ok).length;
  const checking = snapshots.some((s) => s.isLoading);

  const allEval = okResults.flatMap((d) => (d.ok ? (health(d)?.evaluationMetrics ?? []) : []));
  const evalPass = allEval.length ? Math.round((allEval.filter((m: { pass?: boolean }) => m.pass).length / allEval.length) * 100) : null;

  const p95s: number[] = [];
  let liveCost = 0;
  let costSeen = false;
  for (const d of okResults) {
    if (!d.ok) continue;
    const rd = health(d);
    if (typeof rd?.latencyMsP95 === "number") p95s.push(rd.latencyMsP95);
    if (typeof rd?.costPerQuery === "number" && rd.observability && typeof rd.observability.total === "number") {
      liveCost += rd.costPerQuery * rd.observability.total;
      costSeen = true;
    }
  }
  const avgP95 = p95s.length ? Math.round(p95s.reduce((a, b) => a + b, 0) / p95s.length) : null;

  const spend = registrations.reduce((sum, r) => sum + Number(r.monthlySpend || 0), 0);
  const roiTargets = registrations.map((r) => Number(r.roiTarget || 0)).filter((n) => n > 0);
  const blendedRoi = roiTargets.length ? Math.round(roiTargets.reduce((a, b) => a + b, 0) / roiTargets.length) : null;

  const openRisks = risks.filter((r) => statusOf(r.data) !== "closed").length;
  const pendingReviews = reviews.filter((r) => statusOf(r.data) !== "completed").length;
  const pendingStages = workflow.filter((w) => w.status === "in-progress" || w.status === "blocked").length;

  const atRiskIds = new Set<string>();
  for (const r of risks) if (r.productId && statusOf(r.data) !== "closed") atRiskIds.add(r.productId);
  for (const w of workflow) if (w.status === "blocked") atRiskIds.add(w.productId);

  return {
    registered: registrations.length,
    reachable,
    checking,
    evalPass,
    spend,
    blendedRoi,
    openRisks,
    pendingGovernance: pendingReviews + pendingStages,
    atRisk: atRiskIds.size,
    opportunities: assessments.length,
    avgP95,
    liveCost: costSeen ? liveCost : null,
  };
}

export interface TopOpp {
  name: string;
  score: number;
}
export function computeTopOpps(assessments: AssessmentLike[]): TopOpp[] {
  return [...assessments]
    .filter((a) => a.opportunityScore != null)
    .sort((a, b) => (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0))
    .slice(0, 6)
    .map((a) => ({ name: a.title.length > 18 ? a.title.slice(0, 17) + "…" : a.title, score: a.opportunityScore ?? 0 }));
}

export interface ProductRow {
  id: string;
  name: string;
  businessUnit: string | null;
  sourceStatus: "live" | "checking" | "down";
  p95Ms: number | null;
  openRisks: number;
  monthlySpend: number | null;
}
export function computeProductRows(registrations: RegLike[], risks: RiskLike[], snapshots: RollupSnapshot[]): ProductRow[] {
  return registrations.map((p, i) => {
    const s = snapshots[i];
    const ok = !!s?.data?.ok;
    const loading = !!s?.isLoading;
    const rd = ok ? health(s!.data!) : undefined;
    const p95 = typeof rd?.latencyMsP95 === "number" ? rd.latencyMsP95 : null;
    const openRisks = risks.filter((r) => r.productId === p.id && statusOf(r.data) !== "closed").length;
    return {
      id: p.id,
      name: p.name ?? p.id,
      businessUnit: p.businessUnit ?? null,
      sourceStatus: ok ? "live" : loading ? "checking" : "down",
      p95Ms: p95,
      openRisks,
      monthlySpend: p.monthlySpend != null ? Number(p.monthlySpend) : null,
    };
  });
}

// Plain-text executive summary (mirrors the dashboard's narrative) for the PDF.
export function executiveSummaryText(r: Rollup): string {
  const parts: string[] = [];
  parts.push(`The portfolio holds ${r.registered} registered product${r.registered === 1 ? "" : "s"}, with ${r.reachable} reporting live right now.`);
  parts.push(`Governance shows ${r.openRisks} open risk${r.openRisks === 1 ? "" : "s"} and ${r.pendingGovernance} item${r.pendingGovernance === 1 ? "" : "s"} awaiting a decision.`);
  parts.push(r.opportunities > 0 ? `${r.opportunities} opportunit${r.opportunities === 1 ? "y has" : "ies have"} been scored.` : `No opportunities scored yet.`);
  parts.push(r.evalPass != null ? `Live evaluation pass rate is ${r.evalPass}%.` : `No product reports evaluation metrics live.`);
  if (r.avgP95 != null || r.liveCost != null) parts.push(`Reliability and inference cost are computed live where a source exposes them.`);
  parts.push(`Adoption remains Not reported — real usage/billing telemetry is a deliberate deferral (R14d).`);
  return parts.join(" ");
}
