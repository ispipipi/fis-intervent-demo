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

export function createCaseActions(set: StoreSet, get: StoreGet): Pick<DemoState, "createCase" | "updateCase" | "updateCaseDetails" | "prepareUpload"> {
  return {
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
        if (!hasCaseWriteAccess(get(), casoId)) return;
        const nowIso = new Date().toISOString();
        set((state) => ({
          casos: state.casos.map((caso) => {
            if (caso.id !== casoId) return caso;
            const basePrescription = calculatePrescription(
              patch.dateOfDischarge ?? caso.dateOfDischarge,
              patch.jurisdiccion ?? caso.jurisdiccion,
              patch.modoTransporte ?? caso.modoTransporte
            );
            return {
              ...caso,
              ...patch,
              fechaPrescripcion: basePrescription,
              informeRevision: undefined,
              ultimaActualizacion: nowIso
            };
          }),
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
        if (!hasCaseWriteAccess(state, casoId)) return { ok: false, error: "Solo el Handler responsable puede editar este caso." };

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
        const nextFechaRecepcion = patch.fechaRecepcion === undefined ? current.fechaRecepcion : patch.fechaRecepcion;
        const nextModoTransporte: TransportMode = patch.modoTransporte || current.modoTransporte || "Marítimo";
        const nextJurisdiccion = patch.jurisdiccion === undefined ? current.jurisdiccion : patch.jurisdiccion;
        const nextPrescription = calculatePrescription(nextDate, nextJurisdiccion, nextModoTransporte);
        const nowIso = new Date().toISOString();
        const changedFields: string[] = [];
        if (nextId !== current.id) changedFields.push(`referencia ${current.id} → ${nextId}`);
        if (nextDate !== current.dateOfDischarge) changedFields.push(`fecha ${current.dateOfDischarge || "sin fecha"} → ${nextDate || "sin fecha"}`);
        if (nextDateType !== current.dateOfDischargeType) changedFields.push(`tipo de fecha ${current.dateOfDischargeType || "Real"} → ${nextDateType || "Real"}`);
        if (nextFechaRecepcion !== current.fechaRecepcion) changedFields.push(`fecha de recepción ${current.fechaRecepcion || "sin fecha"} → ${nextFechaRecepcion || "sin fecha"}`);
        if (nextModoTransporte !== (current.modoTransporte || "Marítimo")) changedFields.push(`modo de transporte ${current.modoTransporte || "Marítimo"} → ${nextModoTransporte}`);
        if (nextJurisdiccion !== current.jurisdiccion) changedFields.push(`jurisdicción ${current.jurisdiccion || "sin definir"} → ${nextJurisdiccion || "sin definir"}`);

        set((state) => ({
          casos: state.casos.map((caso) =>
            caso.id === casoId
              ? {
                  ...caso,
                  id: nextId,
                  dateOfDischarge: nextDate,
                  dateOfDischargeType: nextDateType,
                  fechaRecepcion: nextFechaRecepcion,
                  modoTransporte: nextModoTransporte,
                  jurisdiccion: nextJurisdiccion,
                  fechaPrescripcion: nextPrescription,
                  informeRevision: undefined,
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
          file,
          tipoDocumento: classifyDocument(file.name)
        })),
  };
}
