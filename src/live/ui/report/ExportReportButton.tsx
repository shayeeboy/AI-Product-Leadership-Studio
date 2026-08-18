import { useRef, useState } from "react";
import { FileDown, Presentation } from "lucide-react";
import { useReportData } from "../../report/useReportData";
import { BoardReport } from "./BoardReport";

// Board-report export for the executive views (R7). "Export PDF" captures the
// off-screen BoardReport via html-to-image → jsPDF; "Export deck" builds an
// editable PPTX from the same data. Both exporters are lazily imported, so
// jsPDF / html-to-image / pptxgenjs never touch the main bundle until used.
export function ExportReportButton() {
  const data = useReportData();
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"pdf" | "pptx" | null>(null);
  const stamp = new Date().toISOString().slice(0, 10);

  async function exportPdf() {
    if (!ref.current || busy) return;
    setBusy("pdf");
    try {
      const { exportNodeToPdf } = await import("@/lib/export/pdf");
      await exportNodeToPdf(ref.current, `AI-Portfolio-Board-Report-${stamp}.pdf`);
    } catch (e) {
      console.error("PDF export failed", e);
    } finally {
      setBusy(null);
    }
  }

  async function exportPptx() {
    if (busy) return;
    setBusy("pptx");
    try {
      const { exportReportToPptx } = await import("@/lib/export/pptx");
      await exportReportToPptx(data, `AI-Portfolio-Board-Deck-${stamp}.pptx`);
    } catch (e) {
      console.error("PPTX export failed", e);
    } finally {
      setBusy(null);
    }
  }

  const btn = "inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-60";

  return (
    <div className="flex items-center gap-2">
      <button onClick={exportPdf} disabled={!!busy} title="Download a board-ready PDF of the portfolio" className={btn}>
        <FileDown className="h-4 w-4" />
        {busy === "pdf" ? "Preparing…" : "Export PDF"}
      </button>
      <button onClick={exportPptx} disabled={!!busy} title="Download an editable PowerPoint deck of the portfolio" className={btn}>
        <Presentation className="h-4 w-4" />
        {busy === "pptx" ? "Preparing…" : "Export deck"}
      </button>

      {/* Off-screen capture surface for the PDF — rendered (not display:none) so
          it has layout for html-to-image, positioned far off-canvas and inert. */}
      <div aria-hidden className="pointer-events-none fixed left-[-99999px] top-0">
        <div ref={ref}>
          <BoardReport data={data} />
        </div>
      </div>
    </div>
  );
}
