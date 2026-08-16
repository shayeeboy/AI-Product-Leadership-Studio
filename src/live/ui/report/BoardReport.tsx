import { usd, pct } from "@/lib/format";
import { executiveSummaryText } from "../../report/rollups";
import type { ReportData } from "../../report/useReportData";

const NR = "Not reported";

// A fixed-width (A4-proportioned) board report rendered from live data. Pure
// HTML/CSS with explicit colors (no Recharts, no theme tokens) so html-to-image
// captures it crisply and identically regardless of the viewer's theme (R7).
const W = 794; // A4 width at ~96dpi

function Kpi({ label, value, foot }: { label: string; value: string | number; foot?: string }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", background: "#fff" }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.4, color: "#64748b" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{value}</div>
      {foot && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{foot}</div>}
    </div>
  );
}

export function BoardReport({ data }: { data: ReportData }) {
  const { roll, topOpps, products, generatedAt, preparedBy } = data;
  const maxOpp = Math.max(100, ...topOpps.map((o) => o.score));

  return (
    <div style={{ width: W, background: "#fff", color: "#0f172a", fontFamily: "Inter, system-ui, Arial, sans-serif", padding: 32, boxSizing: "border-box" }}>
      {/* Cover band */}
      <div style={{ background: "#1d3faf", color: "#fff", borderRadius: 10, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.8, letterSpacing: 1, textTransform: "uppercase" }}>AI Product &amp; Leadership Studio</div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>Executive Board Report</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11, lineHeight: 1.5 }}>
          <div>{generatedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
          <div style={{ opacity: 0.85 }}>Prepared by {preparedBy}</div>
        </div>
      </div>

      {/* KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 20 }}>
        <Kpi label="Registered products" value={roll.registered} />
        <Kpi label="Live sources" value={`${roll.reachable} / ${roll.registered}`} foot="reachable now" />
        <Kpi label="Products at risk" value={roll.atRisk} foot="open risk / blocked" />
        <Kpi label="Open risks" value={roll.openRisks} />
        <Kpi label="Pending governance" value={roll.pendingGovernance} foot="reviews + stages" />
        <Kpi label="Opportunities scored" value={roll.opportunities} />
        <Kpi label="Evaluation pass rate" value={roll.evalPass != null ? pct(roll.evalPass) : NR} foot={roll.evalPass != null ? "live" : "no source"} />
        <Kpi label="Monthly AI spend" value={roll.spend > 0 ? usd(roll.spend, true) : NR} />
        <Kpi label="Blended ROI target" value={roll.blendedRoi != null ? pct(roll.blendedRoi) : NR} />
        <Kpi label="Live inference cost" value={roll.liveCost != null ? usd(roll.liveCost) : NR} foot={roll.liveCost != null ? "cost/query × volume" : "no source"} />
        <Kpi label="Avg latency p95" value={roll.avgP95 != null ? `${(roll.avgP95 / 1000).toFixed(1)}s` : NR} foot={roll.avgP95 != null ? "live reliability" : "no source"} />
      </div>

      {/* Executive summary */}
      <div style={{ marginTop: 22, borderLeft: "4px solid #1d3faf", padding: "4px 0 4px 14px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#334155", marginBottom: 6 }}>Executive summary</div>
        <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "#334155", margin: 0 }}>{executiveSummaryText(roll)}</p>
      </div>

      {/* Top opportunities */}
      <div style={{ marginTop: 22 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#334155", marginBottom: 8 }}>Top opportunity scores</div>
        {topOpps.length === 0 ? (
          <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>No opportunities scored yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {topOpps.map((o) => (
              <div key={o.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 150, fontSize: 11.5, color: "#334155", textAlign: "right", flexShrink: 0 }}>{o.name}</div>
                <div style={{ flex: 1, background: "#eef2f7", borderRadius: 4, height: 16 }}>
                  <div style={{ width: `${(o.score / maxOpp) * 100}%`, height: 16, borderRadius: 4, background: o.score >= 75 ? "#16a34a" : o.score >= 60 ? "#3b6fed" : "#94a3b8" }} />
                </div>
                <div style={{ width: 28, fontSize: 11.5, fontWeight: 700, color: "#0f172a" }}>{o.score}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Registered products table */}
      <div style={{ marginTop: 22 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#334155", marginBottom: 8 }}>Registered products</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
          <thead>
            <tr style={{ background: "#f1f5f9", color: "#64748b", textAlign: "left" }}>
              <th style={{ padding: "6px 8px" }}>Product</th>
              <th style={{ padding: "6px 8px" }}>Source</th>
              <th style={{ padding: "6px 8px" }}>Business unit</th>
              <th style={{ padding: "6px 8px", textAlign: "right" }}>p95</th>
              <th style={{ padding: "6px 8px", textAlign: "right" }}>Open risks</th>
              <th style={{ padding: "6px 8px", textAlign: "right" }}>Monthly</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #eef2f7" }}>
                <td style={{ padding: "6px 8px", fontWeight: 600, color: "#0f172a" }}>{p.name}</td>
                <td style={{ padding: "6px 8px", color: p.sourceStatus === "live" ? "#16a34a" : p.sourceStatus === "checking" ? "#94a3b8" : "#ef4444" }}>
                  {p.sourceStatus === "live" ? "Live" : p.sourceStatus === "checking" ? "Checking…" : "Down"}
                </td>
                <td style={{ padding: "6px 8px", color: "#475569" }}>{p.businessUnit ?? "—"}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#334155" }}>{p.p95Ms != null ? `${(p.p95Ms / 1000).toFixed(1)}s` : "—"}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#334155" }}>{p.openRisks || "—"}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#334155" }}>{p.monthlySpend ? usd(p.monthlySpend, true) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer / provenance */}
      <div style={{ marginTop: 24, paddingTop: 10, borderTop: "1px solid #e2e8f0", fontSize: 9.5, color: "#94a3b8" }}>
        Computed live from the registry, product snapshots and persisted governance/decision data. Figures without a real source read “Not reported” — never seeded. Generated {generatedAt.toLocaleString("en-US")}.
      </div>
    </div>
  );
}
