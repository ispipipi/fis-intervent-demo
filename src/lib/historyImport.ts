import * as XLSX from "xlsx";
import { HistoricalCalculationInsight, HistoricalCase, HistoricalCategory, HistoryImportBatch, HistorySheetSummary } from "../types/domain";

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

/**
 * Identifies one historical row without using the import batch timestamp.
 * The same reference may legitimately appear in different rows or sheets.
 */
type HistoricalRecordIdentity = Pick<HistoricalCase, "reference" | "sourceSheet" | "sourceRow"> &
  Partial<Pick<HistoricalCase, "sourceFileName" | "sourceBatchId">>;

function sourceFileKey(record: HistoricalRecordIdentity) {
  if (record.sourceFileName) return normalizedHeader(record.sourceFileName);
  const legacyFileName = record.sourceBatchId?.replace(/-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z$/, "");
  return normalizedHeader(legacyFileName || "legacy");
}

export function historicalRecordKey(record: HistoricalRecordIdentity) {
  return [sourceFileKey(record), normalizedHeader(record.sourceSheet), record.sourceRow, normalizedReference(record.reference)].join("::");
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

function readByExactHeader(row: CellValue[], headers: string[], aliases: string[]) {
  const index = headers.findIndex((header) => aliases.includes(header));
  return index >= 0 ? text(row[index]) : "";
}

function parseAmount(value: string) {
  if (!value) return undefined;
  const token = value.match(/-?\d[\d.,]*/)?.[0];
  if (!token) return undefined;
  const raw = token;
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

function readNumericByHeader(row: CellValue[], headers: string[], aliases: string[]) {
  const value = readByHeader(row, headers, aliases);
  // A cell such as "1.924.920 ($17.434,29 USD)" contains more than one monetary representation.
  // Keep it out of an automatic formula until the handler can confirm which value applies.
  if ((value.match(/-?\d[\d.,]*/g) || []).length > 1) return undefined;
  return parseAmount(value);
}

function readNumericByExactHeader(row: CellValue[], headers: string[], aliases: string[]) {
  const value = readByExactHeader(row, headers, aliases);
  if ((value.match(/-?\d[\d.,]*/g) || []).length > 1) return undefined;
  return parseAmount(value);
}

function readCurrency(row: CellValue[], headers: string[]) {
  const value = readByHeader(row, headers, ["currency", "moneda"]);
  return value || undefined;
}

function calculationInsight(row: CellValue[], headers: string[], claimAmount?: number): HistoricalCalculationInsight | undefined {
  const smv = readNumericByExactHeader(row, headers, ["smv total", "smv"]);
  const smvPerKilo = readNumericByExactHeader(row, headers, ["smv per kilo"]);
  const kilos = readNumericByExactHeader(row, headers, ["kilos", "kg"]);
  const liquidation = readNumericByExactHeader(row, headers, ["liquidacion por contenedor", "liquidacion", "liquidation"]);
  const sale = readNumericByExactHeader(row, headers, ["sale", "venta", "venta destino"]);
  const invoice = readNumericByExactHeader(row, headers, ["export invoice", "factura de exportacion", "factura exportacion"]);
  const exchangeRate = readNumericByExactHeader(row, headers, ["exchange rate", "tipo de cambio", "tc"]);
  const currency = readCurrency(row, headers);
  const rowText = row.map(text).join(" ").toLowerCase();
  const calculatedSmv = smv ?? (smvPerKilo !== undefined && kilos !== undefined ? smvPerKilo * kilos : undefined);

  if (calculatedSmv !== undefined && liquidation !== undefined) {
    const rawResult = calculatedSmv - liquidation;
    return {
      method: "SMV vs liquidación",
      formula: exchangeRate !== undefined ? "(SMV - liquidación) × tipo de cambio" : "SMV - liquidación",
      referenceValue: calculatedSmv,
      actualValue: liquidation,
      exchangeRate,
      result: exchangeRate !== undefined ? rawResult * exchangeRate : rawResult,
      currency,
      sourceFields: [smv !== undefined ? "SMV" : "SMV por kilo × kilos", "Liquidación", ...(exchangeRate !== undefined ? ["Tipo de cambio"] : [])],
      confidence: exchangeRate !== undefined ? "Completo" : "Parcial",
      note: exchangeRate === undefined ? "El histórico no registra tipo de cambio para esta fila." : undefined
    };
  }

  if (calculatedSmv !== undefined && sale !== undefined) {
    const rawResult = calculatedSmv - sale;
    return {
      method: "SMV vs venta destino",
      formula: exchangeRate !== undefined ? "(SMV - venta destino) × tipo de cambio" : "SMV - venta destino",
      referenceValue: calculatedSmv,
      actualValue: sale,
      exchangeRate,
      result: exchangeRate !== undefined ? rawResult * exchangeRate : rawResult,
      currency,
      sourceFields: [smv !== undefined ? "SMV" : "SMV por kilo × kilos", "Venta destino", ...(exchangeRate !== undefined ? ["Tipo de cambio"] : [])],
      confidence: exchangeRate !== undefined ? "Completo" : "Parcial",
      note: exchangeRate === undefined ? "El histórico no registra tipo de cambio para esta fila." : undefined
    };
  }

  if (invoice !== undefined && sale !== undefined) {
    return {
      method: "Factura vs venta destino",
      formula: "Factura de exportación - venta destino",
      referenceValue: invoice,
      actualValue: sale,
      result: invoice - sale,
      currency,
      sourceFields: ["Factura de exportación", "Venta destino"],
      confidence: "Parcial",
      note: "La fuente contiene ambos valores; la venta puede incluir una presentación monetaria compuesta y requiere revisión humana."
    };
  }

  if (/venta firme|nota de credito|credit note|firm sale/.test(rowText)) {
    return {
      method: "Venta firme / nota de crédito",
      formula: "Usar valor de nota de crédito",
      result: claimAmount,
      currency,
      sourceFields: ["Venta firme / nota de crédito"],
      confidence: claimAmount !== undefined ? "Parcial" : "Monto informado",
      note: "La fila identifica una venta firme o nota de crédito, pero no conserva un campo separado para el valor de la nota."
    };
  }

  if (claimAmount !== undefined) {
    return {
      method: "Monto histórico sin fórmula",
      formula: "Monto informado en el histórico",
      result: claimAmount,
      currency,
      sourceFields: ["Claim amount / monto"],
      confidence: "Monto informado",
      note: "No hay insumos suficientes en esta fila para reconstruir la fórmula."
    };
  }

  return undefined;
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
  sourceFileName: string,
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
  const identity = { reference, sourceFileName, sourceSheet, sourceRow, sourceBatchId };
  return {
    id: `historico-${historicalRecordKey(identity)}`.replace(/[^a-zA-Z0-9_-]+/g, "-"),
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
    calculoHistorico: calculationInsight(row, headers, claimAmount),
    category: categoryFor(reference, sourceSheet, legacyStatusValue || statusColumn),
    sourceFileName,
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
      const record = makeRecord(row, headers, file.name, sheetName, headerIndex + offset + 2, batchId, importedAt);
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
