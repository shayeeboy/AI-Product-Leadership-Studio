import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PRODUCTS } from "@/seed/products";
import { Card, PageHeader, SectionTitle } from "@/shared/components/ui";
import { usd } from "@/lib/format";
import { clsx } from "clsx";

// Executive Scorecard: side-by-side comparison across the portfolio with
// traffic-light indicators and segmentation filters (Section 6.13).
type Metric = { key: string; label: string; get: (p: (typeof PRODUCTS)[number]) => number; fmt: (n: number) => string; goodHigh: boolean };

const METRICS: Metric[] = [
  { key: "roi", label: "ROI", get: (p) => p.roi, fmt: (n) => `${n}%`, goodHigh: true },
  { key: "adoption", label: "Adoption", get: (p) => p.adoption, fmt: (n) => `${n}`, goodHigh: true },
  { key: "spend", label: "Monthly spend", get: (p) => p.monthlySpend, fmt: (n) => usd(n, true), goodHigh: false },
];

function light(value: number, all: number[], goodHigh: boolean) {
  const max = Math.max(...all, 1);
  const norm = value / max;
  const score = goodHigh ? norm : 1 - norm;
  if (score >= 0.66) return "bg-emerald-500";
  if (score >= 0.33) return "bg-amber-400";
  return "bg-red-500";
}

export function CrossProductAnalytics() {
  const [unit, setUnit] = useState<string>("all");
  const units = ["all", ...Array.from(new Set(PRODUCTS.map((p) => p.businessUnit)))];

  const rows = useMemo(
    () => PRODUCTS.filter((p) => p.status !== "archived").filter((p) => unit === "all" || p.businessUnit === unit),
    [unit],
  );

  return (
    <div>
      <PageHeader
        title="Cross-Product AI Intelligence Platform"
        subtitle="The Executive Scorecard — compare every product on the metrics that matter, with traffic-light indicators and segmentation."
        actions={
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm">
            {units.map((u) => <option key={u} value={u}>{u === "all" ? "All business units" : u}</option>)}
          </select>
        }
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Product</th>
                <th className="px-3 py-2.5 font-medium">Architecture</th>
                <th className="px-3 py-2.5 font-medium">Lifecycle</th>
                {METRICS.map((m) => <th key={m.key} className="px-3 py-2.5 text-right font-medium">{m.label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-ink-50">
                  <td className="px-5 py-2.5"><Link to={`/product/${p.id}`} className="font-medium text-brand-600 hover:underline">{p.name}</Link><div className="text-xs text-ink-400">{p.businessUnit}</div></td>
                  <td className="px-3 py-2.5 text-ink-600">{p.architecture}</td>
                  <td className="px-3 py-2.5 capitalize text-ink-600">{p.lifecycle}</td>
                  {METRICS.map((m) => {
                    const val = m.get(p);
                    const all = rows.map(m.get);
                    return (
                      <td key={m.key} className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-2">
                          <span className="tabular-nums text-ink-700">{m.fmt(val)}</span>
                          <span className={clsx("h-2.5 w-2.5 rounded-full", light(val, all, m.goodHigh))} />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4"><SectionTitle>Segment insight</SectionTitle><p className="text-sm text-ink-600">Knowledge & Support carries the most products but mixed health — the RAG Assistant is the anchor while Support Triage drifts.</p></Card>
        <Card className="p-4"><SectionTitle>Reliability</SectionTitle><p className="text-sm text-ink-600">Production RAG holds p95 at ~11s; pilot models (Visual QC, Demand Forecaster) are the reliability and cost outliers.</p></Card>
        <Card className="p-4"><SectionTitle>ROI leaders</SectionTitle><p className="text-sm text-ink-600">Financial Intelligence (260%) and the AI-Native Diagnostic (210%) lead; agentic pilots trail until oversight matures.</p></Card>
      </div>
    </div>
  );
}
