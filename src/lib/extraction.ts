import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import * as XLSX from "xlsx";
import { classifyDocument } from "./business";
import { DocumentType, ExtractedCaseData, ExtractedLossProposal, UploadDraft } from "../types/domain";

const MAX_TEXT_LENGTH = 18_000;
const REFERENCE_PATTERN = /PRE-FIS-[A-Z0-9]+-\d{4}-\d{2}-\d{4}/gi;
const CLAIM_PATTERN = /CS-\d{4}-\d{3,}/i;

function clean(value?: string) {
  return value?.replace(/\s+/g, " ").replace(/[|]+/g, " ").trim() || undefined;
}

function firstMatch(text: string, pattern: RegExp) {
  return clean(text.match(pattern)?.[1]);
}

function findLabelValue(text: string, labels: string[]) {
  const lines = text.split(/\r?\n/).map((line) => clean(line)).filter(Boolean) as string[];
  const normalizedLabels = labels.map((label) => label.toLowerCase());
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lower = line.toLowerCase();
    const label = normalizedLabels.find((candidate) => lower.includes(candidate));
    if (!label) continue;
    const afterLabel = clean(line.slice(lower.indexOf(label) + label.length).replace(/^[\s,:;|\-]+/, ""));
    if (afterLabel) return afterLabel;
    const next = lines[index + 1];
    if (next && !normalizedLabels.some((candidate) => next.toLowerCase().includes(candidate))) return next;
  }
  return undefined;
}

function extractDate(value?: string) {
  const match = value?.match(/\d{4}-\d{2}-\d{2}|\d{2}[./-]\d{2}[./-]\d{4}/);
  if (!match) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(match[0])) return match[0];
  const [day, month, year] = match[0].split(/[./-]/);
  return `${year}-${month}-${day}`;
}

function extractAmount(value?: string) {
  const match = value?.match(/(?:USD|US\$|CLP)?\s*(-?\d(?:[\d.,]*\d)?)/i);
  if (!match) return undefined;
  const raw = match[1];
  const commaIndex = raw.lastIndexOf(",");
  const dotIndex = raw.lastIndexOf(".");
  let normalized = raw;
  if (commaIndex >= 0 && dotIndex >= 0) {
    normalized = commaIndex > dotIndex ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, "");
  } else if (commaIndex >= 0) {
    const decimals = raw.length - commaIndex - 1;
    normalized = decimals === 3 ? raw.replace(/,/g, "") : raw.replace(",", ".");
  } else if (dotIndex >= 0) {
    const decimals = raw.length - dotIndex - 1;
    normalized = decimals === 3 ? raw.replace(/\./g, "") : raw;
  }
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : undefined;
}

function extractAmountsAfterLabel(text: string, label: string) {
  const start = text.toLowerCase().indexOf(label.toLowerCase());
  if (start < 0) return [];
  const segment = text.slice(start + label.length, start + label.length + 180);
  return [...segment.matchAll(/(?:USD|US\$|CLP)?\s*-?\d(?:[\d.,]*\d)?/gi)]
    .map((match) => extractAmount(match[0]))
    .filter((value): value is number => value !== undefined);
}

function extractLossProposal(text: string, type: DocumentType, fileName: string): ExtractedLossProposal | undefined {
  const currency = (text.match(/\b(USD|CLP)\b/i)?.[1].toUpperCase() || "USD") as "USD" | "CLP";
  const method1 = extractAmountsAfterLabel(text, "Comparable shipment");
  const method2 = extractAmountsAfterLabel(text, "Market report");
  const method3 = extractAmountsAfterLabel(text, "Export invoice vs destination sale");
  const invoiceValue = extractAmount(findLabelValue(text, ["Subtotal", "Invoice total"]));
  const finalClaim = extractAmount(findLabelValue(text, ["Indicative final claim", "Indicative claim"]));
  const salvage = extractAmountsAfterLabel(text, "Additional salvage adjustment")[0];
  const proposal: ExtractedLossProposal = {
    moneda: currency,
    metodo1_liquidacionComparativa: method1[0],
    metodo1_liquidacionReal: method1[1],
    metodo2_valorReporteMercado: method2[0],
    metodo2_liquidacionReal: method2[1],
    metodo3_valorFactura: method3[0] ?? invoiceValue,
    metodo3_ventaBrutaDestino: method3[1],
    rubrosAdicionales: salvage !== undefined ? [{ concepto: "Salvataje", monto: -Math.abs(salvage) }] : [],
    montoFinalReclamo: finalClaim,
    fuentes: [fileName]
  };
  const hasValues = Object.entries(proposal).some(([key, value]) => key !== "moneda" && key !== "rubrosAdicionales" && key !== "fuentes" && value !== undefined);
  const supportedType = type === "Liquidación por contenedor" || type === "Liquidaciones comparativas o informe de mercado" || type === "Factura de exportación";
  return hasValues && supportedType ? proposal : undefined;
}

function extractVesselAndVoyage(value?: string) {
  if (!value) return {};
  const parts = value.split("/").map((part) => clean(part)).filter(Boolean);
  return { vessel: parts[0], voyage: parts[1] };
}

function extractPlaceAndDate(value?: string) {
  if (!value) return {};
  return { place: clean(value.split("/")[0]), date: extractDate(value) };
}

function detectCause(text: string, type: DocumentType) {
  const lower = text.toLowerCase();
  if (type === "Registros de termógrafos" || /temperatura|thermograph|cold chain|desviación térmica/.test(lower)) {
    return "Posible desviación térmica durante el transporte, sustentada en registros de termógrafos y referencias de temperatura del expediente.";
  }
  if (type === "Reportes de inspección" || type === "Informes de QC en origen y destino" || /manipulacion|golpe|damage|inspection|quality/.test(lower)) {
    return "Posible daño de condición o manipulación, sustentado en reportes de inspección y controles de calidad.";
  }
  return undefined;
}

export function extractCaseData(text: string, fileName: string, type: DocumentType): ExtractedCaseData {
  const normalizedText = text.slice(0, MAX_TEXT_LENGTH);
  const references = [...new Set([...(fileName.match(REFERENCE_PATTERN) || []), ...(normalizedText.match(REFERENCE_PATTERN) || [])])];
  const assured = findLabelValue(normalizedText, ["Asegurado", "Shipper", "Principal"]);
  const opponent = findLabelValue(normalizedText, ["Contraparte", "Transportista", "Carrier", "Opponent"]);
  const vesselAndVoyage = extractVesselAndVoyage(findLabelValue(normalizedText, ["Nave / viaje", "Vessel / voyage"]));
  const discharge = extractPlaceAndDate(findLabelValue(normalizedText, ["Descarga", "Port of discharge"]));
  const shipment = extractPlaceAndDate(findLabelValue(normalizedText, ["Embarque", "Port of loading", "Origen"]));
  const cargo = findLabelValue(normalizedText, ["Tipo de carga", "Cargo", "Description"]);
  const cause = findLabelValue(normalizedText, ["Causa reportada", "Cause", "Causa"]);
  const amount = findLabelValue(normalizedText, ["Monto preliminar", "Claim amount", "Declared claim exposure", "Indicative final claim", "Indicative claim"]);
  const surveyor = findLabelValue(normalizedText, ["Inspector", "Surveyor", "Officer"]);
  const reference = references[0];
  const csClaimNo = normalizedText.match(CLAIM_PATTERN)?.[0];
  const detectedCause = detectCause(normalizedText, type) || cause;
  const propuestaPerdida = extractLossProposal(normalizedText, type, fileName);
  const tipoCaso = detectedCause?.toLowerCase().includes("térmica") || type === "Registros de termógrafos"
    ? "Daño de temperatura"
    : detectedCause
      ? "Daño de condición o manipulación"
      : "Siniestro de carga marítima";
  const summaryParts = [
    assured && `El asegurado ${assured}`,
    opponent && `presenta antecedentes frente a ${opponent}`,
    cargo && `por carga identificada como ${cargo}`,
    vesselAndVoyage.vessel && `transportada en ${vesselAndVoyage.vessel}${vesselAndVoyage.voyage ? `, viaje ${vesselAndVoyage.voyage}` : ""}`,
    discharge.place && `con descarga en ${discharge.place}${discharge.date ? ` el ${discharge.date}` : ""}`
  ].filter(Boolean);
  return {
    referencia: reference,
    csClaimNo,
    assured,
    opponent,
    vessel: vesselAndVoyage.vessel,
    voyage: vesselAndVoyage.voyage,
    cargo,
    placeOfShipment: shipment.place,
    dateOfShipment: shipment.date,
    placeOfDischarge: discharge.place,
    dateOfDischarge: discharge.date,
    surveyor,
    claimAmount: extractAmount(amount) ?? propuestaPerdida?.montoFinalReclamo,
    tipoCaso,
    resumenCaso: summaryParts.length ? `${summaryParts.join(" ")}.` : undefined,
    causaPotencial: detectedCause,
    fuentesCausa: detectedCause ? [fileName] : [],
    referenciasDetectadas: references,
    propuestaPerdida
  };
}

type ReadContentResult = {
  text: string;
  ocrUsed: boolean;
};

async function ocrPdf(pdfDocument: Awaited<ReturnType<typeof pdfjsLib.getDocument>>["promise"] extends Promise<infer PdfDocument> ? PdfDocument : never) {
  if (typeof document === "undefined") return "";
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("spa+eng");
  const pages: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= Math.min(pdfDocument.numPages, 5); pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.6 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) continue;
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      const result = await worker.recognize(canvas);
      if (result.data.text) pages.push(result.data.text);
      canvas.width = 1;
      canvas.height = 1;
    }
  } finally {
    await worker.terminate();
  }
  return pages.join("\n").slice(0, MAX_TEXT_LENGTH);
}

async function readPdf(file: File): Promise<ReadContentResult> {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdfDocument = await pdfjsLib.getDocument({ data, disableWorker: true, useWorkerFetch: false, isEvalSupported: false } as never).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  const text = pages.join("\n").slice(0, MAX_TEXT_LENGTH);
  if (text.trim()) return { text, ocrUsed: false };
  let ocrText = "";
  try {
    ocrText = await ocrPdf(pdfDocument);
  } catch {
    return { text: "", ocrUsed: false };
  }
  return { text: ocrText, ocrUsed: Boolean(ocrText.trim()) };
}

async function readSpreadsheet(file: File) {
  const workbook = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array" });
  return workbook.SheetNames.map((sheetName) => XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName])).join("\n").slice(0, MAX_TEXT_LENGTH);
}

async function readContent(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return readPdf(file);
  if (["xls", "xlsx", "csv"].includes(extension || "")) return { text: extension === "csv" ? await file.text() : await readSpreadsheet(file), ocrUsed: false };
  if (["txt", "json", "xml", "md"].includes(extension || "")) return { text: await file.text(), ocrUsed: false };
  return { text: "", ocrUsed: false };
}

export async function processDocumentFiles(files: File[]): Promise<UploadDraft[]> {
  return Promise.all(files.map(async (file) => {
    const tipoDocumento = classifyDocument(file.name);
    const extension = file.name.split(".").pop()?.toLowerCase();
    try {
      const content = await readContent(file);
      const textoExtraido = content.text;
      const datosExtraidos = extractCaseData(textoExtraido, file.name, tipoDocumento);
      return {
        originalName: file.name,
        tipoDocumento,
        relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
        textoExtraido: textoExtraido.slice(0, 4000),
        datosExtraidos,
        estadoExtraccion: textoExtraido ? (content.ocrUsed ? "procesado con OCR" : "procesado") : extension === "pdf" ? "requiere OCR" : "no soportado",
        ocrUsado: content.ocrUsed
      } satisfies UploadDraft;
    } catch {
      return {
        originalName: file.name,
        tipoDocumento,
        relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
        estadoExtraccion: "parcial"
      } satisfies UploadDraft;
    }
  }));
}

export function mergeExtractedData(drafts: UploadDraft[], fallbackReference: string): ExtractedCaseData {
  const data = drafts.map((draft) => draft.datosExtraidos).filter(Boolean) as ExtractedCaseData[];
  const first = <K extends keyof ExtractedCaseData>(key: K) => data.map((item) => item[key]).find((value) => value !== undefined && value !== "") as ExtractedCaseData[K] | undefined;
  const sources = [...new Set(data.flatMap((item) => item.fuentesCausa || []))];
  const references = [...new Set(data.flatMap((item) => item.referenciasDetectadas || []))];
  const prioritized = data.find((item) => item.tipoCaso === "Daño de temperatura" || item.tipoCaso === "Daño de condición o manipulación") || data[0];
  const summary = data.map((item) => item.resumenCaso).filter(Boolean).sort((left, right) => (right?.length || 0) - (left?.length || 0))[0];
  const lossDrafts = drafts
    .filter((draft) => draft.datosExtraidos?.propuestaPerdida)
    .sort((left, right) => (left.tipoDocumento === "Liquidación por contenedor" ? -1 : 0) - (right.tipoDocumento === "Liquidación por contenedor" ? -1 : 0));
  const lossData = lossDrafts.map((draft) => draft.datosExtraidos?.propuestaPerdida).filter(Boolean) as ExtractedLossProposal[];
  const firstLoss = <K extends keyof ExtractedLossProposal>(key: K) => lossData.map((item) => item[key]).find((value) => value !== undefined) as ExtractedLossProposal[K] | undefined;
  const propuestaPerdida = lossData.length > 0
    ? {
        moneda: lossData[0].moneda,
        metodo1_liquidacionReal: firstLoss("metodo1_liquidacionReal"),
        metodo1_liquidacionComparativa: firstLoss("metodo1_liquidacionComparativa"),
        metodo2_valorReporteMercado: firstLoss("metodo2_valorReporteMercado"),
        metodo2_liquidacionReal: firstLoss("metodo2_liquidacionReal"),
        metodo3_valorFactura: firstLoss("metodo3_valorFactura"),
        metodo3_ventaBrutaDestino: firstLoss("metodo3_ventaBrutaDestino"),
        rubrosAdicionales: lossData.flatMap((item) => item.rubrosAdicionales),
        montoFinalReclamo: firstLoss("montoFinalReclamo"),
        fuentes: [...new Set(lossData.flatMap((item) => item.fuentes))]
      }
    : undefined;
  return {
    referencia: first("referencia") || references[0] || fallbackReference,
    csClaimNo: first("csClaimNo"),
    assured: first("assured"),
    opponent: first("opponent"),
    vessel: first("vessel"),
    voyage: first("voyage"),
    cargo: first("cargo"),
    placeOfShipment: first("placeOfShipment"),
    dateOfShipment: first("dateOfShipment"),
    placeOfDischarge: first("placeOfDischarge"),
    dateOfDischarge: first("dateOfDischarge"),
    surveyor: first("surveyor"),
    claimAmount: first("claimAmount"),
    tipoCaso: prioritized?.tipoCaso || first("tipoCaso"),
    resumenCaso: summary || first("resumenCaso"),
    causaPotencial: prioritized?.causaPotencial || first("causaPotencial"),
    fuentesCausa: sources,
    referenciasDetectadas: references.length ? references : [fallbackReference],
    propuestaPerdida
  };
}
