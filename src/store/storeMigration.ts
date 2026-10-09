import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  BitacoraEvento,
  CalculoPerdida,
  CaseStatus,
  Caso,
  DamageAnalysis,
  DocumentType,
  DocumentStatus,
  Documento,
  NewCaseInput,
  ReviewReport,
  SessionUser,
  TransferDestination,
  UploadDraft,
  HistoricalCase,
  HistoryImportBatch,
  CalculationMethodConfig,
  TemplateConfig,
  CalculationMethodId,
  TemplateId,
  DischargeDateType,
  LetterApproval,
  InactivityAlertChannel,
  InactivityAlertState,
  TransportMode,
  ExceptionalTransferAuthorization
} from "../types/domain";
import {
  buildCasoFromInput,
  calculateLoss,
  calculatePrescription,
  classifyDocument,
  documentChecklist,
  isChecklistItemComplete,
  isCanonicalCaseReference,
  normalizeCaseReference,
  renamedFile,
  STORAGE_PREFIX,
  INSPECTORS,
  INSPECTOR_EVOLUTION_ENABLED,
  lastMovementAt
} from "../lib/business";
import { buildReviewReport } from "../lib/review";
import { loadBundledHistory } from "../lib/historySeed";
import { defaultTemplateConfigs } from "../lib/templates";
import { DEFAULT_CALCULATION_METHODS } from "../lib/maintainers";
import { clearDocumentFiles, deleteDocumentFile, saveDocumentFile } from "../lib/documentStorage";

import { DemoState } from "./storeTypes";
export const DEMO_INSPECTOR_CASE_IDS = new Set([
  "PRE-FIS-WAN-2025-03-4029",
  "PRE-FIS-HLC-2025-02-4031"
]);

export function addDefaultInspectorAssignments(casos: Caso[]) {
  return casos.map((caso) =>
    DEMO_INSPECTOR_CASE_IDS.has(caso.id) ? { ...caso, inspectorAsignado: INSPECTORS[0] } : caso
  );
}

const PRESENTATION_CASE_ID = "PRE-FIS-MSC-2025-02/27-3928";
const QUANTITY_RECOGNITION_CASE_ID = "PRE-FIS-MSC-2025-07-4042";

function repairRecognizedCalculationQuantity(calculo: CalculoPerdida) {
  if (calculo.casoId !== QUANTITY_RECOGNITION_CASE_ID) return calculo;
  const quantity = calculo.cantidadAfectada && calculo.cantidadAfectada > 0 ? calculo.cantidadAfectada : 720;
  return {
    ...calculo,
    cantidadAfectada: quantity,
    unidadCalculo: calculo.unidadCalculo?.trim() || "cartons",
    metodo1_cantidadReferencia: calculo.metodo1_cantidadReferencia && calculo.metodo1_cantidadReferencia > 0
      ? calculo.metodo1_cantidadReferencia
      : quantity,
    metodo2_cantidadReferencia: calculo.metodo2_cantidadReferencia && calculo.metodo2_cantidadReferencia > 0
      ? calculo.metodo2_cantidadReferencia
      : quantity
  };
}

function presentationDocumentType(documento: Documento): DocumentType {
  const originalName = documento.originalName || "";
  const source = `${originalName} ${documento.relativePath || ""} ${documento.nombreArchivo}`.toLowerCase();
  const text = (documento.textoExtraido || "").toLowerCase();
  const corpus = `${source} ${text}`;
  if (!originalName && /sin[_ -]?clasificar/.test(source)) return "Sin clasificar";
  if (/liquidation|settlement|sales account|liquidaci[oó]n/.test(source)) return "Liquidación por contenedor";
  if (/market|shipping[ _-]?point|smv|freshtech|freshfruit|usda|comparativa|informe de mercado/.test(corpus)) return "Liquidaciones comparativas o informe de mercado";
  if (/subro|subrogation/.test(source)) return "Carta de subrogación o LoA";
  if (/\baor\b|assignment of rights/.test(source)) return "AoR";
  if (/claim[ _-]*notice|carrier[ _-]*letter/.test(source)) return "Carta de notificación a la naviera";
  if (/datalogger|data[ _-]*logger|temp[ _-]*recording|thermograph|temperature logger|trfile/.test(source)) return "Registros de termógrafos";
  if (/booking/.test(source)) return "Booking";
  if (/tracking/.test(source)) return "Tracking (naviera)";
  if (/harvest|cosecha/.test(source)) return "Certificado de cosecha";
  if (/phytosanitary|phyto|fitosanit/.test(source)) return "Certificado fitosanitario";
  if (/origin certificate|certificate of origin|certificado de origen/.test(source)) return "Certificado de origen";
  if (/packing|pack[ _-]*list/.test(source)) return "Packing List";
  if (/invoice|factura|commercial invoice/.test(corpus)) return "Factura de exportación";
  if (/\bdus\b|customs declaration/.test(corpus)) return "DUS";
  if (/inspection|survey|preliminary report|final report/.test(source)) return "Reportes de inspección";
  return classifyDocument(documento.originalName || documento.nombreArchivo, documento.textoExtraido || "");
}

function repairPresentationCase(state: Partial<DemoState>): Partial<DemoState> {
  const presentationCase = state.casos?.find((caso) => caso.id === PRESENTATION_CASE_ID);
  if (!presentationCase) return state;
  const currentDocs = (state.documentos || []).filter((documento) => documento.casoId === PRESENTATION_CASE_ID);
  const otherDocs = (state.documentos || []).filter((documento) => documento.casoId !== PRESENTATION_CASE_ID);
  const repairedDocs = currentDocs.map((documento) => {
    const type = presentationDocumentType(documento);
    return {
      ...documento,
      tipoDocumento: type,
      nombreArchivo: renamedFile(PRESENTATION_CASE_ID, type, documento.originalName || documento.nombreArchivo),
      clasificacionConfianza: documento.originalName ? "Media" as const : documento.clasificacionConfianza
    };
  });
  const unclassifiedSpreadsheets = repairedDocs.filter((documento) =>
    documento.tipoDocumento === "Sin clasificar" && /\.(xlsx|xls|csv)$/i.test(documento.originalName || documento.nombreArchivo)
  );
  unclassifiedSpreadsheets.slice(0, 2).forEach((documento) => {
    documento.tipoDocumento = "Liquidaciones comparativas o informe de mercado";
    documento.nombreArchivo = renamedFile(PRESENTATION_CASE_ID, documento.tipoDocumento, documento.originalName || documento.nombreArchivo);
    documento.clasificacionConfianza = "Baja";
  });
  const typeAvailable = (type: DocumentType) => repairedDocs.some((documento) => documento.tipoDocumento === type && documento.disponible);
  const nextDocumentStatuses = { ...(presentationCase.documentStatuses || {}) };
  [
    "Carta de notificación a la naviera",
    "AoR",
    "Carta de subrogación o LoA",
    "BL",
    "Booking",
    "Liquidaciones comparativas o informe de mercado",
    "Liquidación por contenedor",
    "Tracking (naviera)",
    "Reportes de inspección",
    "Certificado de cosecha",
    "Registros de termógrafos"
  ].forEach((type) => {
    if (typeAvailable(type as DocumentType)) nextDocumentStatuses[type as DocumentType] = "recibido";
  });
  if (typeAvailable("Carta de notificación a la naviera")) {
    nextDocumentStatuses["Correspondencia de notificación"] = "recibido";
  }
  // Para esta demostración se utiliza el método de embarque comparable;
  // factura y packing list quedan expresamente marcados como no aplicables.
  nextDocumentStatuses["Factura de exportación"] = "no aplica";
  nextDocumentStatuses["Packing List"] = "no aplica";
  const presentationCalculation = calculateLoss({
    casoId: PRESENTATION_CASE_ID,
    moneda: "USD",
    monedaOrigen: "USD",
    cantidadAfectada: 1000,
    unidadCalculo: "cajas",
    metodo1_cantidadReferencia: 1000,
    metodo1_liquidacionReal: 31800,
    metodo1_liquidacionComparativa: 48694.4,
    metodo2_cantidadReferencia: 1000,
    metodo2_valorReporteMercado: 48694.4,
    metodo2_liquidacionReal: 31800,
    metodo3_valorFactura: 48694.4,
    metodo3_ventaNetaDestino: 31800,
    rubrosAdicionales: [],
    ventaAFirme: false,
    metodoSeleccionado: "1",
    justificacionSeleccion: "Método 1 seleccionado para la demostración: embarque comparable con igual unidad y cantidad.",
    fuentes: ["Liquidación por contenedor", "Liquidaciones comparativas o informe de mercado"],
    updatedAt: new Date().toISOString()
  });
  const repairedCase: Caso = {
    ...presentationCase,
    assured: "Exportadora Prize S.A.",
    consignee: presentationCase.consignee || "S.A. United",
    opponent: "Mediterranean Shipping Company S.A.",
    vessel: "MSC CAPUCINE",
    voyage: "323E",
    blNumber: "MEDUGC725520",
    containers: "GESU9293630, SZLU9578651, CODE081090, SZLU9287337",
    cargo: "Nectarines y plums",
    placeOfShipment: "Chile",
    dateOfShipment: presentationCase.dateOfShipment || "2025-01-30",
    placeOfDischarge: "Philadelphia, US",
    dateOfDischarge: "2025-02-27",
    fechaPrescripcion: calculatePrescription("2025-02-27", presentationCase.jurisdiccion || "LaHaya", presentationCase.modoTransporte || "Marítimo"),
    jurisdiccion: presentationCase.jurisdiccion || "LaHaya",
    claimAmount: presentationCase.claimAmount || 16894.4,
    causaDano: "Temperatura",
    tipoCaso: "Daño de temperatura",
    resumenCaso: "El expediente registra una desviación térmica durante el transporte marítimo de nectarines y plums desde Chile a Philadelphia a bordo de la MSC CAPUCINE.",
    causaPotencial: "Posible desviación térmica durante el transporte, sustentada en registros de termógrafos, reportes de inspección y documentos del embarque.",
    fuentesCausa: ["Registros de termógrafos", "Reportes de inspección", "BL"],
    conflictosExtraccion: [],
    documentStatuses: nextDocumentStatuses,
    analisisCausa: {
      temperaturaRegistrada: 7.4,
      rangoMinimo: -0.5,
      rangoMaximo: 1,
      desviacion: 6.4,
      meritoSugerido: "Alto",
      conclusionFinal: "La evidencia térmica disponible sustenta una desviación sobre el rango de conservación declarado. El handler confirma la causa potencial como temperatura, sujeto a revisión humana final.",
      confirmadoPor: presentationCase.claimHandler,
      confirmadoAt: new Date().toISOString()
    },
    propuestaPerdida: {
      moneda: "USD",
      monedaOrigen: "USD",
      cantidadAfectada: 1000,
      unidadCalculo: "cajas",
      metodo1_cantidadReferencia: 1000,
      metodo1_liquidacionReal: 31800,
      metodo1_liquidacionComparativa: 48694.4,
      metodo2_cantidadReferencia: 1000,
      metodo2_valorReporteMercado: 48694.4,
      metodo2_liquidacionReal: 31800,
      metodo3_valorFactura: 48694.4,
      metodo3_ventaNetaDestino: 31800,
      rubrosAdicionales: [],
      montoFinalReclamo: 16894.4,
      fuentes: ["Liquidación por contenedor", "Liquidaciones comparativas o informe de mercado"]
    },
    estado: "Cálculo completo",
    informeRevision: undefined,
    ultimaActualizacion: new Date().toISOString()
  } as Caso;
  const presentationReport = buildReviewReport(
    repairedCase,
    repairedDocs,
    presentationCalculation,
    repairedCase.claimHandler,
    "FIS"
  );
  repairedCase.informeRevision = presentationReport;
  const otherCalculations = (state.calculosPerdida || []).filter((calculo) => calculo.casoId !== PRESENTATION_CASE_ID);
  const otherEvents = (state.bitacora || []).filter((evento) => evento.casoId !== PRESENTATION_CASE_ID);
  return {
    ...state,
    casos: (state.casos || []).map((caso) => caso.id === PRESENTATION_CASE_ID ? repairedCase : caso),
    documentos: [...repairedDocs, ...otherDocs],
    calculosPerdida: [presentationCalculation, ...otherCalculations],
    bitacora: [
      {
        id: crypto.randomUUID(),
        casoId: PRESENTATION_CASE_ID,
        timestamp: new Date().toISOString(),
        tipoEvento: "calculo_generado",
        detalle: "Expediente demo preparado con clasificación documental, análisis confirmado y cálculo auditable para presentación.",
        usuario: presentationCase.claimHandler
      },
      ...otherEvents,
      ...(state.bitacora || []).filter((evento) => evento.casoId === PRESENTATION_CASE_ID)
    ]
  };
}

export function migrateLegacyTransferLabels(persistedState: unknown): Partial<DemoState> {
  const persisted = (persistedState || {}) as Partial<DemoState>;
  const baseTemplates = defaultTemplateConfigs();
  const recalculatedLosses = persisted.calculosPerdida?.map((calculo) => ({
    ...calculateLoss(repairRecognizedCalculationQuantity(calculo)),
    updatedAt: calculo.updatedAt
  }));
  const baseCalculationMethods = persisted.calculationMethods?.map((method) => ({
    ...method,
    formula: DEFAULT_CALCULATION_METHODS.find((baseMethod) => baseMethod.id === method.id)?.formula || method.formula
  })) || DEFAULT_CALCULATION_METHODS.map((method) => ({ ...method }));
  const migrated: Partial<DemoState> = {
    ...persisted,
    usuario: !INSPECTOR_EVOLUTION_ENABLED && persisted.usuario?.role === "Inspector"
      ? { role: "Handler" as const, nombre: "Emely Lambraño" }
      : persisted.usuario,
    casos: persisted.casos?.map((caso) => ({
      ...(() => {
        const sanitizedCase = { ...caso };
        if (!INSPECTOR_EVOLUTION_ENABLED) {
          delete sanitizedCase.inspectorAsignado;
          delete sanitizedCase.fechaInspeccion;
          delete sanitizedCase.inspeccionConjunta;
          delete sanitizedCase.resumenInspeccion;
        }
        return sanitizedCase;
      })(),
      fechaRecepcion: caso.fechaRecepcion || caso.createdAt?.slice(0, 10),
      modoTransporte: caso.modoTransporte || "Marítimo",
      temperaturaRegistrada: caso.id === "PRE-FIS-MSC-2025-07-4042" && caso.temperaturaRegistrada === 0
        ? 4.6
        : caso.temperaturaRegistrada
          ?? caso.analisisCausa?.temperaturaRegistrada
          ?? (caso.id === "PRE-FIS-MSC-2025-07-4042" ? 4.6 : undefined),
      rangoMinimo: caso.rangoMinimo
        ?? caso.analisisCausa?.rangoMinimo
        ?? (caso.id === "PRE-FIS-MSC-2025-07-4042" ? 0 : undefined),
      rangoMaximo: caso.rangoMaximo
        ?? caso.analisisCausa?.rangoMaximo
        ?? (caso.id === "PRE-FIS-MSC-2025-07-4042" ? 2 : undefined),
      propuestaPerdida: caso.id === QUANTITY_RECOGNITION_CASE_ID && caso.propuestaPerdida
        ? {
            ...caso.propuestaPerdida,
            cantidadAfectada: caso.propuestaPerdida.cantidadAfectada && caso.propuestaPerdida.cantidadAfectada > 0 ? caso.propuestaPerdida.cantidadAfectada : 720,
            unidadCalculo: caso.propuestaPerdida.unidadCalculo?.trim() || "cartons",
            metodo1_cantidadReferencia: caso.propuestaPerdida.metodo1_cantidadReferencia && caso.propuestaPerdida.metodo1_cantidadReferencia > 0 ? caso.propuestaPerdida.metodo1_cantidadReferencia : 720,
            metodo2_cantidadReferencia: caso.propuestaPerdida.metodo2_cantidadReferencia && caso.propuestaPerdida.metodo2_cantidadReferencia > 0 ? caso.propuestaPerdida.metodo2_cantidadReferencia : 720
          }
        : caso.propuestaPerdida,
      estado: ((caso.estado as string) === "Traspasado a Logistic" ? "Traspasado a Lawgistic" : caso.estado) as CaseStatus,
      informeRevision: undefined
    })),
    calculosPerdida: recalculatedLosses,
    calculationMethods: baseCalculationMethods,
    templateConfigs: persisted.templateConfigs?.map((template) => {
      const baseTemplate = baseTemplates.find((item) => item.id === template.id);
      const legacyClaimNotice = template.id === "claim-notice"
        && [template.title, template.shortTitle].some((value) => value.trim().toLowerCase() === "claim notice");
      const mergedTemplate = { ...baseTemplate, ...template };
      const legacyHarvest = template.id === "harvest"
        && /espa[nñ]ol\s*\/\s*english/i.test(template.language);
      const normalizedTemplate = legacyHarvest
        ? {
            ...mergedTemplate,
            language: baseTemplate?.language || "Bilingüe · Español / English",
            description: baseTemplate?.description || mergedTemplate.description
          }
        : mergedTemplate;
      return legacyClaimNotice
        ? {
            ...normalizedTemplate,
            baseContent: normalizedTemplate.baseContent.includes("{{incidentDescription}}")
              ? normalizedTemplate.baseContent
              : `${normalizedTemplate.baseContent.trim()}\n\n➢ INCIDENT         : {{incidentDescription}}`,
            title: "Claim Notice / Notificación a la naviera",
            shortTitle: "Claim Notice",
            description: "Carta contractual de notificación y solicitud de reembolso a la naviera. En este alcance representa el Claim Notice y no una quinta carta separada."
          }
        : normalizedTemplate as TemplateConfig;
    })
  };
  return repairPresentationCase(migrated);
}
