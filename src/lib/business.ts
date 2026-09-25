import Fuse from "fuse.js";
import {
  CalculoPerdida,
  CaseStatus,
  Caso,
  BitacoraEvento,
  DocumentType,
  Documento,
  DocumentStatus,
  CurrencyCode,
  EventType,
  InactivityAlertChannel,
  InactivityAlertState,
  Jurisdiccion,
  NewCaseInput
} from "../types/domain";

export const STORAGE_PREFIX = "fis-intervent-demo:";

export const HANDLERS = ["Emely Lambraño", "Camila Rojas", "Mateo Silva"];

export const INSPECTORS = ["Valentina Soto"];
export const INSPECTOR_EVOLUTION_ENABLED = false;

export const INACTIVITY_ALERT_DAYS = 15;
export const INACTIVITY_ALERT_TIMEZONE = "America/Santiago";
export const INACTIVITY_ALERT_RECIPIENTS = "Handler responsable y Gerente";
export const INACTIVITY_EXCLUDED_STATUSES: CaseStatus[] = ["Traspasado a FIS", "Traspasado a Lawgistic"];
export const INACTIVITY_EVENT_TYPES: EventType[] = [
  "cambio_estado",
  "documento_cargado",
  "documento_solicitado",
  "calculo_generado",
  "reversion_estado"
];

export function suggestHandler(assured?: string) {
  const normalized = assured?.toLowerCase() || "";
  if (normalized.includes("agroexport") || normalized.includes("exportadora")) return "Emely Lambraño";
  if (normalized.includes("frutera") || normalized.includes("fruta")) return "Camila Rojas";
  if (normalized.includes("demo") || normalized.includes("comercial")) return "Mateo Silva";
  return undefined;
}

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

function normalizeDocumentText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const DOCUMENT_ALIASES = [
  { type: "Carta de notificación a la naviera", aliases: ["carta de notificacion", "notificacion", "notice", "carrier letter", "naviera"] },
  { type: "AoR", aliases: ["aor", "appointment", "authority"] },
  { type: "Carta de subrogación o LoA", aliases: ["carta de subrogacion", "subrogacion", "subrogation", "loa", "letter of authority"] },
  { type: "Carta de asignación de derechos", aliases: ["carta de asignacion de derechos", "asignacion de derechos", "assignment of rights", "rights assignment"] },
  { type: "BL", aliases: ["bl", "bill of lading", "b/l", "conocimiento"] },
  { type: "Booking", aliases: ["booking", "reserva"] },
  { type: "Factura de exportación", aliases: ["factura de exportacion", "factura", "invoice", "export invoice"] },
  { type: "Nota de crédito", aliases: ["nota de credito", "nota credito", "credit note", "credit memo"] },
  { type: "Correspondencia de notificación", aliases: ["correo de notificacion", "correspondencia de notificacion", "email de notificacion", "notification email", "carrier email", "correo naviera"] },
  { type: "DUS", aliases: ["dus", "declaracion unica"] },
  { type: "IVV", aliases: ["ivv"] },
  { type: "Packing List", aliases: ["packing", "packing list", "lista empaque"] },
  { type: "Certificado fitosanitario", aliases: ["fitosanitario", "phytosanitary", "phyto"] },
  { type: "Certificado de origen", aliases: ["origen", "origin certificate"] },
  { type: "Liquidaciones comparativas o informe de mercado", aliases: ["liquidaciones comparativas", "informe de mercado", "informe mercado", "market", "freshtech", "usda", "comparativa", "liquidacion comparativa"] },
  { type: "Liquidación por contenedor", aliases: ["liquidacion por contenedor", "liquidacion contenedor", "container settlement", "settlement"] },
  { type: "Tracking (naviera)", aliases: ["tracking", "trace", "naviera tracking"] },
  { type: "Informes de QC en origen y destino", aliases: ["qc", "quality control", "origen destino"] },
  { type: "Reportes de inspección", aliases: ["inspection", "survey", "reporte inspeccion", "inspeccion"] },
  { type: "Certificado de cosecha", aliases: ["cosecha", "harvest"] },
  { type: "Registros de termógrafos", aliases: ["termografo", "thermograph", "temperature", "temperatura", "logger"] },
  { type: "Certificado de destrucción", aliases: ["certificado de destruccion", "destruction certificate"] },
  { type: "Factura de destrucción", aliases: ["factura de destruccion", "destruction invoice"] }
] as const;

const DIRECT_DOCUMENT_ALIASES = DOCUMENT_ALIASES.flatMap((entry) =>
  entry.aliases.map((alias) => ({ type: entry.type as DocumentType, alias: normalizeDocumentText(alias) }))
).sort((left, right) => right.alias.length - left.alias.length);

const fuse = new Fuse(
  DOCUMENT_ALIASES.flatMap((entry) =>
    entry.aliases.map((alias) => ({ type: entry.type as DocumentType, alias }))
  ),
  {
    keys: ["alias"],
    threshold: 0.35,
    includeScore: true
  }
);

export const STATUS_SEQUENCE: CaseStatus[] = [
  "Datos incompletos",
  "Preclaim",
  "Documentación pendiente",
  "Cálculo completo",
  "Traspasado a FIS",
  "Traspasado a Lawgistic"
];

function classifyNormalized(value: string, allowFuzzy: boolean) {
  const normalized = normalizeDocumentText(value);
  const exactBl = /\b(b\/l|bl|bill of lading)\b/.test(normalized);
  const qcReport = /\b(qc|quality control)\b/.test(normalized) && /\b(origen|destino)\b/.test(normalized);
  if (exactBl) return "BL";
  if (qcReport) return "Informes de QC en origen y destino";
  const directMatch = DIRECT_DOCUMENT_ALIASES.find((entry) => normalized.includes(entry.alias));
  if (directMatch) return directMatch.type;
  if (!allowFuzzy) return "Sin clasificar";
  const result = fuse.search(normalized)[0];
  return result && (result.score ?? 1) < 0.35 ? result.item.type : "Sin clasificar";
}

export function classifyDocument(fileName: string, content = ""): DocumentType {
  const fromName = classifyNormalized(fileName, true);
  if (fromName !== "Sin clasificar") return fromName;
  return classifyNormalized(content, false);
}

export function documentClassificationConfidence(fileName: string, content: string, type: DocumentType): "Alta" | "Media" | "Baja" {
  if (type === "Sin clasificar") return "Baja";
  if (classifyNormalized(fileName, true) === type) return "Alta";
  if (classifyNormalized(content, false) === type) return "Media";
  return "Baja";
}

export function abbreviateDocumentType(type: DocumentType): string {
  const map: Record<DocumentType, string> = {
    "Carta de notificación a la naviera": "NOTIFICACION_NAVIERA",
    AoR: "AOR",
    "Carta de subrogación o LoA": "LOA_SUBROGACION",
    "Carta de asignación de derechos": "ASIGNACION_DERECHOS",
    BL: "BL",
    Booking: "BOOKING",
    "Factura de exportación": "FACTURA_EXPORTACION",
    "Nota de crédito": "NOTA_CREDITO",
    "Correspondencia de notificación": "CORRESPONDENCIA_NOTIFICACION",
    DUS: "DUS",
    IVV: "IVV",
    "Packing List": "PACKING_LIST",
    "Certificado fitosanitario": "CERTIFICADO_FITOSANITARIO",
    "Certificado de origen": "CERTIFICADO_ORIGEN",
    "Liquidaciones comparativas o informe de mercado": "INFORME_MERCADO",
    "Liquidación por contenedor": "LIQUIDACION_CONTENEDOR",
    "Tracking (naviera)": "TRACKING_NAVIERA",
    "Informes de QC en origen y destino": "QC_ORIGEN_DESTINO",
    "Reportes de inspección": "REPORTE_INSPECCION",
    "Certificado de cosecha": "CERTIFICADO_COSECHA",
    "Registros de termógrafos": "TERMOGRAFOS",
    "Certificado de destrucción": "CERTIFICADO_DESTRUCCION",
    "Factura de destrucción": "FACTURA_DESTRUCCION",
    "Sin clasificar": "SIN_CLASIFICAR"
  };
  return map[type];
}

export function renamedFile(referenceNo: string, type: DocumentType, originalName: string): string {
  const extension = originalName.includes(".") ? originalName.split(".").pop() : "file";
  const safeReference = referenceNo.replace(/[^\w-]+/g, "-").replace(/-+/g, "-");
  return `${safeReference}_${abbreviateDocumentType(type)}.${extension}`;
}

export const PRESCRIPTION_RULES: Record<Jurisdiccion, { label: string; years: number; scope: string }> = {
  LaHaya: { label: "La Haya", years: 1, scope: "Regla marítima general" },
  Hamburgo: { label: "Hamburgo", years: 2, scope: "Chile/Perú marítimo" }
};

export function calculatePrescription(dateOfDischarge?: string, jurisdiccion?: Jurisdiccion): string | undefined {
  if (!dateOfDischarge || !jurisdiccion) return undefined;
  const base = new Date(`${dateOfDischarge}T00:00:00`);
  if (Number.isNaN(base.getTime())) return undefined;
  base.setFullYear(base.getFullYear() + PRESCRIPTION_RULES[jurisdiccion].years);
  return base.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, to = new Date()): number {
  const from = new Date(`${fromIso.slice(0, 10)}T00:00:00`);
  const target = new Date(to.toISOString().slice(0, 10) + "T00:00:00");
  return Math.ceil((from.getTime() - target.getTime()) / 86_400_000);
}

export function prescriptionStatus(caso: Caso): {
  label: string;
  tone: "ok" | "warn" | "danger" | "missing";
  days?: number;
} {
  if (!caso.dateOfDischarge) {
    return { label: "Falta fecha de descarga", tone: "missing" };
  }
  if (!caso.jurisdiccion) {
    return { label: "Jurisdicción sin confirmar", tone: "missing" };
  }
  const fechaPrescripcion = calculatePrescription(caso.dateOfDischarge, caso.jurisdiccion);
  if (!fechaPrescripcion) return { label: "No calculable", tone: "missing" };
  const days = daysBetween(fechaPrescripcion);
  const etaPrefix = caso.dateOfDischargeType === "ETA" ? "ETA · " : "";
  if (days < 15) return { label: `${etaPrefix}${days < 0 ? `Vencido hace ${Math.abs(days)} días` : `${days} días para prescribir`}`, tone: "danger", days };
  if (days <= 60 || caso.dateOfDischargeType === "ETA") return { label: `${etaPrefix}${days} días para prescribir`, tone: "warn", days };
  return { label: `${days} días para prescribir`, tone: "ok", days };
}

export function isInactivityEligible(caso: Caso): boolean {
  return !INACTIVITY_EXCLUDED_STATUSES.includes(caso.estado);
}

export function lastMovementAt(caso: Caso, events: BitacoraEvento[] = []): string {
  const validEvents = events
    .filter((event) => event.casoId === caso.id && INACTIVITY_EVENT_TYPES.includes(event.tipoEvento))
    .map((event) => event.timestamp)
    .filter((timestamp) => !Number.isNaN(new Date(timestamp).getTime()))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime());
  return validEvents[0] || caso.ultimaActualizacion || caso.createdAt;
}

function calendarDateInTimeZone(value: Date, timeZone = INACTIVITY_ALERT_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function daysWithoutMovement(caso: Caso, events: BitacoraEvento[] = [], referenceDate = new Date()): number {
  const updated = new Date(lastMovementAt(caso, events));
  if (Number.isNaN(updated.getTime())) return 0;
  const updatedDate = new Date(`${calendarDateInTimeZone(updated)}T00:00:00Z`);
  const reference = new Date(`${calendarDateInTimeZone(referenceDate)}T00:00:00Z`);
  return Math.max(0, Math.floor((reference.getTime() - updatedDate.getTime()) / 86_400_000));
}

export type InactivityAlertSnapshot = {
  active: boolean;
  staleDays: number;
  thresholdDays: number;
  emailRequired: boolean;
  channels: InactivityAlertChannel[];
  recipients: string;
  recurrence: "diaria";
  state?: InactivityAlertState["estado"];
  readAt?: string;
};

export function inactivityAlert(
  caso: Caso,
  events: BitacoraEvento[] = [],
  referenceDate = new Date()
): InactivityAlertSnapshot {
  const staleDays = daysWithoutMovement(caso, events, referenceDate);
  const alertState = caso.alertaInactividad;
  const lastMovement = new Date(lastMovementAt(caso, events)).getTime();
  const lastHandled = alertState?.lastHandledAt ? new Date(alertState.lastHandledAt).getTime() : undefined;
  const handledAfterLastMovement = lastHandled !== undefined && !Number.isNaN(lastHandled) && lastHandled >= lastMovement;
  const eligible = isInactivityEligible(caso);
  const active = eligible && staleDays >= INACTIVITY_ALERT_DAYS && !handledAfterLastMovement;
  const emailRequired = prescriptionStatus(caso).tone !== "ok" || staleDays >= 20;
  return {
    active,
    staleDays,
    thresholdDays: INACTIVITY_ALERT_DAYS,
    emailRequired,
    channels: emailRequired ? ["plataforma", "correo"] : ["plataforma"],
    recipients: INACTIVITY_ALERT_RECIPIENTS,
    recurrence: "diaria",
    state: alertState?.estado,
    readAt: alertState?.readAt
  };
}

export function hasRequiredMinimum(input: NewCaseInput): boolean {
  return Boolean(
    input.claimHandler &&
      input.assured &&
      input.opponent &&
      input.vessel &&
      input.dateOfDischarge &&
      input.jurisdiccion
  );
}

const REFERENCE_SEQUENCE_START = 4029;
const CASE_REFERENCE_PATTERN = /^PRE-FIS(?:\/([A-Z0-9]{2,10}))?-([A-Z0-9]{3})-(\d{4})-(\d{2})(?:\/(\d{2}))?-(\d+)$/i;

export const REFERENCE_CHANGE_REASONS = [
  "Error de carrier",
  "Error de prescripción",
  "Duplicación confirmada"
] as const;

const CARRIER_CODE_CATALOG: Record<string, string> = {
  msc: "MSC",
  "h m msc": "HMM",
  hmm: "HMM",
  "hapag lloyd": "HLL",
  hapaglloyd: "HLL",
  hll: "HLL",
  maersk: "MAE",
  mae: "MAE",
  "one": "ONE",
  "ocean network express": "ONE",
  "wan hai": "WAN",
  wan: "WAN",
  evergreen: "EVE",
  cosco: "COS",
  cma: "CMA",
  "cma cgm": "CMA"
};

export type CaseReferenceParts = {
  clientCode?: string;
  opponentCode: string;
  assignmentYear: number;
  prescriptionMonth: string;
  prescriptionYear?: string;
  correlativo: number;
};

export function normalizeCaseReference(value: string): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseCaseReference(value?: string): CaseReferenceParts | undefined {
  const match = value?.trim().match(CASE_REFERENCE_PATTERN);
  if (!match) return undefined;
  return {
    clientCode: match[1]?.toUpperCase(),
    opponentCode: match[2].toUpperCase(),
    assignmentYear: Number(match[3]),
    prescriptionMonth: match[4],
    prescriptionYear: match[5],
    correlativo: Number(match[6])
  };
}

export function isCanonicalCaseReference(value?: string): boolean {
  return Boolean(value && CASE_REFERENCE_PATTERN.test(value.trim()));
}

export function resolveCarrierCode(opponent?: string): string {
  const normalized = opponent?.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]+/g, "").replace(/\s+/g, " ") || "opp";
  return CARRIER_CODE_CATALOG[normalized] || normalized.replace(/\s/g, "").slice(0, 3).padEnd(3, "X").toUpperCase();
}

export function nextCaseReferenceSequence(cases: Pick<Caso, "id">[]): string {
  const lastSequence = cases.reduce((max, caso) => {
    const sequence = parseCaseReference(caso.id)?.correlativo;
    return sequence && Number.isFinite(sequence) ? Math.max(max, sequence) : max;
  }, REFERENCE_SEQUENCE_START - 1);
  return String(lastSequence + 1).padStart(4, "0");
}

export function referencePrescriptionMismatch(
  reference: string | undefined,
  dateOfDischarge: string | undefined,
  jurisdiccion: Jurisdiccion | undefined
) {
  const parts = parseCaseReference(reference);
  const prescriptionDate = calculatePrescription(dateOfDischarge, jurisdiccion);
  if (!parts || !prescriptionDate) return undefined;
  const expectedMonth = prescriptionDate.slice(5, 7);
  const expectedYear = prescriptionDate.slice(2, 4);
  const currentPeriod = parts.prescriptionYear ? `${parts.prescriptionMonth}/${parts.prescriptionYear}` : parts.prescriptionMonth;
  const expectedPeriod = `${expectedMonth}/${expectedYear}`;
  if (currentPeriod === expectedPeriod || (!parts.prescriptionYear && parts.prescriptionMonth === expectedMonth)) return undefined;
  return {
    currentPeriod,
    expectedPeriod,
    prescriptionDate
  };
}

export function buildCaseId(input: NewCaseInput, cases: Pick<Caso, "id">[], assignmentDate = new Date()): string {
  if (input.id?.trim()) return input.id.trim().toUpperCase();
  const opponent = resolveCarrierCode(input.opponent);
  const prescriptionDate = calculatePrescription(input.dateOfDischarge, input.jurisdiccion);
  const prescriptionPeriod = prescriptionDate ? `${prescriptionDate.slice(5, 7)}/${prescriptionDate.slice(2, 4)}` : "00/00";
  const clientPrefix = input.codigoCliente?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `PRE-FIS${clientPrefix ? `/${clientPrefix}` : ""}-${opponent}-${assignmentDate.getFullYear()}-${prescriptionPeriod}-${nextCaseReferenceSequence(cases)}`;
}

export function buildCasoFromInput(input: NewCaseInput, cases: Pick<Caso, "id">[], complete: boolean): Caso {
  const now = new Date().toISOString();
  const id = buildCaseId(input, cases);
  return {
    id,
    codigoCliente: input.codigoCliente?.trim().toUpperCase() || undefined,
    claimHandler: input.claimHandler,
    csClaimNo: input.csClaimNo,
    assured: input.assured || "",
    consignee: input.consignee,
    opponent: input.opponent || "",
    vessel: input.vessel || "",
    voyage: input.voyage,
    cargo: input.cargo,
    placeOfShipment: input.placeOfShipment,
    dateOfShipment: input.dateOfShipment,
    placeOfDischarge: input.placeOfDischarge,
    dateOfDischarge: input.dateOfDischarge,
    dateOfDischargeType: input.dateOfDischargeType || "Real",
    surveyor: input.surveyor,
    claimAmount: input.claimAmount,
    jurisdiccion: input.jurisdiccion,
    fechaPrescripcion: calculatePrescription(input.dateOfDischarge, input.jurisdiccion),
    causaDano: input.causaDano,
    tipoCaso: input.tipoCaso,
    resumenCaso: input.resumenCaso,
    causaPotencial: input.causaPotencial,
    fuentesCausa: input.fuentesCausa,
    propuestaPerdida: input.propuestaPerdida,
    inspectorAsignado: input.inspectorAsignado,
    estado: complete && hasRequiredMinimum(input) ? "Preclaim" : "Datos incompletos",
    ultimaActualizacion: now,
    createdAt: now
  };
}

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

export type DocumentChecklistItem = {
  type: DocumentType;
  status: DocumentStatus;
  required: boolean;
  reason: string;
  documents: Documento[];
};

function isDestructionCase(caso: Caso) {
  const text = `${caso.tipoCaso || ""} ${caso.causaDano || ""} ${caso.resumenCaso || ""}`.toLowerCase();
  return /destrucci[oó]n|p[eé]rdida total|p[eé]rdida parcial/.test(text);
}

export function documentChecklist(caso: Caso, documentos: Documento[], calculo?: CalculoPerdida): DocumentChecklistItem[] {
  const required = new Map<DocumentType, string>([
    ["BL", "Siempre requerido para identificar el embarque."],
    ["Carta de notificación a la naviera", "Documento base para preservar derechos frente al transportista."],
    ["Correspondencia de notificación", "Debe conservarse el correo o correspondencia de envío a la naviera en PDF."]
  ]);
  if (caso.causaDano?.toLowerCase().includes("temperatura")) required.set("Registros de termógrafos", "Aplica cuando la causa del caso es temperatura.");
  if (calculo?.metodoSeleccionado === "1") required.set("Liquidaciones comparativas o informe de mercado", "Aplica porque se seleccionó el método de embarque comparable.");
  if (calculo?.metodoSeleccionado === "2") required.set("Liquidaciones comparativas o informe de mercado", "Aplica porque se seleccionó el método de reporte de mercado.");
  if (calculo?.metodoSeleccionado === "3") {
    required.set("Factura de exportación", "Aplica porque se seleccionó el método factura versus venta destino.");
    required.set("Liquidación por contenedor", "Respalda la venta neta real del embarque afectado.");
  }
  if (calculo?.ventaAFirme) required.set("Nota de crédito", "Aplica cuando el caso es una venta a firme.");
  if (isDestructionCase(caso)) {
    required.set("Certificado de destrucción", "Aplica en pérdida total o parcial con destrucción documentada.");
    required.set("Factura de destrucción", "Aplica cuando existe un costo de destrucción reclamable.");
  }

  return DOCUMENT_TYPES.map((type) => {
    const docs = documentos.filter((doc) => doc.tipoDocumento === type && doc.disponible);
    const override = caso.documentStatuses?.[type];
    const documentStatus = docs.find((doc) => doc.estadoDocumental)?.estadoDocumental;
    const status = override || documentStatus || (docs.length > 0 ? "recibido" : required.has(type) ? "faltante" : "no aplica");
    return {
      type,
      status,
      required: required.has(type),
      reason: required.get(type) || "No definido como obligatorio para este caso.",
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
    { id: "rights-assignment", label: "Carta de asignación de derechos", types: ["Carta de asignación de derechos"] },
    { id: "export-invoice", label: "Factura de exportación", types: ["Factura de exportación"] },
    { id: "packing-list", label: "Packing List", types: ["Packing List"] },
    { id: "transport-document", label: "BL / AWB", types: ["BL"] },
    { id: "sale-support", label: "Liquidación de venta o Nota de crédito", types: ["Liquidación por contenedor", "Nota de crédito"] },
    { id: "inspection-report", label: "Reporte de inspección", types: ["Reportes de inspección"], pendingAllowed: true },
    { id: "comparable-market", label: "Liquidación comparativa o reporte de mercado", types: ["Liquidaciones comparativas o informe de mercado"] },
    { id: "claim-notice", label: "Claim Notice / notificación a la naviera", types: ["Carta de notificación a la naviera"] },
    { id: "aor", label: "AoR", types: ["AoR"], pendingAllowed: true }
  ];
}

export function isTransferDocumentRuleSatisfied(rule: TransferDocumentRule, documentos: Documento[]) {
  return documentos.some((documento) => {
    if (!rule.types.includes(documento.tipoDocumento) || !documento.disponible) return false;
    const status = documento.estadoDocumental;
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

export function calculateLoss(input: CalculoPerdida): CalculoPerdida {
  const sourceCurrency = input.monedaOrigen || input.moneda;
  const requiresConversion = sourceCurrency !== input.moneda;
  const conversionRate = requiresConversion ? input.tipoCambio : 1;
  const round = (value: number, decimals: number) => {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  };
  const convert = (value?: number) => {
    if (value === undefined || !Number.isFinite(value)) return undefined;
    if (!requiresConversion) return value;
    if (conversionRate === undefined || !Number.isFinite(conversionRate) || conversionRate <= 0) return undefined;
    return value * conversionRate;
  };
  const normalizeReference = (value: number | undefined, referenceQuantity: number | undefined) => {
    if (value === undefined || !Number.isFinite(value)) return undefined;
    if (referenceQuantity === undefined || input.cantidadAfectada === undefined) return value;
    if (!Number.isFinite(referenceQuantity) || !Number.isFinite(input.cantidadAfectada) || referenceQuantity <= 0 || input.cantidadAfectada <= 0) return undefined;
    return (value / referenceQuantity) * input.cantidadAfectada;
  };
  const converted = (reference?: number, actual?: number) => {
    const convertedReference = convert(reference);
    const convertedActual = convert(actual);
    return convertedReference !== undefined && convertedActual !== undefined
      ? round(convertedReference - convertedActual, 4)
      : undefined;
  };
  const metodo1 =
    converted(normalizeReference(input.metodo1_liquidacionComparativa, input.metodo1_cantidadReferencia), input.metodo1_liquidacionReal);
  const metodo2 =
    converted(normalizeReference(input.metodo2_valorReporteMercado, input.metodo2_cantidadReferencia), input.metodo2_liquidacionReal);
  const metodo3VentaNeta = input.metodo3_ventaNetaDestino ?? input.metodo3_ventaBrutaDestino;
  const metodo3 =
    converted(input.metodo3_valorFactura, metodo3VentaNeta);
  const selectedBaseResult = input.ventaAFirme
    ? convert(input.notaCreditoValor)
    : input.metodoSeleccionado === "1"
      ? metodo1
      : input.metodoSeleccionado === "2"
        ? metodo2
      : input.metodoSeleccionado === "3"
        ? metodo3
        : undefined;
  const rubrosTotal = input.rubrosAdicionales.reduce((sum, rubro) => sum + (convert(rubro.monto) || 0), 0);
  const selectedResult = selectedBaseResult !== undefined ? round(selectedBaseResult + rubrosTotal, 4) : undefined;
  return {
    ...input,
    metodo1_resultado: metodo1,
    metodo2_resultado: metodo2,
    metodo3_resultado: metodo3,
    metodo3_ventaNetaDestino: metodo3VentaNeta,
    resultadoSeleccionadoFirmado: selectedResult,
    montoFinalReclamo: selectedResult !== undefined ? round(Math.max(selectedResult, 0), 2) : undefined,
    updatedAt: new Date().toISOString()
  };
}

export function currency(value?: number, moneda: CurrencyCode = "USD"): string {
  if (value === undefined || Number.isNaN(value)) return "Sin datos";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function canEditCalculation(caso: Caso): boolean {
  return Boolean(caso.id);
}

export function nextStatusFromCase(caso: Caso, docs: Documento[], calculo?: CalculoPerdida): CaseStatus {
  const checklist = documentChecklist(caso, docs, calculo);
  const missingRequired = checklist.filter((item) => item.required && !isChecklistItemComplete(item));
  if (caso.estado === "Datos incompletos") return hasCasoMinimum(caso) ? "Preclaim" : "Datos incompletos";
  if (caso.estado === "Preclaim" || caso.estado === "Documentación pendiente") {
    if (missingRequired.length > 0) return "Documentación pendiente";
    if (calculo?.metodoSeleccionado || calculo?.ventaAFirme) return "Cálculo completo";
    return "Preclaim";
  }
  return caso.estado;
}

export function hasCasoMinimum(caso: Caso): boolean {
  return Boolean(caso.claimHandler && caso.assured && caso.opponent && caso.vessel && caso.dateOfDischarge && caso.jurisdiccion);
}

export function suggestDamageMerit(
  registered: number,
  min: number,
  max: number
): { deviation: number; meritoSugerido: "Alto" | "Medio" | "Bajo" } {
  const deviation = registered < min ? registered - min : registered > max ? registered - max : 0;
  const absolute = Math.abs(deviation);
  const meritoSugerido = absolute >= 4 ? "Alto" : absolute >= 2 ? "Medio" : "Bajo";
  return { deviation, meritoSugerido };
}

export function pendingField(value?: string | number): string {
  if (value === undefined || value === "") return "[PENDIENTE COMPLETAR]";
  return String(value);
}
