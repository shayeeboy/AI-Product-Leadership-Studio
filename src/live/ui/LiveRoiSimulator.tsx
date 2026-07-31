import { useMemo, useState } from "react";
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { Trash2 } from "lucide-react";
import { useLiveStore } from "../store";
import { Card, PageHeader, SectionTitle, KpiTile, EmptyState } from "@/shared/components/ui";
import { usd, pct, shortDate } from "@/lib/format";

interface Inputs {
  investment: number; engCostMonthly: number; licensingMonthly: number; infraMonthly: number; peakBenefitMonthly: number; rampMonths: number;
}
const ADOPTION: Record<string, number> = { Base: 1, Upside: 1.4, Downside: 0.6 };

function simulate(inp: Inputs, adoptionMult: number) {
  const months = 24;
  const monthlyCost = inp.engCostMonthly + inp.licensingMonthly + inp.infraMonthly;
  let cumulative = -inp.investment;
  let payback: number | null = null;
  const series: { month: number; benefit: number; cumulative: number }[] = [];
  let totalBenefit = 0;
  for (let m = 1; m <= months; m++) {
    const benefit = inp.peakBenefitMonthly * Math.min(1, m / inp.rampMonths) * adoptionMult;
    totalBenefit += benefit;
    cumulative += benefit - monthlyCost;
    if (payback === null && cumulative >= 0) payback = m;
    series.push({ month: m, benefit: Math.round(benefit), cumulative: Math.round(cumulative) });
  }
  const totalCost = inp.investment + monthlyCost * months;
  const roi = Math.round(((totalBenefit - totalCost) / totalCost) * 100);
  const npv = Math.round(series.reduce((acc, s, i) => acc + (s.benefit - monthlyCost) / Math.pow(1.008, i + 1), -inp.investment));
  return { series, roi, payback, npv };
}

export function LiveRoiSimulator() {
  const scenarios = useLiveStore((s) => s.entities.roi_scenario);
  const registrations = useLiveStore((s) => s.registrations);
  const saveEntity = useLiveStore((s) => s.saveEntity);
  const removeEntity = useLiveStore((s) => s.removeEntity);

  const [inp, setInp] = useState<Inputs>({ investment: 120000, engCostMonthly: 18000, licensingMonthly: 4000, infraMonthly: 3000, peakBenefitMonthly: 42000, rampMonths: 8 });
  const [scenario, setScenario] = useState<keyof typeof ADOPTION>("Base");
  const [name, setName] = useState("Base case");
  const [productId, setProductId] = useState("");
  const [saving, setSaving] = useState(false);

  const result = useMemo(() => simulate(inp, ADOPTION[scenario]), [inp, scenario]);

  const fields: { key: keyof Inputs; label: string; min: number; max: number; step: number; money?: boolean }[] = [
    { key: "investment", label: "Upfront investment", min: 20000, max: 400000, step: 10000, money: true },
    { key: "engCostMonthly", label: "Engineering / month", min: 2000, max: 60000, step: 1000, money: true },
    { key: "licensingMonthly", label: "Licensing / month", min: 0, max: 30000, step: 500, money: true },
    { key: "infraMonthly", label: "Infra / month", min: 0, max: 30000, step: 500, money: true },
    { key: "peakBenefitMonthly", label: "Peak benefit / month", min: 5000, max: 150000, step: 5000, money: true },
    { key: "rampMonths", label: "Adoption ramp (months)", min: 1, max: 18, step: 1 },
  ];

  async function save() {
    setSaving(true);
    try {
      await saveEntity("roi_scenario", { id: crypto.randomUUID(), productId: productId || null, data: { name: name.trim() || "Scenario", scenario, inputs: inp, roi: result.roi, payback: result.payback, npv: result.npv } });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="AI ROI Simulator"
        subtitle="Model ROI, payback and NPV against an adoption ramp; save named scenarios (persisted) to compare funding cases."
        actions={
          <div className="flex gap-1.5">
            {Object.keys(ADOPTION).map((s) => (
              <button key={s} onClick={() => setScenario(s as keyof typeof ADOPTION)} className={`rounded-full px-3 py-1 text-xs font-medium ${scenario === s ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"}`}>{s}</button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <SectionTitle>Inputs</SectionTitle>
          <div className="space-y-3">
            {fields.map((f) => (
              <div key={f.key}>
                <div className="mb-1 flex justify-between text-sm"><span className="font-medium text-ink-700">{f.label}</span><span className="text-ink-500">{f.money ? usd(inp[f.key], true) : inp[f.key]}</span></div>
                <input type="range" min={f.min} max={f.max} step={f.step} value={inp[f.key]} onChange={(e) => setInp((s) => ({ ...s, [f.key]: Number(e.target.value) }))} className="w-full accent-brand-500" />
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-3 gap-4">
            <KpiTile label={`ROI (24mo, ${scenario})`} value={pct(result.roi)} intent={result.roi >= 0 ? "up" : "down"} />
            <KpiTile label="Payback" value={result.payback ? `${result.payback} mo` : ">24 mo"} intent={result.payback && result.payback <= 12 ? "up" : "down"} />
            <KpiTile label="NPV" value={usd(result.npv, true)} intent={result.npv >= 0 ? "up" : "down"} />
          </div>
          <Card className="p-4">
            <SectionTitle hint={`${scenario} scenario`}>Cumulative cashflow</SectionTitle>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={result.series} margin={{ left: 4, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tickFormatter={(v) => usd(v, true)} tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Tooltip formatter={(v) => usd(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="benefit" fill="#c7d7fb" name="Monthly benefit" />
                  <Line type="monotone" dataKey="cumulative" stroke="#16a34a" strokeWidth={2} dot={false} name="Cumulative" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="flex-1 text-sm"><span className="mb-1 block font-medium text-ink-700">Scenario name</span><input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm" /></label>
              <label className="text-sm"><span className="mb-1 block font-medium text-ink-700">Product (optional)</span>
                <select value={productId} onChange={(e) => setProductId(e.target.value)} className="rounded-lg border border-ink-200 px-3 py-2 text-sm"><option value="">—</option>{registrations.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
              </label>
              <button onClick={save} disabled={saving} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">{saving ? "Saving…" : "Save scenario"}</button>
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-ink-200 px-5 py-3"><SectionTitle hint="persisted">Saved scenarios</SectionTitle></div>
        {scenarios.length === 0 ? (
          <div className="p-6"><EmptyState title="No saved scenarios" hint="Configure inputs and hit Save scenario — they persist and compare here." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-xs uppercase text-ink-500"><tr><th className="px-5 py-2.5">Scenario</th><th className="px-3 py-2.5">Case</th><th className="px-3 py-2.5 text-right">ROI</th><th className="px-3 py-2.5 text-right">Payback</th><th className="px-3 py-2.5 text-right">NPV</th><th className="px-3 py-2.5">Saved</th><th className="px-3 py-2.5"></th></tr></thead>
              <tbody className="divide-y divide-ink-100">
                {scenarios.map((s) => {
                  const d = s.data as { name?: string; scenario?: string; roi?: number; payback?: number | null; npv?: number };
                  return (
                    <tr key={s.id} className="hover:bg-ink-50">
                      <td className="px-5 py-2.5 font-medium text-ink-800">{d.name ?? "Scenario"}</td>
                      <td className="px-3 py-2.5 text-ink-600">{d.scenario ?? "—"}</td>
                      <td className="px-3 py-2.5 text-right">{d.roi != null ? pct(d.roi) : "—"}</td>
                      <td className="px-3 py-2.5 text-right">{d.payback ? `${d.payback} mo` : ">24 mo"}</td>
                      <td className="px-3 py-2.5 text-right">{d.npv != null ? usd(d.npv, true) : "—"}</td>
                      <td className="px-3 py-2.5 text-ink-400">{s.createdAt ? shortDate(s.createdAt) : "—"}</td>
                      <td className="px-3 py-2.5"><button onClick={() => removeEntity("roi_scenario", s.id)} className="text-ink-400 hover:text-red-600" title="Delete"><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
