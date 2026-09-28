import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Copy,
  Download,
  FileText,
  FileCheck2,
  FolderUp,
  HelpCircle,
  History,
  LayoutDashboard,
  Lock,
  Plus,
  Pencil,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  Settings,
  UserRound,
  X
} from "lucide-react";
import { useDemoStore } from "../store/useDemoStore";
import {
  CalculoPerdida,
  CaseStatus,
  Caso,
  DamageAnalysis,
  DocumentType,
  DocumentStatus,
  Jurisdiccion,
  NewCaseInput,
  ExtractedCaseData,
  ExtractedLossProposal,
  ReviewReport,
  TransferDestination,
  UploadDraft,
  HistoricalCase,
  CalculationMethodConfig,
  CalculationMethodId,
  TemplateConfig,
  TemplateDownloadFormat,
  TemplateId,
  DischargeDateType,
  TransportMode,
  CurrencyCode
} from "../types/domain";
import { mergeExtractedData, processDocumentFiles } from "../lib/extraction";
import { readDocumentFile } from "../lib/documentStorage";
import { downloadLetterDocx, downloadLetterPdf } from "../lib/letterExport";
import { buildReviewReportText } from "../lib/review";
import { exportCaseTrackingXlsx, exportUnifiedHistoryXlsx } from "../lib/caseExport";
import {
  canEditCalculation,
  calculateLoss,
  calculatePrescription,
  currency,
  daysWithoutMovement,
  DOCUMENT_TYPES,
  documentChecklist,
  documentChecklistCoverage,
  DOCUMENT_REQUIREMENT_LABELS,
  DOCUMENT_STATUS_LABELS,
  HANDLERS,
  hasRequiredMinimum,
  INSPECTORS,
  INSPECTOR_EVOLUTION_ENABLED,
  INACTIVITY_ALERT_DAYS,
  INACTIVITY_ALERT_RECIPIENTS,
  inactivityAlert,
  isCanonicalCaseReference,
  isChecklistItemComplete,
  lastMovementAt,
  missingRequiredDocumentTypes,
  normalizeCaseReference,
  nextStatusFromCase,
  pendingField,
  prescriptionRuleFor,
  prescriptionStatus,
  REFERENCE_CHANGE_REASONS,
  referencePrescriptionMismatch,
  suggestDamageMerit,
  suggestHandler
} from "../lib/business";
import {
  buildLetterTemplate,
  buildPrintableHtml,
  getLetterTemplate,
  LETTER_TEMPLATES,
  LetterTemplateId,
  TEMPLATE_TOKENS,
  templateContentFingerprint,
  templateConflicts,
  templateHasPendingFields,
  templateLockedTokenIssues,
  templateMissingAttachments,
  templateFieldValues,
  templateRequiredTokenIssues,
  templateTokenIssues
} from "../lib/templates";
import { buildJointInspectionLetter } from "../lib/inspection";
import { HISTORICAL_BASELINE } from "../lib/historySeed";

import { AppShell, Field, EmptyState, ReadonlyBanner, StatusPill, cx, downloadTextFile, downloadHtmlFile, printHtmlFile } from "./appShared";
import { LossProposalSummary } from "./caseWork";
import { HistoricalValue } from "./historyPages";
import { FinalClaim, MethodInputs, NumberField } from "./calculationFields";

export function CalculationTab({ caso, calculo, canWrite }: { caso: Caso; calculo?: CalculoPerdida; canWrite: boolean }) {
  const { saveCalculation, calculationMethods, documentos } = useDemoStore();
  const [form, setForm] = useState<CalculoPerdida>(() => calculo
    ? {
        ...calculo,
        moneda: calculo.moneda || "USD",
        monedaOrigen: calculo.monedaOrigen || calculo.moneda || "USD",
        tipoCambioFecha: calculo.tipoCambioFecha || caso.dateOfDischarge || new Date().toISOString().slice(0, 10),
        tipoCambioFuente: calculo.tipoCambioFuente || "Xrate",
        metodo3_ventaNetaDestino: calculo.metodo3_ventaNetaDestino ?? calculo.metodo3_ventaBrutaDestino
      }
    : {
        casoId: caso.id,
        moneda: "USD",
        monedaOrigen: "USD",
        tipoCambioFecha: caso.dateOfDischarge || new Date().toISOString().slice(0, 10),
        tipoCambioFuente: "Xrate",
        rubrosAdicionales: [],
        ventaAFirme: false,
        updatedAt: new Date().toISOString()
      });
  const [error, setError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const computed = useMemo(() => calculateLoss(form), [form]);
  const updateNumber = (key: keyof CalculoPerdida, value: string) => {
    setForm((current) => ({ ...current, [key]: value === "" ? undefined : Number(value) }));
  };
  const calculationChecklist = documentChecklist(caso, documentos, form);
  const isUsableCalculationDocument = (type: DocumentType) => {
    const item = calculationChecklist.find((checklistItem) => checklistItem.type === type);
    return Boolean(item && item.documents.length > 0 && isChecklistItemComplete(item));
  };
  const firmInvoiceAvailable = isUsableCalculationDocument("Factura de exportación");
  const firmCreditNoteAvailable = isUsableCalculationDocument("Nota de crédito");
  const save = (event: FormEvent) => {
    event.preventDefault();
    const result = saveCalculation(computed);
    setError(result.ok ? "" : result.error || "No se pudo guardar.");
    setSaveNotice(result.ok
      ? computed.ventaAFirme
        ? "Cálculo guardado como venta a firme con nota de crédito."
        : `Cálculo guardado con Método ${computed.metodoSeleccionado}.`
      : "");
  };
  const loadProposal = () => {
    if (!caso.propuestaPerdida || !canWrite) return;
    setForm((current) => ({
      ...current,
      moneda: caso.propuestaPerdida?.moneda || current.moneda,
      monedaOrigen: caso.propuestaPerdida?.monedaOrigen || caso.propuestaPerdida?.moneda || current.monedaOrigen || current.moneda,
      tipoCambio: caso.propuestaPerdida?.tipoCambio,
      tipoCambioFecha: caso.propuestaPerdida?.tipoCambioFecha || current.tipoCambioFecha || caso.dateOfDischarge || new Date().toISOString().slice(0, 10),
      tipoCambioFuente: caso.propuestaPerdida?.tipoCambioFuente || current.tipoCambioFuente || "Xrate",
      metodo1_liquidacionReal: caso.propuestaPerdida?.metodo1_liquidacionReal,
      metodo1_liquidacionComparativa: caso.propuestaPerdida?.metodo1_liquidacionComparativa,
      metodo2_valorReporteMercado: caso.propuestaPerdida?.metodo2_valorReporteMercado,
      metodo2_liquidacionReal: caso.propuestaPerdida?.metodo2_liquidacionReal,
      metodo3_valorFactura: caso.propuestaPerdida?.metodo3_valorFactura,
      metodo3_ventaNetaDestino: caso.propuestaPerdida?.metodo3_ventaNetaDestino ?? caso.propuestaPerdida?.metodo3_ventaBrutaDestino,
      cantidadAfectada: caso.propuestaPerdida?.cantidadAfectada,
      unidadCalculo: caso.propuestaPerdida?.unidadCalculo,
      metodo1_cantidadReferencia: caso.propuestaPerdida?.metodo1_cantidadReferencia,
      metodo2_cantidadReferencia: caso.propuestaPerdida?.metodo2_cantidadReferencia,
      rubrosAdicionales: caso.propuestaPerdida?.rubrosAdicionales || [],
      fuentes: caso.propuestaPerdida?.fuentes || [],
      metodoSeleccionado: undefined,
      justificacionSeleccion: ""
    }));
  };
  const methods = [
    { id: "1" as const, fallbackTitle: "Método 1 · Embarque comparable", result: computed.metodo1_resultado, fallbackFormula: "liquidación bruta comparable - liquidación bruta real" },
    { id: "2" as const, fallbackTitle: "Método 2 · Reporte de mercado", result: computed.metodo2_resultado, fallbackFormula: "valor bruto reporte de mercado - liquidación bruta real" },
    { id: "3" as const, fallbackTitle: "Método 3 · Factura vs. venta", result: computed.metodo3_resultado, fallbackFormula: "valor factura exportación - venta neta destino" }
  ].map((method) => {
    const config = calculationMethods.find((item) => item.id === method.id);
    return {
      ...method,
      title: config?.title || method.fallbackTitle,
      formula: config?.formula || method.fallbackFormula,
      description: config?.description || "Método contractual disponible.",
      active: config?.active ?? true
    };
  })
    .sort((a, b) => (b.result ?? -Infinity) - (a.result ?? -Infinity));
  const firmMethod = calculationMethods.find((method) => method.id === "firm");
  return (
    <form className="space-y-5" onSubmit={save}>
      <div className="panel">
        <div className="panel-title">
          <h3>Cálculo de pérdida</h3>
          <span>{canWrite ? "Editable" : "Solo lectura"}</span>
        </div>
        {!canWrite && <ReadonlyBanner text={caso.estado.includes("Traspasado") ? "El caso fue traspasado; conserva lectura y solo su Handler responsable puede editar el expediente." : undefined} />}
        <div className="notice">
          Cada resultado es una recomendación preliminar. En los métodos 1 y 2 ingresa valores brutos, no netos. El método 3 compara la factura de exportación con la venta neta consolidada de destino. Si el resultado es negativo, se conserva para auditoría y el monto reclamable queda en cero.
        </div>
        <div className="analysis-card">
          <strong>Conclusión de causa de daño</strong>
          <p>{caso.analisisCausa?.conclusionFinal || "Sin conclusión confirmada todavía."}</p>
        </div>
        {caso.propuestaPerdida && (
          <div className="calculation-proposal">
            <div className="panel-title">
              <div>
                <h3>Propuesta desde documentos</h3>
                <p>Valores detectados para cargar como base editable. No selecciona un método ni completa el caso automáticamente.</p>
              </div>
              <span>{caso.propuestaPerdida.moneda}</span>
            </div>
            <LossProposalSummary proposal={caso.propuestaPerdida} />
            {canWrite && (
              <button type="button" className="button-secondary small mt-3" onClick={loadProposal}>
                <Download size={15} /> Cargar valores como base editable
              </button>
            )}
          </div>
        )}
        {error && <div className="form-error">{error}</div>}
        {saveNotice && <div className="notice" role="status">{saveNotice}</div>}
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Moneda de origen">
            <select className="input" disabled={!canWrite} value={form.monedaOrigen || form.moneda} onChange={(event) => setForm((current) => ({ ...current, monedaOrigen: event.target.value as CurrencyCode }))}>
              <option value="USD">USD · dólar estadounidense</option>
              <option value="EUR">EUR · euro</option>
              <option value="CLP">CLP · peso chileno</option>
              <option value="CNY">CNY · yuan chino</option>
              <option value="HKD">HKD · dólar hongkonés</option>
              <option value="GBP">GBP · libra esterlina</option>
            </select>
          </Field>
          <Field label="Moneda de cálculo">
            <select className="input" disabled={!canWrite} value={form.moneda} onChange={(event) => setForm((current) => ({ ...current, moneda: event.target.value as CurrencyCode }))}>
              <option value="USD">USD · dólar estadounidense</option>
              <option value="EUR">EUR · euro</option>
              <option value="CLP">CLP · peso chileno</option>
              <option value="CNY">CNY · yuan chino</option>
              <option value="HKD">HKD · dólar hongkonés</option>
              <option value="GBP">GBP · libra esterlina</option>
            </select>
          </Field>
          <label className="checkbox-field">
            <input type="checkbox" disabled={!canWrite || firmMethod?.active === false} checked={form.ventaAFirme} onChange={(event) => setForm((current) => ({ ...current, ventaAFirme: event.target.checked }))} />
            {firmMethod?.title || "Venta a firme · nota de crédito"}
          </label>
        </div>
        {form.monedaOrigen !== form.moneda && (
          <div className="mt-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label={`Tipo de cambio · 1 ${form.monedaOrigen || form.moneda} = X ${form.moneda}`}>
                <input className="input" disabled={!canWrite} min="0" step="any" type="number" value={form.tipoCambio || ""} onChange={(event) => updateNumber("tipoCambio", event.target.value)} placeholder="Ej. 0,0011" />
              </Field>
              <Field label="Fecha del tipo de cambio">
                <input className="input" disabled={!canWrite} type="date" value={form.tipoCambioFecha || caso.dateOfDischarge || ""} onChange={(event) => setForm((current) => ({ ...current, tipoCambioFecha: event.target.value }))} />
              </Field>
              <Field label="Fuente del tipo de cambio">
                <input className="input" disabled={!canWrite} value={form.tipoCambioFuente || ""} onChange={(event) => setForm((current) => ({ ...current, tipoCambioFuente: event.target.value }))} placeholder="Xrate o tasa manual documentada" />
              </Field>
            </div>
            <p className="notice mt-3">Los valores de respaldo se ingresan en {form.monedaOrigen || form.moneda} y los resultados se muestran en {form.moneda}. La conversión se aplica antes de comparar, en la dirección 1 {form.monedaOrigen || form.moneda} = X {form.moneda}. La fecha de descarga se propone por defecto, pero puedes indicar otra fecha documentada. Los resultados se redondean a 2 decimales. La fuente oficial configurada es Xrate; también se permite una tasa manual documentada.</p>
          </div>
        )}
        {form.monedaOrigen === form.moneda && <p className="notice mt-3">Los valores de respaldo y el resultado están expresados en {form.moneda}; no se requiere conversión.</p>}
        {form.fuentes && form.fuentes.length > 0 && <p className="history-source-note">Valores cargados desde: {form.fuentes.join(", ")}</p>}
      </div>

      <div className="panel">
        <div className="panel-title">
          <h3>Unidad y cantidad de cálculo</h3>
          <span>Normalización opcional</span>
        </div>
        <p className="notice mb-4">Cuando el embarque comparable o el reporte de mercado tiene un volumen distinto, indica la cantidad de referencia. El sistema llevará el valor unitario a la cantidad afectada antes de comparar.</p>
        <div className="grid gap-4 md:grid-cols-3">
          <NumberField label="Cantidad afectada" disabled={!canWrite} value={form.cantidadAfectada} onChange={(value) => updateNumber("cantidadAfectada", value)} />
          <Field label="Unidad de cálculo">
            <input className="input" disabled={!canWrite} value={form.unidadCalculo || ""} onChange={(event) => setForm((current) => ({ ...current, unidadCalculo: event.target.value }))} placeholder="Cajas, kg, pallets..." />
          </Field>
          <div className="notice self-end">La unidad debe ser la misma para ambos valores comparados.</div>
        </div>
      </div>

      {form.ventaAFirme ? (
        <div className="panel">
          <div className="notice mb-4">
            La venta a firme se calcula únicamente con el valor de la nota de crédito. La factura de exportación debe identificar expresamente la condición “a firme”.
          </div>
          <label className="checkbox-field mb-4">
            <input
              type="checkbox"
              disabled={!canWrite}
              checked={Boolean(form.ventaAFirmeConfirmada)}
              onChange={(event) => setForm((current) => ({ ...current, ventaAFirmeConfirmada: event.target.checked }))}
            />
            Confirmo que la factura de exportación indica que la venta es a firme
          </label>
          <div className="notice mb-4">
            Respaldo detectado: factura {firmInvoiceAvailable ? "disponible" : "faltante"} · nota de crédito {firmCreditNoteAvailable ? "disponible" : "faltante"}.
          </div>
          <Field label="Valor nota de crédito">
            <input className="input" disabled={!canWrite} type="number" value={form.notaCreditoValor || ""} onChange={(event) => updateNumber("notaCreditoValor", event.target.value)} placeholder={`Monto en ${form.monedaOrigen || form.moneda}`} />
          </Field>
            <FinalClaim value={computed.montoFinalReclamo} signedValue={computed.resultadoSeleccionadoFirmado} moneda={form.moneda} />
        </div>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-3">
            <MethodInputs title={calculationMethods.find((method) => method.id === "1")?.title || "Método 1 · Embarque comparable"}>
              <NumberField label={`Cantidad embarque comparable (${form.unidadCalculo || "unidad"})`} disabled={!canWrite} value={form.metodo1_cantidadReferencia} onChange={(value) => updateNumber("metodo1_cantidadReferencia", value)} />
              <NumberField label={`Liquidación bruta real (${form.monedaOrigen || form.moneda})`} disabled={!canWrite} value={form.metodo1_liquidacionReal} onChange={(value) => updateNumber("metodo1_liquidacionReal", value)} />
              <NumberField label={`Liquidación bruta comparable (${form.monedaOrigen || form.moneda})`} disabled={!canWrite} value={form.metodo1_liquidacionComparativa} onChange={(value) => updateNumber("metodo1_liquidacionComparativa", value)} />
            </MethodInputs>
            <MethodInputs title={calculationMethods.find((method) => method.id === "2")?.title || "Método 2 · Reporte de mercado"}>
              <NumberField label={`Cantidad reporte de mercado (${form.unidadCalculo || "unidad"})`} disabled={!canWrite} value={form.metodo2_cantidadReferencia} onChange={(value) => updateNumber("metodo2_cantidadReferencia", value)} />
              <NumberField label={`Valor bruto reporte de mercado (${form.monedaOrigen || form.moneda})`} disabled={!canWrite} value={form.metodo2_valorReporteMercado} onChange={(value) => updateNumber("metodo2_valorReporteMercado", value)} />
              <NumberField label={`Liquidación bruta real (${form.monedaOrigen || form.moneda})`} disabled={!canWrite} value={form.metodo2_liquidacionReal} onChange={(value) => updateNumber("metodo2_liquidacionReal", value)} />
            </MethodInputs>
            <MethodInputs title={calculationMethods.find((method) => method.id === "3")?.title || "Método 3 · Factura vs. venta"}>
              <NumberField label={`Valor factura exportación (${form.monedaOrigen || form.moneda})`} disabled={!canWrite} value={form.metodo3_valorFactura} onChange={(value) => updateNumber("metodo3_valorFactura", value)} />
              <NumberField label={`Venta neta destino (${form.monedaOrigen || form.moneda})`} disabled={!canWrite} value={form.metodo3_ventaNetaDestino} onChange={(value) => updateNumber("metodo3_ventaNetaDestino", value)} />
            </MethodInputs>
          </div>
          <div className="panel">
            <div className="panel-title">
              <h3>Resultados paralelos</h3>
              <span>Ordenados de mayor a menor</span>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {methods.map((method) => (
                <button
                  type="button"
                  key={method.id}
                  disabled={!canWrite || !method.active || method.result === undefined}
                  className={cx("method-card", form.metodoSeleccionado === method.id && "selected")}
                  onClick={() => setForm((current) => ({ ...current, metodoSeleccionado: method.id }))}
                >
                  <span>{method.title}</span>
                  <strong>{currency(method.result, form.moneda)}</strong>
                  <small>{!method.active ? "Inactivo en mantenedor" : method.result === undefined ? "Sin datos" : method.formula}</small>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="panel">
        <div className="panel-title">
          <h3>Regla contractual y justificación</h3>
        </div>
        <p className="notice">Los costos desglosados no se agregan como rubros adicionales al resultado contractual. Los Métodos 1 y 2 utilizan valores brutos; el Método 3 utiliza venta neta en destino; la venta a firme utiliza la nota de crédito. Los rubros históricos se conservan solo como metadata de auditoría.</p>
        {!form.ventaAFirme && (
          <Field label="Justificación del método seleccionado">
            <textarea className="input min-h-28" disabled={!canWrite} value={form.justificacionSeleccion || ""} onChange={(event) => setForm((current) => ({ ...current, justificacionSeleccion: event.target.value }))} />
          </Field>
        )}
        <FinalClaim value={computed.montoFinalReclamo} signedValue={computed.resultadoSeleccionadoFirmado} moneda={form.moneda} />
        {canWrite && (
          <button className="button-primary mt-4" type="submit">
            <Save size={17} /> Guardar cálculo auditable
          </button>
        )}
      </div>
    </form>
  );
}

export function ReviewReportTab({
  caso,
  docs,
  calculo,
  canWrite
}: {
  caso: Caso;
  docs: ReturnType<typeof useDemoStore.getState>["documentos"];
  calculo?: CalculoPerdida;
  canWrite: boolean;
}) {
  const { bitacora, generateReviewReport } = useDemoStore();
  const [destination, setDestination] = useState<TransferDestination>(caso.informeRevision?.destination || "FIS");
  const report = caso.informeRevision;
  const reportMatchesDestination = report?.destination === destination;

  const generate = () => generateReviewReport(caso.id, destination);
  const download = () => {
    if (!report) return;
    downloadTextFile(`${caso.id}_informe_revision_${report.destination}.txt`, buildReviewReportText(report));
  };
  const exportCase = () => exportCaseTrackingXlsx([caso], docs, calculo ? [calculo] : [], bitacora, `${caso.id}_seguimiento.xlsx`);

  return (
    <section className="space-y-5">
      <section className="panel review-report-intro">
        <div>
          <p className="eyebrow">Control previo al traspaso</p>
          <h3>Informe de revisión del expediente</h3>
          <p>Consolida el estado documental, el análisis de causa y el cálculo que el handler está proponiendo para la siguiente etapa.</p>
        </div>
        <div className="review-report-actions">
          <label className="field-label" htmlFor="review-destination">Destino</label>
          <select
            id="review-destination"
            className="input"
            disabled={!canWrite}
            value={destination}
            onChange={(event) => setDestination(event.target.value as TransferDestination)}
          >
            <option value="FIS">FIS · recupero extrajudicial</option>
            <option value="Lawgistic">Lawgistic · recupero judicial</option>
          </select>
          <button className="button-primary" type="button" disabled={!canWrite} onClick={generate}>
            <FileCheck2 size={17} /> Generar informe
          </button>
          {report && reportMatchesDestination && (
            <button className="button-secondary" type="button" onClick={download}>
              <Download size={17} /> Descargar
            </button>
          )}
          <button className="button-secondary" type="button" onClick={exportCase}>
            <Download size={17} /> Exportar Excel
          </button>
        </div>
      </section>

      {report && !reportMatchesDestination && (
        <div className="notice" role="alert">El destino fue cambiado a <strong>{destination}</strong>. Regenera el informe antes de descargarlo o traspasar el caso.</div>
      )}

      {report && reportMatchesDestination ? (
        <ReviewReportContent report={report} />
      ) : (
        <section className="panel review-report-empty">
          <FileCheck2 size={28} />
          <strong>{report ? "El informe requiere actualización" : "Aún no hay un informe generado"}</strong>
          <p>{report ? "Selecciona Generar informe para reconstruir la revisión con el destino actual." : "Selecciona el destino y genera el informe para dejar registrada la revisión previa al traspaso."}</p>
        </section>
      )}

      <section className="panel review-report-sources">
        <div className="panel-title">
          <h3>Fuentes del informe</h3>
          <span>{docs.length} documentos · {calculo ? "cálculo disponible" : "sin cálculo"}</span>
        </div>
        <p>El contenido se construye con la ficha del caso, el inventario documental, el análisis confirmado y el último cálculo guardado.</p>
      </section>
    </section>
  );
}

export function ReviewReportContent({ report, compact = false }: { report: ReviewReport; compact?: boolean }) {
  const availableCount = report.availableDocuments.length;
  const pendingCount = report.pendingActions.length;
  const closureChecklist = report.closureChecklist || [];
  const completedGates = closureChecklist.filter((gate) => gate.status === "Cumplido").length;
  return (
    <section className={cx("review-report", compact && "compact")}>
      <div className="review-report-heading">
        <div>
          <p className="eyebrow">Derivación a {report.destination}</p>
          <h3>Revisión {report.ready ? "aprobada" : "con observaciones"}</h3>
          <p>Generado por {report.generatedBy} · {new Date(report.generatedAt).toLocaleString("es-CL")}</p>
        </div>
        <StatusPill label={report.status} tone={report.ready ? "ok" : "warn"} />
      </div>

      <div className="review-report-summary">
        <strong>Resumen ejecutivo</strong>
        <p>{report.executiveSummary}</p>
      </div>

      <div className="review-report-metrics">
        <div><span>Documentos disponibles</span><strong>{availableCount}</strong></div>
        <div><span>Documentos pendientes</span><strong>{report.missingDocuments.length}</strong></div>
        <div><span>Acciones pendientes</span><strong>{pendingCount}</strong></div>
        <div><span>Mérito preliminar</span><strong>{report.preliminaryMerit || "Pendiente"}</strong></div>
      </div>

      {!compact && (
        <section className="review-gate-panel">
          <div className="panel-title">
            <div>
              <h4>Checklist de cierre local</h4>
              <p>El traspaso normal exige este checklist. Si hay urgencia de prescripción, el Handler puede usar la vía excepcional con autorización registrada.</p>
            </div>
            <span>{completedGates}/{closureChecklist.length || 5} cumplidas</span>
          </div>
          {closureChecklist.length > 0 ? (
            <div className="review-gate-list">
              {closureChecklist.map((gate) => (
                <div className="review-gate-row" key={gate.id}>
                  <div>
                    <strong>{gate.label}</strong>
                    <small>{gate.detail}</small>
                  </div>
                  <StatusPill label={gate.status} tone={gate.status === "Cumplido" ? "ok" : "warn"} />
                </div>
              ))}
            </div>
          ) : (
            <p className="review-gate-empty">Regenera el informe para consultar el checklist de cierre actualizado.</p>
          )}
        </section>
      )}

      {!compact && (
        <div className="review-report-grid">
          <div className="review-report-section">
            <h4>Causa propuesta</h4>
            <p>{report.recommendedCause || "Pendiente de confirmación humana."}</p>
            <small>Sustento: {report.causeSources.length > 0 ? report.causeSources.join(", ") : "No informado"}</small>
          </div>
          <div className="review-report-section">
            <h4>Cálculo seleccionado</h4>
            <p>{report.selectedCalculation?.method || "Pendiente de selección"}</p>
            <strong>
              {report.selectedCalculation?.amount !== undefined
                ? `${report.selectedCalculation.currency || "USD"} ${report.selectedCalculation.amount.toLocaleString("es-CL")}`
                : "Sin monto final"}
            </strong>
            {report.selectedCalculation?.justification && <small>{report.selectedCalculation.justification}</small>}
          </div>
        </div>
      )}

      <div className="review-report-columns">
        <div>
          <h4>Documentación disponible</h4>
          <ul>
            {report.availableDocuments.length > 0 ? report.availableDocuments.map((item) => <li key={item}>{item}</li>) : <li>Ningún documento registrado</li>}
          </ul>
        </div>
        <div>
          <h4>{report.pendingActions.length > 0 ? "Pendientes para cerrar" : "Pendientes"}</h4>
          <ul>
            {report.pendingActions.length > 0 ? report.pendingActions.map((item) => <li key={item}>{item}</li>) : <li>Ninguno</li>}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function HistoryTab({ events }: { events: ReturnType<typeof useDemoStore.getState>["bitacora"] }) {
  const eventLabels: Record<string, string> = {
    cambio_estado: "Cambio de estado",
    caso_actualizado: "Caso actualizado",
    documento_cargado: "Documento cargado",
    documento_solicitado: "Documento solicitado",
    documento_eliminado: "Documento eliminado",
    calculo_generado: "Cálculo guardado",
    carta_generada: "Carta generada",
    carta_aprobada: "Carta aprobada",
    reversion_estado: "Reversión de estado",
    analisis_confirmado: "Análisis confirmado",
    extraccion_revisada: "Extracción revisada",
    inspeccion_registrada: "Inspección registrada",
    informe_generado: "Informe generado",
    alerta_inactividad_enviada: "Alerta de inactividad enviada",
    alerta_inactividad_leida: "Alerta de inactividad leída",
    alerta_inactividad_cerrada: "Alerta de inactividad cerrada"
  };
  return (
    <section className="panel">
      <div className="panel-title">
        <h3>Bitácora no editable</h3>
        <span>{events.length} eventos</span>
      </div>
      {events.length === 0 ? <EmptyState text="Aún no hay eventos registrados para este caso." /> : (
        <div className="timeline">
          {events.map((event) => (
            <div className="timeline-event" key={event.id}>
              <div className="timeline-dot" />
              <div>
                <p className="font-semibold">{event.detalle}</p>
                <p className="text-sm text-slate-500">
                  {new Date(event.timestamp).toLocaleString("es-CL")} · {event.usuario} · {eventLabels[event.tipoEvento] || event.tipoEvento}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function InspectionTab({ caso, canWrite }: { caso: Caso; canWrite: boolean }) {
  const { saveInspection } = useDemoStore();
  const [date, setDate] = useState(caso.fechaInspeccion || "");
  const [jointInspection, setJointInspection] = useState(caso.inspeccionConjunta === undefined ? "" : String(caso.inspeccionConjunta));
  const [summary, setSummary] = useState(caso.resumenInspeccion || "");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const save = () => {
    const result = saveInspection(caso.id, {
      fechaInspeccion: date,
      inspeccionConjunta: jointInspection === "" ? undefined : jointInspection === "true",
      resumenInspeccion: summary
    });
    setError(result.ok ? "" : result.error || "No se pudo guardar la inspección.");
    setNotice(result.ok ? "Inspección registrada en la bitácora del caso." : "");
  };
  const downloadJsi = () => {
    const safeId = caso.id.replace(/[^\w-]+/g, "-");
    downloadHtmlFile(`${safeId}_carta_jsi.html`, buildJointInspectionLetter({
      ...caso,
      fechaInspeccion: date || caso.fechaInspeccion,
      inspeccionConjunta: jointInspection === "" ? caso.inspeccionConjunta : jointInspection === "true",
      resumenInspeccion: summary || caso.resumenInspeccion
    }));
  };
  return (
    <section className="inspection-workspace">
      <div className="panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">Operación de inspección</p>
            <h3>Registro de inspección</h3>
          </div>
          <StatusPill label={canWrite ? "Edición del inspector" : "Solo lectura"} tone={canWrite ? "ok" : "missing"} />
        </div>
        {!canWrite && <ReadonlyBanner text="Solo el inspector asignado puede registrar o modificar estos antecedentes." />}
        {error && <div className="form-error">{error}</div>}
        {notice && <div className="notice">{notice}</div>}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Fecha de inspección *">
            <input className="input" type="date" disabled={!canWrite} value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <Field label="¿Inspección conjunta con la naviera? *">
            <select className="input" disabled={!canWrite} value={jointInspection} onChange={(event) => setJointInspection(event.target.value)}>
              <option value="">Seleccionar</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </Field>
        </div>
        <Field label="Resumen de lo observado">
          <textarea className="input min-h-36" disabled={!canWrite} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Describe los principales hallazgos de la inspección." />
        </Field>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button className="button-secondary" type="button" onClick={downloadJsi}><Download size={16} /> Descargar Carta JSI</button>
          {canWrite && <button className="button-primary" type="button" onClick={save}><Save size={16} /> Guardar inspección</button>}
        </div>
      </div>
      <div className="panel inspection-context-panel">
        <div className="panel-title">
          <div>
            <h3>Antecedentes del caso</h3>
            <p>Información disponible para preparar la notificación.</p>
          </div>
          <ClipboardCheck size={20} />
        </div>
        <div className="history-detail-grid">
          <HistoricalValue label="Referencia" value={caso.id} />
          <HistoricalValue label="Asegurado" value={caso.assured} />
          <HistoricalValue label="Oponente" value={caso.opponent} />
          <HistoricalValue label="Nave / viaje" value={`${caso.vessel || "Sin nave"} / ${caso.voyage || "Sin viaje"}`} />
          <HistoricalValue label="Lugar de descarga" value={caso.placeOfDischarge} />
          <HistoricalValue label="Inspector asignado" value={caso.inspectorAsignado} />
        </div>
      </div>
    </section>
  );
}
