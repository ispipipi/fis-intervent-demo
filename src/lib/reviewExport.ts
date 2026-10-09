import { ReviewReport } from "../types/domain";

type JsPdfInstance = InstanceType<(typeof import("jspdf"))["jsPDF"]>;
type Rgb = readonly [number, number, number];

const NAVY: Rgb = [28, 53, 91];
const TEAL: Rgb = [39, 133, 139];
const TEXT: Rgb = [42, 52, 68];
const MUTED: Rgb = [95, 111, 135];
const LINE: Rgb = [218, 228, 239];
const PALE_TEAL: Rgb = [239, 248, 248];
const PALE_BLUE: Rgb = [241, 246, 252];
const PALE_GREEN: Rgb = [232, 247, 238];
const PALE_AMBER: Rgb = [255, 247, 226];

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-");
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}

async function loadLogoDataUrl() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}fis-logo.jpeg`);
    if (!response.ok) return undefined;
    const blob = await response.blob();
    return await new Promise<string | undefined>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : undefined);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

function setColor(pdf: JsPdfInstance, color: Rgb) {
  pdf.setTextColor(color[0], color[1], color[2]);
}

function fillColor(pdf: JsPdfInstance, color: Rgb) {
  pdf.setFillColor(color[0], color[1], color[2]);
}

function drawColor(pdf: JsPdfInstance, color: Rgb) {
  pdf.setDrawColor(color[0], color[1], color[2]);
}

function wrappedLines(pdf: JsPdfInstance, text: string, width: number) {
  return pdf.splitTextToSize(text || "-", width) as string[];
}

function drawFooter(pdf: JsPdfInstance, caseId: string) {
  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    drawColor(pdf, LINE);
    pdf.setLineWidth(0.25);
    pdf.line(18, 279, 192, 279);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    setColor(pdf, MUTED);
    pdf.text(`FIS Chile · Intervent Preclaim · ${caseId}`, 18, 286);
    pdf.text(`Página ${page} de ${pageCount}`, 192, 286, { align: "right" });
  }
}

function drawHeader(pdf: JsPdfInstance, logoDataUrl?: string) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  fillColor(pdf, NAVY);
  pdf.rect(0, 0, pageWidth, 32, "F");
  if (logoDataUrl) {
    pdf.addImage(logoDataUrl, "JPEG", 17, 4, 24, 24, undefined, "FAST");
  } else {
    fillColor(pdf, [255, 255, 255]);
    pdf.roundedRect(18, 7, 18, 18, 3, 3, "F");
    setColor(pdf, NAVY);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text("FIS", 21.2, 18.5);
  }
  setColor(pdf, [255, 255, 255]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("FRUIT INSURANCE SERVICES", 47, 13);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.text("CHILE · INFORME DE REVISIÓN PRECLAIM", 47, 21);
  fillColor(pdf, TEAL);
  pdf.rect(176, 0, 34, 32, "F");
  setColor(pdf, [255, 255, 255]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("DOCUMENTO", 181, 14);
  pdf.text("EJECUTIVO", 181, 21);
}

function ensureSpace(pdf: JsPdfInstance, y: number, height: number, logoDataUrl?: string) {
  if (y + height <= 268) return y;
  pdf.addPage();
  drawHeader(pdf, logoDataUrl);
  return 45;
}

function drawSectionHeading(pdf: JsPdfInstance, title: string, y: number, logoDataUrl?: string) {
  const nextY = ensureSpace(pdf, y, 13, logoDataUrl);
  setColor(pdf, TEAL);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text(title.toUpperCase(), 18, nextY);
  drawColor(pdf, TEAL);
  pdf.setLineWidth(0.65);
  pdf.line(18, nextY + 4, 192, nextY + 4);
  return nextY + 12;
}

function drawParagraph(pdf: JsPdfInstance, text: string, y: number, width = 174, logoDataUrl?: string) {
  const lines = wrappedLines(pdf, text, width);
  const nextY = ensureSpace(pdf, y, lines.length * 4.7 + 4, logoDataUrl);
  setColor(pdf, TEXT);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.5);
  pdf.text(lines, 18, nextY, { lineHeightFactor: 1.35 });
  return nextY + lines.length * 4.7 + 5;
}

function drawBulletList(pdf: JsPdfInstance, items: string[], y: number, width = 166, logoDataUrl?: string) {
  let currentY = y;
  for (const item of items.length > 0 ? items : ["Ninguno"]) {
    const lines = wrappedLines(pdf, item, width);
    currentY = ensureSpace(pdf, currentY, lines.length * 4.4 + 2, logoDataUrl);
    fillColor(pdf, TEAL);
    pdf.circle(20, currentY - 1.2, 0.9, "F");
    setColor(pdf, TEXT);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(lines, 24, currentY, { lineHeightFactor: 1.3 });
    currentY += lines.length * 4.4 + 2;
  }
  return currentY + 2;
}

function drawCard(pdf: JsPdfInstance, x: number, y: number, width: number, title: string, body: string, background = PALE_BLUE) {
  const lines = body ? wrappedLines(pdf, body, width - 12) : [];
  const height = body ? Math.max(25, lines.length * 4.6 + 16) : 23;
  fillColor(pdf, background);
  drawColor(pdf, LINE);
  pdf.roundedRect(x, y, width, height, 2.5, 2.5, "FD");
  setColor(pdf, NAVY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text(title, x + 6, y + 9);
  if (lines.length > 0) {
    setColor(pdf, TEXT);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.7);
    pdf.text(lines, x + 6, y + 16, { lineHeightFactor: 1.3 });
  }
  return height;
}

function drawListCard(pdf: JsPdfInstance, x: number, y: number, width: number, title: string, items: string[], background: Rgb) {
  const list = items.length > 0 ? items : ["Ninguno"];
  const rows = list.map((item) => wrappedLines(pdf, item, width - 18));
  const height = Math.max(31, 21 + rows.reduce((total, lines) => total + lines.length * 3.8 + 3, 0));
  fillColor(pdf, background);
  drawColor(pdf, LINE);
  pdf.roundedRect(x, y, width, height, 2.5, 2.5, "FD");
  setColor(pdf, NAVY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text(title, x + 6, y + 10);
  let currentY = y + 19;
  rows.forEach((lines) => {
    setColor(pdf, background === PALE_AMBER ? [169, 111, 0] : TEAL);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.8);
    pdf.text(`• ${lines[0]}`, x + 6, currentY);
    for (const line of lines.slice(1)) {
      currentY += 3.8;
      pdf.text(line, x + 10, currentY);
    }
    currentY += 3.8;
  });
  return height;
}

export async function downloadReviewReportPdf(fileName: string, report: ReviewReport) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const logoDataUrl = await loadLogoDataUrl();
  drawHeader(pdf, logoDataUrl);

  let y = 49;
  setColor(pdf, TEAL);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("INFORME DE REVISIÓN PRECLAIM", 18, y);
  y += 10;
  setColor(pdf, NAVY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(19);
  pdf.text(report.caseId, 18, y);
  y += 8;
  setColor(pdf, MUTED);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("Documento de control previo al traspaso del expediente", 18, y);
  y += 10;

  fillColor(pdf, PALE_BLUE);
  drawColor(pdf, LINE);
  pdf.roundedRect(18, y, 174, 24, 3, 3, "FD");
  const meta = [
    ["DESTINO PROPUESTO", report.destination],
    ["ESTADO", report.status],
    ["GENERADO POR", report.generatedBy],
    ["FECHA", formatDate(report.generatedAt)]
  ];
  meta.forEach(([label, value], index) => {
    const x = 24 + index * 42;
    setColor(pdf, MUTED);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.7);
    pdf.text(label, x, y + 8);
    setColor(pdf, index === 1 && report.ready ? TEAL : TEXT);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(index === 3 ? 7.2 : 8.3);
    pdf.text(wrappedLines(pdf, value, 34), x, y + 15, { lineHeightFactor: 1.2 });
  });
  y += 36;

  y = drawSectionHeading(pdf, "Resumen ejecutivo", y, logoDataUrl);
  fillColor(pdf, PALE_TEAL);
  drawColor(pdf, [190, 222, 222]);
  const summaryLines = wrappedLines(pdf, report.executiveSummary, 162);
  const summaryHeight = Math.max(30, summaryLines.length * 4.8 + 14);
  pdf.roundedRect(18, y, 174, summaryHeight, 3, 3, "FD");
  setColor(pdf, TEXT);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(summaryLines, 24, y + 11, { lineHeightFactor: 1.35 });
  y += summaryHeight + 10;

  y = drawSectionHeading(pdf, "Causa y mérito preliminar", y, logoDataUrl);
  const causeText = `${report.recommendedCause || "Pendiente de confirmación humana."}${report.causeSources.length > 0 ? ` Sustento: ${report.causeSources.join(", ")}.` : ""}`;
  const causeHeight = drawCard(pdf, 18, y, 116, "Causa propuesta", causeText, PALE_TEAL);
  const meritHeight = drawCard(pdf, 140, y, 52, "Mérito", report.preliminaryMerit || "Pendiente", report.preliminaryMerit === "Alto" ? PALE_GREEN : PALE_AMBER);
  y += Math.max(causeHeight, meritHeight) + 10;

  y = drawSectionHeading(pdf, "Cálculo seleccionado", y, logoDataUrl);
  const calculation = report.selectedCalculation
    ? `${report.selectedCalculation.method}. ${report.selectedCalculation.amount !== undefined ? `Monto final: ${report.selectedCalculation.currency || "USD"} ${report.selectedCalculation.amount.toLocaleString("es-CL")}.` : "Monto pendiente."} ${report.selectedCalculation.justification ? `Justificación: ${report.selectedCalculation.justification}` : ""}`
    : "No hay cálculo seleccionado.";
  y = drawParagraph(pdf, calculation, y, 174, logoDataUrl) + 3;

  y = drawSectionHeading(pdf, "Checklist de cierre local", y, logoDataUrl);
  const gates = report.closureChecklist || [];
  if (gates.length === 0) {
    y = drawParagraph(pdf, "No hay checklist registrado.", y, 174, logoDataUrl);
  } else {
    for (const gate of gates) {
      const lines = wrappedLines(pdf, `${gate.label}: ${gate.detail}`, 146);
      const rowHeight = Math.max(13, lines.length * 4.1 + 7);
      y = ensureSpace(pdf, y, rowHeight, logoDataUrl);
      fillColor(pdf, gate.status === "Cumplido" ? PALE_GREEN : PALE_AMBER);
      drawColor(pdf, LINE);
      pdf.roundedRect(18, y, 174, rowHeight, 2, 2, "FD");
      setColor(pdf, gate.status === "Cumplido" ? TEAL : [169, 111, 0]);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text(gate.status === "Cumplido" ? "OK" : "PENDIENTE", 24, y + 8);
      setColor(pdf, TEXT);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.text(lines, 46, y + 8, { lineHeightFactor: 1.25 });
      y += rowHeight + 3;
    }
  }

  if (y > 165) {
    pdf.addPage();
    drawHeader(pdf, logoDataUrl);
    y = 45;
  }
  y = drawSectionHeading(pdf, "Documentación y siguientes acciones", y + 3, logoDataUrl);
  const docsStart = y;
  const availableHeight = 21 + (report.availableDocuments.length > 0 ? report.availableDocuments : ["Ninguno"])
    .map((item) => wrappedLines(pdf, item, 66).length * 3.8 + 3).reduce((total, value) => total + value, 0);
  const pendingHeight = 21 + (report.missingDocuments.length > 0 ? report.missingDocuments : ["Ninguno"])
    .map((item) => wrappedLines(pdf, item, 66).length * 3.8 + 3).reduce((total, value) => total + value, 0);
  const listHeight = Math.max(31, availableHeight, pendingHeight);
  y = ensureSpace(pdf, docsStart, listHeight + 8, logoDataUrl);
  drawListCard(pdf, 18, y, 84, "Documentos disponibles", report.availableDocuments, PALE_BLUE);
  drawListCard(pdf, 108, y, 84, "Documentos pendientes", report.missingDocuments, PALE_AMBER);
  y += listHeight + 8;
  y = drawSectionHeading(pdf, "Acciones pendientes", y, logoDataUrl);
  drawBulletList(pdf, report.pendingActions, y, 166, logoDataUrl);

  drawFooter(pdf, report.caseId);
  pdf.save(safeFileName(fileName));
}
