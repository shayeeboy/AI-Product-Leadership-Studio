import { useRef, useState } from "react";
import { Download } from "lucide-react";
import { useReportData } from "../../report/useReportData";
import { BoardReport } from "./BoardReport";

// Drop-in "Export PDF" button for the executive views (R7). Renders the board
// report off-screen (so it has real layout for html-to-image) and, on click,
// lazily loads the PDF exporter — jsPDF + html-to-image never touch the main
// bundle until someone actually exports.
export function ExportReportButton() {
  const data = useReportData();
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  async function onExport() {
    if (!ref.current || busy) return;
    setBusy(true);
    try {
      const { exportNodeToPdf } = await import("@/lib/export/pdf");
      await exportNodeToPdf(ref.current, `AI-Portfolio-Board-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error("PDF export failed", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={onExport}
        disabled={busy}
        title="Download a board-ready PDF of the portfolio"
        className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-60"
      >
        <Download className="h-4 w-4" />
        {busy ? "Preparing…" : "Export PDF"}
      </button>

      {/* Off-screen capture surface — rendered (not display:none) so it has
          layout for html-to-image, positioned far off-canvas and inert. */}
      <div aria-hidden className="pointer-events-none fixed left-[-99999px] top-0">
        <div ref={ref}>
          <BoardReport data={data} />
        </div>
      </div>
    </>
  );
}
