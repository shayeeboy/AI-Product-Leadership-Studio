import { useMemo, useState } from "react";
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { Card, PageHeader, SectionTitle, KpiTile } from "@/shared/components/ui";
import { usd, pct } from "@/lib/format";

interface Inputs {
  investment: number;
  engCostMonthly: number;
  licensingMonthly: number;
  infraMonthly: number;
  peakBenefitMonthly: number;
  rampMonths: number;
}

const SCENARIOS: Record<string, Partial<Inputs> & { adoptionMult: number }> = {
  Base: { adoptionMult: 1 },
  Upside: { adoptionMult: 1.4 },
  Downside: { adoptionMult: 0.6 },
};

function simulate(inp: Inputs, adoptionMult: number) {
  const months = 24;
  const monthlyCost = inp.engCostMonthly + inp.licensingMonthly + inp.infraMonthly;
  let cumulative = -inp.investment;
  let payback: number | null = null;
  const series: { month: number; benefit: number; cost: number; cumulative: number }[] = [];
  let totalBenefit = 0;
  for (let m = 1; m <= months; m++) {
    const ramp = Math.min(1, m / inp.rampMonths);
    const benefit = inp.peakBenefitMonthly * ramp * adoptionMult;
    totalBenefit += benefit;
    cumulative += benefit - monthlyCost;
    if (payback === null && cumulative >= 0) payback = m;
    series.push({ month: m, benefit: Math.round(benefit), cost: Math.round(monthlyCost), cumulative: Math.round(cumulative) });
  }
  const totalCost = inp.investment + monthlyCost * months;
  const roi = Math.round(((totalBenefit - totalCost) / totalCost) * 100);
  const npv = Math.round(series.reduce((acc, s, i) => acc + (s.benefit - s.cost) / Math.pow(1.008, i + 1), -inp.investment));
  return { series, roi, payback, npv, netSavings: Math.round(totalBenefit - monthlyCost * months) };
}

export function RoiSimulator() {
  const [inp, setInp] = useState<Inputs>({
    investment: 120000, engCostMonthly: 18000, licensingMonthly: 4000, infraMonthly: 3000, peakBenefitMonthly: 42000, rampMonths: 8,
  });
  const [scenario, setScenario] = useState<keyof typeof SCENARIOS>("Base");

  const result = useMemo(() => simulate(inp, SCENARIOS[scenario].adoptionMult), [inp, scenario]);
  const compare = useMemo(
    () => Object.entries(SCENARIOS).map(([name, s]) => ({ name, ...simulate(inp, s.adoptionMult) })),
    [inp],
  );

  const fields: { key: keyof Inputs; label: string; min: number; max: number; step: number; money?: boolean }[] = [
    { key: "investment", label: "Upfront investment", min: 20000, max: 400000, step: 10000, money: true },
    { key: "engCostMonthly", label: "Engineering / month", min: 2000, max: 60000, step: 1000, money: true },
    { key: "licensingMonthly", label: "Licensing / month", min: 0, max: 30000, step: 500, money: true },
    { key: "infraMonthly", label: "Infra / month", min: 0, max: 30000, step: 500, money: true },
    { key: "peakBenefitMonthly", label: "Peak benefit / month", min: 5000, max: 150000, step: 5000, money: true },
    { key: "rampMonths", label: "Adoption ramp (months)", min: 1, max: 18, step: 1 },
  ];

  return (
    <div>
      <PageHeader
        title="AI ROI Simulator"
        subtitle="Model ROI, payback and NPV against an adoption ramp. Compare Base / Upside / Downside side by side."
        actions={
          <div className="flex gap-1.5">
            {Object.keys(SCENARIOS).map((s) => (
              <button key={s} onClick={() => setScenario(s as keyof typeof SCENARIOS)} className={`rounded-full px-3 py-1 text-xs font-medium ${scenario === s ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"}`}>{s}</button>
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiTile label="ROI (24mo)" value={pct(result.roi)} intent={result.roi >= 0 ? "up" : "down"} />
            <KpiTile label="Payback" value={result.payback ? `${result.payback} mo` : ">24 mo"} intent={result.payback && result.payback <= 12 ? "up" : "down"} />
            <KpiTile label="NPV" value={usd(result.npv, true)} intent={result.npv >= 0 ? "up" : "down"} />
            <KpiTile label="Net savings" value={usd(result.netSavings, true)} />
          </div>

          <Card className="p-4">
            <SectionTitle hint={`${scenario} scenario`}>Cumulative cashflow</SectionTitle>
            <div className="h-56">
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

          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-xs uppercase text-ink-500"><tr><th className="px-5 py-2">Scenario</th><th className="px-3 py-2 text-right">ROI</th><th className="px-3 py-2 text-right">Payback</th><th className="px-3 py-2 text-right">NPV</th></tr></thead>
              <tbody className="divide-y divide-ink-100">
                {compare.map((c) => (
                  <tr key={c.name} className={c.name === scenario ? "bg-brand-50" : ""}>
                    <td className="px-5 py-2 font-medium text-ink-800">{c.name}</td>
                    <td className="px-3 py-2 text-right">{pct(c.roi)}</td>
                    <td className="px-3 py-2 text-right">{c.payback ? `${c.payback} mo` : ">24 mo"}</td>
                    <td className="px-3 py-2 text-right">{usd(c.npv, true)}</td>
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
