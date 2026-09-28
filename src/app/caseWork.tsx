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


import { AppShell, Field, EmptyState, ReadonlyBanner, StatusPill, cx, copyText } from "./appShared";
import { filesFromDrop } from "../lib/fileDrop";

export function CaseSummaryMetric({
  label,
  value,
  detail,
  icon,
  tone,
  onClick,
  buttonLabel
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone: "ok" | "warn" | "danger";
  onClick?: () => void;
  buttonLabel?: string;
}) {
  const content = (
    <>
      <div className="case-summary-heading">
        <span>{label}</span>
        <div className="case-summary-icon">{icon}</div>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </>
  );
  if (onClick) {
    return <button className={cx("case-summary-metric", "case-summary-metric-button", tone)} type="button" onClick={onClick} aria-label={buttonLabel || label}>{content}</button>;
  }
  return <div className={cx("case-summary-metric", tone)}>{content}</div>;
}

export function ExtractionValue({ label, value }: { label: string; value?: string }) {
  return (
    <div className="extraction-value">
      <span>{label}</span>
      <strong>{value || "No detectado"}</strong>
    </div>
  );
}

export function LossProposalSummary({ proposal }: { proposal: ExtractedLossProposal }) {
  const methods = [
    {
      label: "Embarque comparable · base bruta",
      reference: proposal.metodo1_liquidacionComparativa,
      actual: proposal.metodo1_liquidacionReal
    },
    {
      label: "Reporte de mercado · base bruta",
      reference: proposal.metodo2_valorReporteMercado,
      actual: proposal.metodo2_liquidacionReal
    },
    {
      label: "Factura vs. venta destino · venta neta",
      reference: proposal.metodo3_valorFactura,
      actual: proposal.metodo3_ventaNetaDestino ?? proposal.metodo3_ventaBrutaDestino
    }
  ];
  return (
    <div className="loss-proposal-summary">
      <div className="loss-proposal-heading">
        <strong>Propuesta preliminar de pérdida</strong>
        <span>{proposal.moneda} · revisión humana obligatoria</span>
      </div>
      <div className="loss-proposal-grid">
        {methods.map((method) => (
          <div key={method.label} className="loss-proposal-method">
            <span>{method.label}</span>
            <strong>{method.reference !== undefined && method.actual !== undefined ? currency(method.reference - method.actual, proposal.moneda) : "Sin datos"}</strong>
            <small>{method.reference !== undefined && method.actual !== undefined
              ? `Base ${currency(method.reference, proposal.moneda)} − ${currency(method.actual, proposal.moneda)}`
              : "Valores brutos pendientes"}</small>
          </div>
        ))}
      </div>
      {proposal.montoFinalReclamo !== undefined && (
        <p className="loss-proposal-final">Monto indicativo documentado: <strong>{currency(proposal.montoFinalReclamo, proposal.moneda)}</strong></p>
      )}
      {proposal.rubrosAdicionales.length > 0 && <p className="loss-proposal-source">Ajustes detectados: {proposal.rubrosAdicionales.map((item) => `${item.concepto} ${currency(item.monto, proposal.moneda)}`).join(" · ")}</p>}
      <p className="loss-proposal-source">Sustento: {proposal.fuentes.join(", ")}</p>
    </div>
  );
}

export function DocumentsTab({ caso, docs, canWrite }: { caso: Caso; docs: ReturnType<typeof useDemoStore.getState>["documentos"]; canWrite: boolean }) {
  const { prepareUpload, confirmUpload, removeDocument, updateCase, updateDocumentStatus, requestMissingDocuments, calculosPerdida } = useDemoStore();
  const [drafts, setDrafts] = useState<UploadDraft[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState("");
  const [extractionProposal, setExtractionProposal] = useState<ExtractedCaseData>();
  const [reviewSummary, setReviewSummary] = useState("");
  const [reviewCause, setReviewCause] = useState("");
  const [reviewType, setReviewType] = useState("");
  const [extractionApplied, setExtractionApplied] = useState(false);
  const [fileActionError, setFileActionError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [documentStatusError, setDocumentStatusError] = useState("");
  const calculo = calculosPerdida.find((item) => item.casoId === caso.id);
  const checklist = documentChecklist(caso, docs, calculo);
  const requiredChecklist = checklist.filter((item) => item.required);
  const conditionalChecklist = checklist.filter((item) => item.requirement === "condicional");
  const additionalChecklist = checklist.filter((item) => item.requirement === "adicional");
  const notApplicableChecklist = checklist.filter((item) => item.status === "no aplica");
  const missingChecklist = requiredChecklist.filter((item) => !isChecklistItemComplete(item));
  const completedRequired = requiredChecklist.filter((item) => isChecklistItemComplete(item)).length;
  const addFiles = async (files: FileList | File[]) => {
    if (files.length === 0) return;
    setProcessingError("");
    setUploadError("");
    setDocumentStatusError("");
    setExtractionApplied(false);
    setIsProcessing(true);
    try {
      const processed = await processDocumentFiles(Array.from(files));
      setDrafts(processed);
      const proposal = mergeExtractedData(processed, caso.id);
      setExtractionProposal(proposal);
      setReviewSummary(proposal.resumenCaso || "");
      setReviewCause(proposal.causaPotencial || "");
      setReviewType(proposal.tipoCaso || "");
    } catch {
      setProcessingError("No fue posible procesar todos los archivos. Revisa la carga e inténtalo nuevamente.");
      setDrafts(prepareUpload(files));
      setExtractionProposal(undefined);
    } finally {
      setIsProcessing(false);
    }
  };
  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.currentTarget.value = "";
    if (files.length > 0) addFiles(files);
  };
  const onDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (canWrite) setIsDragging(true);
  };
  const onDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };
  const onDrop = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (canWrite) await addFiles(await filesFromDrop(event.dataTransfer));
  };
  const applyExtraction = () => {
    if (!canWrite || !extractionProposal) return;
    const patch: Partial<Caso> = {
      csClaimNo: extractionProposal.csClaimNo,
      assured: extractionProposal.assured,
      consignee: extractionProposal.consignee,
      opponent: extractionProposal.opponent,
      vessel: extractionProposal.vessel,
      voyage: extractionProposal.voyage,
      cargo: extractionProposal.cargo,
      placeOfShipment: extractionProposal.placeOfShipment,
      dateOfShipment: extractionProposal.dateOfShipment,
      placeOfDischarge: extractionProposal.placeOfDischarge,
      dateOfDischarge: extractionProposal.dateOfDischarge,
      surveyor: extractionProposal.surveyor,
      claimAmount: extractionProposal.claimAmount,
      tipoCaso: reviewType.trim() || extractionProposal.tipoCaso,
      resumenCaso: reviewSummary.trim() || extractionProposal.resumenCaso,
      causaPotencial: reviewCause.trim() || extractionProposal.causaPotencial,
      fuentesCausa: extractionProposal.fuentesCausa,
      conflictosExtraccion: extractionProposal.conflictosDetectados,
      propuestaPerdida: extractionProposal.propuestaPerdida
    };
    if (extractionProposal.causaPotencial?.toLowerCase().includes("térmica")) patch.causaDano = "Temperatura";
    updateCase(caso.id, Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as Partial<Caso>);
    setExtractionApplied(true);
  };
  const openDocument = async (document: (typeof docs)[number]) => {
    if (!document.fileStorageKey) {
      setFileActionError("Este respaldo pertenece a los datos precargados del demo y no tiene un archivo adjunto para abrir.");
      return;
    }
    const popup = window.open("about:blank", "_blank");
    try {
      const file = await readDocumentFile(document.fileStorageKey);
      if (!file) throw new Error("Archivo no encontrado");
      const url = URL.createObjectURL(file);
      if (popup) popup.location.href = url;
      else window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setFileActionError("");
    } catch {
      popup?.close();
      setFileActionError("No fue posible abrir el respaldo. Vuelve a cargar el archivo si el navegador limpió su almacenamiento local.");
    }
  };
  const downloadDocument = async (document: (typeof docs)[number]) => {
    if (!document.fileStorageKey) {
      setFileActionError("Este respaldo pertenece a los datos precargados del demo y no tiene un archivo adjunto para descargar.");
      return;
    }
    try {
      const file = await readDocumentFile(document.fileStorageKey);
      if (!file) throw new Error("Archivo no encontrado");
      const url = URL.createObjectURL(file);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = document.nombreArchivo;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setFileActionError("");
    } catch {
      setFileActionError("No fue posible descargar el respaldo. Vuelve a cargar el archivo si el navegador limpió su almacenamiento local.");
    }
  };
  const confirmFiles = async () => {
    setUploadError("");
    try {
      await confirmUpload(caso.id, drafts);
      setDrafts([]);
    } catch {
      setUploadError("No fue posible guardar uno o más archivos en el almacenamiento local. Conservamos la selección para que puedas reintentar la carga.");
    }
  };
  const changeDocumentStatus = (type: DocumentType, status: DocumentStatus) => {
    const result = updateDocumentStatus(caso.id, type, status);
    setDocumentStatusError(result.ok ? "" : result.error || "No fue posible actualizar el estado documental.");
  };
  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <div className="panel">
        <div className="panel-title">
          <h3>Ingesta y clasificación</h3>
          <span>Lectura asistida</span>
        </div>
        {!canWrite && <ReadonlyBanner />}
        {canWrite && (
          <>
            <label
              className={cx("upload-box", isDragging && "dragging")}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <FolderUp size={24} />
              <span>
                <strong>Arrastra una carpeta o documentos aquí</strong>
                <small>También puedes seleccionar una carpeta completa</small>
              </span>
              <input
                type="file"
                multiple
                onChange={onFiles}
                {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
              />
            </label>
            {isProcessing && <p className="notice mt-3">Procesando contenido documental y preparando propuesta de datos...</p>}
            {processingError && <div className="form-error mt-3">{processingError}</div>}
            {drafts.length > 0 && (
              <div className="mt-4 space-y-3">
                <p className="upload-count">{drafts.length} archivo(s) detectado(s) para {caso.id}</p>
                {drafts.map((draft, index) => (
                  <div key={`${draft.originalName}-${index}`} className="upload-draft">
                    <div>
                      <p className="font-semibold">{draft.originalName}</p>
                      <p className="text-xs text-slate-500">{draft.estadoExtraccion || "Pendiente"} · Clasificación {draft.clasificacionConfianza || "Baja"} · {draft.relativePath || draft.originalName}</p>
                    </div>
                    <select
                      className="input w-72"
                      value={draft.tipoDocumento}
                      onChange={(event) =>
                        setDrafts((current) =>
                          current.map((item, itemIndex) => (itemIndex === index ? { ...item, tipoDocumento: event.target.value as DocumentType } : item))
                        )
                      }
                    >
                      <option>Sin clasificar</option>
                      {DOCUMENT_TYPES.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                ))}
                {drafts.some((draft) => ["parcial", "no soportado", "requiere OCR"].includes(draft.estadoExtraccion || "")) && (
                  <p className="notice" role="note">
                    Algunos archivos requieren revisión técnica individual. El demo aísla ese archivo, conserva su estado y permite confirmar el resto; esta tolerancia es una decisión técnica interna y no un criterio contractual de aceptación.
                  </p>
                )}
                <button
                  className="button-primary"
                  type="button"
                  disabled={drafts.length === 0}
                  onClick={() => void confirmFiles()}
                >
                  <Check size={17} /> Confirmar carga
                </button>
                {uploadError && <div className="form-error" role="alert">{uploadError}</div>}
              </div>
            )}
            {extractionProposal && (
              <section className="extraction-review mt-5">
                <div className="panel-title">
                  <div>
                    <h3>Datos detectados para revisión humana</h3>
                    <p>La propuesta no modifica el caso hasta que el Handler la confirme.</p>
                  </div>
                  <span>{extractionProposal.referencia || caso.id}</span>
                </div>
                <div className="extraction-grid">
                  <ExtractionValue label="Asegurado" value={extractionProposal.assured} />
                  <ExtractionValue label="Consignatario" value={extractionProposal.consignee} />
                  <ExtractionValue label="Transportista / oponente" value={extractionProposal.opponent} />
                  <ExtractionValue label="Nave / viaje" value={[extractionProposal.vessel, extractionProposal.voyage].filter(Boolean).join(" / ")} />
                  <ExtractionValue label="Carga" value={extractionProposal.cargo} />
                  <ExtractionValue label="Embarque" value={[extractionProposal.placeOfShipment, extractionProposal.dateOfShipment].filter(Boolean).join(" · ")} />
                  <ExtractionValue label="Descarga" value={[extractionProposal.placeOfDischarge, extractionProposal.dateOfDischarge].filter(Boolean).join(" · ")} />
                  <ExtractionValue label="Inspector" value={extractionProposal.surveyor} />
                  <ExtractionValue label="Monto reclamado" value={extractionProposal.claimAmount ? currency(extractionProposal.claimAmount) : undefined} />
                </div>
                {extractionProposal.referenciasDetectadas && extractionProposal.referenciasDetectadas.length > 1 && (
                  <div className="notice mt-3">Se detectaron varias referencias: {extractionProposal.referenciasDetectadas.join(", ")}. Revisa antes de aplicar.</div>
                )}
                {extractionProposal.conflictosDetectados && extractionProposal.conflictosDetectados.length > 0 && (
                  <div className="notice mt-3" role="alert">
                    <strong>Conflictos entre documentos:</strong> {extractionProposal.conflictosDetectados.join(" · ")} . El sistema no elige una versión por ti; el Handler debe resolverlos.
                  </div>
                )}
                <Field label="Tipo de caso sugerido">
                  <input className="input" disabled={!canWrite} value={reviewType} onChange={(event) => setReviewType(event.target.value)} />
                </Field>
                <Field label="Resumen automático editable">
                  <textarea className="input min-h-24" disabled={!canWrite} value={reviewSummary} onChange={(event) => setReviewSummary(event.target.value)} />
                </Field>
                <Field label="Causa potencial y sustento documental">
                  <textarea className="input min-h-24" disabled={!canWrite} value={reviewCause} onChange={(event) => setReviewCause(event.target.value)} />
                </Field>
                {extractionProposal.fuentesCausa && extractionProposal.fuentesCausa.length > 0 && (
                  <p className="extraction-sources">Sustento detectado en: {extractionProposal.fuentesCausa.join(", ")}</p>
                )}
                {extractionProposal.propuestaPerdida && <LossProposalSummary proposal={extractionProposal.propuestaPerdida} />}
                {canWrite && (
                  <button className="button-primary mt-3" type="button" onClick={applyExtraction}>
                    <Check size={17} /> {extractionApplied ? "Datos aplicados al caso" : "Confirmar datos detectados"}
                  </button>
                )}
              </section>
            )}
          </>
        )}
        {caso.conflictosExtraccion && caso.conflictosExtraccion.length > 0 && (
          <div className="notice mt-4" role="alert">
            <strong>Conflictos de extracción pendientes:</strong> {caso.conflictosExtraccion.join(" · ")} . Deben resolverse mediante revisión humana antes de usar esos datos en un cálculo o documento.
          </div>
        )}
        {docs.length === 0 && <EmptyState text="Carga al menos un documento para continuar el caso." />}
        <div className="mt-5 space-y-2">
          {fileActionError && <div className="form-error" role="alert">{fileActionError}</div>}
          {docs.map((doc) => (
            <div className="doc-row" key={doc.id}>
              <FileText size={17} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{doc.nombreArchivo}</p>
                <p className="text-xs text-slate-500">
                  {doc.tipoDocumento} · {doc.estadoExtraccion || (doc.ocrUsado ? "procesado con OCR" : "procesado")} · Confianza {doc.clasificacionConfianza || "Baja"} · {doc.fileStorageKey ? "respaldo guardado" : "metadata precargada del demo"}
                </p>
              </div>
              {doc.fileStorageKey && (
                <div className="flex shrink-0 gap-1">
                  <button className="icon-button" type="button" title="Abrir documento" aria-label={`Abrir ${doc.nombreArchivo}`} onClick={() => void openDocument(doc)}>
                    <FileCheck2 size={16} />
                  </button>
                  <button className="icon-button" type="button" title="Descargar documento" aria-label={`Descargar ${doc.nombreArchivo}`} onClick={() => void downloadDocument(doc)}>
                    <Download size={16} />
                  </button>
                </div>
              )}
              {canWrite && (
                <button
                  className="icon-button"
                  type="button"
                  title="Eliminar documento"
                  onClick={() => {
                    if (window.confirm(`¿Eliminar ${doc.nombreArchivo} del expediente? Esta acción quedará registrada en el historial.`)) removeDocument(doc.id);
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="panel">
        <div className="panel-title">
          <div>
            <h3>Matriz documental</h3>
            <p className="text-xs text-slate-500">Requerimiento y estado operativo por documento.</p>
          </div>
          <span>{completedRequired}/{requiredChecklist.length} aplicables completos</span>
        </div>
        <p className="mb-4 text-xs text-slate-500">Obligatorios y condicionales aplicables bloquean el cierre si faltan. Los adicionales se pueden incorporar cuando el caso los requiera y los no aplicables no bloquean el traspaso.</p>
        <div className="mb-4 flex flex-wrap gap-2 text-xs text-slate-600">
          <span className="matrix-summary-chip">Obligatorios: {checklist.filter((item) => item.requirement === "obligatorio").length}</span>
          <span className="matrix-summary-chip">Condicionales: {conditionalChecklist.length}</span>
          <span className="matrix-summary-chip">Adicionales: {additionalChecklist.length}</span>
          <span className="matrix-summary-chip">No aplica: {notApplicableChecklist.length}</span>
        </div>
        {documentStatusError && <div className="form-error mb-4" role="alert">{documentStatusError}</div>}
        <div className="checklist-grid">
          {checklist.map((item) => {
            const complete = isChecklistItemComplete(item);
            return (
            <div key={item.type} className={cx("check-item", complete && "done", !item.required && "optional")}>
              {complete ? <Check size={16} /> : item.required ? <AlertTriangle size={16} /> : <HelpCircle size={16} />}
              <div>
                <div className="flex items-center gap-2">
                  <p>{item.type}</p>
                  <span className={cx("check-requirement", `check-requirement-${item.requirement}`)}>{DOCUMENT_REQUIREMENT_LABELS[item.requirement]}</span>
                </div>
                <span>{DOCUMENT_STATUS_LABELS[item.status]}{item.documents.length > 1 ? ` · ${item.documents.length} archivos` : ""}</span>
                <small>{item.reason}</small>
              </div>
              <select
                className="checklist-status-select"
                aria-label={`Estado documental de ${item.type}`}
                value={item.status}
                disabled={!canWrite}
                onChange={(event) => changeDocumentStatus(item.type, event.target.value as DocumentStatus)}
              >
                {(Object.keys(DOCUMENT_STATUS_LABELS) as DocumentStatus[]).map((status) => (
                  <option key={status} value={status}>{DOCUMENT_STATUS_LABELS[status]}</option>
                ))}
              </select>
            </div>
            );
          })}
        </div>
        <MissingDocsText
          caso={caso}
          missing={missingChecklist}
          canWrite={canWrite}
          onRequest={() => requestMissingDocuments(caso.id, missingChecklist.map((item) => item.type))}
        />
      </div>
    </section>
  );
}

export function MissingDocsText({ caso, missing, canWrite, onRequest }: { caso: Caso; missing: ReturnType<typeof documentChecklist>; canWrite: boolean; onRequest: () => { ok: boolean; error?: string } }) {
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">("idle");
  const [requestState, setRequestState] = useState<"idle" | "success" | "error">("idle");
  const text =
    missing.length === 0
      ? `Caso ${caso.id}: documentación completa para revisión preclaim.`
      : `Caso ${caso.id}: favor remitir los siguientes documentos pendientes para continuar el análisis preclaim:\n\n${missing.map((item) => `- ${item.type}`).join("\n")}`;
  const copy = async () => {
    const copied = await copyText(text);
    setCopyState(copied ? "success" : "error");
  };
  return (
    <div className="mt-5 rounded-md border border-line bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <strong>Texto para solicitar faltantes</strong>
        <div className="flex flex-wrap justify-end gap-2">
          {canWrite && missing.length > 0 && (
            <button className="button-secondary small" type="button" onClick={() => setRequestState(onRequest().ok ? "success" : "error")}>
              <ClipboardCheck size={15} /> {requestState === "success" ? "Solicitados" : "Marcar solicitados"}
            </button>
          )}
          <button className="button-secondary small" type="button" onClick={copy}>
            <Copy size={15} /> {copyState === "success" ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>
      {copyState === "error" && <p className="form-error mb-3">No fue posible copiar automáticamente. Selecciona el texto y cópialo manualmente.</p>}
      {requestState === "error" && <p className="form-error mb-3">No fue posible actualizar la solicitud documental.</p>}
      <pre className="whitespace-pre-wrap text-sm text-slate-700">{text}</pre>
    </div>
  );
}

export function AnalysisTab({ caso, docs, canWrite }: { caso: Caso; docs: ReturnType<typeof useDemoStore.getState>["documentos"]; canWrite: boolean }) {
  const { saveAnalysis, usuario } = useDemoStore();
  const thermographItem = documentChecklist(caso, docs).find((item) => item.type === "Registros de termógrafos");
  const hasThermograph = Boolean(thermographItem && isChecklistItemComplete(thermographItem));
  const applies = caso.causaDano?.toLowerCase().includes("temperatura") === true && hasThermograph;
  const [registered, setRegistered] = useState(caso.analisisCausa?.temperaturaRegistrada?.toString() || "");
  const [min, setMin] = useState(caso.analisisCausa?.rangoMinimo?.toString() || "");
  const [max, setMax] = useState(caso.analisisCausa?.rangoMaximo?.toString() || "");
  const [conclusion, setConclusion] = useState(caso.analisisCausa?.conclusionFinal || "");
  const [saveError, setSaveError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const suggestion = applies && registered && min && max ? suggestDamageMerit(Number(registered), Number(min), Number(max)) : undefined;
  const suggestedText = suggestion
    ? `Desviación de ${Math.abs(suggestion.deviation).toFixed(1)}° sobre lo requerido — mérito sugerido: ${suggestion.meritoSugerido}.`
    : "";
  const save = () => {
    setSaveError("");
    setSaveNotice("");
    if (conclusion.trim().length < 10) {
      setSaveError("La conclusión debe tener al menos 10 caracteres.");
      return;
    }
    const enteredTemperatureValues = [registered, min, max].filter((value) => value.trim() !== "");
    if (applies && enteredTemperatureValues.length > 0 && enteredTemperatureValues.length < 3) {
      setSaveError("Completa temperatura registrada, rango mínimo y rango máximo para calcular la sugerencia térmica.");
      return;
    }
    if (applies && enteredTemperatureValues.length === 3) {
      const values = [registered, min, max].map(Number);
      if (values.some((value) => !Number.isFinite(value))) {
        setSaveError("Los valores de temperatura deben ser numéricos.");
        return;
      }
      if (values[1] > values[2]) {
        setSaveError("El rango mínimo no puede ser mayor que el rango máximo.");
        return;
      }
    }
    const analysis: DamageAnalysis = {
      temperaturaRegistrada: registered ? Number(registered) : undefined,
      rangoMinimo: min ? Number(min) : undefined,
      rangoMaximo: max ? Number(max) : undefined,
      desviacion: suggestion?.deviation,
      meritoSugerido: suggestion?.meritoSugerido,
      conclusionFinal: conclusion.trim(),
      confirmadoPor: usuario.nombre,
      confirmadoAt: new Date().toISOString()
    };
    saveAnalysis(caso.id, analysis);
    setSaveNotice("Análisis confirmado y registrado en la bitácora del caso.");
  };
  return (
    <section className="panel">
      <div className="panel-title">
        <h3>Análisis de causa de daño</h3>
        <span>Confirmación humana obligatoria</span>
      </div>
      {!canWrite && <ReadonlyBanner />}
      {saveError && <div className="form-error mb-4" role="alert">{saveError}</div>}
      {saveNotice && <div className="notice mb-4" role="status">{saveNotice}</div>}
      {applies ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Temperatura registrada">
            <input className="input" disabled={!canWrite} type="number" value={registered} onChange={(event) => setRegistered(event.target.value)} />
          </Field>
          <Field label="Rango mínimo BL">
            <input className="input" disabled={!canWrite} type="number" value={min} onChange={(event) => setMin(event.target.value)} />
          </Field>
          <Field label="Rango máximo BL">
            <input className="input" disabled={!canWrite} type="number" value={max} onChange={(event) => setMax(event.target.value)} />
          </Field>
        </div>
      ) : (
        <div className="rounded-md border border-line bg-slate-50 p-4 text-sm text-slate-700">
          No hay sugerencia asistida: solo se activa cuando la causa es "Temperatura" y existe un documento de registros de termógrafos.
        </div>
      )}
      {suggestedText && (
        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-4">
          <p className="font-semibold text-blue-900">{suggestedText}</p>
          {canWrite && (
            <button className="button-secondary small mt-3" type="button" onClick={() => setConclusion(suggestedText)}>
              Usar como base editable
            </button>
          )}
        </div>
      )}
      <Field label="Conclusión final del handler">
        <textarea className="input min-h-36" disabled={!canWrite} value={conclusion} onChange={(event) => setConclusion(event.target.value)} placeholder="El handler debe confirmar o escribir la conclusión final." />
      </Field>
      {canWrite && (
        <button className="button-primary mt-4" type="button" disabled={conclusion.trim().length < 10} onClick={save}>
          <Save size={17} /> Confirmar análisis
        </button>
      )}
    </section>
  );
}
