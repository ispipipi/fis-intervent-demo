import * as XLSX from "xlsx";
import { HistoricalCase, HistoricalCategory, HistoryImportBatch, HistorySheetSummary } from "../types/domain";

type CellValue = string | number | boolean | Date | null | undefined;

const REFERENCE_PATTERN = /\b((?:PRE-)?FIS(?:[-/][A-Z0-9]+)+-\d{4}-\d{2}(?:[/-])\d{2}-\d{4}(?:\([A-Z]+\))?)\b/i;

function text(value: CellValue) {
  if (value === null || value === undefined || value === "") return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizedHeader(value: CellValue) {
  return text(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizedReference(value: string) {
  return value
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[\/]+/g, "-")
    .replace(/-+/g, "-");
}

function findReference(row: CellValue[]) {
  for (const value of row) {
    const match = text(value).match(REFERENCE_PATTERN);
    if (match) return match[1].toUpperCase();
  }
  return undefined;
}

function findHeaderRow(rows: CellValue[][]) {
  let bestIndex = 0;
  let bestScore = 0;
  for (let index = 0; index < Math.min(rows.length, 8); index += 1) {
    const line = rows[index].map(normalizedHeader);
    const score = ["reference no", "reference", "claim handler", "assured", "opponent", "vessel", "status"]
      .filter((label) => line.some((header) => header === label || header.includes(label)))
      .length;
    if (score > bestScore) {
      bestIndex = index;
      bestScore = score;
    }
  }
  return bestIndex;
}

function readByHeader(row: CellValue[], headers: string[], aliases: string[]) {
  const index = headers.findIndex((header) => aliases.some((alias) => header === alias || header.includes(alias)));
  return index >= 0 ? text(row[index]) : "";
}

function parseAmount(value: string) {
  if (!value) return undefined;
  const raw = value.replace(/[^\d,.-]/g, "");
  if (!raw) return undefined;
  const comma = raw.lastIndexOf(",");
  const dot = raw.lastIndexOf(".");
  let normalized = raw;
  if (comma >= 0 && dot >= 0) {
    normalized = comma > dot ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, "");
  } else if (comma >= 0) {
    normalized = raw.replace(/,/g, raw.length - comma - 1 === 3 ? "" : ".");
  } else if (dot >= 0 && raw.length - dot - 1 === 3) {
    normalized = raw.replace(/\./g, "");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function statusLabel(value: string) {
  return value.length <= 40 && value ? value : undefined;
}

function categoryFor(reference: string, sheetName: string, legacyStatus?: string): HistoricalCategory {
  const upperSheet = sheetName.toUpperCase();
  const upperStatus = legacyStatus?.toUpperCase() || "";
  if (upperStatus.includes("DESCART") || upperSheet.includes("DESCART")) return "Descartado";
  if (upperStatus.includes("TRASPAS") || upperSheet.includes("TRASPAS")) return "Traspasado";
  if (upperStatus.includes("PRESENT") || upperSheet.includes("PRESENT")) return "Presentar";
  if (reference.toUpperCase().startsWith("FIS-")) return "FIS";
  return "Preclaim";
}

function rowIsEmpty(row: CellValue[]) {
  return row.every((value) => text(value) === "");
}

function makeRecord(
  row: CellValue[],
  headers: string[],
  sourceSheet: string,
  sourceRow: number,
  sourceBatchId: string,
  importedAt: string
): HistoricalCase | undefined {
  const reference = findReference(row);
  if (!reference) return undefined;

  const statusColumn = readByHeader(row, headers, ["status"]);
  const legacyStatusValue = statusColumn || readByHeader(row, headers, ["estado", "workflow status", "case status", "id"]);
  const summary = readByHeader(row, headers, ["summary", "resumen", "incident", "cause", "causa"]);
  const missingDocuments = readByHeader(row, headers, ["missing documents", "documentos faltantes"])
    || (/falta|pendiente|solicit/i.test(statusColumn) ? statusColumn : "");
  const amountFromHeader = readByHeader(row, headers, ["claim amount", "loss amount", "monto", "amount"]);
  const claimAmount = parseAmount(amountFromHeader) ?? parseAmount(text(row[0]));
  return {
    id: `historico-${normalizedReference(reference)}-${sourceSheet}-${sourceRow}`.replace(/[^a-zA-Z0-9_-]+/g, "-"),
    reference,
    referenceKey: normalizedReference(reference),
    legacyStatus: statusLabel(legacyStatusValue || statusColumn),
    missingDocumentsRaw: missingDocuments || undefined,
    incidentSummaryRaw: summary || undefined,
    claimHandler: readByHeader(row, headers, ["claim handler", "handler"] ) || undefined,
    csClaimNo: readByHeader(row, headers, ["cs claim no", "claim no", "claim number"]) || undefined,
    assured: readByHeader(row, headers, ["assured", "asegurado"]) || undefined,
    opponent: readByHeader(row, headers, ["opponent", "transportista", "carrier"]) || undefined,
    vessel: readByHeader(row, headers, ["vessel", "nave"]) || undefined,
    voyage: readByHeader(row, headers, ["voyage", "viaje"]) || undefined,
    placeOfDischarge: readByHeader(row, headers, ["place of discharge", "pod", "descarga"]) || undefined,
    dateOfDischarge: readByHeader(row, headers, ["date of discharge", "fecha de descarga"]) || undefined,
    dateOfLoading: readByHeader(row, headers, ["date of loading", "fecha de loading", "fecha de embarque"]) || undefined,
    surveyor: readByHeader(row, headers, ["surveyor", "surveyorco", "inspector"]) || undefined,
    commodity: readByHeader(row, headers, ["commodity", "cargo", "carga"]) || undefined,
    claimAmount,
    category: categoryFor(reference, sourceSheet, legacyStatusValue || statusColumn),
    sourceSheet,
    sourceRow,
    sourceBatchId,
    importedAt
  };
}

export async function parseHistoryWorkbook(file: File): Promise<HistoryImportBatch> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true, raw: true });
  const importedAt = new Date().toISOString();
  const batchId = `${file.name}-${importedAt}`.replace(/[^a-zA-Z0-9_.-]+/g, "-");
  const records: HistoricalCase[] = [];
  const sheets: HistorySheetSummary[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    const rows = XLSX.utils.sheet_to_json<CellValue[]>(workbook.Sheets[sheetName], { header: 1, defval: "", raw: true });
    const headerIndex = findHeaderRow(rows);
    const headers = (rows[headerIndex] || []).map(normalizedHeader);
    let importedRows = 0;
    let skippedRows = 0;
    rows.slice(headerIndex + 1).forEach((row, offset) => {
      if (rowIsEmpty(row)) return;
      const record = makeRecord(row, headers, sheetName, headerIndex + offset + 2, batchId, importedAt);
      if (record) {
        records.push(record);
        importedRows += 1;
      } else {
        skippedRows += 1;
      }
    });
    sheets.push({ sheetName, headerRow: headerIndex + 1, importedRows, skippedRows });
  });

  const counts = records.reduce((map, record) => map.set(record.referenceKey, (map.get(record.referenceKey) || 0) + 1), new Map<string, number>());
  return {
    batchId,
    fileName: file.name,
    importedAt,
    records,
    sheets,
    duplicateReferenceKeys: [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key)
  };
}
