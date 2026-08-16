// Client-side PDF export (R7). jsPDF + html-to-image are imported dynamically so
// they land in their own lazy chunk (consistent with R3) — the main bundle pays
// nothing until the user actually clicks Export. Everything runs in the browser;
// no data leaves the page.

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/**
 * Capture a DOM node as a crisp PNG and lay it into a multi-page A4 PDF, then
 * trigger a download. The node should be a fixed-width report view (see
 * BoardReport) — a tall single image is sliced across pages.
 */
export async function exportNodeToPdf(node: HTMLElement, filename: string): Promise<void> {
  const [{ toPng }, jsPdfMod] = await Promise.all([import("html-to-image"), import("jspdf")]);
  const JsPDF = jsPdfMod.jsPDF;

  const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true });
  const img = await loadImage(dataUrl);

  const pdf = new JsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgH = (img.height * pageW) / img.width; // scale image to full page width

  let y = 0;
  let remaining = imgH;
  pdf.addImage(dataUrl, "PNG", 0, y, pageW, imgH);
  remaining -= pageH;
  while (remaining > 0) {
    y -= pageH; // shift the same tall image up by one page
    pdf.addPage();
    pdf.addImage(dataUrl, "PNG", 0, y, pageW, imgH);
    remaining -= pageH;
  }
  pdf.save(filename);
}
