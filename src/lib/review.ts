import {
  documentChecklist,
  isChecklistItemComplete,
  isTransferDocumentRuleSatisfied,
  pendingField,
  transferCauseIsConfirmed,
  transferDocumentRules
} from "./business";
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
  const checklistItems = documentChecklist(caso, documentos, calculo);
  const availableDocuments = checklistItems.filter((item) => isChecklistItemComplete(item)).map((item) => item.type);
  const contextualMissing = checklistItems.filter((item) => item.required && !isChecklistItemComplete(item)).map((item) => item.type);
  const transferRules = transferDocumentRules();
  const blockingTransferDocuments = transferRules.filter((rule) => !isTransferDocumentRuleSatisfied(rule, documentos) && !rule.pendingAllowed);
  const allowedPendingTransferDocuments = transferRules.filter((rule) => !isTransferDocumentRuleSatisfied(rule, documentos) && rule.pendingAllowed);
  const loaRule = transferRules.find((rule) => rule.id === "loa-subrogation");
  const aorRule = transferRules.find((rule) => rule.id === "aor");
  const lettersReady = Boolean(
    loaRule && isTransferDocumentRuleSatisfied(loaRule, documentos) &&
    aorRule && (isTransferDocumentRuleSatisfied(aorRule, documentos) || aorRule.pendingAllowed)
  );
  const contextualMissingLabels = contextualMissing.map((type) => transferRules.find((rule) => rule.types.includes(type))?.label || type);
  const missingDocuments = [...new Set([...contextualMissingLabels, ...blockingTransferDocuments.map((rule) => rule.label)])];
  const pendingActions: string[] = missingDocuments.map((type) => `Solicitar: ${type}`);
  const missingCaseFields = [
    ["Referencia FIS", caso.id],
    ["Commodity", caso.cargo],
    ["Puerto de embarque", caso.placeOfShipment],
    ["Puerto de descarga", caso.placeOfDischarge],
    ["Fecha de embarque", caso.dateOfShipment],
    ["Fecha de descarga", caso.dateOfDischarge],
    ["Monto a reclamar informado", caso.claimAmount ?? calculo?.montoFinalReclamo],
    ["Nombre del shipper / asegurado", caso.assured],
    ["Nombre del consignatario", caso.consignee],
    ["Carrier responsable", caso.opponent]
  ].filter(([, value]) => value === undefined || value === "" || value === null);
  const method = calculationMethod(calculo);
  const hasMinimumCaseData = missingCaseFields.length === 0 && Boolean(caso.claimHandler.trim() && caso.vessel.trim());
  const causeReviewed = transferCauseIsConfirmed(caso);
  const calculationReviewed = Boolean(
    method && calculo?.montoFinalReclamo !== undefined && (calculo.justificacionSeleccion?.trim().length ?? 0) >= 10
  );
  const prescriptionReady = Boolean(
    caso.dateOfDischarge && caso.jurisdiccion && caso.fechaPrescripcion && caso.dateOfDischargeType !== "ETA"
  );
  const inferredCauseSources = documentos
    .filter((documento) =>
      ["BL", "Registros de termógrafos", "Informes de QC en origen y destino", "Reportes de inspección"].includes(documento.tipoDocumento)
    )
    .map((documento) => documento.tipoDocumento);
  const causeSources = [...new Set(caso.fuentesCausa?.length ? caso.fuentesCausa : inferredCauseSources)];

  if (!hasMinimumCaseData) {
    pendingActions.push(`Completar datos mínimos de traspaso: ${missingCaseFields.map(([label]) => label).join(", ") || "nave o handler"}.`);
  }
  if (!causeReviewed) {
    pendingActions.push("Confirmar en Análisis una causa válida: Temperature, Delay, Market Loss, Mishanding, Roberry, Falla CT o Falla AC.");
  }
  if (!calculationReviewed) {
    pendingActions.push("Seleccionar, completar y justificar el cálculo aplicable en la pestaña Cálculo.");
  }
  if (!prescriptionReady && caso.dateOfDischargeType !== "ETA") {
    pendingActions.push("Completar fecha de descarga y jurisdicción para calcular prescripción.");
  }
  if (caso.dateOfDischargeType === "ETA") {
    pendingActions.push("Confirmar la fecha real de descarga antes del traspaso; la fecha actual es una ETA.");
  }
  if (generatedBy !== caso.claimHandler) {
    pendingActions.push("El traspaso debe ser aprobado y ejecutado por el Handler responsable del caso.");
  }

  const closureChecklist = [
    {
      id: "case-data",
      label: "Datos mínimos del expediente",
      status: hasMinimumCaseData ? "Cumplido" as const : "Pendiente" as const,
      detail: hasMinimumCaseData ? "Referencia, commodity, puertos, fechas, shipper, consignatario, carrier, nave y monto informados." : "Faltan uno o más datos mínimos contractuales del expediente."
    },
    {
      id: "documents",
      label: "Checklist documental",
      status: blockingTransferDocuments.length === 0 ? "Cumplido" as const : "Pendiente" as const,
      detail: blockingTransferDocuments.length === 0
        ? allowedPendingTransferDocuments.length > 0
          ? `Documentación mínima cumplida. Pendientes permitidos: ${allowedPendingTransferDocuments.map((rule) => rule.label).join(", ")}.`
          : "Documentación mínima de traspaso disponible."
        : `Faltan documentos obligatorios: ${blockingTransferDocuments.map((rule) => rule.label).join(", ")}.`
    },
    {
      id: "letters",
      label: "Cartas obligatorias",
      status: lettersReady ? "Cumplido" as const : "Pendiente" as const,
      detail: lettersReady
        ? isTransferDocumentRuleSatisfied(aorRule!, documentos)
          ? "LoA / subrogación y AoR disponibles."
          : "LoA / subrogación disponible. AoR pendiente permitido por FIS."
        : "Debe estar disponible la Carta de subrogación o LoA; el AoR puede quedar pendiente como excepción."
    },
    {
      id: "cause",
      label: "Causa y mérito revisados",
      status: causeReviewed ? "Cumplido" as const : "Pendiente" as const,
      detail: causeReviewed
        ? `Causa válida confirmada por ${caso.analisisCausa?.confirmadoPor}. El mérito bajo no bloquea el traspaso.`
        : "La causa debe confirmarse desde la pestaña Análisis y corresponder a una causal contractual."
    },
    {
      id: "calculation",
      label: "Cálculo seleccionado y justificado",
      status: calculationReviewed ? "Cumplido" as const : "Pendiente" as const,
      detail: calculationReviewed ? `${method} con monto final y justificación registrada.` : "Falta método, monto final o justificación suficiente."
    },
    {
      id: "prescription",
      label: "Prescripción confirmada",
      status: prescriptionReady ? "Cumplido" as const : "Pendiente" as const,
      detail: prescriptionReady ? "Calculada desde una fecha real de descarga." : caso.dateOfDischargeType === "ETA" ? "La ETA debe reemplazarse o confirmarse como fecha real." : "Falta fecha de descarga, jurisdicción o fecha de prescripción."
    },
    {
      id: "handler-approval",
      label: "Aprobación del Handler responsable",
      status: generatedBy === caso.claimHandler ? "Cumplido" as const : "Pendiente" as const,
      detail: generatedBy === caso.claimHandler ? `Informe generado por ${generatedBy}.` : `Debe revisar y aprobar ${caso.claimHandler}.`
    }
  ];
  const ready = closureChecklist.every((item) => item.status === "Cumplido");

  const cause = caso.causaPotencial || caso.analisisCausa?.conclusionFinal;
  const merit = caso.analisisCausa?.meritoSugerido || (cause ? "Pendiente" : undefined);
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
    closureChecklist,
    recommendedCause: cause,
    causeSources,
    preliminaryMerit: merit,
    selectedCalculation,
    checklist: checklistItems
      .filter((item) => item.required)
      .map((item) => ({
        label: item.type,
        status: isChecklistItemComplete(item) ? "Disponible" : "Pendiente"
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
    "CHECKLIST DE CIERRE LOCAL",
    ...(report.closureChecklist || []).map((gate) => `${gate.status === "Cumplido" ? "[OK]" : "[PENDIENTE]"} ${gate.label}: ${gate.detail}`),
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
