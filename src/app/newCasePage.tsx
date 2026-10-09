import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
  formatCalendarDate,
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


import { AppShell, Field, StatusPill, cx } from "./appShared";
import { LossProposalSummary } from "./caseWork";
import { filesFromDrop } from "../lib/fileDrop";

const DEMO_FOLDER_NAME = "PRE-FIS-HLC-2025-02-4031";
const DEMO_FOLDER_DOCUMENTS = [
  "AoR", "BL", "Booking", "Carta_de_notificacion_a_la_naviera", "Carta_de_subrogacion_o_LoA",
  "Certificado_de_cosecha", "Certificado_de_origen", "Certificado_fitosanitario", "DUS",
  "Factura_de_exportacion", "Informes_de_QC_en_origen_y_destino", "Liquidacion_por_contenedor",
  "Liquidaciones_comparativas_o_informe_de_mercado", "Packing_List", "Registros_de_termografos",
  "Reportes_de_inspeccion", "Tracking_naviera"
];
const DEMO_JURISDICTIONS: Record<string, Jurisdiccion> = {
  "PRE-FIS-MSC-2025-07-4042": "LaHaya",
  "PRE-FIS-HLC-2025-02-4031": "Hamburgo"
};

function suggestedDemoJurisdiction(reference?: string) {
  return reference ? DEMO_JURISDICTIONS[reference.trim().toUpperCase()] : undefined;
}

function EditableExtractionValue({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
  return (
    <label className="extraction-value extraction-editable">
      <span>{label}</span>
      <input className="input" value={value || ""} onChange={(event) => onChange(event.target.value)} aria-label={label} />
    </label>
  );
}

export function NewCasePage() {
  const { usuario, casos, createCase, prepareUpload, confirmUpload, resetTestRun, setUsuario } = useDemoStore();
  const navigate = useNavigate();
  const [input, setInput] = useState<NewCaseInput>({
    claimHandler: usuario.nombre,
    dateOfDischargeType: "Real",
    fechaRecepcion: new Date().toISOString().slice(0, 10),
    modoTransporte: "Marítimo"
  });
  const [drafts, setDrafts] = useState<UploadDraft[]>([]);
  const [proposal, setProposal] = useState<ExtractedCaseData>();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ completed: 0, total: 0, currentFile: "" });
  const [processingError, setProcessingError] = useState("");
  const [error, setError] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const hasData = Object.entries(input).some(([key, value]) =>
    !["claimHandler", "dateOfDischargeType", "fechaRecepcion", "modoTransporte"].includes(key) && Boolean(value)
  );
  const duplicateReference = input.id?.trim()
    ? casos.find((caso) => normalizeCaseReference(caso.id) === normalizeCaseReference(input.id || ""))
    : undefined;
  const referenceMismatch = referencePrescriptionMismatch(input.id, input.dateOfDischarge, input.jurisdiccion, input.modoTransporte);
  const calculatedPrescription = calculatePrescription(input.dateOfDischarge, input.jurisdiccion, input.modoTransporte);
  const prescriptionRule = prescriptionRuleFor(input.jurisdiccion, input.modoTransporte);

  useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      errorRef.current?.focus();
    }
  }, [error]);

  if (usuario.role !== "Handler") return <Navigate to="/casos" replace />;

  const update = (key: keyof NewCaseInput, value: string) => {
    setError("");
    setInput((current) => ({
      ...current,
      [key]: key === "claimAmount" ? (value ? Number(value) : undefined) : value || undefined
    }));
  };
  const processFolder = async (files: FileList | File[]) => {
    if (files.length === 0) return;
    setProcessingError("");
    setIsProcessing(true);
    setProcessingProgress({ completed: 0, total: files.length, currentFile: "" });
    try {
      const processed = await processDocumentFiles(Array.from(files), (completed, total, currentFile) => {
        setProcessingProgress({ completed, total, currentFile });
      });
      const extracted = mergeExtractedData(processed, input.id || "");
      setDrafts(processed);
      setProposal(extracted);
      setInput((current) => ({
        ...current,
        id: current.id || extracted.referencia,
        claimHandler: current.claimHandler === usuario.nombre
          ? suggestHandler(extracted.assured) || current.claimHandler || usuario.nombre
          : current.claimHandler,
        csClaimNo: current.csClaimNo || extracted.csClaimNo,
        assured: current.assured || extracted.assured,
        consignee: current.consignee || extracted.consignee,
        opponent: current.opponent || extracted.opponent,
        vessel: current.vessel || extracted.vessel,
        voyage: current.voyage || extracted.voyage,
        cargo: current.cargo || extracted.cargo,
        placeOfShipment: current.placeOfShipment || extracted.placeOfShipment,
        dateOfShipment: current.dateOfShipment || extracted.dateOfShipment,
        placeOfDischarge: current.placeOfDischarge || extracted.placeOfDischarge,
        dateOfDischarge: current.dateOfDischarge || extracted.dateOfDischarge,
        surveyor: current.surveyor || extracted.surveyor,
        claimAmount: current.claimAmount ?? extracted.claimAmount,
        temperaturaRegistrada: current.temperaturaRegistrada ?? extracted.temperaturaRegistrada,
        rangoMinimo: current.rangoMinimo ?? extracted.rangoMinimo,
        rangoMaximo: current.rangoMaximo ?? extracted.rangoMaximo,
        jurisdiccion: current.jurisdiccion || suggestedDemoJurisdiction(current.id || extracted.referencia),
        tipoCaso: current.tipoCaso || extracted.tipoCaso,
        resumenCaso: current.resumenCaso || extracted.resumenCaso,
        causaPotencial: current.causaPotencial || extracted.causaPotencial,
        causaDano: current.causaDano || (extracted.causaPotencial?.toLowerCase().includes("térmica") ? "Temperatura" : undefined),
        fuentesCausa: extracted.fuentesCausa,
        propuestaPerdida: current.propuestaPerdida || extracted.propuestaPerdida
      }));
    } catch {
      setProcessingError("No fue posible leer la carpeta completa. Puedes continuar con la carga de metadata y corregir los datos manualmente.");
      setDrafts(prepareUpload(files));
      setProposal(undefined);
    } finally {
      setIsProcessing(false);
    }
  };
  const onFolderChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.currentTarget.value = "";
    if (files.length > 0) processFolder(files);
  };
  const onDocumentsChange = onFolderChange;
  const onFolderDrop = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    await processFolder(await filesFromDrop(event.dataTransfer));
  };
  const loadDemoFolder = async () => {
    setProcessingError("");
    try {
      const files = await Promise.all(DEMO_FOLDER_DOCUMENTS.map(async (documentName) => {
        const fileName = `${DEMO_FOLDER_NAME}_${documentName}.pdf`;
        const response = await fetch(`${import.meta.env.BASE_URL}demo/${DEMO_FOLDER_NAME}/${fileName}`);
        if (!response.ok) throw new Error(`No se pudo cargar ${fileName}`);
        const file = new File([await response.arrayBuffer()], fileName, { type: "application/pdf" });
        Object.defineProperty(file, "webkitRelativePath", { value: `${DEMO_FOLDER_NAME}/${fileName}` });
        return file;
      }));
      await processFolder(files);
    } catch {
      setProcessingError("No se pudo cargar la carpeta demo incluida en el repositorio.");
    }
  };
  const resetTest = () => {
    if (!window.confirm("¿Reiniciar esta prueba? Se limpiarán los casos activos, documentos y cálculos, pero se conservará la memoria histórica.")) return;
    resetTestRun();
    setDrafts([]);
    setProposal(undefined);
    setProcessingError("");
    setError("");
    setInput({
      claimHandler: usuario.nombre,
      dateOfDischargeType: "Real",
      fechaRecepcion: new Date().toISOString().slice(0, 10),
      modoTransporte: "Marítimo"
    });
  };
  const validateDraft = () => {
    if (input.fechaRecepcion && input.fechaRecepcion > new Date().toISOString().slice(0, 10)) return "La fecha de recepción no puede ser futura.";
    if (input.dateOfDischarge && input.dateOfDischarge > new Date().toISOString().slice(0, 10) && input.dateOfDischargeType !== "ETA") {
      return "La fecha efectiva de descarga no puede ser futura. Selecciona ETA si corresponde.";
    }
    if (input.claimAmount !== undefined && (!Number.isFinite(input.claimAmount) || input.claimAmount <= 0)) return "El monto reclamado debe ser un número positivo.";
    if (input.id && !isCanonicalCaseReference(input.id)) return "La referencia debe usar el formato PRE-FIS-... o PRE-FIS/CLIENTE-... . Las referencias históricas se conservan al migrarlas, pero no se generan nuevas con formato libre.";
    if (input.id && casos.some((caso) => normalizeCaseReference(caso.id) === normalizeCaseReference(input.id || ""))) {
      return "La referencia ya existe en el expediente. Abre el caso existente o corrige la referencia antes de continuar.";
    }
    return "";
  };
  const validateComplete = () => {
    const draftValidation = validateDraft();
    if (draftValidation) return draftValidation;
    if (!hasRequiredMinimum(input)) return "Completa handler, asegurado, consignatario, oponente, nave, fecha de descarga y la regla de prescripción aplicable.";
    return "";
  };
  const save = async (complete: boolean) => {
    const validation = complete ? validateComplete() : validateDraft();
    if (validation) {
      setError(validation);
      return;
    }
    const caso = createCase(input, complete);
    if (complete && caso.claimHandler !== usuario.nombre) {
      setUsuario({ role: "Handler", nombre: caso.claimHandler });
    }
    if (drafts.length > 0) await confirmUpload(caso.id, drafts, { initialUpload: true });
    navigate(`/casos/${encodeURIComponent(caso.id)}?tab=documentos`);
  };

  return (
    <AppShell>
      <Link to="/casos" className="back-link">
        <ArrowLeft size={16} /> Volver a casos
      </Link>
      <form className="panel new-case-form mt-4" onSubmit={(event) => event.preventDefault()}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Nuevo caso</p>
            <h2>Ingreso documental del caso</h2>
          </div>
          <StatusPill label="Carpeta + extracción asistida" tone="ok" />
        </div>
        <section className="new-case-intake">
          <div className="panel-title">
            <div>
              <h3>Carga la carpeta documental</h3>
              <p>El sistema leerá los archivos compatibles, identificará el caso y preparará una propuesta editable.</p>
            </div>
            {drafts.length > 0 && <span className="upload-count">{drafts.length} archivos</span>}
          </div>
          <div className="notice mt-3" role="note">
            <strong>Fuente de entrada de Fase 1:</strong> carpeta documental ya descargada. Las conexiones directas a plataformas, API, correo o robots de descarga quedan fuera de este alcance y requieren una evolución aprobada.
          </div>
          <div
            className={cx("upload-box", isDragging && "dragging")}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={onFolderDrop}
          >
            <FolderUp size={24} />
            <span>
              <strong>Arrastra una carpeta o documentos aquí</strong>
              <small>O selecciona una carpeta completa o varios documentos</small>
            </span>
            <div className="upload-box-actions">
              <button className="button-secondary small" type="button" onClick={() => folderInputRef.current?.click()} disabled={isProcessing}>
                <FolderUp size={15} /> Seleccionar carpeta
              </button>
              <button className="button-secondary small" type="button" onClick={() => filesInputRef.current?.click()} disabled={isProcessing}>
                <FileText size={15} /> Seleccionar documentos
              </button>
            </div>
            <input ref={folderInputRef} type="file" multiple onChange={onFolderChange} {...({ webkitdirectory: "", directory: "" } as Record<string, string>)} />
            <input
              ref={filesInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.json,.xml,.md,.png,.jpg,.jpeg,.webp"
              onChange={onDocumentsChange}
            />
          </div>
          <div className="demo-upload-action">
            <div className="demo-upload-buttons">
              <button className="button-secondary small" type="button" onClick={() => void loadDemoFolder()} disabled={isProcessing}>
                <FolderUp size={15} /> Cargar carpeta demo completa · 17 PDF
              </button>
              <button className="button-secondary small" type="button" onClick={resetTest} disabled={isProcessing}>
                <RefreshCcw size={15} /> Reiniciar prueba
              </button>
            </div>
            <small>Usa el expediente HLC incluido en el repositorio para una demostración reproducible.</small>
          </div>
          {isProcessing && (
            <p className="notice mt-3">
              Procesando documentos y preparando la propuesta... {processingProgress.completed}/{processingProgress.total}
              {processingProgress.currentFile ? ` · ${processingProgress.currentFile}` : ""}
            </p>
          )}
          {processingError && <div className="form-error mt-3">{processingError}</div>}
          {drafts.length > 0 && (
            <div className="intake-file-list">
              {drafts.map((draft, index) => (
                <div key={`${draft.originalName}-${index}`} className="upload-draft">
                  <div>
                    <p className="font-semibold">{draft.originalName}</p>
                    <p className="text-xs text-slate-500">{draft.tipoDocumento} · {draft.relativePath || draft.originalName}</p>
                  </div>
                  <StatusPill label={draft.estadoExtraccion || "Pendiente"} tone={draft.estadoExtraccion?.startsWith("procesado") ? "ok" : "warn"} />
                </div>
              ))}
              {drafts.some((draft) => ["parcial", "no soportado", "requiere OCR"].includes(draft.estadoExtraccion || "")) && (
                <p className="notice mt-3" role="note">
                  Algunos archivos requieren revisión técnica individual. El demo aísla ese archivo, conserva su estado y permite continuar con el resto de la carpeta; esta tolerancia es una decisión técnica interna y no un criterio contractual de aceptación.
                </p>
              )}
            </div>
          )}
          {proposal && (
            <div className="extraction-review mt-5">
              <div className="panel-title">
                <div>
                  <h3>Propuesta detectada para revisión humana</h3>
                  <p>Edita los campos detectados aquí y confirma con “Guardar y continuar”. Los cambios se guardan junto con la carpeta.</p>
                </div>
                <span>{proposal.referencia || "Referencia pendiente"}</span>
              </div>
              <div className="extraction-grid">
                <EditableExtractionValue label="Asegurado" value={input.assured} onChange={(value) => update("assured", value)} />
                <EditableExtractionValue label="Consignatario" value={input.consignee} onChange={(value) => update("consignee", value)} />
                <EditableExtractionValue label="Transportista / oponente" value={input.opponent} onChange={(value) => update("opponent", value)} />
                <div className="extraction-value extraction-editable">
                  <span>Nave / viaje</span>
                  <div className="extraction-editable-pair">
                    <input className="input" value={input.vessel || ""} onChange={(event) => update("vessel", event.target.value)} placeholder="Nave" aria-label="Nave detectada" />
                    <input className="input" value={input.voyage || ""} onChange={(event) => update("voyage", event.target.value)} placeholder="Viaje" aria-label="Viaje detectado" />
                  </div>
                </div>
                <EditableExtractionValue label="Carga" value={input.cargo} onChange={(value) => update("cargo", value)} />
                <div className="extraction-value extraction-editable">
                  <span>Embarque</span>
                  <div className="extraction-editable-pair">
                    <input className="input" value={input.placeOfShipment || ""} onChange={(event) => update("placeOfShipment", event.target.value)} placeholder="Lugar" aria-label="Lugar de embarque" />
                    <input className="input" type="date" value={input.dateOfShipment || ""} onChange={(event) => update("dateOfShipment", event.target.value)} aria-label="Fecha de embarque" />
                  </div>
                </div>
                <div className="extraction-value extraction-editable">
                  <span>Descarga</span>
                  <div className="extraction-editable-pair">
                    <input className="input" value={input.placeOfDischarge || ""} onChange={(event) => update("placeOfDischarge", event.target.value)} placeholder="Lugar" aria-label="Lugar de descarga" />
                    <input className="input" type="date" value={input.dateOfDischarge || ""} onChange={(event) => update("dateOfDischarge", event.target.value)} aria-label="Fecha de descarga" />
                  </div>
                </div>
                <EditableExtractionValue label="Inspector" value={input.surveyor} onChange={(value) => update("surveyor", value)} />
                <EditableExtractionValue label="CS Claim No" value={input.csClaimNo} onChange={(value) => update("csClaimNo", value)} />
              </div>
              {proposal.conflictosDetectados && proposal.conflictosDetectados.length > 0 && (
                <div className="notice mt-3" role="alert">
                  <strong>Conflictos entre documentos:</strong> {proposal.conflictosDetectados.join(" · ")} . Revisa estos campos antes de guardar; no se resuelven automáticamente.
                </div>
              )}
              <p className="notice mt-3">Handler sugerido por cliente: <strong>{input.claimHandler}</strong>. Puedes modificarlo antes de guardar.</p>
              {proposal.propuestaPerdida && <LossProposalSummary proposal={proposal.propuestaPerdida} />}
            </div>
          )}
        </section>
        {duplicateReference && (
          <div className="notice mt-4" role="alert">
            Esta referencia coincide con el caso <strong>{duplicateReference.id}</strong>. No se fusionarán expedientes: corrige la referencia o abre el caso existente.
          </div>
        )}
        {referenceMismatch && (
          <div className="notice mt-3" role="status">
            Revisa la referencia: su período de prescripción es <strong>{referenceMismatch.currentPeriod}</strong>, pero con la fecha y jurisdicción actuales el vencimiento cae en <strong>{referenceMismatch.expectedPeriod}</strong> ({formatCalendarDate(referenceMismatch.prescriptionDate)}). Puedes corregirla antes de guardar.
          </div>
        )}
        {calculatedPrescription && prescriptionRule && (
          <div className="notice mt-3" role="status">
            {input.dateOfDischargeType === "ETA" ? "Prescripción estimada según ETA" : "Prescripción calculada desde la descarga"}: <strong>{formatCalendarDate(calculatedPrescription)}</strong> · {prescriptionRule.scope}.
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Referencia interna editable">
            <input className="input" value={input.id || ""} onChange={(event) => update("id", event.target.value)} placeholder="PRE-FIS-MSC-2026-03/27-1456" />
            <small className="mt-1 block text-xs text-slate-500">Formato: PRE-FIS-CARRIER-AÑO-MM/AA-CORRELATIVO o PRE-FIS/CLIENTE-CARRIER-AÑO-MM/AA-CORRELATIVO.</small>
          </Field>
          <Field label="Claim handler *">
            <select className="input" value={input.claimHandler} onChange={(event) => update("claimHandler", event.target.value)}>
              {HANDLERS.map((handler) => (
                <option key={handler}>{handler}</option>
              ))}
            </select>
          </Field>
          <Field label="CS Claim No">
            <input className="input" value={input.csClaimNo || ""} onChange={(event) => update("csClaimNo", event.target.value)} />
          </Field>
          <Field label="Fecha de recepción *">
            <input className="input" type="date" value={input.fechaRecepcion || ""} onChange={(event) => update("fechaRecepcion", event.target.value)} />
            <small className="mt-1 block text-xs text-slate-500">Define el año de la referencia y el inicio del historial del caso.</small>
          </Field>
          <Field label="Asegurado *">
            <input className="input" value={input.assured || ""} onChange={(event) => update("assured", event.target.value)} />
          </Field>
          <Field label="Consignatario *">
            <input className="input" value={input.consignee || ""} onChange={(event) => update("consignee", event.target.value)} />
          </Field>
          <Field label="Código cliente directo">
            <input className="input" value={input.codigoCliente || ""} onChange={(event) => update("codigoCliente", event.target.value)} placeholder="FRU · opcional" />
            <small className="mt-1 block text-xs text-slate-500">Solo para casos directos. Se incorpora como PRE-FIS/CLIENTE-...</small>
          </Field>
          <Field label="Oponente / transportista *">
            <input className="input" value={input.opponent || ""} onChange={(event) => update("opponent", event.target.value)} />
          </Field>
          <Field label="Nave *">
            <input className="input" value={input.vessel || ""} onChange={(event) => update("vessel", event.target.value)} />
          </Field>
          <Field label="Viaje">
            <input className="input" value={input.voyage || ""} onChange={(event) => update("voyage", event.target.value)} />
          </Field>
          <Field label="Puerto de descarga">
            <input className="input" value={input.placeOfDischarge || ""} onChange={(event) => update("placeOfDischarge", event.target.value)} />
          </Field>
          <Field label={input.dateOfDischargeType === "ETA" ? "ETA de descarga *" : "Fecha de descarga *"}>
            <input className="input" type="date" value={input.dateOfDischarge || ""} onChange={(event) => update("dateOfDischarge", event.target.value)} />
          </Field>
          <Field label="Tipo de fecha *">
            <select className="input" value={input.dateOfDischargeType || "Real"} onChange={(event) => update("dateOfDischargeType", event.target.value as DischargeDateType)}>
              <option value="Real">Fecha efectiva de descarga</option>
              <option value="ETA">ETA estimada</option>
            </select>
          </Field>
          <Field label="Modo de transporte *">
            <select className="input" value={input.modoTransporte || "Marítimo"} onChange={(event) => update("modoTransporte", event.target.value as TransportMode)}>
              <option value="Marítimo">Marítimo</option>
              <option value="Terrestre">Terrestre · 6 meses</option>
              <option value="Aéreo">Aéreo · 2 años</option>
            </select>
          </Field>
          <Field label="Inspector">
            <input className="input" value={input.surveyor || ""} onChange={(event) => update("surveyor", event.target.value)} />
          </Field>
          <Field label="Monto reclamado">
            <input className="input" type="number" min="0" value={input.claimAmount || ""} onChange={(event) => update("claimAmount", event.target.value)} />
          </Field>
          <Field label={input.modoTransporte === "Marítimo" ? "Jurisdicción marítima *" : "Jurisdicción marítima (opcional)"}>
            <select className="input" value={input.jurisdiccion || ""} onChange={(event) => update("jurisdiccion", event.target.value as Jurisdiccion)}>
              <option value="">{input.modoTransporte === "Marítimo" ? "Seleccionar manualmente" : "No aplica para este transporte"}</option>
              <option value="LaHaya">La Haya · 1 año desde descarga</option>
              <option value="Hamburgo">Hamburgo · 2 años desde descarga (Chile/Perú)</option>
            </select>
            <small className="mt-1 block text-xs text-slate-500">Para terrestre y aéreo se usa el plazo legal del modo de transporte.</small>
          </Field>
          <Field label="Causa de daño">
            <input className="input" value={input.causaDano || ""} onChange={(event) => update("causaDano", event.target.value)} placeholder="Temperatura, golpe, falta..." />
          </Field>
          <Field label="Tipo de caso sugerido">
            <input className="input" value={input.tipoCaso || ""} onChange={(event) => update("tipoCaso", event.target.value)} placeholder="Se completa desde la carpeta" />
          </Field>
        </div>
        {proposal && (
          <div className="grid gap-4 mt-4 md:grid-cols-2">
            <Field label="Resumen automático editable">
              <textarea className="input min-h-24" value={input.resumenCaso || ""} onChange={(event) => update("resumenCaso", event.target.value)} />
            </Field>
            <Field label="Causa potencial y sustento documental">
              <textarea className="input min-h-24" value={input.causaPotencial || ""} onChange={(event) => update("causaPotencial", event.target.value)} />
            </Field>
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          {error && <div ref={errorRef} className="form-error action-error" role="alert" tabIndex={-1}>{error}</div>}
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              if (!hasData || window.confirm("¿Seguro que quieres salir sin guardar?")) navigate("/casos");
            }}
          >
            <X size={17} /> Cancelar
          </button>
          <button type="button" className="button-secondary" onClick={() => void save(false)}>
            <Save size={17} /> Guardar borrador
          </button>
          <button type="button" className="button-primary" onClick={() => void save(true)}>
            <Check size={17} /> Guardar y continuar
          </button>
        </div>
      </form>
    </AppShell>
  );
}
