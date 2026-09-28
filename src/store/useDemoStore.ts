import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SessionUser } from "../types/domain";
import { STORAGE_PREFIX, INSPECTORS, INSPECTOR_EVOLUTION_ENABLED } from "../lib/business";
import { clearDocumentFiles } from "../lib/documentStorage";
import { DEFAULT_CALCULATION_METHODS } from "../lib/maintainers";
import { defaultTemplateConfigs } from "../lib/templates";
import { initialState } from "./demoSeed";
import { addDefaultInspectorAssignments, migrateLegacyTransferLabels } from "./storeMigration";
import { DemoState } from "./storeTypes";
import { createCaseActions } from "./caseActions";
import { createDocumentActions } from "./documentActions";
import { createCalculationActions } from "./calculationActions";
import { createWorkflowActions } from "./workflowActions";

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => ({
      ...initialState(),
      setUsuario: (usuario: SessionUser) =>
        set((state) => ({
          usuario: !INSPECTOR_EVOLUTION_ENABLED && usuario.role === "Inspector"
            ? { role: "Handler" as const, nombre: "Emely Lambraño" }
            : usuario,
          casos:
            INSPECTOR_EVOLUTION_ENABLED && usuario.role === "Inspector" && !state.casos.some((caso) => caso.inspectorAsignado)
              ? addDefaultInspectorAssignments(state.casos)
              : state.casos
        })),
      ...createCaseActions(set, get),
      ...createDocumentActions(set, get),
      ...createCalculationActions(set, get),
      ...createWorkflowActions(set, get)
    }),
    {
      name: `${STORAGE_PREFIX}state`,
      version: 13,
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
