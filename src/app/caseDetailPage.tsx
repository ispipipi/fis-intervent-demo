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


import { AppShell, Field, Modal, ReadonlyBanner, StatusPill, EmptyState, STATUS_LABELS, cx, downloadTextFile } from "./appShared";
import { CaseSummaryMetric, DocumentsTab, AnalysisTab } from "./caseWork";
import { CalculationTab, ReviewReportTab, ReviewReportContent, HistoryTab, InspectionTab } from "./calculationReviewPages";
import { LettersTab } from "./lettersMaintainersPages";

export function CaseDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const decodedId = decodeURIComponent(id || "");
  const { casos, documentos, calculosPerdida, bitacora, usuario, generateReviewReport, transitionCase, revertCase, updateCaseDetails, assignInspector } = useDemoStore();
  const caso = casos.find((item) => item.id === decodedId);
  const params = new URLSearchParams(location.search);
  const requestedTab = params.get("tab") || "documentos";
  const validTabs = ["documentos", "analisis", "calculo", "informe", "historial", "cartas"];
  const initialTab = requestedTab === "inspeccion" && !INSPECTOR_EVOLUTION_ENABLED
    ? "documentos"
    : validTabs.includes(requestedTab) || (INSPECTOR_EVOLUTION_ENABLED && requestedTab === "inspeccion")
      ? requestedTab
      : "documentos";
  const [tab, setTab] = useState(initialTab);
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);
  const [showTransfer, setShowTransfer] = useState<"Traspasado a FIS" | "Traspasado a Lawgistic" | null>(null);
  const [revertReason, setRevertReason] = useState("");
  const [revertStatus, setRevertStatus] = useState<CaseStatus>("Preclaim");
  const [notice, setNotice] = useState("");
  const [isEditingCase, setIsEditingCase] = useState(false);
  const [editReference, setEditReference] = useState("");
  const [editReferenceReason, setEditReferenceReason] = useState("");
  const [editDateOfDischarge, setEditDateOfDischarge] = useState("");
  const [editDateType, setEditDateType] = useState<DischargeDateType>("Real");
  const [editFechaRecepcion, setEditFechaRecepcion] = useState("");
  const [editModoTransporte, setEditModoTransporte] = useState<TransportMode>("Marítimo");
  const [editJurisdiccion, setEditJurisdiccion] = useState<Jurisdiccion | "">("");
  const [editError, setEditError] = useState("");
  const [inspectorDraft, setInspectorDraft] = useState(caso?.inspectorAsignado || "");
  const [inspectorNotice, setInspectorNotice] = useState("");
  const [exceptionalTransferReason, setExceptionalTransferReason] = useState("");
  const [exceptionalTransferAcknowledged, setExceptionalTransferAcknowledged] = useState(false);
  if (!caso) {
    return (
      <AppShell>
        <EmptyState text="Caso no encontrado." />
      </AppShell>
    );
  }
  if (usuario.role === "Inspector" && caso.inspectorAsignado !== usuario.nombre) {
    return (
      <AppShell>
        <EmptyState text="Este caso no está asignado al inspector actual." />
      </AppShell>
    );
  }
  if (usuario.role === "Handler" && caso.claimHandler !== usuario.nombre) {
    return (
      <AppShell>
        <EmptyState text="Este caso está asignado a otro Handler y no está disponible para tu perfil." />
      </AppShell>
    );
  }
  const caseDocs = documentos.filter((doc) => doc.casoId === caso.id);
  const calculo = calculosPerdida.find((item) => item.casoId === caso.id);
  const events = bitacora.filter((event) => event.casoId === caso.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const pres = prescriptionStatus(caso);
  const referenceMismatch = referencePrescriptionMismatch(caso.id, caso.dateOfDischarge, caso.jurisdiccion, caso.modoTransporte);
  const staleDays = daysWithoutMovement(caso, bitacora);
  const inactivity = inactivityAlert(caso, bitacora);
  const lastMovement = lastMovementAt(caso, bitacora);
  const canWrite = usuario.role === "Handler" && caso.claimHandler === usuario.nombre;
  const isTransferred = caso.estado === "Traspasado a FIS" || caso.estado === "Traspasado a Lawgistic";
  const canMutateCase = canWrite;
  const canEditCaseDetails = canMutateCase && canEditCalculation(caso);
  const nextStatus = nextStatusFromCase(caso, caseDocs, calculo);
  const canAdvance = nextStatus !== caso.estado;
  const isInspector = usuario.role === "Inspector";
  const activeTab = isInspector ? "inspeccion" : tab;
  const editReferenceMismatch = referencePrescriptionMismatch(editReference, editDateOfDischarge, editJurisdiccion || undefined, editModoTransporte);
  const editCalculatedPrescription = calculatePrescription(editDateOfDischarge, editJurisdiccion || undefined, editModoTransporte);
  const editPrescriptionRule = prescriptionRuleFor(editJurisdiccion || undefined, editModoTransporte);

  const changeTab = (next: string) => {
    setTab(next);
    navigate(`/casos/${encodeURIComponent(caso.id)}?tab=${next}`, { replace: true });
  };
  const actionPrimary = () => {
    if (caso.estado === "Cálculo completo") return;
    if (nextStatus === caso.estado) {
      setNotice("Aún falta completar documentos o cálculo antes de avanzar el estado.");
      return;
    }
    const result = transitionCase(caso.id, nextStatus, `Estado actualizado automáticamente a ${nextStatus}.`);
    if (!result.ok) setNotice(result.error || "No se pudo actualizar el estado.");
  };
  const openTransfer = (destination: TransferDestination) => {
    generateReviewReport(caso.id, destination);
    setExceptionalTransferReason("");
    setExceptionalTransferAcknowledged(false);
    setShowTransfer(destination === "FIS" ? "Traspasado a FIS" : "Traspasado a Lawgistic");
  };
  const confirmTransfer = () => {
    if (!showTransfer) return;
    const isExceptional = !caso.informeRevision?.ready;
    if (isExceptional && (!exceptionalTransferAcknowledged || exceptionalTransferReason.trim().length < 10)) {
      setNotice("Confirma la autorización y registra un motivo de al menos 10 caracteres para continuar con un traspaso incompleto.");
      return;
    }
    const destination = showTransfer.replace("Traspasado a ", "");
    const result = transitionCase(
      caso.id,
      showTransfer,
      isExceptional
        ? `Caso traspasado excepcionalmente a ${destination}. El expediente queda incompleto para completar antecedentes en la siguiente etapa.`
        : `Caso traspasado a ${destination}. Informe de revisión listo. El expediente permanece editable por el Handler responsable.`,
      isExceptional ? exceptionalTransferReason : undefined
    );
    if (!result.ok) {
      setNotice(result.error || "No se pudo completar el traspaso.");
      setShowTransfer(null);
      return;
    }
    setShowTransfer(null);
    setExceptionalTransferReason("");
    setExceptionalTransferAcknowledged(false);
  };
  const submitRevert = () => {
    const result = revertCase(caso.id, revertStatus, revertReason);
    setNotice(result.ok ? "Estado revertido y registrado en bitácora." : result.error || "No se pudo revertir.");
    if (result.ok) setRevertReason("");
  };
  const beginCaseEdit = () => {
    setEditReference(caso.id);
    setEditReferenceReason("");
    setEditDateOfDischarge(caso.dateOfDischarge || "");
    setEditDateType(caso.dateOfDischargeType || "Real");
    setEditFechaRecepcion(caso.fechaRecepcion || caso.createdAt.slice(0, 10));
    setEditModoTransporte(caso.modoTransporte || "Marítimo");
    setEditJurisdiccion(caso.jurisdiccion || "");
    setEditError("");
    setIsEditingCase(true);
  };
  const cancelCaseEdit = () => {
    setEditError("");
    setEditReferenceReason("");
    setIsEditingCase(false);
  };
  const saveCaseDetails = () => {
    const nextReference = editReference.trim();
    const today = new Date().toISOString().slice(0, 10);
    if (!nextReference) {
      setEditError("La referencia interna es obligatoria.");
      return;
    }
    if (nextReference !== caso.id && !isCanonicalCaseReference(nextReference)) {
      setEditError("La nueva referencia debe usar el formato PRE-FIS-... o PRE-FIS/CLIENTE-... .");
      return;
    }
    if (nextReference !== caso.id && !editReferenceReason) {
      setEditError("Selecciona el motivo de modificación de la referencia.");
      return;
    }
    if (casos.some((item) => item.id !== caso.id && normalizeCaseReference(item.id) === normalizeCaseReference(nextReference))) {
      setEditError("La referencia ya existe en otro caso.");
      return;
    }
    if (editDateOfDischarge && editDateOfDischarge > today && editDateType !== "ETA") {
      setEditError("La fecha efectiva no puede ser futura. Selecciona ETA si corresponde.");
      return;
    }
    if (editFechaRecepcion && editFechaRecepcion > today) {
      setEditError("La fecha de recepción no puede ser futura.");
      return;
    }
    if (!editModoTransporte || (editModoTransporte === "Marítimo" && !editJurisdiccion)) {
      setEditError("Selecciona el modo de transporte y la jurisdicción marítima cuando corresponda.");
      return;
    }
    const result = updateCaseDetails(caso.id, {
      id: nextReference,
      dateOfDischarge: editDateOfDischarge || undefined,
      dateOfDischargeType: editDateOfDischarge ? editDateType : undefined,
      fechaRecepcion: editFechaRecepcion || undefined,
      modoTransporte: editModoTransporte,
      jurisdiccion: editJurisdiccion || undefined
    }, editReferenceReason || undefined);
    if (!result.ok) {
      setEditError(result.error || "No se pudieron guardar los cambios.");
      return;
    }
    setIsEditingCase(false);
    setEditReferenceReason("");
    navigate(`/casos/${encodeURIComponent(nextReference)}?tab=${tab}`, { replace: true });
  };
  const saveInspectorAssignment = () => {
    const result = assignInspector(caso.id, inspectorDraft || undefined);
    setInspectorNotice(result.ok ? "Asignación de inspector actualizada." : result.error || "No se pudo actualizar la asignación.");
  };

  return (
    <AppShell>
      <Link to="/casos" className="back-link">
        <ArrowLeft size={16} /> Volver a casos
      </Link>
      <section className="case-header">
        <div>
          <p className="eyebrow">{caso.csClaimNo || "Sin CS Claim No"}</p>
          <h2>{caso.id}</h2>
          <p className="mt-2 text-slate-600">
            {caso.assured || "Sin asegurado"} · {caso.opponent || "Sin oponente"} · {caso.vessel || "Sin nave"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusPill label={caso.estado} tone={caso.estado === "Datos incompletos" ? "missing" : caso.estado.includes("Traspasado") ? "ok" : "warn"} />
            <StatusPill label={pres.label} tone={pres.tone} />
            {inactivity.active && <StatusPill label={`${staleDays} días sin movimiento`} tone="warn" />}
          </div>
        </div>
        <div className="case-actions">
          {notice && <p className="notice">{notice}</p>}
          {inactivity.active && (
            <p className="notice" role="status">
              Aviso de gestión: este caso lleva {INACTIVITY_ALERT_DAYS} días o más sin movimiento según su última actividad válida de bitácora. Registra una acción de gestión para reiniciar el contador.
            </p>
          )}
          {referenceMismatch && (
            <p className="notice" role="status">
              Revisa la referencia: usa el período de prescripción <strong>{referenceMismatch.currentPeriod}</strong>, pero la fecha y jurisdicción actuales indican <strong>{referenceMismatch.expectedPeriod}</strong>. Puedes corregirla desde Editar datos clave.
            </p>
          )}
          {canEditCaseDetails && !isEditingCase && (
          <button className="button-secondary" type="button" onClick={beginCaseEdit}>
              <Pencil size={16} /> Editar datos clave
            </button>
          )}
          {canWrite && isTransferred && (
            <p className="notice">Caso traspasado: el cambio de estado quedó registrado y el expediente sigue editable por el Handler responsable.</p>
          )}
          {caso.traspasoExcepcional && (
            <p className="notice" role="status">
              Traspaso excepcional autorizado por <strong>{caso.traspasoExcepcional.authorizedBy}</strong> el {new Date(caso.traspasoExcepcional.authorizedAt).toLocaleString("es-CL")}. Pendientes conservados: {caso.traspasoExcepcional.pendingDocuments.join(", ") || "ninguno"}.
            </p>
          )}
          {usuario.role === "Handler" && !canWrite && (
            <p className="notice">
              Este caso está asignado a <strong>{caso.claimHandler}</strong>. Selecciona ese Handler para editarlo.
            </p>
          )}
          {usuario.role === "Inspector" && (
            <p className="notice">Caso asignado a <strong>{caso.inspectorAsignado}</strong>. Esta vista permite registrar la inspección.</p>
          )}
          {canMutateCase && !isTransferred && (
            <>
              {caso.estado !== "Cálculo completo" ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    className="button-primary"
                    type="button"
                    onClick={actionPrimary}
                    disabled={!canAdvance}
                    title={canAdvance ? `Avanzar a ${nextStatus}` : "Completa los documentos y el cálculo antes de avanzar."}
                  >
                    <Check size={17} /> {canAdvance ? `Avanzar a ${nextStatus}` : "Revisar pendientes"}
                  </button>
                  <button className="button-secondary" type="button" onClick={() => openTransfer("FIS")} title="Permite derivar con autorización y pendientes visibles.">
                    Traspaso excepcional a FIS
                  </button>
                  <button className="button-secondary" type="button" onClick={() => openTransfer("Lawgistic")} title="Permite derivar con autorización y pendientes visibles.">
                    Traspaso excepcional a Lawgistic
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button className="button-primary" type="button" onClick={() => openTransfer("FIS")}>Traspasar a FIS</button>
                  <button className="button-secondary" type="button" onClick={() => openTransfer("Lawgistic")}>Traspasar a Lawgistic</button>
                </div>
              )}
            </>
          )}
          {usuario.role === "CEO" && (
            <p className="notice">
              Vista dirección: este perfil es de solo lectura. La reversión de estados corresponde al Gerente.
            </p>
          )}
          {usuario.role === "Gerente" && (
            <div className="revert-box">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Lock size={15} /> Reversión gerencial
              </div>
              <select className="input mt-2" value={revertStatus} onChange={(event) => setRevertStatus(event.target.value as CaseStatus)}>
                {STATUS_LABELS.filter((status) => status !== caso.estado && !status.startsWith("Traspasado a ")).map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
              <textarea className="input mt-2 min-h-20" value={revertReason} onChange={(event) => setRevertReason(event.target.value)} placeholder="Motivo obligatorio" />
              <button className="button-secondary mt-2 w-full" type="button" onClick={submitRevert}>
                <RefreshCcw size={16} /> Revertir estado
              </button>
            </div>
          )}
          {INSPECTOR_EVOLUTION_ENABLED && usuario.role === "Gerente" && (
            <div className="revert-box">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ClipboardCheck size={15} /> Asignación de inspección
              </div>
              <select className="input mt-2" value={inspectorDraft} onChange={(event) => setInspectorDraft(event.target.value)}>
                <option value="">Sin inspector asignado</option>
                {INSPECTORS.map((inspector) => <option key={inspector}>{inspector}</option>)}
              </select>
              <button className="button-secondary mt-2 w-full" type="button" onClick={saveInspectorAssignment}>
                <Save size={16} /> Guardar asignación
              </button>
              {inspectorNotice && <p className="text-xs text-slate-500">{inspectorNotice}</p>}
            </div>
          )}
        </div>
      </section>

      {isEditingCase && (
        <section className="panel case-edit-panel">
          <div className="panel-title">
            <div>
              <h3>Editar datos clave</h3>
              <p>Los cambios actualizan la prescripción y quedan registrados en el historial del caso.</p>
            </div>
            <StatusPill label="Revisión humana" tone="warn" />
          </div>
          {editError && <div className="form-error">{editError}</div>}
          {editReferenceMismatch && (
            <div className="notice" role="status">
              La referencia usa el período <strong>{editReferenceMismatch.currentPeriod}</strong>, pero la fecha y jurisdicción indican prescripción en <strong>{editReferenceMismatch.expectedPeriod}</strong>. Si la fecha real cambió, corrige la referencia antes de guardar.
            </div>
          )}
          {editCalculatedPrescription && editPrescriptionRule && (
            <div className="notice" role="status">
              {editDateType === "ETA" ? "Prescripción estimada según ETA" : "Prescripción calculada desde la descarga"}: <strong>{new Date(`${editCalculatedPrescription}T00:00:00`).toLocaleDateString("es-CL")}</strong> · {editPrescriptionRule.scope}.
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Referencia interna *">
              <input className="input" value={editReference} onChange={(event) => setEditReference(event.target.value)} placeholder="PRE-FIS-MSC-2026-03/27-1456" autoFocus />
              <small className="mt-1 block text-xs text-slate-500">Formato: PRE-FIS-CARRIER-AÑO-MM/AA-CORRELATIVO o PRE-FIS/CLIENTE-CARRIER-AÑO-MM/AA-CORRELATIVO.</small>
            </Field>
            {editReference !== caso.id && (
              <Field label="Motivo de modificación *">
                <select className="input" value={editReferenceReason} onChange={(event) => setEditReferenceReason(event.target.value)}>
                  <option value="">Seleccionar motivo</option>
                  {REFERENCE_CHANGE_REASONS.map((reason) => <option key={reason}>{reason}</option>)}
                </select>
              </Field>
            )}
            <Field label="Fecha de recepción *">
              <input className="input" type="date" value={editFechaRecepcion} onChange={(event) => setEditFechaRecepcion(event.target.value)} />
              <small className="mt-1 block text-xs text-slate-500">El año de la referencia se basa en esta fecha.</small>
            </Field>
            <Field label="Modo de transporte *">
              <select className="input" value={editModoTransporte} onChange={(event) => setEditModoTransporte(event.target.value as TransportMode)}>
                <option value="Marítimo">Marítimo</option>
                <option value="Terrestre">Terrestre · 6 meses</option>
                <option value="Aéreo">Aéreo · 2 años</option>
              </select>
            </Field>
            <Field label="Jurisdicción marítima">
              <select className="input" value={editJurisdiccion} onChange={(event) => setEditJurisdiccion(event.target.value as Jurisdiccion | "")}>
                <option value="">{editModoTransporte === "Marítimo" ? "Seleccionar manualmente" : "No aplica para este transporte"}</option>
                <option value="LaHaya">La Haya · 1 año desde descarga</option>
                <option value="Hamburgo">Hamburgo · 2 años desde descarga (Chile/Perú)</option>
              </select>
            </Field>
            <Field label={editDateType === "ETA" ? "ETA de descarga" : "Fecha de descarga efectiva"}>
              <input className="input" type="date" value={editDateOfDischarge} onChange={(event) => setEditDateOfDischarge(event.target.value)} />
            </Field>
            <Field label="Tipo de fecha">
              <select className="input" value={editDateType} onChange={(event) => setEditDateType(event.target.value as DischargeDateType)}>
                <option value="Real">Fecha efectiva de descarga</option>
                <option value="ETA">ETA estimada</option>
              </select>
            </Field>
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button className="button-secondary" type="button" onClick={cancelCaseEdit}><X size={16} /> Cancelar</button>
            <button className="button-primary" type="button" onClick={saveCaseDetails}><Save size={16} /> Guardar cambios</button>
          </div>
        </section>
      )}

      <div className="case-summary-grid">
        <CaseSummaryMetric
          label="Riesgo de prescripción"
          value={pres.label}
          detail={caso.fechaPrescripcion ? `${caso.dateOfDischargeType === "ETA" ? "Estimación según ETA · vence" : "Vence"} ${new Date(caso.fechaPrescripcion).toLocaleDateString("es-CL")}` : "Fecha o regla de prescripción pendiente"}
          icon={<AlertTriangle size={19} />}
          tone={pres.tone === "danger" ? "danger" : pres.tone === "warn" ? "warn" : "ok"}
          onClick={() => changeTab("historial")}
          buttonLabel="Ver historial y riesgo de prescripción"
        />
        <CaseSummaryMetric
          label="Días sin movimiento"
          value={`${staleDays} días`}
          detail={`Último movimiento ${new Date(lastMovement).toLocaleDateString("es-CL")}`}
          icon={<CalendarClock size={19} />}
          tone={inactivity.active ? "warn" : "ok"}
          onClick={() => changeTab("historial")}
          buttonLabel="Ver historial de movimientos"
        />
        <CaseSummaryMetric
          label="Recupero estimado"
          value={calculo?.montoFinalReclamo !== undefined ? currency(calculo.montoFinalReclamo, calculo.moneda) : "Sin cálculo"}
          detail={calculo?.metodoSeleccionado ? `Método ${calculo.metodoSeleccionado} seleccionado` : "Pendiente de cálculo"}
          icon={<BarChart3 size={19} />}
          tone="ok"
          onClick={() => changeTab("calculo")}
          buttonLabel="Ver cálculo de pérdida"
        />
      </div>

      {(caso.resumenCaso || caso.tipoCaso || caso.causaPotencial) && (
        <section className="panel case-intelligence-panel">
          <div className="panel-title">
            <div>
              <h3>Resumen preliminar del expediente</h3>
              <p>Información extraída y confirmada por el handler.</p>
            </div>
            {caso.tipoCaso && <StatusPill label={caso.tipoCaso} tone="warn" />}
          </div>
          {caso.resumenCaso && <p className="case-summary-copy">{caso.resumenCaso}</p>}
          {caso.causaPotencial && (
            <div className="case-cause-note">
              <strong>Causa potencial</strong>
              <p>{caso.causaPotencial}</p>
              {caso.fuentesCausa && caso.fuentesCausa.length > 0 && <small>Sustento: {caso.fuentesCausa.join(", ")}</small>}
            </div>
          )}
        </section>
      )}

      {showTransfer && (
        <Modal title="Confirmar traspaso" onClose={() => setShowTransfer(null)}>
          <p className="mb-4">
            Revisa el informe antes de confirmar. El traspaso registra un cambio de estado; el expediente seguirá editable por el Handler responsable.
          </p>
          {caso.informeRevision && <ReviewReportContent report={caso.informeRevision} compact />}
          {caso.informeRevision && !caso.informeRevision.ready && (
            <div className="mt-4 space-y-3" role="alert">
              <div className="notice">
                El expediente tiene {caso.informeRevision.pendingActions.length} observaciones. Puedes derivarlo excepcionalmente para solicitar extensión, judicializar o interrumpir prescripción, dejando los pendientes visibles para la siguiente etapa.
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={exceptionalTransferAcknowledged}
                  onChange={(event) => setExceptionalTransferAcknowledged(event.target.checked)}
                />
                <span>Autorizo el traspaso excepcional del expediente incompleto al destino seleccionado.</span>
              </label>
              <Field label="Motivo de autorización *">
                <textarea
                  className="input min-h-24"
                  value={exceptionalTransferReason}
                  onChange={(event) => setExceptionalTransferReason(event.target.value)}
                  placeholder="Ej.: Caso próximo a prescribir; se deriva para solicitar extensión y completar antecedentes."
                />
                <small className="mt-1 block text-xs text-slate-500">Se guardará con usuario, fecha, pendientes y acciones del informe.</small>
              </Field>
            </div>
          )}
          <div className="mt-5 flex justify-end gap-3">
            <button className="button-secondary" type="button" onClick={() => setShowTransfer(null)}>Cancelar</button>
            {caso.informeRevision && (
              <>
                <button
                  className="button-secondary"
                  type="button"
                  onClick={() => downloadTextFile(`${caso.id}_informe_revision.txt`, buildReviewReportText(caso.informeRevision!))}
                >
                  <Download size={16} /> Descargar informe
                </button>
                <button
                  className="button-primary"
                  type="button"
                  disabled={!caso.informeRevision.ready && (!exceptionalTransferAcknowledged || exceptionalTransferReason.trim().length < 10)}
                  onClick={confirmTransfer}
                  title={caso.informeRevision.ready ? "Confirmar traspaso" : "Autoriza el traspaso excepcional con motivo"}
                >
                  <Check size={16} /> {caso.informeRevision.ready ? "Confirmar traspaso" : "Autorizar y traspasar"}
                </button>
              </>
            )}
          </div>
        </Modal>
      )}

      <div className="tabs">
        {[
          ["documentos", "Documentos", <FolderUp size={16} key="i" />],
          ["analisis", "Análisis", <ShieldCheck size={16} key="i" />],
          ["calculo", "Cálculo", <BarChart3 size={16} key="i" />],
          ["informe", "Informe", <FileCheck2 size={16} key="i" />],
          ["historial", "Historial", <History size={16} key="i" />],
          ["cartas", "Cartas", <FileText size={16} key="i" />]
        ].filter(([, key]) => !isInspector || key === "Inspección").concat(INSPECTOR_EVOLUTION_ENABLED && (usuario.role === "Inspector" || usuario.role === "Gerente") ? [["inspeccion", "Inspección", <ClipboardCheck size={16} key="i" />] as const] : []).map(([key, label, icon]) => (
          <button key={String(key)} type="button" className={cx("tab", activeTab === key && "active")} onClick={() => changeTab(String(key))}>
            {icon} {label}
          </button>
        ))}
      </div>

      {!isInspector && tab === "documentos" && <DocumentsTab caso={caso} docs={caseDocs} canWrite={canMutateCase} />}
      {!isInspector && tab === "analisis" && <AnalysisTab caso={caso} docs={caseDocs} canWrite={canMutateCase} />}
      {!isInspector && tab === "calculo" && <CalculationTab caso={caso} calculo={calculo} canWrite={canWrite && canEditCalculation(caso)} />}
      {!isInspector && tab === "informe" && <ReviewReportTab caso={caso} docs={caseDocs} calculo={calculo} canWrite={canMutateCase} />}
      {!isInspector && tab === "historial" && <HistoryTab events={events} />}
      {!isInspector && tab === "cartas" && <LettersTab caso={caso} docs={caseDocs} canWrite={canMutateCase} />}
      {INSPECTOR_EVOLUTION_ENABLED && (isInspector || usuario.role === "Gerente") && activeTab === "inspeccion" && <InspectionTab caso={caso} canWrite={isInspector && !isTransferred} />}
    </AppShell>
  );
}
