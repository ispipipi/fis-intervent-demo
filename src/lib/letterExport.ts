type LetterExportTemplate = {
  logoText?: string;
  headerText?: string;
  footerText?: string;
};

function normalizeExportText(text: string) {
  return text.replace(/[➢•]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
}

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-");
}

function downloadBlob(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

type JsPdfInstance = InstanceType<(typeof import("jspdf"))["jsPDF"]>;

function addPdfFooter(pdf: JsPdfInstance, footerText: string) {
  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(214, 223, 235);
    pdf.line(18, 279, 192, 279);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(95, 111, 135);
    pdf.text(footerText.slice(0, 110), 18, 286);
    pdf.text(`Página ${page} de ${pageCount}`, 192, 286, { align: "right" });
  }
}

export async function downloadLetterPdf(fileName: string, template: LetterExportTemplate, text: string) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  const normalizedText = normalizeExportText(text);

  pdf.setFillColor(28, 53, 91);
  pdf.rect(0, 0, pageWidth, 28, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text(template.logoText || "FRUIT INSURANCE SERVICES CHILE", margin, 12);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(template.headerText || "Documento oficial para revisión y aprobación", margin, 20);

  let y = 39;
  pdf.setTextColor(28, 53, 91);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text(template.headerText || "Documento contractual", margin, y);
  y += 10;
  pdf.setDrawColor(39, 133, 139);
  pdf.setLineWidth(0.8);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 9;

  pdf.setTextColor(42, 52, 68);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  for (const sourceLine of normalizedText.split(/\r?\n/)) {
    const line = sourceLine.trimEnd();
    if (!line.trim()) {
      y += 4;
      continue;
    }
    const wrapped = pdf.splitTextToSize(line, contentWidth) as string[];
    for (const wrappedLine of wrapped) {
      if (y > pageHeight - 25) {
        pdf.addPage();
        y = 22;
      }
      pdf.text(wrappedLine, margin, y);
      y += 5.5;
    }
  }

  addPdfFooter(pdf, template.footerText || "Intervent Preclaim · Documento generado para revisión humana");
  pdf.save(safeFileName(fileName));
}

export async function downloadLetterDocx(fileName: string, template: LetterExportTemplate, text: string) {
  const { AlignmentType, Document, Footer, Header, Packer, Paragraph, TextRun } = await import("docx");
  const normalizedText = normalizeExportText(text);
  const paragraphs = normalizedText.split(/\r?\n/).map((line) => new Paragraph({
    spacing: { after: line.trim() ? 120 : 60 },
    children: [new TextRun({
      text: line || " ",
      bold: Boolean(line.trim() && (line === line.toUpperCase() || line.endsWith(":"))),
      color: "2A3444",
      size: 21
    })]
  }));
  const document = new Document({
    sections: [{
      properties: {
        page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            border: { bottom: { color: "27858B", style: "single", size: 12, space: 6 } },
            children: [new TextRun({ text: template.logoText || "FRUIT INSURANCE SERVICES CHILE", bold: true, color: "1C355B", size: 24 })]
          }), new Paragraph({
            children: [new TextRun({ text: template.headerText || "Documento oficial para revisión y aprobación", color: "27858B", size: 18 })]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: template.footerText || "Intervent Preclaim · Documento generado para revisión humana", color: "5F6F87", size: 16 })]
          })]
        })
      },
      children: paragraphs
    }]
  });
  const blob = await Packer.toBlob(document);
  downloadBlob(safeFileName(fileName), blob);
}
