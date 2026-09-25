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
  InactivityAlertState
} from "../types/domain";
import {
  buildCasoFromInput,
  calculateLoss,
  calculatePrescription,
  classifyDocument,
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

type DemoState = {
  usuario: SessionUser;
  casos: Caso[];
  documentos: Documento[];
  calculosPerdida: CalculoPerdida[];
  bitacora: BitacoraEvento[];
  historico: HistoricalCase[];
  calculationMethods: CalculationMethodConfig[];
  templateConfigs: TemplateConfig[];
  ultimaImportacionHistorico?: Omit<HistoryImportBatch, "records"> & { records: number };
  historicoCargando: boolean;
  setUsuario: (usuario: SessionUser) => void;
  createCase: (input: NewCaseInput, complete: boolean) => Caso;
  updateCase: (casoId: string, patch: Partial<Caso>) => void;
  updateCaseDetails: (
    casoId: string,
    patch: Partial<Pick<Caso, "id" | "dateOfDischarge" | "dateOfDischargeType" | "jurisdiccion">>,
    referenceChangeReason?: string
  ) => { ok: boolean; error?: string };
  prepareUpload: (files: FileList | File[]) => UploadDraft[];
  confirmUpload: (casoId: string, drafts: UploadDraft[]) => void;
  updateDocumentStatus: (casoId: string, type: DocumentType, status: DocumentStatus) => { ok: boolean; error?: string };
  requestMissingDocuments: (casoId: string, types: DocumentType[]) => { ok: boolean; error?: string };
  registerInactivityAlertSent: (casoId: string, channel: InactivityAlertChannel) => { ok: boolean; error?: string };
  markInactivityAlertRead: (casoId: string) => { ok: boolean; error?: string };
  resolveInactivityAlert: (casoId: string, action: "cerrar" | "silenciar") => { ok: boolean; error?: string };
  removeDocument: (documentId: string) => void;
  saveAnalysis: (casoId: string, analysis: DamageAnalysis) => void;
  saveCalculation: (calculation: CalculoPerdida) => { ok: boolean; error?: string };
  generateReviewReport: (casoId: string, destination: TransferDestination) => ReviewReport | undefined;
  transitionCase: (casoId: string, nextStatus: CaseStatus, detail: string) => { ok: boolean; error?: string };
  revertCase: (casoId: string, previousStatus: CaseStatus, reason: string) => { ok: boolean; error?: string };
  registerLetter: (casoId: string, templateId: TemplateId, fingerprint: string, detail: string) => void;
  approveLetter: (casoId: string, approval: Pick<LetterApproval, "templateId" | "version" | "fingerprint">) => { ok: boolean; error?: string };
  assignInspector: (casoId: string, inspector?: string) => { ok: boolean; error?: string };
  saveInspection: (
    casoId: string,
    patch: Partial<Pick<Caso, "fechaInspeccion" | "inspeccionConjunta" | "resumenInspeccion">>
  ) => { ok: boolean; error?: string };
  updateCalculationMethod: (id: CalculationMethodId, patch: Partial<Omit<CalculationMethodConfig, "id" | "updatedAt">>) => void;
  resetCalculationMethods: () => void;
  updateTemplateConfig: (id: TemplateId, patch: Partial<Omit<TemplateConfig, "id" | "updatedAt">>) => void;
  resetTemplateConfigs: () => void;
  hydrateHistoricalCases: () => Promise<void>;
  resetDemo: () => void;
};

const now = new Date();
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();
const dateOffset = (days: number) => new Date(now.getTime() + days * 86_400_000).toISOString().slice(0, 10);

function event(casoId: string, tipoEvento: BitacoraEvento["tipoEvento"], detalle: string, usuario: string, days = 0): BitacoraEvento {
  return {
    id: crypto.randomUUID(),
    casoId,
    timestamp: daysAgo(days),
    tipoEvento,
    detalle,
    usuario
  };
}

function isTransferredCase(caso?: Caso) {
  return caso?.estado === "Traspasado a FIS" || caso?.estado === "Traspasado a Lawgistic";
}

const seedCases: Caso[] = [
  {
    id: "PRE-FIS-WAN-2025-03-4029",
    claimHandler: "Emely Lambraño",
    csClaimNo: "CS-2025-02892",
    assured: "Exportadora Andes Fresh",
    opponent: "Wan Hai",
    vessel: "YM EXPRESS",
    voyage: "086W",
    placeOfDischarge: "Busan",
    dateOfDischarge: dateOffset(-350),
    surveyor: "Hyopsung Surveyors",
    claimAmount: 68928,
    jurisdiccion: "LaHaya",
    fechaPrescripcion: calculatePrescription(dateOffset(-350), "LaHaya"),
    causaDano: "Temperatura",
    estado: "Preclaim",
    ultimaActualizacion: daysAgo(3),
    createdAt: daysAgo(12),
    analisisCausa: {
      temperaturaRegistrada: 7.4,
      rangoMinimo: -0.5,
      rangoMaximo: 1,
      desviacion: 6.4,
      meritoSugerido: "Alto",
      conclusionFinal: "La desviación térmica sobre el rango exigido da mérito preliminar alto para sostener el reclamo.",
      confirmadoPor: "Emely Lambraño",
      confirmadoAt: daysAgo(2)
    }
  },
  {
    id: "PRE-FIS-HLC-2025-02-4031",
    claimHandler: "Camila Rojas",
    csClaimNo: "CS-2025-03110",
    assured: "Frutera Pacífico",
    opponent: "Hapag-Lloyd",
    vessel: "RIO GRANDE",
    voyage: "044E",
    placeOfDischarge: "Valparaíso",
    dateOfDischarge: dateOffset(-650),
    surveyor: "Global Marine Survey",
    claimAmount: 41100,
    jurisdiccion: "Hamburgo",
    fechaPrescripcion: calculatePrescription(dateOffset(-650), "Hamburgo"),
    causaDano: "Golpe / manipulación",
    estado: "Documentación pendiente",
    ultimaActualizacion: daysAgo(18),
    createdAt: daysAgo(28)
  },
  {
    id: "PRE-FIS-MSC-2025-07-4042",
    claimHandler: "Emely Lambraño",
    csClaimNo: "CS-2025-04420",
    assured: "Agroexport Norte",
    opponent: "MSC",
    vessel: "MSC SOFIA",
    voyage: "119A",
    placeOfDischarge: "Rotterdam",
    dateOfDischarge: dateOffset(-290),
    surveyor: "EuroInspect",
    claimAmount: 22450,
    jurisdiccion: "LaHaya",
    fechaPrescripcion: calculatePrescription(dateOffset(-290), "LaHaya"),
    causaDano: "Temperatura",
    estado: "Cálculo completo",
    ultimaActualizacion: daysAgo(1),
    createdAt: daysAgo(20)
  },
  {
    id: "PRE-FIS-ONE-2025-10-4050",
    claimHandler: "Mateo Silva",
    assured: "Demo sin prescripción completa",
    opponent: "ONE",
    vessel: "ONE HORIZON",
    placeOfDischarge: "Manzanillo",
    causaDano: "Temperatura",
    estado: "Datos incompletos",
    ultimaActualizacion: daysAgo(7),
    createdAt: daysAgo(7)
  }
];

const seedDocs: Documento[] = [
  ["PRE-FIS-WAN-2025-03-4029", "BL", "PRE-FIS-WAN-2025-03-4029_BL.pdf", 11],
  ["PRE-FIS-WAN-2025-03-4029", "Factura de exportación", "PRE-FIS-WAN-2025-03-4029_FACTURA_EXPORTACION.pdf", 10],
  ["PRE-FIS-WAN-2025-03-4029", "Packing List", "PRE-FIS-WAN-2025-03-4029_PACKING_LIST.pdf", 10],
  ["PRE-FIS-WAN-2025-03-4029", "Registros de termógrafos", "PRE-FIS-WAN-2025-03-4029_TERMOGRAFOS.xlsx", 8],
  ["PRE-FIS-WAN-2025-03-4029", "Reportes de inspección", "PRE-FIS-WAN-2025-03-4029_REPORTE_INSPECCION.pdf", 8],
  ["PRE-FIS-HLC-2025-02-4031", "BL", "PRE-FIS-HLC-2025-02-4031_BL.pdf", 24],
  ["PRE-FIS-HLC-2025-02-4031", "Booking", "PRE-FIS-HLC-2025-02-4031_BOOKING.pdf", 22],
  ["PRE-FIS-MSC-2025-07-4042", "BL", "PRE-FIS-MSC-2025-07-4042_BL.pdf", 18],
  ["PRE-FIS-MSC-2025-07-4042", "Factura de exportación", "PRE-FIS-MSC-2025-07-4042_FACTURA_EXPORTACION.pdf", 18],
  ["PRE-FIS-MSC-2025-07-4042", "Liquidaciones comparativas o informe de mercado", "PRE-FIS-MSC-2025-07-4042_INFORME_MERCADO.xlsx", 15],
  ["PRE-FIS-MSC-2025-07-4042", "Registros de termógrafos", "PRE-FIS-MSC-2025-07-4042_TERMOGRAFOS.csv", 15]
].map(([casoId, tipoDocumento, nombreArchivo, days]) => ({
  id: crypto.randomUUID(),
  casoId: String(casoId),
  tipoDocumento: tipoDocumento as DocumentType,
  nombreArchivo: String(nombreArchivo),
  pathMock: `mock://docs/${casoId}/${nombreArchivo}`,
  disponible: true,
  fechaCarga: daysAgo(Number(days))
}));

const seedCalculations: CalculoPerdida[] = [
  calculateLoss({
    casoId: "PRE-FIS-MSC-2025-07-4042",
    moneda: "USD",
    metodo1_liquidacionReal: 31800,
    metodo1_liquidacionComparativa: 45250,
    metodo2_valorReporteMercado: 42100,
    metodo2_liquidacionReal: 31800,
    metodo3_valorFactura: 44100,
    metodo3_ventaBrutaDestino: 32200,
    rubrosAdicionales: [{ concepto: "Salvataje", monto: -1400 }],
    ventaAFirme: false,
    metodoSeleccionado: "1",
    justificacionSeleccion: "SMV seleccionado por existir embarque gemelo comparable en la misma ventana de mercado.",
    updatedAt: daysAgo(1)
  })
];

const seedEvents: BitacoraEvento[] = [
  event("PRE-FIS-WAN-2025-03-4029", "cambio_estado", "Caso creado en estado Preclaim.", "Emely Lambraño", 12),
  event("PRE-FIS-WAN-2025-03-4029", "documento_cargado", "5 documentos registrados como metadata.", "Emely Lambraño", 8),
  event("PRE-FIS-WAN-2025-03-4029", "analisis_confirmado", "Conclusión de causa de daño confirmada por handler.", "Emely Lambraño", 2),
  event("PRE-FIS-HLC-2025-02-4031", "cambio_estado", "Caso marcado con documentación pendiente.", "Camila Rojas", 18),
  event("PRE-FIS-MSC-2025-07-4042", "calculo_generado", "Cálculo de pérdida guardado con Método 1.", "Emely Lambraño", 1)
];

function initialState() {
  return {
    usuario: { role: "Handler" as const, nombre: "Emely Lambraño" },
    casos: seedCases,
    documentos: seedDocs,
    calculosPerdida: seedCalculations,
    bitacora: seedEvents,
    historico: [],
    calculationMethods: DEFAULT_CALCULATION_METHODS,
    templateConfigs: defaultTemplateConfigs(),
    ultimaImportacionHistorico: undefined,
    historicoCargando: false
  };
}

const DEMO_INSPECTOR_CASE_IDS = new Set([
  "PRE-FIS-WAN-2025-03-4029",
  "PRE-FIS-HLC-2025-02-4031"
]);

function addDefaultInspectorAssignments(casos: Caso[]) {
  return casos.map((caso) =>
    DEMO_INSPECTOR_CASE_IDS.has(caso.id) ? { ...caso, inspectorAsignado: INSPECTORS[0] } : caso
  );
}

function migrateLegacyTransferLabels(persistedState: unknown): Partial<DemoState> {
  const persisted = (persistedState || {}) as Partial<DemoState>;
  const baseTemplates = defaultTemplateConfigs();
  const baseCalculationMethods = persisted.calculationMethods?.map((method) => ({
    ...method,
    formula: DEFAULT_CALCULATION_METHODS.find((baseMethod) => baseMethod.id === method.id)?.formula || method.formula
  })) || DEFAULT_CALCULATION_METHODS.map((method) => ({ ...method }));
  return {
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
      estado: ((caso.estado as string) === "Traspasado a Logistic" ? "Traspasado a Lawgistic" : caso.estado) as CaseStatus,
      informeRevision: caso.informeRevision
        ? {
            ...caso.informeRevision,
            status: "Con observaciones",
            ready: false,
            pendingActions: [...new Set([...caso.informeRevision.pendingActions, "Regenerar el informe para validar el checklist de cierre actualizado."])],
            destination: ((caso.informeRevision.destination as string) === "Logistic" ? "Lawgistic" : caso.informeRevision.destination) as TransferDestination
          }
        : undefined
    })),
    calculationMethods: baseCalculationMethods,
    templateConfigs: persisted.templateConfigs?.map((template) => {
      const baseTemplate = baseTemplates.find((item) => item.id === template.id);
      const legacyClaimNotice = template.id === "claim-notice"
        && [template.title, template.shortTitle].some((value) => value.trim().toLowerCase() === "claim notice");
      const mergedTemplate = { ...baseTemplate, ...template };
      return legacyClaimNotice
        ? {
            ...mergedTemplate,
            title: "Claim Notice / Notificación a la naviera",
            shortTitle: "Claim Notice",
            description: "Carta contractual de notificación y solicitud de reembolso a la naviera. En este alcance representa el Claim Notice y no una quinta carta separada."
          }
        : mergedTemplate as TemplateConfig;
    })
  };
}

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => ({
      ...initialState(),
      setUsuario: (usuario) =>
        set((state) => ({
          usuario: !INSPECTOR_EVOLUTION_ENABLED && usuario.role === "Inspector"
            ? { role: "Handler" as const, nombre: "Emely Lambraño" }
            : usuario,
          casos:
            INSPECTOR_EVOLUTION_ENABLED && usuario.role === "Inspector" && !state.casos.some((caso) => caso.inspectorAsignado)
              ? addDefaultInspectorAssignments(state.casos)
              : state.casos
        })),
      createCase: (input, complete) => {
        const caso = buildCasoFromInput(input, get().casos, complete);
        const detail = complete ? "Caso creado desde Guardar y continuar." : "Borrador creado desde Nuevo caso.";
        set((state) => ({
          casos: [caso, ...state.casos],
          bitacora: [
            {
              id: crypto.randomUUID(),
              casoId: caso.id,
              timestamp: new Date().toISOString(),
              tipoEvento: "cambio_estado",
              detalle: detail,
              usuario: state.usuario.nombre
            },
            ...state.bitacora
          ]
        }));
        return caso;
      },
      updateCase: (casoId, patch) => {
        const currentCase = get().casos.find((caso) => caso.id === casoId);
        if (!currentCase) return;
        const nowIso = new Date().toISOString();
        set((state) => ({
          casos: state.casos.map((caso) =>
            caso.id === casoId
              ? {
                  ...caso,
                  ...patch,
                  fechaPrescripcion: calculatePrescription(patch.dateOfDischarge ?? caso.dateOfDischarge, patch.jurisdiccion ?? caso.jurisdiccion),
                  ultimaActualizacion: nowIso
                }
              : caso
          ),
          bitacora: [
            {
              id: crypto.randomUUID(),
              casoId,
              timestamp: nowIso,
              tipoEvento: "extraccion_revisada",
              detalle: "Datos extraídos de documentos revisados y aplicados por el handler.",
              usuario: state.usuario.nombre
            },
            ...state.bitacora
          ]
        }));
      },
      updateCaseDetails: (casoId, patch, referenceChangeReason) => {
        const state = get();
        const current = state.casos.find((caso) => caso.id === casoId);
        if (!current) return { ok: false, error: "No se encontró el caso para actualizar." };
        if (!current) return { ok: false, error: "No se encontró el caso para actualizar." };

        const nextId = patch.id?.trim().toUpperCase() || current.id;
        const normalizedNextId = normalizeCaseReference(nextId);
        const duplicate = state.casos.some(
          (caso) => caso.id !== casoId && normalizeCaseReference(caso.id) === normalizedNextId
        );
        if (duplicate) return { ok: false, error: "La referencia ya existe en otro caso." };
        if (nextId !== current.id) {
          if (state.usuario.role !== "Handler" || state.usuario.nombre !== current.claimHandler) {
            return { ok: false, error: "Solo el Handler responsable puede modificar la referencia." };
          }
          if (!referenceChangeReason?.trim()) {
            return { ok: false, error: "Debes indicar el motivo de modificación de la referencia." };
          }
          if (!isCanonicalCaseReference(nextId)) {
            return { ok: false, error: "La nueva referencia debe usar el formato canónico PRE-FIS-... o PRE-FIS/CLIENTE-... ." };
          }
        }

        const nextDate = patch.dateOfDischarge === undefined ? current.dateOfDischarge : patch.dateOfDischarge;
        const nextDateType: DischargeDateType | undefined =
          patch.dateOfDischargeType === undefined ? current.dateOfDischargeType : patch.dateOfDischargeType;
        const nextJurisdiccion = patch.jurisdiccion === undefined ? current.jurisdiccion : patch.jurisdiccion;
        const nowIso = new Date().toISOString();
        const changedFields: string[] = [];
        if (nextId !== current.id) changedFields.push(`referencia ${current.id} → ${nextId}`);
        if (nextDate !== current.dateOfDischarge) changedFields.push(`fecha ${current.dateOfDischarge || "sin fecha"} → ${nextDate || "sin fecha"}`);
        if (nextDateType !== current.dateOfDischargeType) changedFields.push(`tipo de fecha ${current.dateOfDischargeType || "Real"} → ${nextDateType || "Real"}`);
        if (nextJurisdiccion !== current.jurisdiccion) changedFields.push(`jurisdicción ${current.jurisdiccion || "sin definir"} → ${nextJurisdiccion || "sin definir"}`);

        set((state) => ({
          casos: state.casos.map((caso) =>
            caso.id === casoId
              ? {
                  ...caso,
                  id: nextId,
                  dateOfDischarge: nextDate,
                  dateOfDischargeType: nextDateType,
                  jurisdiccion: nextJurisdiccion,
                  fechaPrescripcion: calculatePrescription(nextDate, nextJurisdiccion),
                  informeRevision: caso.informeRevision
                    ? { ...caso.informeRevision, caseId: nextId }
                    : undefined,
                  ultimaActualizacion: nowIso
                }
              : caso
          ),
          documentos: state.documentos.map((documento) => {
            if (documento.casoId !== casoId) return documento;
            if (nextId === casoId) return { ...documento, casoId: nextId };
            const nombreArchivo = renamedFile(nextId, documento.tipoDocumento, documento.originalName || documento.nombreArchivo);
            return {
              ...documento,
              casoId: nextId,
              nombreArchivo,
              pathMock: `mock://docs/${nextId}/${nombreArchivo}`
            };
          }),
          calculosPerdida: state.calculosPerdida.map((calculo) =>
            calculo.casoId === casoId ? { ...calculo, casoId: nextId } : calculo
          ),
          bitacora: [
            {
              id: crypto.randomUUID(),
              casoId: nextId,
              timestamp: nowIso,
              tipoEvento: "caso_actualizado",
              detalle: `Datos clave actualizados: ${changedFields.join("; ") || "sin cambios"}.${nextId !== current.id ? ` Motivo de cambio de referencia: ${referenceChangeReason}.` : ""} Prescripción recalculada.`,
              usuario: state.usuario.nombre
            },
            ...state.bitacora.map((evento) => (evento.casoId === casoId ? { ...evento, casoId: nextId } : evento))
          ]
        }));
        return { ok: true };
      },
      prepareUpload: (files) =>
        Array.from(files).map((file) => ({
          originalName: file.name,
          tipoDocumento: classifyDocument(file.name)
        })),
      confirmUpload: (casoId, drafts) => {
        const state = get();
        const caso = state.casos.find((item) => item.id === casoId);
        if (!caso) return;
        const nowIso = new Date().toISOString();
        const currentDocs = state.documentos.filter((item) => item.casoId === casoId);
        const draftKeys = new Set<string>();
        const docs: Documento[] = drafts
          .filter((draft) => {
            const renamed = renamedFile(casoId, draft.tipoDocumento, draft.originalName);
            const exactKey = draft.relativePath || draft.originalName;
            if (draftKeys.has(exactKey)) return false;
            draftKeys.add(exactKey);
            return !currentDocs.some((doc) => {
              if (doc.relativePath && draft.relativePath) return doc.relativePath === draft.relativePath;
              if (doc.originalName) return doc.originalName === draft.originalName;
              if (doc.nombreArchivo === renamed) return true;
              // Seeded demo documents predate originalName/relativePath. Avoid duplicating
              // their checklist entry when a complete folder is uploaded afterward.
              return !doc.relativePath && !doc.originalName && doc.tipoDocumento === draft.tipoDocumento;
            });
          })
          .map((draft) => {
            const nombreArchivo = renamedFile(casoId, draft.tipoDocumento, draft.originalName);
            return {
              id: crypto.randomUUID(),
              casoId,
              tipoDocumento: draft.tipoDocumento,
              nombreArchivo,
              originalName: draft.originalName,
                  pathMock: `mock://docs/${casoId}/${nombreArchivo}`,
                  disponible: true,
                  estadoDocumental: "recibido",
              fechaCarga: nowIso,
              clasificacionConfianza: draft.clasificacionConfianza,
              estadoExtraccion: draft.estadoExtraccion,
              relativePath: draft.relativePath,
              textoExtraido: draft.textoExtraido,
              datosExtraidos: draft.datosExtraidos,
              ocrUsado: draft.ocrUsado
            };
          });
        if (docs.length === 0) return;
        set((state) => ({
          documentos: [...docs, ...state.documentos],
          bitacora: [
            {
              id: crypto.randomUUID(),
              casoId,
              timestamp: nowIso,
              tipoEvento: "documento_cargado",
              detalle: `${docs.length} documento(s) cargados: ${docs.map((doc) => doc.tipoDocumento).join(", ")}.`,
              usuario: state.usuario.nombre
            },
            ...state.bitacora
          ]
        }));
      },
      updateDocumentStatus: (casoId, type, status) => {
        const state = get();
        const caso = state.casos.find((item) => item.id === casoId);
        if (!caso) return { ok: false, error: "No se encontró el caso." };
        if (!caso) return { ok: false, error: "No se encontró el caso." };
        if (state.usuario.role !== "Handler" || state.usuario.nombre !== caso.claimHandler) {
          return { ok: false, error: "Solo el Handler responsable puede modificar el checklist documental." };
        }
        if (status === "recibido" && !state.documentos.some((documento) => documento.casoId === casoId && documento.tipoDocumento === type && documento.disponible)) {
          return { ok: false, error: "No puedes marcar como recibido un documento que aún no está cargado." };
        }
        const nowIso = new Date().toISOString();
        set((current) => ({
          casos: current.casos.map((item) => item.id === casoId
            ? { ...item, documentStatuses: { ...item.documentStatuses, [type]: status }, ultimaActualizacion: nowIso }
            : item),
          documentos: current.documentos.map((documento) => documento.casoId === casoId && documento.tipoDocumento === type
            ? { ...documento, estadoDocumental: status }
            : documento),
          bitacora: [
            {
              id: crypto.randomUUID(),
              casoId,
              timestamp: nowIso,
              tipoEvento: "caso_actualizado",
              detalle: `Estado documental actualizado: ${type} → ${status}.`,
              usuario: current.usuario.nombre
            },
            ...current.bitacora
          ]
        }));
        return { ok: true };
      },
      requestMissingDocuments: (casoId, types) => {
        const state = get();
        const caso = state.casos.find((item) => item.id === casoId);
        if (!caso) return { ok: false, error: "No se encontró el caso." };
        if (!caso) return { ok: false, error: "No se encontró el caso." };
        if (state.usuario.role !== "Handler" || state.usuario.nombre !== caso.claimHandler) {
          return { ok: false, error: "Solo el Handler responsable puede solicitar documentos." };
        }
        const requestedTypes = [...new Set(types)];
        if (requestedTypes.length === 0) return { ok: false, error: "No hay documentos faltantes para solicitar." };
        const nowIso = new Date().toISOString();
        set((current) => ({
          casos: current.casos.map((item) => item.id === casoId
            ? {
                ...item,
                documentStatuses: requestedTypes.reduce((statuses, type) => ({ ...statuses, [type]: "solicitado" as DocumentStatus }), { ...item.documentStatuses }),
                ultimaActualizacion: nowIso
              }
            : item),
          bitacora: [
            {
              id: crypto.randomUUID(),
              casoId,
              timestamp: nowIso,
              tipoEvento: "documento_solicitado",
              detalle: `Documentos solicitados: ${requestedTypes.join(", ")}.`,
              usuario: current.usuario.nombre
            },
            ...current.bitacora
          ]
        }));
        return { ok: true };
      },
      registerInactivityAlertSent: (casoId, channel) => {
        const state = get();
        const caso = state.casos.find((item) => item.id === casoId);
        const isResponsibleHandler = state.usuario.role === "Handler" && caso?.claimHandler === state.usuario.nombre;
        if (!caso) return { ok: false, error: "No se encontró el caso." };
        if (!isResponsibleHandler && state.usuario.role !== "Gerente") {
          return { ok: false, error: "Solo el Handler responsable o Gerente puede registrar el aviso." };
        }
        const nowIso = new Date().toISOString();
        set((current) => ({
          casos: current.casos.map((item) => item.id === casoId
            ? {
                ...item,
                alertaInactividad: {
                  ...(item.alertaInactividad || {}),
                  estado: "abierta",
                  ...(channel === "plataforma" ? { lastPlatformSentAt: nowIso } : { lastEmailSentAt: nowIso })
                } as InactivityAlertState
              }
            : item),
          bitacora: [
            {
              id: crypto.randomUUID(),
              casoId,
              timestamp: nowIso,
              tipoEvento: "alerta_inactividad_enviada",
              detalle: `Aviso de inactividad registrado por ${channel}. Destinatarios: Handler responsable y Gerente.`,
              usuario: current.usuario.nombre
            },
            ...current.bitacora
          ]
        }));
        return { ok: true };
      },
      markInactivityAlertRead: (casoId) => {
        const state = get();
        const caso = state.casos.find((item) => item.id === casoId);
        const isResponsibleHandler = state.usuario.role === "Handler" && caso?.claimHandler === state.usuario.nombre;
        if (!caso) return { ok: false, error: "No se encontró el caso." };
        if (!isResponsibleHandler && state.usuario.role !== "Gerente") {
          return { ok: false, error: "Solo el Handler responsable o Gerente puede marcar el aviso." };
        }
        const nowIso = new Date().toISOString();
        set((current) => ({
          casos: current.casos.map((item) => item.id === casoId
            ? { ...item, alertaInactividad: { ...(item.alertaInactividad || {}), estado: "abierta", readAt: nowIso } as InactivityAlertState }
            : item),
          bitacora: [
            {
              id: crypto.randomUUID(),
              casoId,
              timestamp: nowIso,
              tipoEvento: "alerta_inactividad_leida",
              detalle: "Aviso de inactividad marcado como leído.",
              usuario: current.usuario.nombre
            },
            ...current.bitacora
          ]
        }));
        return { ok: true };
      },
      resolveInactivityAlert: (casoId, action) => {
        const state = get();
        const caso = state.casos.find((item) => item.id === casoId);
        if (!caso) return { ok: false, error: "No se encontró el caso." };
        if (state.usuario.role !== "Gerente") {
          return { ok: false, error: "Solo Gerente puede cerrar o silenciar una alerta." };
        }
        const nowIso = new Date().toISOString();
        const lastMovement = lastMovementAt(caso, state.bitacora);
        set((current) => ({
          casos: current.casos.map((item) => item.id === casoId
            ? {
                ...item,
                alertaInactividad: {
                  ...(item.alertaInactividad || {}),
                  estado: action === "cerrar" ? "cerrada" : "silenciada",
                  lastHandledAt: lastMovement,
                  readAt: nowIso
                } as InactivityAlertState
              }
            : item),
          bitacora: [
            {
              id: crypto.randomUUID(),
              casoId,
              timestamp: nowIso,
              tipoEvento: "alerta_inactividad_cerrada",
              detalle: `Alerta de inactividad ${action === "cerrar" ? "cerrada" : "silenciada"} por Gerente.`,
              usuario: current.usuario.nombre
            },
            ...current.bitacora
          ]
        }));
        return { ok: true };
      },
      removeDocument: (documentId) => {
        const state = get();
        const document = state.documentos.find((doc) => doc.id === documentId);
        const caso = document ? state.casos.find((item) => item.id === document.casoId) : undefined;
        if (!document) return;
        const nowIso = new Date().toISOString();
        set((state) => ({
          casos: state.casos.map((item) => item.id === document.casoId ? { ...item, ultimaActualizacion: nowIso } : item),
          documentos: state.documentos.filter((doc) => doc.id !== documentId),
          bitacora: [
            {
              id: crypto.randomUUID(),
              casoId: document.casoId,
              timestamp: nowIso,
              tipoEvento: "documento_eliminado",
              detalle: `Documento eliminado: ${document.nombreArchivo} (${document.tipoDocumento}).`,
              usuario: state.usuario.nombre
            },
            ...state.bitacora
          ]
        }));
      },
      saveAnalysis: (casoId, analysis) => {
        const currentCase = get().casos.find((caso) => caso.id === casoId);
        if (!currentCase) return;
        const nowIso = new Date().toISOString();
        set((state) => ({
          casos: state.casos.map((caso) => (caso.id === casoId ? { ...caso, analisisCausa: analysis } : caso)),
          bitacora: [
            {
              id: crypto.randomUUID(),
              casoId,
              timestamp: nowIso,
              tipoEvento: "analisis_confirmado",
              detalle: "Conclusión de causa de daño confirmada por el handler.",
              usuario: state.usuario.nombre
            },
            ...state.bitacora
          ]
        }));
      },
      saveCalculation: (calculation) => {
        const currentCase = get().casos.find((caso) => caso.id === calculation.casoId);
        if (!currentCase) return { ok: false, error: "No se encontró el caso asociado al cálculo." };
        if (!currentCase) return { ok: false, error: "No se encontró el caso asociado al cálculo." };
        const selectedMethod = calculation.ventaAFirme
          ? get().calculationMethods.find((method) => method.id === "firm")
          : calculation.metodoSeleccionado
            ? get().calculationMethods.find((method) => method.id === calculation.metodoSeleccionado)
            : undefined;
        if (selectedMethod && !selectedMethod.active) {
          return { ok: false, error: "El método seleccionado está inactivo en el mantenedor de cálculos." };
        }
        if (calculation.ventaAFirme && (calculation.notaCreditoValor === undefined || calculation.notaCreditoValor <= 0)) {
          return { ok: false, error: "En venta a firme debes ingresar el valor de la nota de crédito." };
        }
        const caseDocuments = get().documentos.filter((document) => document.casoId === calculation.casoId && document.disponible);
        const availableTypes = new Set(caseDocuments.map((document) => document.tipoDocumento));
        const requiredTypes = calculation.ventaAFirme
          ? ["Nota de crédito"]
          : calculation.metodoSeleccionado === "1" || calculation.metodoSeleccionado === "2"
            ? ["Liquidación por contenedor", "Liquidaciones comparativas o informe de mercado"]
            : calculation.metodoSeleccionado === "3"
              ? ["Factura de exportación", "Liquidación por contenedor"]
              : [];
        const missingSources = requiredTypes.filter((type) => !availableTypes.has(type as Documento["tipoDocumento"]));
        if (missingSources.length > 0) {
          return { ok: false, error: `Falta respaldo documental para cerrar el cálculo: ${missingSources.join(", ")}.` };
        }
        if (!calculation.ventaAFirme && (calculation.cantidadAfectada === undefined || calculation.cantidadAfectada <= 0)) {
          return { ok: false, error: "Indica la cantidad afectada y su unidad antes de cerrar el cálculo." };
        }
        if (calculation.metodoSeleccionado === "1" && (calculation.metodo1_cantidadReferencia === undefined || calculation.metodo1_cantidadReferencia <= 0)) {
          return { ok: false, error: "Indica la cantidad del embarque comparable para validar la unidad de cálculo." };
        }
        if (calculation.metodoSeleccionado === "2" && (calculation.metodo2_cantidadReferencia === undefined || calculation.metodo2_cantidadReferencia <= 0)) {
          return { ok: false, error: "Indica la cantidad del reporte de mercado para validar la unidad de cálculo." };
        }
        const sourceCurrency = calculation.monedaOrigen || calculation.moneda;
        if (sourceCurrency !== calculation.moneda && (calculation.tipoCambio === undefined || !Number.isFinite(calculation.tipoCambio) || calculation.tipoCambio <= 0)) {
          return { ok: false, error: "Ingresa un tipo de cambio positivo para convertir la moneda de origen." };
        }
        if (sourceCurrency !== calculation.moneda && !calculation.tipoCambioFecha) {
          return { ok: false, error: "Indica la fecha del tipo de cambio aplicado." };
        }
        if (sourceCurrency !== calculation.moneda && currentCase.dateOfDischarge && calculation.tipoCambioFecha !== currentCase.dateOfDischarge) {
          return { ok: false, error: "La fecha del tipo de cambio debe coincidir con la fecha de descarga del contenedor." };
        }
        if (sourceCurrency !== calculation.moneda && !calculation.tipoCambioFuente?.trim()) {
          return { ok: false, error: "Indica la fuente del tipo de cambio. La fuente oficial configurada es Xrate; también se permite una tasa manual documentada." };
        }
        if (calculation.metodoSeleccionado && (calculation.justificacionSeleccion?.trim().length ?? 0) < 10) {
          return { ok: false, error: "La justificación del método seleccionado debe tener al menos 10 caracteres." };
        }
        if (!calculation.ventaAFirme && !calculation.metodoSeleccionado) {
          return { ok: false, error: "Selecciona un método o marca venta a firme antes de guardar." };
        }
        const computed = calculateLoss(calculation);
        if (!calculation.ventaAFirme && computed.montoFinalReclamo === undefined) {
          return { ok: false, error: "El método seleccionado no tiene todos sus valores de respaldo." };
        }
        const nowIso = new Date().toISOString();
        set((state) => ({
          calculosPerdida: [computed, ...state.calculosPerdida.filter((item) => item.casoId !== calculation.casoId)],
          bitacora: [
            {
              id: crypto.randomUUID(),
              casoId: calculation.casoId,
              timestamp: nowIso,
              tipoEvento: "calculo_generado",
              detalle: computed.ventaAFirme
                ? "Cálculo guardado como venta a firme con nota de crédito."
                : `Cálculo guardado con Método ${computed.metodoSeleccionado}.`,
              usuario: state.usuario.nombre
            },
            ...state.bitacora
          ]
        }));
        return { ok: true };
      },
      generateReviewReport: (casoId, destination) => {
        const state = get();
        const caso = state.casos.find((item) => item.id === casoId);
        if (!caso) return undefined;
        const calculo = state.calculosPerdida.find((item) => item.casoId === casoId);
        const report = buildReviewReport(
          caso,
          state.documentos.filter((item) => item.casoId === casoId),
          calculo,
          state.usuario.nombre,
          destination
        );
        const nowIso = new Date().toISOString();
        set((current) => ({
          casos: current.casos.map((item) =>
            item.id === casoId ? { ...item, informeRevision: report, ultimaActualizacion: nowIso } : item
          ),
          bitacora: [
            {
              id: crypto.randomUUID(),
              casoId,
              timestamp: nowIso,
              tipoEvento: "informe_generado",
              detalle: `Informe de revisión generado para derivación a ${destination}. Estado: ${report.status}.`,
              usuario: current.usuario.nombre
            },
            ...current.bitacora
          ]
        }));
        return report;
      },
      transitionCase: (casoId, nextStatus, detail) => {
        const currentCase = get().casos.find((caso) => caso.id === casoId);
        if (!currentCase) return { ok: false, error: "No se encontró el caso." };
        if (isTransferredCase(currentCase)) return { ok: false, error: "El caso ya fue traspasado y no admite nuevos cambios." };
        if (nextStatus.startsWith("Traspasado")) {
          if (get().usuario.role !== "Handler" || get().usuario.nombre !== currentCase.claimHandler) {
            return { ok: false, error: "Solo el Handler responsable puede ejecutar el traspaso." };
          }
          const destination = nextStatus === "Traspasado a FIS" ? "FIS" : "Lawgistic";
          const freshReport = buildReviewReport(
            currentCase,
            get().documentos.filter((item) => item.casoId === casoId),
            get().calculosPerdida.find((item) => item.casoId === casoId),
            get().usuario.nombre,
            destination
          );
          if (!currentCase.informeRevision?.ready || currentCase.informeRevision.destination !== destination) {
            return { ok: false, error: "Genera y revisa nuevamente el informe para el destino seleccionado." };
          }
          if (!freshReport.ready) return { ok: false, error: "El traspaso está bloqueado: resuelve el checklist de cierre antes de derivar el caso." };
        }
        const nowIso = new Date().toISOString();
        set((state) => ({
          casos: state.casos.map((caso) =>
            caso.id === casoId ? { ...caso, estado: nextStatus, ultimaActualizacion: nowIso } : caso
          ),
          bitacora: [
            {
              id: crypto.randomUUID(),
              casoId,
              timestamp: nowIso,
              tipoEvento: "cambio_estado",
              detalle: detail,
              usuario: state.usuario.nombre
            },
            ...state.bitacora
          ]
        }));
        return { ok: true };
      },
      revertCase: (casoId, previousStatus, reason) => {
        const { usuario } = get();
        if (usuario.role !== "Gerente") return { ok: false, error: "Solo Gerente puede revertir estados en este demo." };
        if (reason.trim().length < 10) return { ok: false, error: "El motivo de reversión debe tener al menos 10 caracteres." };
        const nowIso = new Date().toISOString();
        set((state) => ({
          casos: state.casos.map((caso) =>
            caso.id === casoId ? { ...caso, estado: previousStatus, ultimaActualizacion: nowIso } : caso
          ),
          bitacora: [
            {
              id: crypto.randomUUID(),
              casoId,
              timestamp: nowIso,
              tipoEvento: "reversion_estado",
              detalle: `Estado revertido a ${previousStatus}. Motivo: ${reason.trim()}`,
              usuario: state.usuario.nombre
            },
            ...state.bitacora
          ]
        }));
        return { ok: true };
      },
      registerLetter: (casoId, templateId, fingerprint, detail) => {
        const currentCase = get().casos.find((caso) => caso.id === casoId);
        const approved = currentCase?.cartasAprobadas?.some(
          (item) => item.templateId === templateId && item.fingerprint === fingerprint
        );
        if (!currentCase || !approved) return;
        const nowIso = new Date().toISOString();
        set((state) => ({
          bitacora: [
            {
              id: crypto.randomUUID(),
              casoId,
              timestamp: nowIso,
              tipoEvento: "carta_generada",
              detalle: detail,
              usuario: state.usuario.nombre
            },
            ...state.bitacora
          ]
        }));
      },
      approveLetter: (casoId, approval) => {
        const state = get();
        const currentCase = state.casos.find((caso) => caso.id === casoId);
        if (!currentCase) return { ok: false, error: "No se encontró el caso." };
        if (state.usuario.role !== "Handler" || currentCase.claimHandler !== state.usuario.nombre) {
          return { ok: false, error: "Solo el handler responsable puede aprobar esta carta." };
        }
        if (!currentCase) return { ok: false, error: "No se encontró el caso." };
        const nowIso = new Date().toISOString();
        set((currentState) => ({
          casos: currentState.casos.map((caso) =>
            caso.id === casoId
              ? {
                  ...caso,
                  cartasAprobadas: [
                    ...(caso.cartasAprobadas || []).filter((item) => item.templateId !== approval.templateId),
                    { ...approval, approvedAt: nowIso, approvedBy: currentState.usuario.nombre }
                  ],
                  ultimaActualizacion: nowIso
                }
              : caso
          ),
          bitacora: [
            {
              id: crypto.randomUUID(),
              casoId,
              timestamp: nowIso,
              tipoEvento: "carta_aprobada",
              detalle: `Carta ${approval.templateId} aprobada para emisión.`,
              usuario: currentState.usuario.nombre
            },
            ...currentState.bitacora
          ]
        }));
        return { ok: true };
      },
      assignInspector: (casoId, inspector) => {
        const state = get();
        const current = state.casos.find((caso) => caso.id === casoId);
        if (!current) return { ok: false, error: "No se encontró el caso para asignar." };
        if (state.usuario.role !== "Gerente") return { ok: false, error: "Solo Gerente puede asignar inspectores." };
        if (!current) return { ok: false, error: "No se encontró el caso." };
        const nextInspector = inspector?.trim() || undefined;
        if (nextInspector && !INSPECTORS.includes(nextInspector)) return { ok: false, error: "Selecciona un inspector válido." };
        const nowIso = new Date().toISOString();
        set((currentState) => ({
          casos: currentState.casos.map((caso) =>
            caso.id === casoId ? { ...caso, inspectorAsignado: nextInspector, ultimaActualizacion: nowIso } : caso
          ),
          bitacora: [
            {
              id: crypto.randomUUID(),
              casoId,
              timestamp: nowIso,
              tipoEvento: "caso_actualizado",
              detalle: `Asignación de inspección ${nextInspector ? `entregada a ${nextInspector}` : "retirada"}.`,
              usuario: currentState.usuario.nombre
            },
            ...currentState.bitacora
          ]
        }));
        return { ok: true };
      },
      saveInspection: (casoId, patch) => {
        const state = get();
        const current = state.casos.find((caso) => caso.id === casoId);
        if (!current) return { ok: false, error: "No se encontró el caso de inspección." };
        if (state.usuario.role !== "Inspector") return { ok: false, error: "Solo el perfil Inspector puede registrar la inspección." };
        if (current.inspectorAsignado !== state.usuario.nombre) return { ok: false, error: "Este caso no está asignado al inspector actual." };
        if (!current) return { ok: false, error: "No se encontró el caso." };
        if (!patch.fechaInspeccion) return { ok: false, error: "Ingresa la fecha de inspección." };
        if (patch.inspeccionConjunta === undefined) return { ok: false, error: "Indica si la inspección será conjunta con la naviera." };
        const nowIso = new Date().toISOString();
        set((currentState) => ({
          casos: currentState.casos.map((caso) =>
            caso.id === casoId
              ? {
                  ...caso,
                  fechaInspeccion: patch.fechaInspeccion,
                  inspeccionConjunta: patch.inspeccionConjunta,
                  resumenInspeccion: patch.resumenInspeccion?.trim() || undefined,
                  ultimaActualizacion: nowIso
                }
              : caso
          ),
          bitacora: [
            {
              id: crypto.randomUUID(),
              casoId,
              timestamp: nowIso,
              tipoEvento: "inspeccion_registrada",
              detalle: `Inspección registrada para ${patch.fechaInspeccion}. ${patch.inspeccionConjunta ? "Se realizará con la naviera" : "No se realizará con la naviera"}.`,
              usuario: currentState.usuario.nombre
            },
            ...currentState.bitacora
          ]
        }));
        return { ok: true };
      },
      updateCalculationMethod: (id, patch) => {
        const nowIso = new Date().toISOString();
        set((state) => ({
          calculationMethods: state.calculationMethods.map((method) =>
            method.id === id ? { ...method, ...patch, updatedAt: nowIso } : method
          )
        }));
      },
      resetCalculationMethods: () => set({ calculationMethods: DEFAULT_CALCULATION_METHODS.map((method) => ({ ...method })) }),
      updateTemplateConfig: (id, patch) => {
        const nowIso = new Date().toISOString();
        set((state) => ({
          templateConfigs: state.templateConfigs.map((template) =>
            template.id === id ? { ...template, ...patch, version: (template.version || 1) + 1, updatedAt: nowIso } : template
          )
        }));
      },
      resetTemplateConfigs: () => set({ templateConfigs: defaultTemplateConfigs() }),
      hydrateHistoricalCases: async () => {
        set({ historicoCargando: true });
        try {
          const bundled = await loadBundledHistory();
          set({
            historico: bundled.batch.records,
            ultimaImportacionHistorico: {
              batchId: bundled.batch.batchId,
              fileName: bundled.batch.fileName,
              importedAt: bundled.batch.importedAt,
              records: bundled.batch.records.length,
              sheets: bundled.batch.sheets,
              duplicateReferenceKeys: bundled.batch.duplicateReferenceKeys
            }
          });
        } catch {
          set({ historico: [], ultimaImportacionHistorico: undefined });
        } finally {
          set({ historicoCargando: false });
        }
      },
      resetDemo: () => set(initialState())
    }),
    {
      name: `${STORAGE_PREFIX}state`,
      version: 10,
      migrate: migrateLegacyTransferLabels,
      partialize: (state) => ({
        usuario: state.usuario,
        casos: state.casos,
        documentos: state.documentos,
        calculosPerdida: state.calculosPerdida,
        bitacora: state.bitacora,
        calculationMethods: state.calculationMethods,
        templateConfigs: state.templateConfigs
      })
    }
  )
);
