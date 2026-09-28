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

export function migrateLegacyTransferLabels(persistedState: unknown): Partial<DemoState> {
  const persisted = (persistedState || {}) as Partial<DemoState>;
  const baseTemplates = defaultTemplateConfigs();
  const recalculatedLosses = persisted.calculosPerdida?.map((calculo) => ({
    ...calculateLoss(calculo),
    updatedAt: calculo.updatedAt
  }));
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
      fechaRecepcion: caso.fechaRecepcion || caso.createdAt?.slice(0, 10),
      modoTransporte: caso.modoTransporte || "Marítimo",
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
      return legacyClaimNotice
        ? {
            ...mergedTemplate,
            baseContent: mergedTemplate.baseContent.includes("{{incidentDescription}}")
              ? mergedTemplate.baseContent
              : `${mergedTemplate.baseContent.trim()}\n\n➢ INCIDENT         : {{incidentDescription}}`,
            title: "Claim Notice / Notificación a la naviera",
            shortTitle: "Claim Notice",
            description: "Carta contractual de notificación y solicitud de reembolso a la naviera. En este alcance representa el Claim Notice y no una quinta carta separada."
          }
        : mergedTemplate as TemplateConfig;
    })
  };
}
