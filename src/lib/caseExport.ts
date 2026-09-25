import * as XLSX from "xlsx";
import { BitacoraEvento, CalculoPerdida, Caso, Documento, HistoricalCase } from "../types/domain";
import { daysWithoutMovement, documentChecklist, isChecklistItemComplete, prescriptionStatus } from "./business";

type ExportValue = string | number | undefined;
type ExportRow = Record<string, ExportValue>;

function dateLabel(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("es-CL");
}

function dateOnly(value?: string) {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("es-CL");
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("es-CL");
}

function daysBetween(from?: string, to?: string) {
  if (!from || !to) return undefined;
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return undefined;
  return Math.max(0, Math.floor((end - start) / 86_400_000));
}

function extractContainers(caso: Caso, docs: Documento[]) {
  const corpus = [
    caso.id,
    caso.voyage,
    caso.cargo,
    ...docs.flatMap((doc) => [doc.originalName, doc.nombreArchivo, doc.textoExtraido])
  ].filter(Boolean).join(" ");
  const matches = corpus.match(/\b[A-Z]{4}\s?\d{6,7}(?:-\d)?\b/gi) || [];
  return [...new Set(matches.map((value) => value.replace(/\s+/g, "").toUpperCase()))].join(", ") || undefined;
}

function transferEvent(caso: Caso, events: BitacoraEvento[]) {
  if (!caso.estado.includes("Traspasado")) return undefined;
  return [...events]
    .filter((event) => event.casoId === caso.id && /traspasad/i.test(event.detalle))
    .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())[0];
}

function caseRows(
  casos: Caso[],
  documentos: Documento[],
  calculosPerdida: CalculoPerdida[],
  bitacora: BitacoraEvento[]
) {
  return casos.map<ExportRow>((caso) => {
    const docs = documentos.filter((documento) => documento.casoId === caso.id);
    const calculo = calculosPerdida.find((item) => item.casoId === caso.id);
    const checklist = documentChecklist(caso, docs, calculo);
    const requiredChecklist = checklist.filter((item) => item.required);
    const missingChecklist = requiredChecklist.filter((item) => !isChecklistItemComplete(item));
    const events = bitacora.filter((event) => event.casoId === caso.id);
    const endEvent = transferEvent(caso, events);
    const lossAmount = calculo?.montoFinalReclamo;
    const lossCurrency = calculo?.moneda;
    const prescription = prescriptionStatus(caso);

    return {
      "Referencia": caso.id,
      "Handler": caso.claimHandler,
      "Asegurado": caso.assured,
      "Oponente": caso.opponent,
      "Nave": caso.vessel,
      "Viaje": caso.voyage,
      "Contenedor": extractContainers(caso, docs),
      "CS Claim N°": caso.csClaimNo,
      "Carga": caso.cargo,
      "Lugar de embarque": caso.placeOfShipment,
      "Fecha de embarque": dateOnly(caso.dateOfShipment),
      "Lugar de descarga": caso.placeOfDischarge,
      "Fecha de descarga / ETA": dateOnly(caso.dateOfDischarge),
      "Tipo de fecha": caso.dateOfDischargeType || "Real",
      "Jurisdicción": caso.jurisdiccion,
      "Surveyor / inspector informado": caso.surveyor,
      "Estado del caso": caso.estado,
      "Estado documental": missingChecklist.length > 0 ? "Pendiente" : "Completo",
      "Documentos disponibles": requiredChecklist.filter((item) => isChecklistItemComplete(item)).length,
      "Documentos faltantes": missingChecklist.length,
      "Detalle documentos faltantes": missingChecklist.map((item) => item.type).join("; "),
      "Pérdida calculada": lossAmount,
      "Moneda pérdida": lossCurrency,
      "Moneda origen cálculo": calculo?.monedaOrigen || calculo?.moneda,
      "Moneda resultado cálculo": calculo?.moneda,
      "Tipo de cambio": calculo?.tipoCambio,
      "Fecha tipo de cambio": dateOnly(calculo?.tipoCambioFecha),
      "Fuente tipo de cambio": calculo?.tipoCambioFuente,
      "Método de cálculo": calculo?.ventaAFirme ? "Venta a firme / nota de crédito" : calculo?.metodoSeleccionado ? `Método ${calculo.metodoSeleccionado}` : undefined,
      "Monto reclamado informado": caso.claimAmount,
      "Fecha de prescripción calculada": dateOnly(caso.fechaPrescripcion),
      "Base de prescripción": caso.dateOfDischargeType === "ETA" ? "ETA estimada" : caso.dateOfDischarge ? "Descarga real" : undefined,
      "Alerta prescripción": prescription.label,
      "Días sin movimiento": daysWithoutMovement(caso),
      "Fecha de recepción": dateOnly(caso.createdAt),
      "Fecha de término / traspaso": dateOnly(endEvent?.timestamp),
      "Gestión": endEvent ? "Finalizada" : "En curso",
      "Duración gestión (días)": daysBetween(caso.createdAt, endEvent?.timestamp) ?? daysBetween(caso.createdAt, new Date().toISOString()),
      "Última actualización": dateLabel(caso.ultimaActualizacion),
      "Destino": caso.informeRevision?.destination,
      "Estado informe": caso.informeRevision?.status,
      "Actualizaciones": events.length
    };
  });
}

function updateRows(casos: Caso[], bitacora: BitacoraEvento[]) {
  const byId = new Map(casos.map((caso) => [caso.id, caso]));
  return casos.flatMap((caso) =>
    bitacora
      .filter((event) => event.casoId === caso.id)
      .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())
      .map<ExportRow>((event, index) => ({
        "Referencia": caso.id,
        "N° actualización": index + 1,
        "Fecha": dateLabel(event.timestamp),
        "Usuario": event.usuario,
        "Tipo de actualización": event.tipoEvento,
        "Detalle": event.detalle,
        "Días desde recepción": daysBetween(byId.get(event.casoId)?.createdAt, event.timestamp)
      }))
  );
}

function historicalRows(records: HistoricalCase[]) {
  return records.map<ExportRow>((record) => ({
    "Referencia": record.reference,
    "Categoría": record.category,
    "Estado original": record.legacyStatus,
    "Handler": record.claimHandler,
    "Asegurado": record.assured,
    "Oponente": record.opponent,
    "Nave": record.vessel,
    "Viaje": record.voyage,
    "CS Claim N°": record.csClaimNo,
    "Carga": record.commodity,
    "Fecha de embarque": record.dateOfLoading,
    "Fecha de descarga": record.dateOfDischarge,
    "Inspector": record.surveyor,
    "Monto histórico": record.claimAmount,
    "Moneda": record.calculoHistorico?.currency,
    "Resultado histórico": record.calculoHistorico?.result,
    "Método histórico": record.calculoHistorico?.method,
    "Documentos / pendientes": record.missingDocumentsRaw,
    "Hoja origen": record.sourceSheet,
    "Fila origen": record.sourceRow,
    "Archivo origen": record.sourceFileName,
    "Importado": dateLabel(record.importedAt)
  }));
}

function appendSheet(workbook: XLSX.WorkBook, name: string, rows: ExportRow[], widths: number[]) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = widths.map((wch) => ({ wch }));
  if (rows.length > 0) sheet["!autofilter"] = { ref: `A1:${XLSX.utils.encode_col(widths.length - 1)}${rows.length + 1}` };
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9_.-]+/g, "-");
}

export function exportCaseTrackingXlsx(
  casos: Caso[],
  documentos: Documento[],
  calculosPerdida: CalculoPerdida[],
  bitacora: BitacoraEvento[],
  fileName = "seguimiento-preclaim.xlsx"
) {
  const workbook = XLSX.utils.book_new();
  appendSheet(workbook, "Seguimiento", caseRows(casos, documentos, calculosPerdida, bitacora), [24, 22, 24, 24, 20, 16, 22, 20, 20, 22, 18, 22, 20, 16, 15, 24, 22, 18, 22, 20, 42, 18, 14, 26, 22, 18, 20, 16, 20, 20, 14, 22, 16, 20, 16, 18, 42, 42]);
  appendSheet(workbook, "Actualizaciones", updateRows(casos, bitacora), [24, 16, 22, 22, 24, 70, 22]);
  XLSX.writeFile(workbook, safeFileName(fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`));
}

export function exportHistoricalMemoryXlsx(records: HistoricalCase[], fileName = "memoria-historica-preclaim.xlsx") {
  const workbook = XLSX.utils.book_new();
  appendSheet(workbook, "Memoria histórica", historicalRows(records), [24, 18, 24, 22, 24, 24, 20, 16, 20, 22, 18, 18, 20, 20, 14, 20, 28, 42, 20, 12, 28, 22]);
  XLSX.writeFile(workbook, safeFileName(fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`));
}
