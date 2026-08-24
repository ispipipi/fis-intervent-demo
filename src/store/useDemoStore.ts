import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  BitacoraEvento,
  CalculoPerdida,
  CaseStatus,
  Caso,
  DamageAnalysis,
  DocumentType,
  Documento,
  NewCaseInput,
  ReviewReport,
  SessionUser,
  TransferDestination,
  UploadDraft,
  HistoricalCase,
  HistoryImportBatch
} from "../types/domain";
import {
  buildCasoFromInput,
  calculateLoss,
  calculatePrescription,
  classifyDocument,
  renamedFile,
  STORAGE_PREFIX
} from "../lib/business";
import { buildReviewReport } from "../lib/review";
import { loadHistoryStore, saveHistoryBatch } from "../lib/historyStorage";

type DemoState = {
  usuario: SessionUser;
  casos: Caso[];
  documentos: Documento[];
  calculosPerdida: CalculoPerdida[];
  bitacora: BitacoraEvento[];
  historico: HistoricalCase[];
  ultimaImportacionHistorico?: Omit<HistoryImportBatch, "records"> & { records: number };
  historicoCargando: boolean;
  setUsuario: (usuario: SessionUser) => void;
  createCase: (input: NewCaseInput, complete: boolean) => Caso;
  updateCase: (casoId: string, patch: Partial<Caso>) => void;
  prepareUpload: (files: FileList | File[]) => UploadDraft[];
  confirmUpload: (casoId: string, drafts: UploadDraft[]) => void;
  removeDocument: (documentId: string) => void;
  saveAnalysis: (casoId: string, analysis: DamageAnalysis) => void;
  saveCalculation: (calculation: CalculoPerdida) => { ok: boolean; error?: string };
  generateReviewReport: (casoId: string, destination: TransferDestination) => ReviewReport | undefined;
  transitionCase: (casoId: string, nextStatus: CaseStatus, detail: string) => void;
  revertCase: (casoId: string, previousStatus: CaseStatus, reason: string) => { ok: boolean; error?: string };
  registerLetter: (casoId: string, detail: string) => void;
  importHistoricalCases: (batch: HistoryImportBatch, sourceFile: Blob) => Promise<number>;
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
    ultimaImportacionHistorico: undefined,
    historicoCargando: false
  };
}

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => ({
      ...initialState(),
      setUsuario: (usuario) => set({ usuario }),
      createCase: (input, complete) => {
        const caso = buildCasoFromInput(input, get().casos.length, complete);
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
              fechaCarga: nowIso,
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
      removeDocument: (documentId) => {
        set((state) => ({
          documentos: state.documentos.filter((doc) => doc.id !== documentId)
        }));
      },
      saveAnalysis: (casoId, analysis) => {
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
        if (calculation.ventaAFirme && (calculation.notaCreditoValor === undefined || calculation.notaCreditoValor <= 0)) {
          return { ok: false, error: "En venta a firme debes ingresar el valor de la nota de crédito." };
        }
        if (calculation.metodoSeleccionado && (calculation.justificacionSeleccion?.trim().length ?? 0) < 10) {
          return { ok: false, error: "La justificación del método seleccionado debe tener al menos 10 caracteres." };
        }
        if (!calculation.ventaAFirme && !calculation.metodoSeleccionado) {
          return { ok: false, error: "Selecciona un método o marca venta a firme antes de guardar." };
        }
        const computed = calculateLoss(calculation);
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
      registerLetter: (casoId, detail) => {
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
      importHistoricalCases: async (batch, sourceFile) => {
        const current = get().historico;
        const knownIds = new Set(current.map((record) => record.id));
        const newRecords = batch.records.filter((record) => !knownIds.has(record.id));
        set((state) => ({
          historico: [...state.historico, ...newRecords],
          ultimaImportacionHistorico: {
            batchId: batch.batchId,
            fileName: batch.fileName,
            importedAt: batch.importedAt,
            records: newRecords.length,
            sheets: batch.sheets,
            duplicateReferenceKeys: batch.duplicateReferenceKeys
          }
        }));
        await saveHistoryBatch({ ...batch, records: newRecords }, sourceFile);
        return newRecords.length;
      },
      hydrateHistoricalCases: async () => {
        set({ historicoCargando: true });
        try {
          const stored = await loadHistoryStore();
          set({ historico: stored.records, ultimaImportacionHistorico: stored.latest });
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
      version: 1,
      partialize: (state) => ({
        usuario: state.usuario,
        casos: state.casos,
        documentos: state.documentos,
        calculosPerdida: state.calculosPerdida,
        bitacora: state.bitacora
      })
    }
  )
);
