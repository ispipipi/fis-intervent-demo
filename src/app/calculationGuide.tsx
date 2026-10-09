import { ArrowRight, Check } from "lucide-react";
import { CalculoPerdida, Caso } from "../types/domain";

export type CalculationGuideStatus = "done" | "current" | "pending";

export type CalculationGuideStep = {
  id: string;
  label: string;
  helper: string;
  status: CalculationGuideStatus;
  targetId: string;
};

export function buildCalculationGuideSteps({ form, caso, calculo, documentCount, methods }: { form: CalculoPerdida; caso: Caso; calculo?: CalculoPerdida; documentCount: number; methods: Array<{ result?: number }> }) {
  const proposalLoaded = [
    form.metodo1_liquidacionReal,
    form.metodo1_liquidacionComparativa,
    form.metodo2_valorReporteMercado,
    form.metodo3_valorFactura,
    form.metodo3_ventaNetaDestino
  ].some((value) => value !== undefined);
  const proposalPending = Boolean(caso.propuestaPerdida) && !proposalLoaded;
  const steps: CalculationGuideStep[] = [
    {
      id: "sources",
      label: proposalPending ? "Cargar propuesta" : "Revisar respaldo",
      helper: proposalPending ? "Usa los valores extraídos de los documentos." : "Verifica moneda y documentos fuente.",
      status: proposalPending ? "current" : form.fuentes?.length || caso.propuestaPerdida || calculo || documentCount > 0 ? "done" : "current",
      targetId: proposalPending ? "calculation-proposal" : "calculation-data-panel"
    },
    {
      id: "inputs",
      label: "Completar datos",
      helper: "Ingresa cantidad y unidad si aplica.",
      status: form.ventaAFirme || form.metodoSeleccionado === "3" || (Boolean(form.cantidadAfectada && form.cantidadAfectada > 0) && Boolean(form.unidadCalculo?.trim())) ? "done" : "current",
      targetId: "calculation-quantity-panel"
    },
    {
      id: "compare",
      label: "Comparar resultados",
      helper: "Revisa las diferencias entre métodos.",
      status: form.ventaAFirme ? form.notaCreditoValor !== undefined ? "done" : "current" : methods.some((method) => method.result !== undefined) ? "done" : "current",
      targetId: "calculation-results-panel"
    },
    {
      id: "save",
      label: "Seleccionar y guardar",
      helper: "Elige un método, justifica y guarda.",
      status: form.ventaAFirme
        ? form.ventaAFirmeConfirmada ? "done" : "current"
        : form.metodoSeleccionado && (form.justificacionSeleccion?.trim().length || 0) >= 10 ? "done" : "current",
      targetId: "calculation-final-panel"
    }
  ];
  const firstPending = steps.findIndex((step) => step.status !== "done");
  return steps.map((step, index) => ({
    ...step,
    status: step.status === "done" ? "done" : index === firstPending ? "current" : "pending"
  })) as CalculationGuideStep[];
}

export function CalculationGuide({ steps, onJump }: { steps: CalculationGuideStep[]; onJump: (targetId: string) => void }) {
  const nextStep = steps.find((step) => step.status !== "done") || steps[steps.length - 1];
  const completed = steps.filter((step) => step.status === "done").length;

  return (
    <section className="calculation-guide" aria-label="Ruta para completar el cálculo">
      <div className="calculation-guide-header">
        <div>
          <span className="eyebrow">RUTA DEL CÁLCULO</span>
          <h3>Completa y guarda el cálculo</h3>
          <p><strong>Siguiente:</strong> {nextStep.label} · {nextStep.helper}</p>
        </div>
        <span className="calculation-guide-progress">{completed}/{steps.length} listos</span>
      </div>
      <ol className="calculation-steps">
        {steps.map((step, index) => (
          <li key={step.id} className={step.status}>
            <button type="button" onClick={() => onJump(step.targetId)} aria-label={`Ir a ${step.label}`}>
              <span className="calculation-step-index">{step.status === "done" ? <Check size={15} /> : index + 1}</span>
              <span className="calculation-step-copy">
                <strong>{step.label}</strong>
                <small>{step.helper}</small>
              </span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
      <p className="calculation-guide-note">Puedes volver a cualquier paso. El guardado final valida los respaldos, el método y la justificación.</p>
    </section>
  );
}
