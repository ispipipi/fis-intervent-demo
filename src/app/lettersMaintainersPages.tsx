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


import { AppShell, Field, EmptyState, ReadonlyBanner, StatusPill, cx, copyText, downloadHtmlFile, printHtmlFile } from "./appShared";

export function LettersTab({ caso, docs, canWrite }: { caso: Caso; docs: ReturnType<typeof useDemoStore.getState>["documentos"]; canWrite: boolean }) {
  const { approveLetter, registerLetter, calculosPerdida, templateConfigs } = useDemoStore();
  const calculo = calculosPerdida.find((item) => item.casoId === caso.id);
  const configuredTemplates = LETTER_TEMPLATES.map((item) => getLetterTemplate(item.id, templateConfigs));
  const firstActiveTemplate = configuredTemplates.find((item) => item.active) || configuredTemplates[0];
  const [templateId, setTemplateId] = useState<LetterTemplateId>(firstActiveTemplate.id);
  const [text, setText] = useState(() => buildLetterTemplate(firstActiveTemplate.id, { caso, docs, calculo }, templateConfigs));
  const template = getLetterTemplate(templateId, templateConfigs);
  const conflicts = templateConflicts({ caso, docs, calculo });
  const context = { caso, docs, calculo };
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">("idle");
  const [approvalNotice, setApprovalNotice] = useState("");
  const templateVersion = templateConfigs.find((item) => item.id === template.id)?.version || 1;
  const pdfEnabled = template.downloadFormats?.includes("pdf") ?? true;
  const wordEnabled = template.downloadFormats?.includes("word") ?? false;
  const fieldValues = templateFieldValues(context);
  const fingerprint = templateContentFingerprint(text);
  const approval = caso.cartasAprobadas?.find(
    (item) => item.templateId === template.id && item.version === templateVersion && item.fingerprint === fingerprint
  );
  const pendingFields = templateHasPendingFields(text);
  const lockedFieldsMissing = templateLockedTokenIssues(text, template.lockedFields, fieldValues);
  const requiredFieldsMissing = templateRequiredTokenIssues(text, template.requiredFields, fieldValues);
  const missingAttachments = templateMissingAttachments(docs, template.requiredAttachments);
  const approved = Boolean(approval);
  const approvalBlockers = [
    ...conflicts,
    pendingFields ? "Completa los campos marcados como [PENDIENTE COMPLETAR] antes de aprobar." : "",
    requiredFieldsMissing.length > 0 ? `Faltan campos obligatorios del template: ${requiredFieldsMissing.map((field) => `{{${field}}}`).join(", ")}.` : "",
    missingAttachments.length > 0 ? `Faltan respaldos para emitir: ${missingAttachments.join(", ")}.` : "",
    lockedFieldsMissing.length > 0 ? `Faltan campos protegidos del template: ${lockedFieldsMissing.map((field) => `{{${field}}}`).join(", ")}.` : "",
    !template.active ? "El template está inactivo en el mantenedor." : ""
  ].filter(Boolean);
  const canApprove = canWrite && approvalBlockers.length === 0;

  const changeTemplate = (nextId: LetterTemplateId) => {
    const nextTemplate = getLetterTemplate(nextId, templateConfigs);
    if (!nextTemplate.active) return;
    setTemplateId(nextId);
    setText(buildLetterTemplate(nextId, context, templateConfigs));
    setCopyState("idle");
    setApprovalNotice("");
  };
  const resetTemplate = () => {
    setText(buildLetterTemplate(templateId, context, templateConfigs));
    setCopyState("idle");
    setApprovalNotice("");
  };
  const editText = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
    setCopyState("idle");
    setApprovalNotice("");
  };
  const approve = () => {
    if (!canApprove) {
      setApprovalNotice("No se puede aprobar: completa la revisión requerida antes de emitir la carta.");
      return;
    }
    const result = approveLetter(caso.id, { templateId: template.id, version: templateVersion, fingerprint });
    setApprovalNotice(result.ok ? "Carta aprobada. Ahora puedes copiarla, imprimirla o descargarla." : result.error || "No fue posible aprobar la carta.");
  };
  const requireApproval = () => {
    if (approved) return true;
    setApprovalNotice("La carta debe ser aprobada por el handler responsable antes de emitirla.");
    return false;
  };
  const copy = async () => {
    if (!requireApproval()) return;
    const copied = await copyText(text);
    setCopyState(copied ? "success" : "error");
    if (copied) registerLetter(caso.id, template.id, fingerprint, `${template.title} copiado al portapapeles.`);
  };
  const download = async () => {
    if (!requireApproval()) return;
    if (!pdfEnabled) {
      setApprovalNotice("El formato PDF está desactivado para este template en el mantenedor.");
      return;
    }
    const safeId = caso.id.replace(/[^\w-]+/g, "-");
    await downloadLetterPdf(`${safeId}_${template.shortTitle.replace(/\s+/g, "_").toLowerCase()}.pdf`, template, text);
    registerLetter(caso.id, template.id, fingerprint, `${template.title} descargado en PDF.`);
  };
  const downloadWord = async () => {
    if (!requireApproval()) return;
    if (!wordEnabled) {
      setApprovalNotice("El formato Word (DOCX) está desactivado para este template en el mantenedor.");
      return;
    }
    const safeId = caso.id.replace(/[^\w-]+/g, "-");
    await downloadLetterDocx(`${safeId}_${template.shortTitle.replace(/\s+/g, "_").toLowerCase()}.docx`, template, text);
    registerLetter(caso.id, template.id, fingerprint, `${template.title} descargado en formato DOCX.`);
  };
  const print = () => {
    if (!requireApproval()) return;
    if (!pdfEnabled) {
      setApprovalNotice("La impresión / PDF está desactivada para este template en el mantenedor.");
      return;
    }
    if (printHtmlFile(buildPrintableHtml(template, text))) {
      registerLetter(caso.id, template.id, fingerprint, `${template.title} enviado a impresión / guardado como PDF.`);
    }
  };
  return (
    <section className="letters-workspace">
      <div className="panel letters-controls">
        <div className="panel-title">
          <div>
            <p className="eyebrow">Templates base parametrizados</p>
            <h3>Cartas automatizadas</h3>
          </div>
          <span>Revisión humana</span>
        </div>
        {!canWrite && <ReadonlyBanner />}
          <Field label="Template contractual">
          <select className="input" disabled={!canWrite} value={templateId} onChange={(event) => changeTemplate(event.target.value as LetterTemplateId)}>
            {configuredTemplates.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.title} · {item.language}</option>)}
          </select>
        </Field>
        <p className="template-description">{template.description}</p>
        {template.id === "claim-notice" && <p className="notice" role="note">Claim Notice y carta de notificación corresponden al mismo documento. Debe existir además la correspondencia de envío a la naviera en formato PDF, conservada en el expediente.</p>}
        {!template.active && <div className="notice template-inactive">Este template está inactivo en el mantenedor y no puede seleccionarse para nuevas generaciones.</div>}
        <div className="template-fields">
          <span>Campos parametrizados</span>
          <div>{template.fields.map((field) => <small key={field}>{field}</small>)}</div>
        </div>
        <div className="template-rules-grid">
          <div><span>Campos obligatorios</span><strong>{template.requiredFields?.join(", ") || "No definidos"}</strong></div>
          <div><span>Campos editables</span><strong>{template.manualEditableFields?.join(", ") || "Revisión en contenido"}</strong></div>
          <div><span>Adjuntos requeridos</span><strong>{template.requiredAttachments?.join(", ") || "No definidos"}</strong></div>
          <div><span>Firma</span><strong>{template.signatureRule || "No definida"}</strong></div>
        </div>
        {approvalBlockers.length > 0 && (
          <div className="form-error template-conflicts">
            <strong>Revisión requerida</strong>
            {approvalBlockers.map((blocker) => <span key={blocker}>{blocker}</span>)}
            {conflicts.length > 0 && <small>El sistema usa el primer valor detectado hasta que el handler lo corrija.</small>}
          </div>
        )}
        <div className="template-approval-bar">
          <div>
            <span className="template-approval-label">Estado de emisión</span>
            <div className="template-approval-status">
              <StatusPill label={approved ? "Aprobada" : "Pendiente de aprobación"} tone={approved ? "ok" : "warn"} />
              {approved && approval && <small>Por {approval.approvedBy} · {new Date(approval.approvedAt).toLocaleString("es-CL")}</small>}
            </div>
          </div>
          {canWrite && <button type="button" className="button-secondary" disabled={!canApprove || approved} onClick={approve}><ShieldCheck size={17} /> {approved ? "Carta aprobada" : "Aprobar carta"}</button>}
        </div>
        <div className="template-editor-heading">
          <div>
            <strong>Contenido editable</strong>
            <small>Los campos pendientes deben completarse antes de usar el documento.</small>
          </div>
          {canWrite && <button type="button" className="button-secondary small" onClick={resetTemplate}><RefreshCcw size={15} /> Restablecer base</button>}
        </div>
        <textarea className="input template-editor" disabled={!canWrite} value={text} onChange={editText} />
        {copyState === "error" && <p className="form-error mt-3">No fue posible copiar automáticamente. Selecciona el contenido y cópialo manualmente.</p>}
        {approvalNotice && <p className={cx("notice", "mt-3", approvalNotice.startsWith("Carta aprobada") ? "template-approval-notice" : "form-error")}>{approvalNotice}</p>}
        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <button className="button-secondary" type="button" disabled={!approved} onClick={copy} title={!approved ? "Aprueba la carta antes de emitirla" : undefined}><Copy size={17} /> {copyState === "success" ? "Copiado" : "Copiar"}</button>
          <button className="button-secondary" type="button" disabled={!approved || !pdfEnabled} onClick={print} title={!approved ? "Aprueba la carta antes de emitirla" : !pdfEnabled ? "PDF desactivado en el mantenedor" : undefined}><FileCheck2 size={17} /> Imprimir / PDF</button>
          <button className="button-secondary" type="button" disabled={!approved || !wordEnabled} onClick={() => void downloadWord()} title={!approved ? "Aprueba la carta antes de emitirla" : !wordEnabled ? "Word (DOCX) desactivado en el mantenedor" : undefined}><FileText size={17} /> Descargar Word (DOCX)</button>
          <button className="button-primary" type="button" disabled={!approved || !pdfEnabled} onClick={() => void download()} title={!approved ? "Aprueba la carta antes de emitirla" : !pdfEnabled ? "PDF desactivado en el mantenedor" : undefined}><Download size={17} /> Descargar PDF</button>
        </div>
      </div>
      <div className="panel template-preview-panel">
        <div className="panel-title">
          <div>
            <h3>Vista previa</h3>
            <p>Formato listo para imprimir o guardar como PDF desde el navegador.</p>
          </div>
          <span>{template.shortTitle}</span>
        </div>
        <TemplatePreview text={text} template={template} />
      </div>
    </section>
  );
}

function TemplatePreview({ text, template }: { text: string; template: ReturnType<typeof getLetterTemplate> }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <article className="template-preview-sheet">
      <header className="template-preview-brand">
        <span className="template-preview-mark">IP</span>
        <span><strong>{template.logoText || "FRUIT INSURANCE SERVICES"}</strong><small>CHILE · EST. 2015</small></span>
      </header>
      {template.headerText && <div className="template-preview-header">{template.headerText}</div>}
      <div className="template-preview-copy">
        {blocks.map((block, index) => <p key={`${index}-${block.slice(0, 20)}`}>{block.split("\n").map((line, lineIndex) => <span key={`${lineIndex}-${line.slice(0, 12)}`}>{line}{lineIndex < block.split("\n").length - 1 && <br />}</span>)}</p>)}
      </div>
      <footer>{template.footerText || "Intervent Preclaim · Documento generado para revisión humana"}</footer>
    </article>
  );
}

export function MaintainersPage() {
  const { usuario } = useDemoStore();
  const [section, setSection] = useState<"calculos" | "templates">("calculos");
  if (usuario.role === "Handler" || usuario.role === "Inspector") return <Navigate to="/dashboard" replace />;
  const canEdit = usuario.role === "Gerente";

  return (
    <AppShell>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Configuración controlada</p>
          <h2>Mantenedores</h2>
          <p className="section-subtitle">Administra los criterios visibles de cálculo y las bases documentales que usa el expediente.</p>
        </div>
        <StatusPill label={canEdit ? "Edición de gerencia" : "Solo lectura"} tone={canEdit ? "ok" : "missing"} />
      </div>
      {!canEdit && <ReadonlyBanner text="La configuración puede ser modificada por Gerente. Esta vista permite revisar los valores vigentes." />}
      <div className="maintainer-tabs" role="tablist" aria-label="Secciones de mantenedores">
        <button type="button" role="tab" aria-selected={section === "calculos"} className={cx("maintainer-tab", section === "calculos" && "active")} onClick={() => setSection("calculos")}>
          <BarChart3 size={17} /> Cálculos
        </button>
        <button type="button" role="tab" aria-selected={section === "templates"} className={cx("maintainer-tab", section === "templates" && "active")} onClick={() => setSection("templates")}>
          <FileText size={17} /> Templates
        </button>
      </div>
      {section === "calculos" ? <CalculationMaintainer canEdit={canEdit} /> : <TemplateMaintainer canEdit={canEdit} />}
    </AppShell>
  );
}

function CalculationMaintainer({ canEdit }: { canEdit: boolean }) {
  const { calculationMethods, updateCalculationMethod, resetCalculationMethods } = useDemoStore();
  const [drafts, setDrafts] = useState<CalculationMethodConfig[]>(calculationMethods);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setDrafts(calculationMethods);
  }, [calculationMethods]);

  const updateDraft = (id: CalculationMethodId, patch: Partial<CalculationMethodConfig>) => {
    setDrafts((current) => current.map((method) => method.id === id ? { ...method, ...patch } : method));
    setNotice("");
  };

  const save = () => {
    const invalid = drafts.find((method) => !method.title.trim() || !method.description.trim());
    if (invalid) {
      setError("Cada método debe tener un nombre y una descripción.");
      return;
    }
    if (!drafts.some((method) => method.active && method.id !== "firm")) {
      setError("Debe quedar activo al menos un método contractual entre los Métodos 1, 2 o 3.");
      return;
    }
    drafts.forEach((method) => updateCalculationMethod(method.id, {
      title: method.title.trim(),
      description: method.description.trim(),
      active: method.active
    }));
    setError("");
    setNotice("Mantenedor de cálculos actualizado. La lógica contractual permanece protegida.");
  };

  const reset = () => {
    if (!window.confirm("¿Restablecer los nombres y descripciones base de los métodos?")) return;
    resetCalculationMethods();
    setError("");
    setNotice("Se restauraron los valores base.");
  };

  return (
    <section className="maintainer-section">
      <div className="panel maintainer-intro">
        <div>
          <p className="eyebrow">Mantenedor de cálculo</p>
          <h3>Criterios de pérdida disponibles</h3>
          <p>Define cómo se presentan los métodos al handler y cuáles quedan habilitados para nuevos cálculos.</p>
        </div>
        <div className="maintainer-actions">
          <button type="button" className="button-secondary" disabled={!canEdit} onClick={reset}><RefreshCcw size={16} /> Restaurar base</button>
          <button type="button" className="button-primary" disabled={!canEdit} onClick={save}><Save size={16} /> Guardar cambios</button>
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}
      {notice && <div className="notice maintainer-notice">{notice}</div>}
      <div className="maintainer-method-grid">
        {drafts.map((method) => (
          <article className={cx("panel", "maintainer-card", !method.active && "inactive")} key={method.id}>
            <div className="panel-title">
              <div>
                <span className="maintainer-code">{method.id === "firm" ? "VENTA FIRME" : `MÉTODO ${method.id}`}</span>
                <h3>{method.title}</h3>
              </div>
              <label className="switch-field">
                <input type="checkbox" disabled={!canEdit} checked={method.active} onChange={(event) => updateDraft(method.id, { active: event.target.checked })} />
                <span>{method.active ? "Activo" : "Inactivo"}</span>
              </label>
            </div>
            <div className="space-y-3">
              <Field label="Nombre visible">
                <input className="input" disabled={!canEdit} value={method.title} onChange={(event) => updateDraft(method.id, { title: event.target.value })} />
              </Field>
              <Field label="Descripción operativa">
                <textarea className="input min-h-24" disabled={!canEdit} value={method.description} onChange={(event) => updateDraft(method.id, { description: event.target.value })} />
              </Field>
              <div className="protected-formula">
                <span>Fórmula contractual</span>
                <strong>{method.formula}</strong>
                <small>La operación está protegida para conservar la trazabilidad del cálculo.</small>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TemplateMaintainer({ canEdit }: { canEdit: boolean }) {
  const { templateConfigs, updateTemplateConfig, resetTemplateConfigs } = useDemoStore();
  const [selectedId, setSelectedId] = useState<TemplateId>(templateConfigs[0]?.id || "claim-notice");
  const selected = templateConfigs.find((template) => template.id === selectedId) || templateConfigs[0];
  const [draft, setDraft] = useState<TemplateConfig | undefined>(selected);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setDraft(selected);
  }, [selected]);

  const chooseTemplate = (id: TemplateId) => {
    setSelectedId(id);
    setError("");
    setNotice("");
  };

  const updateDraft = (patch: Partial<TemplateConfig>) => {
    setDraft((current) => current ? { ...current, ...patch } : current);
    setNotice("");
  };
  const splitList = (value: string) => [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
  const toggleFormat = (format: TemplateDownloadFormat, checked: boolean) => {
    const formats = new Set(draft?.downloadFormats || []);
    if (checked) formats.add(format);
    else formats.delete(format);
    updateDraft({ downloadFormats: [...formats] as TemplateDownloadFormat[] });
  };

  const save = () => {
    if (!draft) return;
    if (!draft.title.trim() || !draft.shortTitle.trim() || !draft.description.trim() || !draft.baseContent.trim()) {
      setError("Completa nombre, nombre corto, descripción y contenido base.");
      return;
    }
    const tokenIssues = templateTokenIssues(draft.baseContent);
    if (tokenIssues.unknown.length > 0 || tokenIssues.unmatchedBraces) {
      setError(tokenIssues.unknown.length > 0
        ? `El contenido contiene tokens no reconocidos: ${tokenIssues.unknown.map((token) => `{{${token}}}`).join(", ")}.`
        : "Revisa que todos los tokens tengan apertura y cierre correcto.");
      return;
    }
    const configuredTokenFields = [
      ...(draft.requiredFields || []),
      ...(draft.optionalFields || []),
      ...(draft.manualEditableFields || []),
      ...(draft.lockedFields || [])
    ];
    const invalidConfiguredFields = [...new Set(configuredTokenFields.filter((field) => !TEMPLATE_TOKENS.includes(field as (typeof TEMPLATE_TOKENS)[number])))];
    if (invalidConfiguredFields.length > 0) {
      setError(`Hay campos configurados que no existen: ${invalidConfiguredFields.map((field) => `{{${field}}}`).join(", ")}.`);
      return;
    }
    const missingConfiguredFields = [...new Set([
      ...(draft.requiredFields || []),
      ...(draft.lockedFields || [])
    ].filter((field) => !draft.baseContent.includes(`{{${field}}}`)))];
    if (missingConfiguredFields.length > 0) {
      setError(`El contenido base no contiene los campos obligatorios o protegidos: ${missingConfiguredFields.map((field) => `{{${field}}}`).join(", ")}.`);
      return;
    }
    if (!draft.active && !templateConfigs.some((template) => template.id !== draft.id && template.active)) {
      setError("Debe quedar activo al menos un template para poder generar cartas.");
      return;
    }
    updateTemplateConfig(draft.id, {
      title: draft.title.trim(),
      shortTitle: draft.shortTitle.trim(),
      description: draft.description.trim(),
      language: draft.language.trim() || "English",
      baseContent: draft.baseContent,
      active: draft.active,
      officialName: draft.officialName?.trim() || draft.title.trim(),
      effectiveDate: draft.effectiveDate || undefined,
      logoText: draft.logoText?.trim() || "FRUIT INSURANCE SERVICES CHILE",
      headerText: draft.headerText?.trim() || undefined,
      footerText: draft.footerText?.trim() || undefined,
      sender: draft.sender?.trim() || undefined,
      recipient: draft.recipient?.trim() || undefined,
      legalText: draft.legalText?.trim() || undefined,
      requiredFields: draft.requiredFields || [],
      optionalFields: draft.optionalFields || [],
      manualEditableFields: draft.manualEditableFields || [],
      lockedFields: draft.lockedFields || [],
      signatureRule: draft.signatureRule?.trim() || undefined,
      authorizedSigner: draft.authorizedSigner?.trim() || undefined,
      downloadFormats: draft.downloadFormats?.length ? draft.downloadFormats : ["pdf", "word"],
      requiresSerialNumber: Boolean(draft.requiresSerialNumber),
      requiredAttachments: draft.requiredAttachments || []
    });
    setError("");
    setNotice("Template base actualizado. La próxima generación usará esta versión.");
  };

  const reset = () => {
    if (!window.confirm("¿Restablecer todos los templates a su contenido base?")) return;
    resetTemplateConfigs();
    setError("");
    setNotice("Se restauraron los templates base.");
  };

  return (
    <section className="maintainer-section">
      <div className="panel maintainer-intro">
        <div>
          <p className="eyebrow">Mantenedor de templates</p>
          <h3>Documentos base parametrizados</h3>
          <p>Administra el texto contractual que se propone en la pestaña Cartas, conservando los campos del expediente.</p>
        </div>
        <div className="maintainer-actions">
          <button type="button" className="button-secondary" disabled={!canEdit} onClick={reset}><RefreshCcw size={16} /> Restaurar base</button>
          <button type="button" className="button-primary" disabled={!canEdit || !draft} onClick={save}><Save size={16} /> Guardar template</button>
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}
      {notice && <div className="notice maintainer-notice">{notice}</div>}
      <div className="template-maintainer-layout">
        <div className="panel template-maintainer-list">
          <div className="panel-title">
            <h3>Templates</h3>
            <span>{templateConfigs.filter((template) => template.active).length} activos</span>
          </div>
          <div className="template-maintainer-options">
            {templateConfigs.map((template) => (
              <button type="button" key={template.id} className={cx("template-maintainer-option", selectedId === template.id && "selected")} onClick={() => chooseTemplate(template.id)}>
                <span><strong>{template.title}</strong><small>{template.language}</small></span>
                <StatusPill label={template.active ? "Activo" : "Inactivo"} tone={template.active ? "ok" : "missing"} />
              </button>
            ))}
          </div>
        </div>
        {draft && (
          <div className="panel template-maintainer-editor">
            <div className="panel-title">
              <div>
                <span className="maintainer-code">{draft.id}</span>
                <h3>{draft.title}</h3>
              </div>
              <label className="switch-field">
                <input type="checkbox" disabled={!canEdit} checked={draft.active} onChange={(event) => updateDraft({ active: event.target.checked })} />
                <span>{draft.active ? "Activo" : "Inactivo"}</span>
              </label>
            </div>
            <p className="template-version">Versión {draft.version || 1} · Última actualización {new Date(draft.updatedAt).toLocaleString("es-CL")}</p>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Nombre visible">
                <input className="input" disabled={!canEdit} value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} />
              </Field>
              <Field label="Nombre corto">
                <input className="input" disabled={!canEdit} value={draft.shortTitle} onChange={(event) => updateDraft({ shortTitle: event.target.value })} />
              </Field>
              <Field label="Idioma">
                <input className="input" disabled={!canEdit} value={draft.language} onChange={(event) => updateDraft({ language: event.target.value })} />
              </Field>
            </div>
            <Field label="Descripción">
              <input className="input" disabled={!canEdit} value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nombre oficial">
                <input className="input" disabled={!canEdit} value={draft.officialName || ""} onChange={(event) => updateDraft({ officialName: event.target.value })} />
              </Field>
              <Field label="Fecha de vigencia">
                <input className="input" disabled={!canEdit} type="date" value={draft.effectiveDate || ""} onChange={(event) => updateDraft({ effectiveDate: event.target.value })} />
              </Field>
              <Field label="Encabezado">
                <input className="input" disabled={!canEdit} value={draft.headerText || ""} onChange={(event) => updateDraft({ headerText: event.target.value })} />
              </Field>
              <Field label="Pie de documento">
                <input className="input" disabled={!canEdit} value={draft.footerText || ""} onChange={(event) => updateDraft({ footerText: event.target.value })} />
              </Field>
              <Field label="Remitente">
                <input className="input" disabled={!canEdit} value={draft.sender || ""} onChange={(event) => updateDraft({ sender: event.target.value })} />
              </Field>
              <Field label="Destinatario">
                <input className="input" disabled={!canEdit} value={draft.recipient || ""} onChange={(event) => updateDraft({ recipient: event.target.value })} />
              </Field>
              <Field label="Texto legal">
                <textarea className="input min-h-20" disabled={!canEdit} value={draft.legalText || ""} onChange={(event) => updateDraft({ legalText: event.target.value })} />
              </Field>
              <Field label="Regla de firma">
                <textarea className="input min-h-20" disabled={!canEdit} value={draft.signatureRule || ""} onChange={(event) => updateDraft({ signatureRule: event.target.value })} />
              </Field>
              <Field label="Firmante autorizado">
                <input className="input" disabled={!canEdit} value={draft.authorizedSigner || ""} onChange={(event) => updateDraft({ authorizedSigner: event.target.value })} />
              </Field>
              <Field label="Logo / marca">
                <input className="input" disabled={!canEdit} value={draft.logoText || ""} onChange={(event) => updateDraft({ logoText: event.target.value })} />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Campos obligatorios (tokens separados por coma)">
                <input className="input" disabled={!canEdit} value={(draft.requiredFields || []).join(", ")} onChange={(event) => updateDraft({ requiredFields: splitList(event.target.value) })} />
              </Field>
              <Field label="Campos opcionales (tokens separados por coma)">
                <input className="input" disabled={!canEdit} value={(draft.optionalFields || []).join(", ")} onChange={(event) => updateDraft({ optionalFields: splitList(event.target.value) })} />
              </Field>
              <Field label="Campos editables manualmente">
                <input className="input" disabled={!canEdit} value={(draft.manualEditableFields || []).join(", ")} onChange={(event) => updateDraft({ manualEditableFields: splitList(event.target.value) })} />
              </Field>
              <Field label="Campos bloqueados">
                <input className="input" disabled={!canEdit} value={(draft.lockedFields || []).join(", ")} onChange={(event) => updateDraft({ lockedFields: splitList(event.target.value) })} />
              </Field>
              <Field label="Adjuntos requeridos">
                <input className="input" disabled={!canEdit} value={(draft.requiredAttachments || []).join(", ")} onChange={(event) => updateDraft({ requiredAttachments: splitList(event.target.value) })} />
              </Field>
              <div className="template-format-box">
                <span>Formatos de descarga</span>
                <div className="flex flex-wrap gap-3">
                  {(["pdf", "word"] as TemplateDownloadFormat[]).map((format) => (
                    <label className="checkbox-field" key={format}>
                      <input type="checkbox" disabled={!canEdit} checked={draft.downloadFormats?.includes(format) || false} onChange={(event) => toggleFormat(format, event.target.checked)} />
                      {format === "pdf" ? "PDF real / impresión" : "Word real (DOCX)"}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="template-token-box">
              <span>Campos disponibles</span>
              <div>{TEMPLATE_TOKENS.map((token) => <code key={token}>{`{{${token}}}`}</code>)}</div>
            </div>
            <Field label="Contenido base parametrizado">
              <textarea className="input template-maintainer-textarea" disabled={!canEdit} value={draft.baseContent} onChange={(event) => updateDraft({ baseContent: event.target.value })} />
            </Field>
            {(() => {
              const tokenIssues = templateTokenIssues(draft.baseContent);
              if (tokenIssues.unknown.length === 0 && !tokenIssues.unmatchedBraces) return null;
              return <div className="form-error">{tokenIssues.unknown.length > 0 ? `Tokens no reconocidos: ${tokenIssues.unknown.map((token) => `{{${token}}}`).join(", ")}.` : "Hay tokens sin cierre correcto."}</div>;
            })()}
          </div>
        )}
      </div>
    </section>
  );
}
