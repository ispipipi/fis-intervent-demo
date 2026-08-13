import { documentCompleteness, DOCUMENT_TYPES, pendingField } from "./business";
import { CalculoPerdida, Caso, Documento, ReviewReport, TransferDestination } from "../types/domain";

function calculationMethod(calculo?: CalculoPerdida) {
  if (!calculo) return undefined;
  if (calculo.ventaAFirme) return "Venta a firme · nota de crédito";
  if (calculo.metodoSeleccionado === "1") return "Método 1 · SMV";
  if (calculo.metodoSeleccionado === "2") return "Método 2 · Reporte de mercado";
  if (calculo.metodoSeleccionado === "3") return "Método 3 · Factura vs. venta";
  return undefined;
}

export function buildReviewReport(
  caso: Caso,
  documentos: Documento[],
  calculo: CalculoPerdida | undefined,
  generatedBy: string,
  destination: TransferDestination
): ReviewReport {
  const completeness = documentCompleteness(documentos);
  const availableDocuments = DOCUMENT_TYPES.filter((type) => completeness.available.has(type));
  const missingDocuments = completeness.missing;
  const pendingActions: string[] = missingDocuments.map((type) => `Solicitar: ${type}`);
  const method = calculationMethod(calculo);
  const inferredCauseSources = documentos
    .filter((documento) =>
      ["BL", "Registros de termógrafos", "Informes de QC en origen y destino", "Reportes de inspección"].includes(documento.tipoDocumento)
    )
    .map((documento) => documento.tipoDocumento);
  const causeSources = [...new Set(caso.fuentesCausa?.length ? caso.fuentesCausa : inferredCauseSources)];

  if (!caso.analisisCausa?.conclusionFinal && !caso.causaPotencial) {
    pendingActions.push("Confirmar la causa potencial y su conclusión en la pestaña Análisis.");
  }
  if (!method) {
    pendingActions.push("Seleccionar y justificar el cálculo aplicable en la pestaña Cálculo.");
  }
  if (!caso.fechaPrescripcion) {
    pendingActions.push("Completar fecha de descarga y jurisdicción para calcular prescripción.");
  }

  const cause = caso.causaPotencial || caso.analisisCausa?.conclusionFinal;
  const merit = caso.analisisCausa?.meritoSugerido || (cause ? "Pendiente" : undefined);
  const ready = pendingActions.length === 0;
  const selectedCalculation = method
    ? {
        method,
        amount: calculo?.montoFinalReclamo,
        currency: calculo?.moneda,
        justification: calculo?.justificacionSeleccion
      }
    : undefined;

  const executiveSummary = [
    `Caso ${caso.id} preparado para revisión de derivación a ${destination}.`,
    caso.resumenCaso || `Expediente de ${pendingField(caso.assured)} frente a ${pendingField(caso.opponent)}.`,
    cause ? `Causa propuesta: ${cause}` : "La causa potencial aún requiere confirmación humana.",
    selectedCalculation?.amount !== undefined
      ? `Pérdida calculada: ${selectedCalculation.currency || "USD"} ${selectedCalculation.amount.toLocaleString("es-CL")}.`
      : "No existe un cálculo seleccionado para el traspaso."
  ].join(" ");

  return {
    caseId: caso.id,
    generatedAt: new Date().toISOString(),
    generatedBy,
    destination,
    status: ready ? "Listo para traspaso" : "Con observaciones",
    ready,
    executiveSummary,
    availableDocuments,
    missingDocuments,
    pendingActions,
    recommendedCause: cause,
    causeSources,
    preliminaryMerit: merit,
    selectedCalculation,
    checklist: DOCUMENT_TYPES.map((label) => ({
      label,
      status: completeness.available.has(label) ? "Disponible" : "Pendiente"
    }))
  };
}

export function buildReviewReportText(report: ReviewReport) {
  const calculation = report.selectedCalculation
    ? [
        `Método: ${report.selectedCalculation.method}`,
        `Monto: ${report.selectedCalculation.amount !== undefined ? `${report.selectedCalculation.currency || "USD"} ${report.selectedCalculation.amount.toLocaleString("es-CL")}` : "Pendiente"}`,
        `Justificación: ${report.selectedCalculation.justification || "No registrada"}`
      ].join("\n")
    : "No hay cálculo seleccionado.";

  return [
    "INFORME DE REVISIÓN PRECLAIM",
    `Caso: ${report.caseId}`,
    `Destino propuesto: ${report.destination}`,
    `Estado: ${report.status}`,
    `Generado por: ${report.generatedBy}`,
    `Fecha: ${new Date(report.generatedAt).toLocaleString("es-CL")}`,
    "",
    "RESUMEN EJECUTIVO",
    report.executiveSummary,
    "",
    "CAUSA Y MÉRITO PRELIMINAR",
    `Causa propuesta: ${report.recommendedCause || "Pendiente"}`,
    `Sustento: ${report.causeSources.length > 0 ? report.causeSources.join(", ") : "No informado"}`,
    `Mérito sugerido: ${report.preliminaryMerit || "Pendiente"}`,
    "",
    "CÁLCULO SELECCIONADO",
    calculation,
    "",
    "DOCUMENTOS DISPONIBLES",
    ...(report.availableDocuments.length > 0 ? report.availableDocuments.map((item) => `- ${item}`) : ["- Ninguno"]),
    "",
    "DOCUMENTOS PENDIENTES",
    ...(report.missingDocuments.length > 0 ? report.missingDocuments.map((item) => `- ${item}`) : ["- Ninguno"]),
    "",
    "ACCIONES PENDIENTES",
    ...(report.pendingActions.length > 0 ? report.pendingActions.map((item) => `- ${item}`) : ["- Ninguna"])
  ].join("\n");
}
