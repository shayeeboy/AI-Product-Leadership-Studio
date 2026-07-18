import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { PRODUCTS } from "@/seed/products";
import { PORTFOLIO_TRENDS } from "@/seed/snapshots";
import { RAG_HEALTH_SNAPSHOTS } from "@/seed/snapshots";
import {
  activeProducts,
  productsAtRisk,
  monthlySpend,
  blendedRoi,
  portfolioHealth,
} from "@/lib/portfolio";
import { usd, pct } from "@/lib/format";
import { PRODUCT_STATUS_META } from "@/lib/status";
import { Card, KpiTile, PageHeader, SectionTitle, StatusBadge } from "@/shared/components/ui";

const STATUS_COLORS: Record<string, string> = {
  healthy: "#16a34a",
  "at-risk": "#d97706",
  "over-budget": "#dc2626",
  pending: "#7c3aed",
  archived: "#94a3b8",
};

export function ExecutiveDashboard() {
  const health = portfolioHealth();
  const atRisk = productsAtRisk();
  const spend = monthlySpend();
  const roi = blendedRoi();
  const prevSpend = PORTFOLIO_TRENDS[PORTFOLIO_TRENDS.length - 2].spend;
  const spendDelta = ((spend - prevSpend) / prevSpend) * 100;
  const evalPass = Math.round(
    (RAG_HEALTH_SNAPSHOTS.reduce((s, r) => s + r.evaluationMetrics.filter((m) => m.pass).length, 0) /
      RAG_HEALTH_SNAPSHOTS.reduce((s, r) => s + r.evaluationMetrics.length, 0)) *
      100,
  );

  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of PRODUCTS) counts[p.status] = (counts[p.status] ?? 0) + 1;
    return Object.entries(counts).map(([status, value]) => ({ status, value }));
  }, []);

  const pendingApprovals = PRODUCTS.filter((p) => p.status === "pending").length + 2;

  return (
    <div>
      <PageHeader
        title="Executive AI Decision Intelligence"
        subtitle="Portfolio-wide health, spend, ROI and governance at a glance — the front door to every module."
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiTile label="Portfolio Health" value={`${health.label} · ${health.score}%`} footnote={`${activeProducts().length} active products`} intent={health.score >= 70 ? "up" : "neutral"} />
        <KpiTile label="Active AI Products" value={activeProducts().length} footnote={`${PRODUCTS.length} total incl. archived`} />
        <KpiTile label="Products at Risk" value={atRisk.length} delta="watchlist" intent="down" footnote="risk / over-budget" />
        <KpiTile label="Monthly AI Spend" value={usd(spend, true)} delta={`${spendDelta >= 0 ? "+" : ""}${spendDelta.toFixed(1)}%`} intent={spendDelta > 0 ? "down" : "up"} footnote="vs prior month" />
        <KpiTile label="Blended ROI" value={pct(roi)} delta="portfolio avg" intent="up" footnote="active products" />
        <KpiTile label="Evaluation Pass Rate" value={pct(evalPass)} intent={evalPass >= 70 ? "up" : "down"} footnote="from RAG eval adapter" />
        <KpiTile label="Reliability (p95)" value="11.0s" footnote="RAG assistant latency" />
        <KpiTile label="Adoption Index" value={PORTFOLIO_TRENDS.at(-1)!.adoption} delta={`+${PORTFOLIO_TRENDS.at(-1)!.adoption - PORTFOLIO_TRENDS.at(-2)!.adoption}`} intent="up" footnote="blended" />
        <KpiTile label="Governance Status" value={`${pendingApprovals} pending`} intent="down" footnote="approvals in queue" />
        <KpiTile label="Cost Trend" value={usd(spend, true)} delta="8-mo +28%" intent="down" footnote="see Cost Analyzer" />
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <SectionTitle hint="last 8 months">Adoption · ROI · Spend trend</SectionTitle>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={PORTFOLIO_TRENDS} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="adoption" stroke="#3b6fed" strokeWidth={2} dot={false} name="Adoption" />
                <Line type="monotone" dataKey="roi" stroke="#16a34a" strokeWidth={2} dot={false} name="ROI %" />
                <Line type="monotone" dataKey="evalPass" stroke="#7c3aed" strokeWidth={2} dot={false} name="Eval pass %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <SectionTitle hint="12 products">Portfolio health mix</SectionTitle>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusDistribution} dataKey="value" nameKey="status" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {statusDistribution.map((d) => (
                    <Cell key={d.status} fill={STATUS_COLORS[d.status] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, PRODUCT_STATUS_META[n as keyof typeof PRODUCT_STATUS_META]?.label ?? n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Executive summary narrative */}
      <Card className="mt-6 border-l-4 border-l-brand-500 p-5">
        <SectionTitle>Executive summary</SectionTitle>
        <p className="text-sm leading-relaxed text-ink-700">
          The portfolio holds <strong>{activeProducts().length} active AI products</strong> against a
          blended ROI of <strong>{pct(roi)}</strong> and monthly run-rate of <strong>{usd(spend)}</strong>{" "}
          ({spendDelta >= 0 ? "up" : "down"} {Math.abs(spendDelta).toFixed(1)}% on the month). Health is{" "}
          <strong>{health.label.toLowerCase()}</strong> at {health.score}%, with <strong>{atRisk.length} products</strong>{" "}
          on the watchlist — chiefly the Demand Forecaster (accuracy regression) and two over-budget pilots
          (Visual QC, Board Summarizer). Evaluation pass rate sits at <strong>{pct(evalPass)}</strong>, and{" "}
          <strong>{pendingApprovals} governance items</strong> await a human decision, including the HR Policy
          Assistant blocked on privacy sign-off. <strong>Recommended focus:</strong> remediate the two
          over-budget pilots and clear the Responsible AI queue before approving new spend.
        </p>
      </Card>

      {/* Product table */}
      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-ink-200 px-5 py-3">
          <SectionTitle>All AI products</SectionTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Product</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Business Unit</th>
                <th className="px-3 py-2.5 font-medium">Architecture</th>
                <th className="px-3 py-2.5 text-right font-medium">Monthly</th>
                <th className="px-3 py-2.5 text-right font-medium">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {PRODUCTS.map((p) => (
                <tr key={p.id} className="hover:bg-ink-50">
                  <td className="px-5 py-2.5">
                    <Link to={`/product/${p.id}`} className="font-medium text-brand-600 hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5"><StatusBadge status={p.status} /></td>
                  <td className="px-3 py-2.5 text-ink-600">{p.businessUnit}</td>
                  <td className="px-3 py-2.5 text-ink-600">{p.architecture}</td>
                  <td className="px-3 py-2.5 text-right text-ink-700">{p.monthlySpend ? usd(p.monthlySpend, true) : "—"}</td>
                  <td className="px-3 py-2.5 text-right text-ink-700">{p.roi ? pct(p.roi) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
