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

import { DemoState, StoreGet, StoreSet } from "./storeTypes";
import { hasCaseWriteAccess } from "./authorization";

export function createDocumentActions(set: StoreSet, get: StoreGet): Pick<DemoState, "confirmUpload" | "updateDocumentStatus" | "requestMissingDocuments" | "registerInactivityAlertSent" | "markInactivityAlertRead" | "resolveInactivityAlert" | "removeDocument" | "saveAnalysis"> {
  return {
      confirmUpload: async (casoId, drafts, options) => {
        const state = get();
        const caso = state.casos.find((item) => item.id === casoId);
        if (!caso) return;
        // The creator must persist the initial folder before automatic assignment
        // to the Client -> Handler relationship takes effect.
        if (!hasCaseWriteAccess(state, casoId) && !options?.initialUpload) return;
        const nowIso = new Date().toISOString();
        const currentDocs = state.documentos.filter((item) => item.casoId === casoId);
        const draftKeys = new Set<string>();
        const acceptedDrafts = drafts
          .filter((draft) => {
            const renamed = renamedFile(casoId, draft.tipoDocumento, draft.originalName);
            const exactKey = draft.relativePath || draft.originalName;
            if (draftKeys.has(exactKey)) return false;
            draftKeys.add(exactKey);
            return !currentDocs.some((doc) => {
              if (doc.relativePath && draft.relativePath) return doc.relativePath === draft.relativePath;
              if (doc.originalName) return doc.originalName === draft.originalName;
              if (doc.nombreArchivo === renamed) return true;
              return false;
            });
          });
        const docs: Documento[] = await Promise.all(acceptedDrafts.map(async (draft) => {
          const id = crypto.randomUUID();
          const nombreArchivo = renamedFile(casoId, draft.tipoDocumento, draft.originalName);
          const fileStorageKey = draft.file ? `document:${id}` : undefined;
          if (draft.file && fileStorageKey) await saveDocumentFile(fileStorageKey, draft.file);
          return {
              id,
              casoId,
              tipoDocumento: draft.tipoDocumento,
              nombreArchivo,
              originalName: draft.originalName,
              pathMock: fileStorageKey ? `indexeddb://${fileStorageKey}` : `mock://docs/${casoId}/${nombreArchivo}`,
              fileStorageKey,
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
        }));
        if (docs.length === 0) return;
        set((state) => ({
          casos: state.casos.map((item) => item.id === casoId
            ? {
                ...item,
                documentStatuses: {
                  ...item.documentStatuses,
                  ...Object.fromEntries(docs.map((doc) => [doc.tipoDocumento, "recibido" as DocumentStatus]))
                },
                informeRevision: undefined,
                ultimaActualizacion: nowIso
              }
            : item),
          documentos: [
            ...docs,
            ...state.documentos.filter((documento) => {
              const replacedByUpload = documento.casoId === casoId
                && !documento.fileStorageKey
                && !documento.relativePath
                && !documento.originalName
                && docs.some((doc) => doc.tipoDocumento === documento.tipoDocumento);
              return !replacedByUpload;
            })
          ],
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
        if (state.usuario.role !== "Handler" || state.usuario.nombre !== caso.claimHandler) {
          return { ok: false, error: "Solo el Handler responsable puede modificar el checklist documental." };
        }
        const checklistItem = documentChecklist(
          caso,
          state.documentos.filter((documento) => documento.casoId === casoId),
          state.calculosPerdida.find((calculo) => calculo.casoId === casoId)
        ).find((item) => item.type === type);
        if (status === "no aplica" && checklistItem?.required) {
          return { ok: false, error: "Este documento es exigible para el caso y no puede marcarse como No aplica." };
        }
        if (status === "recibido" && !state.documentos.some((documento) => documento.casoId === casoId && documento.tipoDocumento === type && documento.disponible)) {
          return { ok: false, error: "No puedes marcar como recibido un documento que aún no está cargado." };
        }
        const nowIso = new Date().toISOString();
        set((current) => ({
          casos: current.casos.map((item) => item.id === casoId
            ? {
                ...item,
                documentStatuses: { ...item.documentStatuses, [type]: status },
                informeRevision: undefined,
                ultimaActualizacion: nowIso
              }
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
        if (state.usuario.role !== "Handler" || state.usuario.nombre !== caso.claimHandler) {
          return { ok: false, error: "Solo el Handler responsable puede solicitar documentos." };
        }
        const checklist = documentChecklist(
          caso,
          state.documentos.filter((documento) => documento.casoId === casoId),
          state.calculosPerdida.find((calculo) => calculo.casoId === casoId)
        );
        const missingTypes = new Set(checklist.filter((item) => item.required && !isChecklistItemComplete(item)).map((item) => item.type));
        const requestedTypes = [...new Set(types)].filter((type) => missingTypes.has(type));
        if (requestedTypes.length === 0) return { ok: false, error: "No hay documentos faltantes para solicitar." };
        const nowIso = new Date().toISOString();
        set((current) => ({
          casos: current.casos.map((item) => item.id === casoId
            ? {
                ...item,
                documentStatuses: requestedTypes.reduce((statuses, type) => ({ ...statuses, [type]: "solicitado" as DocumentStatus }), { ...item.documentStatuses }),
                informeRevision: undefined,
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
        if (!caso || !hasCaseWriteAccess(state, caso.id)) return;
        if (document.fileStorageKey) void deleteDocumentFile(document.fileStorageKey);
        const nowIso = new Date().toISOString();
        const hasAnotherDocumentOfType = state.documentos.some(
          (item) => item.id !== documentId && item.casoId === document.casoId && item.tipoDocumento === document.tipoDocumento && item.disponible
        );
        const nextDocumentStatuses = { ...(caso?.documentStatuses || {}) };
        if (!hasAnotherDocumentOfType) delete nextDocumentStatuses[document.tipoDocumento];
        set((state) => ({
          casos: state.casos.map((item) => item.id === document.casoId
            ? {
                ...item,
                documentStatuses: nextDocumentStatuses,
                informeRevision: undefined,
                ultimaActualizacion: nowIso
              }
            : item),
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
        const state = get();
        const currentCase = state.casos.find((caso) => caso.id === casoId);
        if (!currentCase) return;
        if (!hasCaseWriteAccess(state, casoId)) return;
        const nowIso = new Date().toISOString();
        set((state) => ({
          casos: state.casos.map((caso) =>
            caso.id === casoId
              ? {
                  ...caso,
                  analisisCausa: analysis,
                  informeRevision: undefined,
                  ultimaActualizacion: nowIso
                }
              : caso
          ),
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
      }
    };
}
