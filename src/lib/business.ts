import Fuse from "fuse.js";
import {
  CalculoPerdida,
  CaseStatus,
  Caso,
  DocumentType,
  Documento,
  CurrencyCode,
  Jurisdiccion,
  NewCaseInput
} from "../types/domain";

export const STORAGE_PREFIX = "fis-intervent-demo:";

export const HANDLERS = ["Emely Lambraño", "Camila Rojas", "Mateo Silva"];

export const INSPECTORS = ["Valentina Soto"];

export const INACTIVITY_ALERT_DAYS = 15;

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
  "BL",
  "Booking",
  "Factura de exportación",
  "DUS",
  "Packing List",
  "Certificado fitosanitario",
  "Certificado de origen",
  "Liquidaciones comparativas o informe de mercado",
  "Liquidación por contenedor",
  "Tracking (naviera)",
  "Informes de QC en origen y destino",
  "Reportes de inspección",
  "Certificado de cosecha",
  "Registros de termógrafos"
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
  { type: "BL", aliases: ["bl", "bill of lading", "b/l", "conocimiento"] },
  { type: "Booking", aliases: ["booking", "reserva"] },
  { type: "Factura de exportación", aliases: ["factura de exportacion", "factura", "invoice", "export invoice"] },
  { type: "DUS", aliases: ["dus", "declaracion unica"] },
  { type: "Packing List", aliases: ["packing", "packing list", "lista empaque"] },
  { type: "Certificado fitosanitario", aliases: ["fitosanitario", "phytosanitary", "phyto"] },
  { type: "Certificado de origen", aliases: ["origen", "origin certificate"] },
  { type: "Liquidaciones comparativas o informe de mercado", aliases: ["liquidaciones comparativas", "informe de mercado", "informe mercado", "market", "freshtech", "usda", "comparativa", "liquidacion comparativa"] },
  { type: "Liquidación por contenedor", aliases: ["liquidacion por contenedor", "liquidacion contenedor", "container settlement", "settlement"] },
  { type: "Tracking (naviera)", aliases: ["tracking", "trace", "naviera tracking"] },
  { type: "Informes de QC en origen y destino", aliases: ["qc", "quality control", "origen destino"] },
  { type: "Reportes de inspección", aliases: ["inspection", "survey", "reporte inspeccion", "inspeccion"] },
  { type: "Certificado de cosecha", aliases: ["cosecha", "harvest"] },
  { type: "Registros de termógrafos", aliases: ["termografo", "thermograph", "temperature", "temperatura", "logger"] }
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
    BL: "BL",
    Booking: "BOOKING",
    "Factura de exportación": "FACTURA_EXPORTACION",
    DUS: "DUS",
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
    "Sin clasificar": "SIN_CLASIFICAR"
  };
  return map[type];
}

export function renamedFile(referenceNo: string, type: DocumentType, originalName: string): string {
  const extension = originalName.includes(".") ? originalName.split(".").pop() : "file";
  const safeReference = referenceNo.replace(/[^\w-]+/g, "-").replace(/-+/g, "-");
  return `${safeReference}_${abbreviateDocumentType(type)}.${extension}`;
}

export function calculatePrescription(dateOfDischarge?: string, jurisdiccion?: Jurisdiccion): string | undefined {
  if (!dateOfDischarge || !jurisdiccion) return undefined;
  const base = new Date(`${dateOfDischarge}T00:00:00`);
  if (Number.isNaN(base.getTime())) return undefined;
  base.setFullYear(base.getFullYear() + (jurisdiccion === "Hamburgo" ? 2 : 1));
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
  if (days < 15) return { label: days < 0 ? `Vencido hace ${Math.abs(days)} días` : `${days} días para prescribir`, tone: "danger", days };
  if (days <= 60) return { label: `${days} días para prescribir`, tone: "warn", days };
  return { label: `${days} días para prescribir`, tone: "ok", days };
}

export function daysWithoutMovement(caso: Caso): number {
  const updated = new Date(caso.ultimaActualizacion);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - updated.getTime()) / 86_400_000));
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

export function buildCaseId(input: NewCaseInput, index: number): string {
  if (input.id?.trim()) return input.id.trim();
  const opponent = (input.opponent || "OPP").slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, "X");
  const date = input.dateOfDischarge ? new Date(`${input.dateOfDischarge}T00:00:00`) : new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `PRE-FIS-${opponent}-${yyyy}-${mm}-${String(index + 4029).padStart(4, "0")}`;
}

export function buildCasoFromInput(input: NewCaseInput, index: number, complete: boolean): Caso {
  const now = new Date().toISOString();
  const id = buildCaseId(input, index);
  return {
    id,
    claimHandler: input.claimHandler,
    csClaimNo: input.csClaimNo,
    assured: input.assured || "",
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

export function calculateLoss(input: CalculoPerdida): CalculoPerdida {
  const sourceCurrency = input.monedaOrigen || input.moneda;
  const requiresConversion = sourceCurrency !== input.moneda;
  const conversionRate = requiresConversion ? input.tipoCambio : 1;
  const convert = (value?: number) => {
    if (value === undefined || !Number.isFinite(value)) return undefined;
    if (!requiresConversion) return value;
    if (conversionRate === undefined || !Number.isFinite(conversionRate) || conversionRate <= 0) return undefined;
    return value * conversionRate;
  };
  const converted = (reference?: number, actual?: number) => {
    const convertedReference = convert(reference);
    const convertedActual = convert(actual);
    return convertedReference !== undefined && convertedActual !== undefined ? convertedReference - convertedActual : undefined;
  };
  const metodo1 =
    converted(input.metodo1_liquidacionComparativa, input.metodo1_liquidacionReal);
  const metodo2 =
    converted(input.metodo2_valorReporteMercado, input.metodo2_liquidacionReal);
  const metodo3 =
    converted(input.metodo3_valorFactura, input.metodo3_ventaBrutaDestino);
  const selectedResult = input.ventaAFirme
    ? convert(input.notaCreditoValor)
    : input.metodoSeleccionado === "1"
      ? metodo1
      : input.metodoSeleccionado === "2"
        ? metodo2
        : input.metodoSeleccionado === "3"
          ? metodo3
          : undefined;
  const rubrosTotal = input.rubrosAdicionales.reduce((sum, rubro) => sum + (convert(rubro.monto) || 0), 0);
  return {
    ...input,
    metodo1_resultado: metodo1,
    metodo2_resultado: metodo2,
    metodo3_resultado: metodo3,
    montoFinalReclamo: selectedResult !== undefined ? selectedResult + rubrosTotal : undefined,
    updatedAt: new Date().toISOString()
  };
}

export function currency(value?: number, moneda: CurrencyCode = "USD"): string {
  if (value === undefined || Number.isNaN(value)) return "Sin datos";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: moneda === "CLP" ? 0 : 2
  }).format(value);
}

export function canEditCalculation(caso: Caso): boolean {
  return caso.estado !== "Traspasado a FIS" && caso.estado !== "Traspasado a Lawgistic";
}

export function nextStatusFromCase(caso: Caso, docs: Documento[], calculo?: CalculoPerdida): CaseStatus {
  const completeness = documentCompleteness(docs);
  if (caso.estado === "Datos incompletos") return hasCasoMinimum(caso) ? "Preclaim" : "Datos incompletos";
  if (caso.estado === "Preclaim" || caso.estado === "Documentación pendiente") {
    if (completeness.missing.length > 0) return "Documentación pendiente";
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
