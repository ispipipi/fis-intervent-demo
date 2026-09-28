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

export const STATUS_LABELS: CaseStatus[] = [
  "Datos incompletos",
  "Preclaim",
  "Documentación pendiente",
  "Cálculo completo",
  "Traspasado a FIS",
  "Traspasado a Lawgistic"
];

export const MASS_VESSEL_MIN_CASES = 2;
export const HISTORY_PAGE_SIZE = 50;
export const COMPANY_LOGO_SRC = `${import.meta.env.BASE_URL}fis-logo.jpeg`;

export function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function downloadTextFile(fileName: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function downloadHtmlFile(fileName: string, html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Continue with the browser fallback when clipboard permissions are unavailable.
    }
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  } finally {
    textarea.remove();
  }
  return copied;
}

export function printHtmlFile(html: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  return true;
}

export function useVisibleCases() {
  const { usuario, casos } = useDemoStore();
  if (usuario.role === "Inspector") return casos.filter((caso) => caso.inspectorAsignado === usuario.nombre);
  return usuario.role === "Handler" ? casos.filter((caso) => caso.claimHandler === usuario.nombre) : casos;
}

export function shellTitle(role: string) {
  if (role === "CEO") return "Vista dirección";
  if (role === "Gerente") return "Panel gerencia";
  if (role === "Inspector") return "Vista inspección";
  return "Mesa handler";
}

export function vesselVoyageKey(caso: Caso) {
  return `${caso.vessel.trim().toLowerCase()}|${(caso.voyage || "sin viaje").trim().toLowerCase()}`;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { usuario, setUsuario, resetDemo } = useDemoStore();
  const navigate = useNavigate();
  if (!INSPECTOR_EVOLUTION_ENABLED && usuario.role === "Inspector") return <Navigate to="/" replace />;
  return (
    <div className="app-shell min-h-screen text-ink">
      <header className="app-header sticky top-0 z-20">
        <div className="app-header-inner mx-auto max-w-7xl px-5">
          <Link to="/dashboard" className="brand-lockup">
            <div className="brand-mark">
              <span>IP</span>
            </div>
            <div className="brand-copy">
              <p>Intervent <span>Preclaim</span></p>
              <h1>{shellTitle(usuario.role)}</h1>
            </div>
          </Link>
          <nav className="app-nav hidden items-center gap-1 md:flex">
            <NavLink to="/dashboard" icon={<LayoutDashboard size={18} />} label="Dashboard" />
            <NavLink to="/casos" icon={<ClipboardList size={18} />} label="Casos" />
            {usuario.role !== "Inspector" && <NavLink to="/historial" icon={<History size={18} />} label="Historial" />}
            {usuario.role === "Handler" && <NavLink to="/casos/nuevo" icon={<Plus size={18} />} label="Nuevo caso" />}
            {(usuario.role === "Gerente" || usuario.role === "CEO") && <NavLink to="/benchmark" icon={<BarChart3 size={18} />} label="Benchmark" />}
            {(usuario.role === "Gerente" || usuario.role === "CEO") && <NavLink to="/mantenedores" icon={<Settings size={18} />} label="Mantenedores" />}
            <NavLink to="/manual" icon={<HelpCircle size={18} />} label="Manual" />
          </nav>
          <div className="header-tools">
            <div className="session-controls">
              <span className="role-indicator">{usuario.role}</span>
              <select
                className="role-select"
                value={`${usuario.role}|${usuario.nombre}`}
                onChange={(event) => {
                  const [role, nombre] = event.target.value.split("|");
                  setUsuario({ role: role as typeof usuario.role, nombre });
                  navigate("/dashboard");
                }}
                aria-label="Selector de rol"
              >
                {HANDLERS.map((handler) => (
                  <option key={handler} value={`Handler|${handler}`}>
                    Handler · {handler}
                  </option>
                ))}
                <option value="Gerente|Ljubinka Basic">Gerente · Ljubinka</option>
                <option value="CEO|Dirección NPR">CEO · Dirección</option>
                {INSPECTOR_EVOLUTION_ENABLED && <option value={`Inspector|${INSPECTORS[0]}`}>Inspector · {INSPECTORS[0]}</option>}
              </select>
              <button
                className="icon-button"
                type="button"
                title="Reiniciar datos demo"
                aria-label="Reiniciar datos demo"
                onClick={() => {
                  if (window.confirm("¿Reiniciar todos los datos de la demo? Se perderán los cambios y documentos cargados en esta sesión.")) {
                    resetDemo();
                    navigate("/dashboard");
                  }
                }}
              >
                <RefreshCcw size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="app-main mx-auto max-w-7xl px-5 py-7">{children}</main>
      <footer className="app-footer">
        <div className="app-footer-inner">
          <span>Prototipo funcional sobre el MVP · datos simulados persistidos localmente</span>
          <Link to="/manual">Manual de usuario</Link>
        </div>
      </footer>
    </div>
  );
}

export function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  const location = useLocation();
  const active = location.pathname === to || (to !== "/dashboard" && location.pathname.startsWith(`${to}/`));
  return (
    <Link to={to} className={cx("nav-link", active && "active")}>
      {icon}
      {label}
    </Link>
  );
}

export function RoleSelectorPage() {
  const { setUsuario } = useDemoStore();
  const navigate = useNavigate();
  const roles = [
    { role: "Handler" as const, nombre: "Emely Lambraño", title: "Handler", copy: "Procesa casos, carga documentos y ejecuta cálculos." },
    { role: "Gerente" as const, nombre: "Ljubinka Basic", title: "Gerente", copy: "Supervisa todos los casos, alertas y distribución del equipo." },
    { role: "CEO" as const, nombre: "Dirección NPR", title: "CEO", copy: "Revisa riesgos críticos y estado ejecutivo del portafolio." },
  ];
  return (
    <div className="role-gate">
      <main className="role-gate-shell">
        <section className="role-gate-intro">
          <div className="company-brand-card">
            <img src={COMPANY_LOGO_SRC} alt="Logo de la empresa" />
            <span>Intervent Preclaim</span>
          </div>
          <div className="role-gate-copy">
            <p className="eyebrow">Entorno de demostración</p>
            <h1>Decisiones claras antes del reclamo.</h1>
            <p>
              Un espacio único para ordenar antecedentes, anticipar riesgos y preparar cada caso antes de su traspaso a FIS.
            </p>
          </div>
          <div className="role-gate-proof">
            <span className="proof-dot" />
            <div>
              <strong>MVP funcional completo</strong>
              <span>Datos simulados · flujo auditable</span>
            </div>
          </div>
        </section>

        <section className="role-gate-access">
          <div className="access-heading">
            <div>
              <p className="eyebrow">Acceso de prueba</p>
              <h2>Selecciona tu vista</h2>
            </div>
            <span className="access-count">03 perfiles</span>
          </div>
          <p className="access-description">Cada perfil muestra el mismo expediente con permisos y alcance distintos.</p>
          <div className="role-options">
            {roles.map((item, index) => (
              <button
                key={item.role}
                className="role-option"
                type="button"
                onClick={() => {
                  setUsuario({ role: item.role, nombre: item.nombre });
                  navigate("/dashboard");
                }}
              >
                <span className="role-option-index">0{index + 1}</span>
                <span className="role-option-icon"><UserRound size={18} /></span>
                <span className="role-option-copy">
                  <strong>{item.title}</strong>
                  <span>{item.copy}</span>
                </span>
                <ChevronRight className="role-option-arrow" size={18} />
              </button>
            ))}
          </div>
          <Link to="/manual" className="role-gate-manual">
            <HelpCircle size={16} />
            <span>Revisar manual de usuario</span>
            <ChevronRight size={15} />
          </Link>
          <div className="access-note">
            <ShieldCheck size={15} />
            <span>La navegación no requiere credenciales y no utiliza datos reales.</span>
          </div>
        </section>
      </main>
    </div>
  );
}


export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function StatusPill({ label, tone }: { label: string; tone: "ok" | "warn" | "danger" | "missing" }) {
  return <span className={cx("status-pill", tone)}>{label}</span>;
}

export function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

export function ReadonlyBanner({ text = "Este rol tiene vista de solo lectura para esta sección." }: { text?: string }) {
  return (
    <div className="readonly-banner">
      <Lock size={16} /> {text}
    </div>
  );
}

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const titleId = `modal-title-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="panel-title">
          <h3 id={titleId}>{title}</h3>
          <button className="icon-button" type="button" aria-label="Cerrar ventana" title="Cerrar" onClick={onClose}>
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
