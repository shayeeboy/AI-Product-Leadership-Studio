import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { PRODUCTS } from "@/seed/products";
import { RISKS } from "@/seed/governance";
import { usd } from "@/lib/format";
import { severityScore, SEVERITY_META } from "@/lib/status";
import { Card, PageHeader, SectionTitle, StatusBadge } from "@/shared/components/ui";
import type { ProductStatus, Severity } from "@/types/domain";

const STATUS_FILTERS: (ProductStatus | "all")[] = ["all", "healthy", "at-risk", "over-budget", "pending", "archived"];
const SEV: Severity[] = ["low", "medium", "high"];

export function PortfolioGovernance() {
  const [filter, setFilter] = useState<ProductStatus | "all">("all");
  const [sortByRoi, setSortByRoi] = useState(false);

  const rows = useMemo(() => {
    let r = PRODUCTS.filter((p) => filter === "all" || p.status === filter);
    if (sortByRoi) r = [...r].sort((a, b) => b.roi - a.roi);
    return r;
  }, [filter, sortByRoi]);

  const fundingData = useMemo(
    () =>
      PRODUCTS.filter((p) => p.annualBudget > 0)
        .map((p) => ({ name: p.name.split(" ").slice(0, 2).join(" "), budget: p.annualBudget }))
        .sort((a, b) => b.budget - a.budget),
    [],
  );

  // Risk heatmap: count of risks per (likelihood, impact) cell.
  const heat = useMemo(() => {
    const grid: Record<string, number> = {};
    for (const r of RISKS) grid[`${r.likelihood}:${r.impact}`] = (grid[`${r.likelihood}:${r.impact}`] ?? 0) + 1;
    return grid;
  }, []);

  return (
    <div>
      <PageHeader
        title="Enterprise AI Portfolio Governance"
        subtitle="The central registry and health view of every AI product — funding, ownership, risk and workflow status in one place."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <SectionTitle hint="annual, USD">Funding by product</SectionTitle>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fundingData} layout="vertical" margin={{ left: 20, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => usd(v, true)} tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "#334155" }} />
                <Tooltip formatter={(v) => usd(Number(v))} />
                <Bar dataKey="budget" fill="#3b6fed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <SectionTitle hint="likelihood × impact">Risk heatmap</SectionTitle>
          <div className="mt-2">
            <div className="grid grid-cols-[auto_repeat(3,1fr)] gap-1 text-center text-xs">
              <div />
              {SEV.map((s) => (
                <div key={s} className="pb-1 font-medium text-ink-500">{SEVERITY_META[s].label}</div>
              ))}
              {[...SEV].reverse().map((lik) => (
                <FragmentRow key={lik} lik={lik} heat={heat} />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-ink-400">
              <span>← Impact →</span>
              <span>↑ Likelihood</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Registry */}
      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-ink-200 px-5 py-3">
          <SectionTitle>Product registry</SectionTitle>
          <div className="ml-auto flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                  filter === f ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                }`}
              >
                {f === "all" ? "All" : f.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Product</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Owner</th>
                <th className="px-3 py-2.5 font-medium">Sponsor</th>
                <th className="px-3 py-2.5 font-medium">Lifecycle</th>
                <th className="cursor-pointer px-3 py-2.5 text-right font-medium hover:text-ink-800" onClick={() => setSortByRoi((v) => !v)}>
                  ROI {sortByRoi ? "▾" : "⇅"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-ink-50">
                  <td className="px-5 py-2.5">
                    <Link to={`/product/${p.id}`} className="font-medium text-brand-600 hover:underline">{p.name}</Link>
                    <div className="text-xs text-ink-400">{p.businessUnit}</div>
                  </td>
                  <td className="px-3 py-2.5"><StatusBadge status={p.status} /></td>
                  <td className="px-3 py-2.5 text-ink-600">{p.owner}</td>
                  <td className="px-3 py-2.5 text-ink-600">{p.sponsor}</td>
                  <td className="px-3 py-2.5 capitalize text-ink-600">{p.lifecycle}</td>
                  <td className="px-3 py-2.5 text-right text-ink-700">{p.roi ? `${p.roi}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function FragmentRow({ lik, heat }: { lik: Severity; heat: Record<string, number> }) {
  return (
    <>
      <div className="flex items-center pr-1 font-medium text-ink-500">{SEVERITY_META[lik].label}</div>
      {SEV.map((imp) => {
        const count = heat[`${lik}:${imp}`] ?? 0;
        const intensity = severityScore(lik) * severityScore(imp); // 1..9
        const bg =
          intensity >= 6 ? "bg-red-500 text-white" : intensity >= 3 ? "bg-amber-400 text-amber-950" : "bg-emerald-300 text-emerald-950";
        return (
          <div key={imp} className={`flex h-12 items-center justify-center rounded font-semibold ${count ? bg : "bg-ink-100 text-ink-300"}`}>
            {count || ""}
          </div>
        );
      })}
    </>
  );
}
