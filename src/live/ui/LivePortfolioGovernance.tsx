import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Trash2, PlusCircle } from "lucide-react";
import { useLiveStore } from "../store";
import { Card, PageHeader, SectionTitle, StatusBadge, SeverityBadge, EmptyState } from "@/shared/components/ui";
import { SEVERITY_META, severityScore } from "@/lib/status";
import { usd } from "@/lib/format";
import type { Severity } from "@/types/domain";
import type { Registration } from "../types";

const SEV: Severity[] = ["low", "medium", "high"];
interface RiskData { risk: string; likelihood: Severity; impact: Severity; owner?: string; mitigation?: string; status?: string }

export function LivePortfolioGovernance() {
  const registrations = useLiveStore((s) => s.registrations);
  const riskRows = useLiveStore((s) => s.entities.risk);
  const saveEntity = useLiveStore((s) => s.saveEntity);
  const removeEntity = useLiveStore((s) => s.removeEntity);

  const [form, setForm] = useState<{ productId: string; risk: string; likelihood: Severity; impact: Severity; owner: string; mitigation: string }>({
    productId: registrations[0]?.id ?? "", risk: "", likelihood: "medium", impact: "medium", owner: "", mitigation: "",
  });

  const funding = useMemo(
    () => registrations.map((r) => ({ name: r.name.split(" ").slice(0, 2).join(" "), budget: Number(r.annualBudget || 0) })).filter((r) => r.budget > 0).sort((a, b) => b.budget - a.budget),
    [registrations],
  );

  const heat = useMemo(() => {
    const grid: Record<string, number> = {};
    for (const r of riskRows) {
      const d = r.data as unknown as RiskData;
      if (d?.likelihood && d?.impact) grid[`${d.likelihood}:${d.impact}`] = (grid[`${d.likelihood}:${d.impact}`] ?? 0) + 1;
    }
    return grid;
  }, [riskRows]);

  const productName = (id?: string | null) => registrations.find((r) => r.id === id)?.name ?? "—";

  async function addRisk(e: React.FormEvent) {
    e.preventDefault();
    if (!form.risk.trim()) return;
    await saveEntity("risk", { productId: form.productId || null, data: { risk: form.risk.trim(), likelihood: form.likelihood, impact: form.impact, owner: form.owner || undefined, mitigation: form.mitigation || undefined, status: "open" } });
    setForm((f) => ({ ...f, risk: "", owner: "", mitigation: "" }));
  }

  return (
    <div>
      <PageHeader
        title="Enterprise AI Portfolio Governance"
        subtitle="Registry, funding and a real risk register across every registered product — all Studio-managed and persisted. No seeded data."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <SectionTitle hint="annual, USD — from registration">Funding by product</SectionTitle>
          {funding.length === 0 ? (
            <div className="py-8"><EmptyState title="No funding captured" hint="Add an annual budget when registering a product (or edit its registration)." /></div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funding} layout="vertical" margin={{ left: 20, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => usd(v, true)} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "#334155" }} />
                  <Tooltip formatter={(v) => usd(Number(v))} />
                  <Bar dataKey="budget" fill="#3b6fed" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <SectionTitle hint="likelihood × impact">Risk heatmap</SectionTitle>
          <div className="grid grid-cols-[auto_repeat(3,1fr)] gap-1 text-center text-xs">
            <div />
            {SEV.map((s) => <div key={s} className="pb-1 font-medium text-ink-500">{SEVERITY_META[s].label}</div>)}
            {[...SEV].reverse().map((lik) => (
              <HeatRow key={lik} lik={lik} heat={heat} />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-ink-400"><span>← Impact →</span><span>↑ Likelihood</span></div>
        </Card>
      </div>

      {/* Registry */}
      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-ink-200 px-5 py-3"><SectionTitle>Product registry</SectionTitle></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr><th className="px-5 py-2.5">Product</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Owner</th><th className="px-3 py-2.5">Sponsor</th><th className="px-3 py-2.5">Lifecycle</th><th className="px-3 py-2.5 text-right">Budget</th><th className="px-3 py-2.5 text-right">ROI target</th></tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {registrations.map((p: Registration) => (
                <tr key={p.id} className="hover:bg-ink-50">
                  <td className="px-5 py-2.5"><Link to={`/product/${p.id}`} className="font-medium text-brand-600 hover:underline">{p.name}</Link><div className="text-xs text-ink-400">{p.businessUnit ?? "—"}</div></td>
                  <td className="px-3 py-2.5"><StatusBadge status={p.status} /></td>
                  <td className="px-3 py-2.5 text-ink-600">{p.owner ?? "—"}</td>
                  <td className="px-3 py-2.5 text-ink-600">{p.sponsor ?? "—"}</td>
                  <td className="px-3 py-2.5 capitalize text-ink-600">{p.lifecycle ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right text-ink-700">{p.annualBudget ? usd(Number(p.annualBudget), true) : "—"}</td>
                  <td className="px-3 py-2.5 text-right text-ink-700">{p.roiTarget ? `${p.roiTarget}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Risk register */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <SectionTitle>Add a risk</SectionTitle>
          <form onSubmit={addRisk} className="space-y-2.5">
            <select value={form.productId} onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))} className={inputCls}>
              <option value="">— portfolio-wide</option>
              {registrations.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <input value={form.risk} onChange={(e) => setForm((f) => ({ ...f, risk: e.target.value }))} placeholder="Risk description *" className={inputCls} />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-ink-500">Likelihood
                <select value={form.likelihood} onChange={(e) => setForm((f) => ({ ...f, likelihood: e.target.value as Severity }))} className={inputCls}>{SEV.map((s) => <option key={s} value={s}>{SEVERITY_META[s].label}</option>)}</select>
              </label>
              <label className="text-xs text-ink-500">Impact
                <select value={form.impact} onChange={(e) => setForm((f) => ({ ...f, impact: e.target.value as Severity }))} className={inputCls}>{SEV.map((s) => <option key={s} value={s}>{SEVERITY_META[s].label}</option>)}</select>
              </label>
            </div>
            <input value={form.owner} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} placeholder="Owner" className={inputCls} />
            <input value={form.mitigation} onChange={(e) => setForm((f) => ({ ...f, mitigation: e.target.value }))} placeholder="Mitigation" className={inputCls} />
            <button type="submit" className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"><PlusCircle className="h-4 w-4" /> Add risk</button>
          </form>
        </Card>

        <Card className="overflow-hidden lg:col-span-2">
          <div className="border-b border-ink-200 px-5 py-3"><SectionTitle hint="persisted">Risk register</SectionTitle></div>
          {riskRows.length === 0 ? (
            <div className="p-6"><EmptyState title="No risks logged" hint="Add a risk on the left — it persists and drives the heatmap." /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ink-50 text-left text-xs uppercase text-ink-500"><tr><th className="px-5 py-2">Risk</th><th className="px-3 py-2">Product</th><th className="px-3 py-2">L</th><th className="px-3 py-2">I</th><th className="px-3 py-2"></th></tr></thead>
                <tbody className="divide-y divide-ink-100">
                  {riskRows.map((r) => {
                    const d = r.data as unknown as RiskData;
                    return (
                      <tr key={r.id}>
                        <td className="px-5 py-2"><div className="font-medium text-ink-800">{d.risk}</div>{d.mitigation && <div className="text-xs text-ink-400">{d.owner ? `${d.owner} · ` : ""}{d.mitigation}</div>}</td>
                        <td className="px-3 py-2 text-ink-600">{productName(r.productId)}</td>
                        <td className="px-3 py-2"><SeverityBadge severity={d.likelihood} /></td>
                        <td className="px-3 py-2"><SeverityBadge severity={d.impact} /></td>
                        <td className="px-3 py-2"><button onClick={() => removeEntity("risk", r.id)} className="text-ink-400 hover:text-red-600" title="Delete"><Trash2 className="h-4 w-4" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <p className="mt-4 text-xs text-ink-400">Dependency graph is deferred to roadmap R14 (needs a real dependency data model).</p>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500";

function HeatRow({ lik, heat }: { lik: Severity; heat: Record<string, number> }) {
  return (
    <>
      <div className="flex items-center pr-1 font-medium text-ink-500">{SEVERITY_META[lik].label}</div>
      {SEV.map((imp) => {
        const count = heat[`${lik}:${imp}`] ?? 0;
        const intensity = severityScore(lik) * severityScore(imp);
        const bg = intensity >= 6 ? "bg-red-500 text-white" : intensity >= 3 ? "bg-amber-400 text-amber-950" : "bg-emerald-300 text-emerald-950";
        return <div key={imp} className={`flex h-12 items-center justify-center rounded font-semibold ${count ? bg : "bg-ink-100 text-ink-300"}`}>{count || ""}</div>;
      })}
    </>
  );
}
