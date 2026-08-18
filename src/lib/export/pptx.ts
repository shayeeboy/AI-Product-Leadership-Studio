import { usd, pct } from "@/lib/format";
import { executiveSummaryText } from "@/live/report/rollups";
import type { ReportData } from "@/live/report/useReportData";

// Client-side PPTX export (R7 follow-on). pptxgenjs is imported dynamically so it
// stays in its own lazy chunk (like jsPDF) — nothing touches the main bundle
// until someone exports a deck. Builds slides from the report data directly (no
// DOM capture), so the deck is fully editable text/tables in PowerPoint.

const NR = "Not reported";
const BRAND = "1D3FAF";
const INK = "0F172A";
const MUTE = "64748B";
const latency = (ms: number | null) => (ms == null ? NR : `${(ms / 1000).toFixed(1)}s`);

export async function exportReportToPptx(data: ReportData, filename: string): Promise<void> {
  const { default: PptxGen } = await import("pptxgenjs");
  const pptx = new PptxGen(); // default 16:9 layout = 10 x 5.625 in
  pptx.author = "AI Product & Leadership Studio";
  pptx.title = "Executive Board Report";

  const { roll, topOpps, products, generatedAt, preparedBy } = data;
  const dateStr = generatedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const rect = pptx.ShapeType.rect;
  const roundRect = pptx.ShapeType.roundRect;
  // pptxgenjs table cells must be objects (not bare strings).
  const cell = (text: string, options: Record<string, unknown> = {}) => ({ text, options });
  const th = (text: string, align: "left" | "right" = "left") => cell(text, { bold: true, color: "FFFFFF", fill: { color: BRAND }, align });

  // 1) Cover
  const cover = pptx.addSlide();
  cover.background = { color: "FFFFFF" };
  cover.addShape(rect, { x: 0, y: 0, w: 10, h: 2.6, fill: { color: BRAND } });
  cover.addText("AI PRODUCT & LEADERSHIP STUDIO", { x: 0.6, y: 0.7, w: 8.8, h: 0.4, color: "FFFFFF", fontSize: 12, charSpacing: 2 });
  cover.addText("Executive Board Report", { x: 0.6, y: 1.1, w: 8.8, h: 0.8, color: "FFFFFF", fontSize: 32, bold: true });
  cover.addText(
    [
      { text: dateStr, options: { breakLine: true } },
      { text: `Prepared by ${preparedBy}`, options: { color: MUTE } },
    ],
    { x: 0.6, y: 3.0, w: 8.8, h: 0.8, fontSize: 14, color: INK },
  );

  // 2) KPIs
  const kpiSlide = pptx.addSlide();
  kpiSlide.addText("Portfolio at a glance", { x: 0.5, y: 0.35, w: 9, h: 0.5, fontSize: 22, bold: true, color: INK });
  const kpis: [string, string][] = [
    ["Registered products", String(roll.registered)],
    ["Live sources", `${roll.reachable} / ${roll.registered}`],
    ["Products at risk", String(roll.atRisk)],
    ["Open risks", String(roll.openRisks)],
    ["Pending governance", String(roll.pendingGovernance)],
    ["Opportunities scored", String(roll.opportunities)],
    ["Evaluation pass rate", roll.evalPass != null ? pct(roll.evalPass) : NR],
    ["Monthly AI spend", roll.spend > 0 ? usd(roll.spend, true) : NR],
    ["Blended ROI target", roll.blendedRoi != null ? pct(roll.blendedRoi) : NR],
    ["Live inference cost", roll.liveCost != null ? usd(roll.liveCost) : NR],
    ["Avg latency p95", latency(roll.avgP95)],
  ];
  const cols = 4;
  const tileW = 2.2;
  const tileH = 1.05;
  const gapX = 0.13;
  const gapY = 0.18;
  const startX = 0.5;
  const startY = 1.05;
  kpis.forEach(([label, value], i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = startX + c * (tileW + gapX);
    const y = startY + r * (tileH + gapY);
    kpiSlide.addShape(roundRect, { x, y, w: tileW, h: tileH, fill: { color: "F8FAFC" }, line: { color: "E2E8F0", width: 1 }, rectRadius: 0.06 });
    kpiSlide.addText(label.toUpperCase(), { x: x + 0.12, y: y + 0.1, w: tileW - 0.24, h: 0.3, fontSize: 8, color: MUTE });
    kpiSlide.addText(value, { x: x + 0.12, y: y + 0.4, w: tileW - 0.24, h: 0.5, fontSize: 18, bold: true, color: INK });
  });

  // 3) Executive summary
  const sum = pptx.addSlide();
  sum.addText("Executive summary", { x: 0.5, y: 0.35, w: 9, h: 0.5, fontSize: 22, bold: true, color: INK });
  sum.addShape(rect, { x: 0.5, y: 1.0, w: 0.06, h: 3.4, fill: { color: BRAND } });
  sum.addText(executiveSummaryText(roll), { x: 0.75, y: 1.0, w: 8.75, h: 3.4, fontSize: 15, color: "334155", lineSpacingMultiple: 1.3, valign: "top" });

  // 4) Top opportunities
  if (topOpps.length) {
    const opp = pptx.addSlide();
    opp.addText("Top opportunity scores", { x: 0.5, y: 0.35, w: 9, h: 0.5, fontSize: 22, bold: true, color: INK });
    const rows = [[th("Opportunity"), th("Score", "right")], ...topOpps.map((o) => [cell(o.name), cell(String(o.score), { align: "right" })])];
    opp.addTable(rows as Parameters<typeof opp.addTable>[0], { x: 0.5, y: 1.1, w: 9, colW: [7, 2], fontSize: 13, border: { type: "solid", color: "E2E8F0", pt: 1 }, rowH: 0.4, valign: "middle" });
  }

  // 5) Registered products
  const prod = pptx.addSlide();
  prod.addText("Registered products", { x: 0.5, y: 0.35, w: 9, h: 0.5, fontSize: 22, bold: true, color: INK });
  const head = [th("Product"), th("Source"), th("Business unit"), th("p95", "right"), th("Open risks", "right"), th("Monthly", "right")];
  const body = products.map((p) => [
    cell(p.name),
    cell(p.sourceStatus === "live" ? "Live" : p.sourceStatus === "checking" ? "Checking" : "Down"),
    cell(p.businessUnit ?? "—"),
    cell(p.p95Ms != null ? latency(p.p95Ms) : "—", { align: "right" }),
    cell(String(p.openRisks || "—"), { align: "right" }),
    cell(p.monthlySpend ? usd(p.monthlySpend, true) : "—", { align: "right" }),
  ]);
  prod.addTable([head, ...body] as Parameters<typeof prod.addTable>[0], { x: 0.5, y: 1.1, w: 9, colW: [2.7, 1.1, 2.2, 1, 1.2, 0.8], fontSize: 11, border: { type: "solid", color: "E2E8F0", pt: 1 }, rowH: 0.34, valign: "middle" });
  prod.addText("Computed live from the registry, product snapshots and persisted governance data; figures without a real source read “Not reported.”", { x: 0.5, y: 5.15, w: 9, h: 0.3, fontSize: 9, color: MUTE });

  await pptx.writeFile({ fileName: filename });
}
