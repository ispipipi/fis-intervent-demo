import {
  CalculoPerdida,
  Caso,
  DocumentStatus,
  Documento,
  DocumentRequirement,
  DocumentType
} from "../types/domain";

export const DOCUMENT_TYPES: DocumentType[] = [
  "Carta de notificación a la naviera",
  "AoR",
  "Carta de subrogación o LoA",
  "Carta de asignación de derechos",
  "BL",
  "Booking",
  "Factura de exportación",
  "Nota de crédito",
  "Correspondencia de notificación",
  "DUS",
  "IVV",
  "Packing List",
  "Certificado fitosanitario",
  "Certificado de origen",
  "Liquidaciones comparativas o informe de mercado",
  "Liquidación por contenedor",
  "Tracking (naviera)",
  "Informes de QC en origen y destino",
  "Reportes de inspección",
  "Certificado de cosecha",
  "Registros de termógrafos",
  "Certificado de destrucción",
  "Factura de destrucción"
];

export function documentCompleteness(documentos: Documento[]) {
  const available = new Set(
    documentos.filter((doc) => doc.disponible && doc.tipoDocumento !== "Sin clasificar").map((doc) => doc.tipoDocumento)
  );
  const missing = DOCUMENT_TYPES.filter((type) => !available.has(type));
  return {
    available,
    missing,
    completed: DOCUMENT_TYPES.length - missing.length,
    total: DOCUMENT_TYPES.length
  };
}

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  disponible: "Disponible",
  faltante: "Faltante",
  solicitado: "Solicitado",
  recibido: "Recibido",
  rechazado: "Rechazado",
  "no aplica": "No aplica",
  ilegible: "Ilegible",
  "pendiente de revisión": "Pendiente de revisión"
};

export const DOCUMENT_REQUIREMENT_LABELS: Record<DocumentRequirement, string> = {
  obligatorio: "Obligatorio",
  condicional: "Condicional",
  adicional: "Adicional"
};

export type DocumentChecklistItem = {
  type: DocumentType;
  status: DocumentStatus;
  requirement: DocumentRequirement;
  applies: boolean;
  required: boolean;
  reason: string;
  documents: Documento[];
};

function isDestructionCase(caso: Caso) {
  const text = `${caso.tipoCaso || ""} ${caso.causaDano || ""} ${caso.resumenCaso || ""}`.toLowerCase();
  return /destrucci[oó]n|p[eé]rdida total|p[eé]rdida parcial/.test(text);
}

export function documentChecklist(caso: Caso, documentos: Documento[], calculo?: CalculoPerdida): DocumentChecklistItem[] {
  type ActiveDocumentRule = {
    requirement: "obligatorio" | "condicional";
    reason: string;
    applies?: (currentCase: Caso, currentCalculation?: CalculoPerdida) => boolean;
  };
  const rules = new Map<DocumentType, ActiveDocumentRule>();
  const addRule = (
    type: DocumentType,
    requirement: ActiveDocumentRule["requirement"],
    reason: string,
    applies?: ActiveDocumentRule["applies"]
  ) => rules.set(type, { requirement, reason, applies });

  addRule("BL", "obligatorio", "Siempre requerido para identificar el embarque.");
  addRule("Carta de notificación a la naviera", "obligatorio", "Documento base para preservar derechos frente al transportista.");
  addRule("Correspondencia de notificación", "obligatorio", "Debe conservarse el correo o correspondencia de envío a la naviera en PDF.");
  addRule("Registros de termógrafos", "condicional", "Aplica cuando la causa del caso es temperatura.", (currentCase) => currentCase.causaDano?.toLowerCase().includes("temperatura") || false);
  addRule("Liquidaciones comparativas o informe de mercado", "condicional", "Aplica cuando se selecciona el método de embarque comparable o de reporte de mercado.", (_currentCase, currentCalculation) => currentCalculation?.metodoSeleccionado === "1" || currentCalculation?.metodoSeleccionado === "2");
  addRule("Factura de exportación", "condicional", "Aplica cuando se selecciona el método factura versus venta destino.", (_currentCase, currentCalculation) => currentCalculation?.metodoSeleccionado === "3" || currentCalculation?.ventaAFirme === true);
  addRule("Liquidación por contenedor", "condicional", "Respalda la venta neta real del embarque afectado.", (_currentCase, currentCalculation) => currentCalculation?.metodoSeleccionado === "3");
  addRule("Nota de crédito", "condicional", "Aplica cuando el caso corresponde a una venta a firme.", (_currentCase, currentCalculation) => currentCalculation?.ventaAFirme === true);
  addRule("Certificado de destrucción", "condicional", "Aplica en pérdida total o parcial con destrucción documentada.", (currentCase) => isDestructionCase(currentCase));
  addRule("Factura de destrucción", "condicional", "Aplica cuando existe un costo de destrucción reclamable.", (currentCase) => isDestructionCase(currentCase));

  return DOCUMENT_TYPES.map((type) => {
    const docs = documentos.filter((doc) => doc.tipoDocumento === type && doc.disponible);
    const override = caso.documentStatuses?.[type];
    const documentStatus = docs.find((doc) => doc.estadoDocumental)?.estadoDocumental;
    const rule = rules.get(type);
    const requirement = rule?.requirement || "adicional";
    const applies = rule ? rule.applies?.(caso, calculo) ?? true : false;
    const required = applies && requirement !== "adicional";
    const status = override || documentStatus || (docs.length > 0 ? "recibido" : required ? "faltante" : "no aplica");
    return {
      type,
      status,
      requirement,
      applies,
      required,
      reason: rule?.reason || "Documento adicional: se incorpora cuando el caso lo requiera.",
      documents: docs
    };
  });
}

export function isDocumentUsable(status: DocumentStatus) {
  return status === "disponible" || status === "recibido";
}

export function isChecklistItemComplete(item: DocumentChecklistItem) {
  return item.documents.length > 0 && isDocumentUsable(item.status);
}

export function requiredDocumentChecklist(caso: Caso, documentos: Documento[], calculo?: CalculoPerdida) {
  return documentChecklist(caso, documentos, calculo).filter((item) => item.required);
}

export function missingRequiredDocumentTypes(caso: Caso, documentos: Documento[], calculo?: CalculoPerdida) {
  return requiredDocumentChecklist(caso, documentos, calculo)
    .filter((item) => !isChecklistItemComplete(item))
    .map((item) => item.type);
}

export function documentChecklistCoverage(caso: Caso, documentos: Documento[], calculo?: CalculoPerdida) {
  const required = requiredDocumentChecklist(caso, documentos, calculo);
  if (required.length === 0) return 100;
  return Math.round((required.filter((item) => isChecklistItemComplete(item)).length / required.length) * 100);
}

export type TransferDocumentRule = {
  id: string;
  label: string;
  types: DocumentType[];
  pendingAllowed?: boolean;
};

export const TRANSFER_PENDING_DOCUMENT_TYPES: DocumentType[] = [
  "AoR",
  "Certificado de cosecha",
  "Booking",
  "Registros de termógrafos",
  "DUS",
  "IVV",
  "Reportes de inspección"
];

export function transferDocumentRules(): TransferDocumentRule[] {
  return [
    { id: "loa-subrogation", label: "LoA o Carta de subrogación", types: ["Carta de subrogación o LoA"] },
    { id: "export-invoice", label: "Factura de exportación", types: ["Factura de exportación"] },
    { id: "packing-list", label: "Packing List", types: ["Packing List"] },
    { id: "transport-document", label: "BL / AWB", types: ["BL"] },
    { id: "sale-support", label: "Liquidación de venta o Nota de crédito", types: ["Liquidación por contenedor", "Nota de crédito"] },
    { id: "inspection-report", label: "Reporte de inspección", types: ["Reportes de inspección"], pendingAllowed: true },
    { id: "comparable-market", label: "Liquidación comparativa o reporte de mercado", types: ["Liquidaciones comparativas o informe de mercado"] },
    { id: "claim-notice", label: "Claim Notice / notificación a la naviera", types: ["Carta de notificación a la naviera"] },
    { id: "notification-correspondence", label: "Correspondencia de notificación", types: ["Correspondencia de notificación"] },
    { id: "aor", label: "AoR", types: ["AoR"], pendingAllowed: true }
  ];
}

export function isTransferDocumentRuleSatisfied(rule: TransferDocumentRule, documentos: Documento[], caso?: Caso) {
  return documentos.some((documento) => {
    if (!rule.types.includes(documento.tipoDocumento) || !documento.disponible) return false;
    const status = caso?.documentStatuses?.[documento.tipoDocumento] || documento.estadoDocumental;
    return !status || isDocumentUsable(status);
  });
}

export function transferCauseIsConfirmed(caso: Caso) {
  if (!caso.analisisCausa?.confirmadoPor || !caso.analisisCausa.conclusionFinal.trim()) return false;
  const cause = `${caso.causaDano || ""} ${caso.tipoCaso || ""} ${caso.causaPotencial || ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return /temperatura|temperature|delay|retraso|market loss|perdida de mercado|mercado|mishandling|manipulacion|golpe|roberry|robbery|robo|falla\s*ct|falla\s*ac/.test(cause);
}
