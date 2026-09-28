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
import { initialState, isTransferredCase } from "./demoSeed";
import { canManageMaintainers, hasCaseWriteAccess } from "./authorization";
export function createWorkflowActions(set: StoreSet, get: StoreGet): Pick<DemoState, "generateReviewReport" | "transitionCase" | "revertCase" | "registerLetter" | "approveLetter" | "assignInspector" | "saveInspection" | "updateCalculationMethod" | "resetCalculationMethods" | "updateTemplateConfig" | "resetTemplateConfigs" | "hydrateHistoricalCases" | "resetDemo"> {
  return {
      generateReviewReport: (casoId, destination) => {
        const state = get();
        const caso = state.casos.find((item) => item.id === casoId);
        if (!caso) return undefined;
        if (!hasCaseWriteAccess(state, casoId)) return undefined;
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
      transitionCase: (casoId, nextStatus, detail, exceptionalReason) => {
        const currentCase = get().casos.find((caso) => caso.id === casoId);
        if (!currentCase) return { ok: false, error: "No se encontró el caso." };
        if (isTransferredCase(currentCase)) return { ok: false, error: "El caso ya fue traspasado y no admite nuevos cambios." };
        let freshReport: ReturnType<typeof buildReviewReport> | undefined;
        let exceptionalAuthorization: ExceptionalTransferAuthorization | undefined;
        if (nextStatus.startsWith("Traspasado")) {
          if (get().usuario.role !== "Handler" || get().usuario.nombre !== currentCase.claimHandler) {
            return { ok: false, error: "Solo el Handler responsable puede ejecutar el traspaso." };
          }
          const destination = nextStatus === "Traspasado a FIS" ? "FIS" : "Lawgistic";
          freshReport = buildReviewReport(
            currentCase,
            get().documentos.filter((item) => item.casoId === casoId),
            get().calculosPerdida.find((item) => item.casoId === casoId),
            get().usuario.nombre,
            destination
          );
          if (!currentCase.informeRevision || currentCase.informeRevision.destination !== destination) {
            return { ok: false, error: "Genera y revisa nuevamente el informe para el destino seleccionado." };
          }
          if (!freshReport.ready) {
            if (!exceptionalReason?.trim() || exceptionalReason.trim().length < 10) {
              return { ok: false, error: "Para un traspaso incompleto debes registrar una autorización de al menos 10 caracteres." };
            }
            const nowIso = new Date().toISOString();
            exceptionalAuthorization = {
              destination,
              reason: exceptionalReason.trim(),
              authorizedBy: get().usuario.nombre,
              authorizedAt: nowIso,
              pendingDocuments: freshReport.missingDocuments,
              pendingActions: freshReport.pendingActions
            };
          }
        }
        const nowIso = new Date().toISOString();
        set((state) => ({
          casos: state.casos.map((caso) =>
            caso.id === casoId
              ? {
                  ...caso,
                  estado: nextStatus,
                  ...(freshReport ? { informeRevision: freshReport } : {}),
                  ...(exceptionalAuthorization ? { traspasoExcepcional: exceptionalAuthorization } : {}),
                  ultimaActualizacion: nowIso
                }
              : caso
          ),
          bitacora: [
            {
              id: crypto.randomUUID(),
              casoId,
              timestamp: nowIso,
              tipoEvento: "cambio_estado",
              detalle: exceptionalAuthorization
                ? `${detail} Traspaso excepcional autorizado por ${exceptionalAuthorization.authorizedBy}: ${exceptionalAuthorization.reason}. Pendientes conservados: ${exceptionalAuthorization.pendingDocuments.join(", ") || "ninguno"}.`
                : detail,
              usuario: state.usuario.nombre
            },
            ...state.bitacora
          ]
        }));
        return { ok: true };
      },
      revertCase: (casoId, previousStatus, reason) => {
        const { usuario, casos } = get();
        const currentCase = casos.find((caso) => caso.id === casoId);
        if (!currentCase) return { ok: false, error: "No se encontró el caso para revertir." };
        if (usuario.role !== "Gerente") return { ok: false, error: "Solo Gerente puede revertir estados en este demo." };
        if (previousStatus.startsWith("Traspasado a ")) return { ok: false, error: "La reversión debe volver a un estado interno del flujo preclaim." };
        if (reason.trim().length < 10) return { ok: false, error: "El motivo de reversión debe tener al menos 10 caracteres." };
        const nowIso = new Date().toISOString();
        set((state) => ({
          casos: state.casos.map((caso) =>
            caso.id === casoId
              ? {
                  ...caso,
                  estado: previousStatus,
                  informeRevision: undefined,
                  traspasoExcepcional: undefined,
                  ultimaActualizacion: nowIso
                }
              : caso
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
        const state = get();
        const currentCase = state.casos.find((caso) => caso.id === casoId);
        if (!currentCase || !hasCaseWriteAccess(state, casoId)) return;
        const approved = currentCase?.cartasAprobadas?.some(
          (item) => item.templateId === templateId && item.fingerprint === fingerprint
        );
        if (!approved) return;
        const nowIso = new Date().toISOString();
        set((state) => ({
          casos: state.casos.map((caso) => (caso.id === casoId ? { ...caso, ultimaActualizacion: nowIso } : caso)),
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
        if (!INSPECTOR_EVOLUTION_ENABLED) return { ok: false, error: "La asignación de inspectores está fuera del alcance de esta fase." };
        if (state.usuario.role !== "Gerente") return { ok: false, error: "Solo Gerente puede asignar inspectores." };
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
        if (!canManageMaintainers(get())) return;
        const nowIso = new Date().toISOString();
        set((state) => ({
          calculationMethods: state.calculationMethods.map((method) =>
            method.id === id ? { ...method, ...patch, updatedAt: nowIso } : method
          )
        }));
      },
      resetCalculationMethods: () => {
        if (!canManageMaintainers(get())) return;
        set({ calculationMethods: DEFAULT_CALCULATION_METHODS.map((method) => ({ ...method })) });
      },
      updateTemplateConfig: (id, patch) => {
        if (!canManageMaintainers(get())) return;
        const nowIso = new Date().toISOString();
        set((state) => ({
          templateConfigs: state.templateConfigs.map((template) =>
            template.id === id ? { ...template, ...patch, version: (template.version || 1) + 1, updatedAt: nowIso } : template
          )
        }));
      },
      resetTemplateConfigs: () => {
        if (!canManageMaintainers(get())) return;
        set({ templateConfigs: defaultTemplateConfigs() });
      },
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
      resetDemo: () => {
        set(initialState());
        void clearDocumentFiles().catch(() => undefined);
      }
  };
}
