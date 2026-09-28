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

export function createCalculationActions(set: StoreSet, get: StoreGet): Pick<DemoState, "saveCalculation"> {
  return {
      saveCalculation: (calculation) => {
        const state = get();
        const currentCase = state.casos.find((caso) => caso.id === calculation.casoId);
        if (!currentCase) return { ok: false, error: "No se encontró el caso asociado al cálculo." };
        if (!hasCaseWriteAccess(state, calculation.casoId)) return { ok: false, error: "Solo el Handler responsable puede guardar el cálculo." };
        const selectedMethod = calculation.ventaAFirme
          ? get().calculationMethods.find((method) => method.id === "firm")
          : calculation.metodoSeleccionado
            ? get().calculationMethods.find((method) => method.id === calculation.metodoSeleccionado)
            : undefined;
        if (selectedMethod && !selectedMethod.active) {
          return { ok: false, error: "El método seleccionado está inactivo en el mantenedor de cálculos." };
        }
        const numericInputs: Array<[string, number | undefined]> = [
          ["cantidad afectada", calculation.cantidadAfectada],
          ["cantidad comparable", calculation.metodo1_cantidadReferencia],
          ["cantidad de mercado", calculation.metodo2_cantidadReferencia],
          ["liquidación real del Método 1", calculation.metodo1_liquidacionReal],
          ["liquidación comparable del Método 1", calculation.metodo1_liquidacionComparativa],
          ["reporte de mercado del Método 2", calculation.metodo2_valorReporteMercado],
          ["liquidación real del Método 2", calculation.metodo2_liquidacionReal],
          ["factura de exportación del Método 3", calculation.metodo3_valorFactura],
          ["venta neta de destino del Método 3", calculation.metodo3_ventaNetaDestino],
          ["nota de crédito", calculation.notaCreditoValor],
          ["tipo de cambio", calculation.tipoCambio]
        ];
        const invalidNumericInput = numericInputs.find(([, value]) => value !== undefined && (!Number.isFinite(value) || value < 0));
        if (invalidNumericInput) {
          return { ok: false, error: `El valor de ${invalidNumericInput[0]} debe ser un número igual o mayor que cero.` };
        }
        if (calculation.ventaAFirme && (calculation.notaCreditoValor === undefined || calculation.notaCreditoValor <= 0)) {
          return { ok: false, error: "En venta a firme debes ingresar el valor de la nota de crédito." };
        }
        const caseDocuments = get().documentos.filter((document) => document.casoId === calculation.casoId);
        const calculationChecklist = documentChecklist(currentCase, caseDocuments, calculation);
        const requiredTypes = calculation.ventaAFirme
          ? ["Factura de exportación", "Nota de crédito"]
          : calculation.metodoSeleccionado === "1" || calculation.metodoSeleccionado === "2"
            ? ["Liquidación por contenedor", "Liquidaciones comparativas o informe de mercado"]
            : calculation.metodoSeleccionado === "3"
              ? ["Factura de exportación", "Liquidación por contenedor"]
              : [];
        const missingSources = requiredTypes.filter((type) => {
          const checklistItem = calculationChecklist.find((item) => item.type === type);
          return !checklistItem || !isChecklistItemComplete(checklistItem);
        });
        if (missingSources.length > 0) {
          return { ok: false, error: `Falta respaldo documental para cerrar el cálculo: ${missingSources.join(", ")}.` };
        }
        if (calculation.ventaAFirme && !calculation.ventaAFirmeConfirmada) {
          return { ok: false, error: "Confirma que la factura de exportación identifica la venta como a firme antes de guardar." };
        }
        const usesQuantityNormalization = calculation.metodoSeleccionado === "1" || calculation.metodoSeleccionado === "2";
        if (!calculation.ventaAFirme && usesQuantityNormalization && (calculation.cantidadAfectada === undefined || calculation.cantidadAfectada <= 0)) {
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
        if (sourceCurrency !== calculation.moneda && calculation.tipoCambioFecha && calculation.tipoCambioFecha > new Date().toISOString().slice(0, 10)) {
          return { ok: false, error: "La fecha del tipo de cambio no puede ser futura." };
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
          casos: state.casos.map((caso) =>
            caso.id === calculation.casoId
              ? { ...caso, informeRevision: undefined, ultimaActualizacion: nowIso }
              : caso
          ),
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
      }
    };
}
