import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarClock,
  Check,
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
import { useDemoStore } from "./store/useDemoStore";
import {
  CalculoPerdida,
  CaseStatus,
  Caso,
  DamageAnalysis,
  DocumentType,
  Jurisdiccion,
  NewCaseInput,
  RubroAdicional,
  ExtractedCaseData,
  ExtractedLossProposal,
  ReviewReport,
  TransferDestination,
  UploadDraft,
  HistoricalCase,
  CalculationMethodConfig,
  CalculationMethodId,
  TemplateConfig,
  TemplateId,
  DischargeDateType,
  CurrencyCode
} from "./types/domain";
import { mergeExtractedData, processDocumentFiles } from "./lib/extraction";
import { buildReviewReportText } from "./lib/review";
import { exportCaseTrackingXlsx, exportHistoricalMemoryXlsx } from "./lib/caseExport";
import {
  canEditCalculation,
  calculateLoss,
  currency,
  daysWithoutMovement,
  DOCUMENT_TYPES,
  documentCompleteness,
  HANDLERS,
  hasRequiredMinimum,
  INSPECTORS,
  INACTIVITY_ALERT_DAYS,
  nextStatusFromCase,
  pendingField,
  prescriptionStatus,
  suggestDamageMerit,
  suggestHandler
} from "./lib/business";
import {
  buildLetterTemplate,
  buildPrintableHtml,
  getLetterTemplate,
  LETTER_TEMPLATES,
  LetterTemplateId,
  TEMPLATE_TOKENS,
  templateConflicts,
  templateTokenIssues
} from "./lib/templates";
import { buildJointInspectionLetter } from "./lib/inspection";

const STATUS_LABELS: CaseStatus[] = [
  "Datos incompletos",
  "Preclaim",
  "Documentación pendiente",
  "Cálculo completo",
  "Traspasado a FIS",
  "Traspasado a Lawgistic"
];

const MASS_VESSEL_MIN_CASES = 2;
const COMPANY_LOGO_SRC = `${import.meta.env.BASE_URL}fis-logo.jpeg`;

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function downloadTextFile(fileName: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadHtmlFile(fileName: string, html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

async function copyText(text: string) {
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

function printHtmlFile(html: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  return true;
}

function useVisibleCases() {
  const { usuario, casos } = useDemoStore();
  if (usuario.role === "Inspector") return casos.filter((caso) => caso.inspectorAsignado === usuario.nombre);
  return usuario.role === "Handler" ? casos.filter((caso) => caso.claimHandler === usuario.nombre) : casos;
}

function shellTitle(role: string) {
  if (role === "CEO") return "Vista dirección";
  if (role === "Gerente") return "Panel gerencia";
  if (role === "Inspector") return "Vista inspección";
  return "Mesa handler";
}

function vesselVoyageKey(caso: Caso) {
  return `${caso.vessel.trim().toLowerCase()}|${(caso.voyage || "sin viaje").trim().toLowerCase()}`;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { usuario, setUsuario, resetDemo } = useDemoStore();
  const navigate = useNavigate();
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
            {usuario.role !== "Inspector" && <NavLink to="/historial" icon={<History size={18} />} label="Memoria" />}
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
                <option value={`Inspector|${INSPECTORS[0]}`}>Inspector · {INSPECTORS[0]}</option>
              </select>
              <button className="icon-button" title="Reiniciar datos demo" onClick={resetDemo}>
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

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  const location = useLocation();
  const active = location.pathname === to || (to !== "/dashboard" && location.pathname.startsWith(`${to}/`));
  return (
    <Link to={to} className={cx("nav-link", active && "active")}>
      {icon}
      {label}
    </Link>
  );
}

function RoleSelectorPage() {
  const { setUsuario } = useDemoStore();
  const navigate = useNavigate();
  const roles = [
    { role: "Handler" as const, nombre: "Emely Lambraño", title: "Handler", copy: "Procesa casos, carga documentos y ejecuta cálculos." },
    { role: "Gerente" as const, nombre: "Ljubinka Basic", title: "Gerente", copy: "Supervisa todos los casos, alertas y distribución del equipo." },
    { role: "CEO" as const, nombre: "Dirección NPR", title: "CEO", copy: "Revisa riesgos críticos y estado ejecutivo del portafolio." },
    { role: "Inspector" as const, nombre: INSPECTORS[0], title: "Inspector", copy: "Consulta solo casos asignados y registra la inspección." }
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
            <span className="access-count">04 perfiles</span>
          </div>
          <p className="access-description">Cada perfil muestra el mismo expediente con permisos y alcance distintos.</p>
          <div className="role-options">
            {roles.map((item, index) => (
              <button
                key={item.role}
                className="role-option"
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

function DashboardPage() {
  const visibleCases = useVisibleCases();
  const { documentos, calculosPerdida, bitacora, usuario } = useDemoStore();
  const [handlerFilter, setHandlerFilter] = useState("Todos");
  const filtered = handlerFilter === "Todos" ? visibleCases : visibleCases.filter((caso) => caso.claimHandler === handlerFilter);
  const massVesselGroups = useMemo(() => {
    const groups = new Map<string, { key: string; vessel: string; voyage: string; cases: Caso[] }>();
    filtered.forEach((caso) => {
      if (!caso.vessel.trim()) return;
      const key = vesselVoyageKey(caso);
      const current = groups.get(key) || { key, vessel: caso.vessel, voyage: caso.voyage || "Sin viaje", cases: [] };
      current.cases.push(caso);
      groups.set(key, current);
    });
    return [...groups.values()]
      .filter((group) => group.cases.length >= MASS_VESSEL_MIN_CASES)
      .sort((left, right) => right.cases.length - left.cases.length || left.vessel.localeCompare(right.vessel));
  }, [filtered]);
  const alerts = filtered
    .map((caso) => ({ caso, prescription: prescriptionStatus(caso), staleDays: daysWithoutMovement(caso) }))
    .filter((item) => item.prescription.tone !== "ok" || item.staleDays > INACTIVITY_ALERT_DAYS)
    .sort((a, b) => {
      const priority = { danger: 0, missing: 1, warn: 2, ok: 3 };
      return priority[a.prescription.tone] - priority[b.prescription.tone] || b.staleDays - a.staleDays;
    });
  const statusCounts = STATUS_LABELS.map((status) => ({
    status,
    count: filtered.filter((caso) => caso.estado === status).length
  }));
  const byHandler = HANDLERS.map((handler) => ({
    handler,
    count: filtered.filter((caso) => caso.claimHandler === handler).length
  }));
  const staleCount = filtered.filter((caso) => daysWithoutMovement(caso) > INACTIVITY_ALERT_DAYS).length;
  const riskCount = alerts.length;
  const coverage = filtered.length
    ? Math.round(
        filtered.reduce((sum, caso) => {
          const completeness = documentCompleteness(documentos.filter((doc) => doc.casoId === caso.id));
          return sum + (completeness.completed / completeness.total) * 100;
        }, 0) / filtered.length
      )
    : 0;
  const exportTracking = () => exportCaseTrackingXlsx(filtered, documentos, calculosPerdida, bitacora, `seguimiento-preclaim-${new Date().toISOString().slice(0, 10)}.xlsx`);

  return (
    <AppShell>
      <section className="dashboard-overview">
        <div className="dashboard-welcome">
          <p className="eyebrow">{shellTitle(usuario.role)}</p>
          <h2>Hola, {usuario.nombre.split(" ")[0]}</h2>
          <p>
            {filtered.length} casos visibles · {riskCount} alertas activas · {coverage}% de cobertura documental promedio.
          </p>
          <div className="dashboard-actions">
            {usuario.role === "Handler" ? (
              <div className="flex flex-wrap gap-3">
                <Link className="button-primary" to="/casos/nuevo">
                  <Plus size={16} /> Nuevo caso
                </Link>
                <button className="button-secondary" type="button" onClick={exportTracking}>
                  <Download size={16} /> Exportar seguimiento
                </button>
              </div>
            ) : usuario.role === "Inspector" ? (
              <p className="notice">Vista restringida a los casos asignados para inspección.</p>
            ) : (
              <>
                <Link className="button-primary" to="/benchmark">
                  <BarChart3 size={16} /> Ver benchmark
                </Link>
                <button className="button-secondary" type="button" onClick={exportTracking}>
                  <Download size={16} /> Exportar seguimiento
                </button>
                <select className="input" value={handlerFilter} onChange={(event) => setHandlerFilter(event.target.value)} aria-label="Filtrar por handler">
                  <option>Todos</option>
                  {HANDLERS.map((handler) => (
                    <option key={handler}>{handler}</option>
                  ))}
                </select>
              </>
            )}
          </div>
          <Link to="/manual" className="welcome-manual">
            <HelpCircle size={15} /> Abrir manual de usuario <ChevronRight size={14} />
          </Link>
        </div>
        <div className="dashboard-metrics">
          <Metric title="Total casos" value={filtered.length} icon={<BarChart3 size={20} />} />
          <Metric title="Alertas activas" value={riskCount} icon={<AlertTriangle size={20} />} tone="danger" />
          <Metric title="Sin movimiento" value={staleCount} icon={<CalendarClock size={20} />} tone="warn" />
          <Metric title="Documentos cargados" value={documentos.filter((doc) => filtered.some((caso) => caso.id === doc.casoId)).length} icon={<FileText size={20} />} />
        </div>
        <div className="coverage-card">
          <div className="coverage-ring" aria-label={`Cobertura documental ${coverage}%`}>
            <svg viewBox="0 0 42 42" role="img" aria-hidden="true">
              <circle className="coverage-ring-track" cx="21" cy="21" r="15.9" pathLength="100" />
              <circle className="coverage-ring-value" cx="21" cy="21" r="15.9" pathLength="100" strokeDasharray={`${coverage} 100`} />
            </svg>
            <strong>{coverage}%</strong>
          </div>
          <div>
            <span className="coverage-label">Cobertura documental</span>
            <p>Promedio real sobre los 17 documentos del checklist.</p>
          </div>
        </div>
      </section>

      {staleCount > 0 && (
        <div className="notice mt-5" role="status">
          Aviso de gestión: {staleCount} {staleCount === 1 ? "caso lleva" : "casos llevan"} más de {INACTIVITY_ALERT_DAYS} días sin movimiento. El aviso se mantiene hasta registrar una nueva actualización.
        </div>
      )}

      <section className="dashboard-grid mt-6 grid gap-5 lg:grid-cols-[1.05fr_1.5fr]">
        <div className="panel priority-panel">
          <div className="panel-title">
            <h3>Alertas de prescripción y movimiento</h3>
            <span>{alerts.length} activas</span>
          </div>
          <div className="space-y-3">
            {alerts.length === 0 && <EmptyState text="No hay alertas para el filtro actual." />}
            {alerts.map(({ caso, prescription, staleDays }) => (
              <Link key={caso.id} to={`/casos/${encodeURIComponent(caso.id)}`} className="alert-row">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill label={prescription.label} tone={prescription.tone} />
                    {staleDays > INACTIVITY_ALERT_DAYS && <StatusPill label={`${staleDays} días sin movimiento`} tone="warn" />}
                  </div>
                  <p className="mt-2 font-semibold">{caso.id}</p>
                  <p className="text-sm text-slate-600">
                    {caso.assured} · {caso.opponent} · {caso.claimHandler}
                  </p>
                </div>
                <ChevronRight size={18} />
              </Link>
            ))}
          </div>
        </div>
        <div className="dashboard-insights space-y-5">
          <div className="panel distribution-panel">
            <div className="panel-title">
              <h3>Casos por estado</h3>
            </div>
            <div className="space-y-2">
              {statusCounts.map((item) => (
                <Distribution key={item.status} label={item.status} value={item.count} total={Math.max(filtered.length, 1)} />
              ))}
            </div>
          </div>
          <div className="panel distribution-panel">
            <div className="panel-title">
              <h3>Distribución por handler</h3>
            </div>
            <div className="space-y-2">
              {byHandler.map((item) => (
                <Distribution key={item.handler} label={item.handler} value={item.count} total={Math.max(filtered.length, 1)} />
              ))}
            </div>
          </div>
          <div className="panel recent-panel">
            <div className="panel-title">
              <div>
                <h3>Naves con casos relacionados</h3>
                <p className="panel-kicker">Agrupación por nave y viaje</p>
              </div>
              <span>{massVesselGroups.length} grupos</span>
            </div>
            <div className="recent-list">
              {massVesselGroups.map((group) => (
                <Link key={group.key} to={`/casos?group=${encodeURIComponent(group.key)}`} className="recent-row">
                  <div>
                    <strong>{group.cases.length} casos · {group.vessel}</strong>
                    <span>Viaje {group.voyage} · abrir conjunto relacionado</span>
                  </div>
                  <ChevronRight size={18} />
                </Link>
              ))}
              {massVesselGroups.length === 0 && <EmptyState text="No hay naves con dos o más casos en el filtro actual." />}
            </div>
          </div>
          <div className="panel recent-panel">
            <div className="panel-title">
              <div>
                <h3>Casos recientes</h3>
                <p className="panel-kicker">Últimos expedientes del portafolio visible</p>
              </div>
              <Link className="text-link" to="/casos">Ver todos</Link>
            </div>
            <div className="recent-list">
              {filtered.slice(0, 4).map((caso) => (
                <Link key={caso.id} to={`/casos/${encodeURIComponent(caso.id)}`} className="recent-row">
                  <div>
                    <strong>{caso.id}</strong>
                    <span>{caso.claimHandler} · {caso.assured || "Sin asegurado"}</span>
                  </div>
                  <StatusPill label={caso.estado} tone={caso.estado.includes("Traspasado") ? "ok" : caso.estado === "Datos incompletos" ? "missing" : "warn"} />
                </Link>
              ))}
              {filtered.length === 0 && <EmptyState text="No hay casos recientes para este filtro." />}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function Metric({ title, value, icon, tone = "ok" }: { title: string; value: number; icon: React.ReactNode; tone?: "ok" | "warn" | "danger" }) {
  return (
    <div className="metric">
      <div className={cx("metric-icon", tone === "danger" && "bg-red-50 text-red-700", tone === "warn" && "bg-amber-50 text-amber-700")}>{icon}</div>
      <p>{title}</p>
      <strong>{value}</strong>
    </div>
  );
}

function Distribution({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = Math.round((value / total) * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function BenchmarkPage() {
  const visibleCases = useVisibleCases();
  const { documentos, calculosPerdida, bitacora, usuario } = useDemoStore();
  if (usuario.role === "Handler" || usuario.role === "Inspector") return <Navigate to="/dashboard" replace />;

  const rows = HANDLERS.map((handler) => {
    const handlerCases = visibleCases.filter((caso) => caso.claimHandler === handler);
    const coverageValues = handlerCases.map((caso) => {
      const completeness = documentCompleteness(documentos.filter((doc) => doc.casoId === caso.id));
      return (completeness.completed / completeness.total) * 100;
    });
    const coverage = coverageValues.length
      ? Math.round(coverageValues.reduce((sum, value) => sum + value, 0) / coverageValues.length)
      : 0;
    const pendingDocumentCases = handlerCases.filter(
      (caso) => documentCompleteness(documentos.filter((doc) => doc.casoId === caso.id)).missing.length > 0
    ).length;
    const alerts = handlerCases.filter((caso) => {
      const prescription = prescriptionStatus(caso);
      return prescription.tone !== "ok" || daysWithoutMovement(caso) > INACTIVITY_ALERT_DAYS;
    }).length;
    const stale = handlerCases.filter((caso) => daysWithoutMovement(caso) > INACTIVITY_ALERT_DAYS).length;
    const completeCalculations = handlerCases.filter((caso) => caso.estado === "Cálculo completo").length;
    return {
      handler,
      total: handlerCases.length,
      pendingDocumentCases,
      alerts,
      stale,
      coverage,
      completeCalculations
    };
  });
  const totals = rows.reduce(
    (sum, row) => ({
      total: sum.total + row.total,
      pendingDocumentCases: sum.pendingDocumentCases + row.pendingDocumentCases,
      alerts: sum.alerts + row.alerts,
      stale: sum.stale + row.stale,
      completeCalculations: sum.completeCalculations + row.completeCalculations
    }),
    { total: 0, pendingDocumentCases: 0, alerts: 0, stale: 0, completeCalculations: 0 }
  );
  const portfolioCoverage = visibleCases.length
    ? Math.round(
        visibleCases.reduce((sum, caso) => {
          const completeness = documentCompleteness(documentos.filter((doc) => doc.casoId === caso.id));
          return sum + (completeness.completed / completeness.total) * 100;
        }, 0) / visibleCases.length
      )
    : 0;

  return (
    <AppShell>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Benchmark operativo</p>
          <h2>Comparativa general por handler</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Vista gerencial para comparar carga, pendientes, riesgo y avance del portafolio visible.
          </p>
        </div>
        <Link className="button-secondary" to="/dashboard">
          <LayoutDashboard size={17} /> Ir al dashboard
        </Link>
        <button className="button-primary" type="button" onClick={() => exportCaseTrackingXlsx(visibleCases, documentos, calculosPerdida, bitacora, `seguimiento-portafolio-${new Date().toISOString().slice(0, 10)}.xlsx`)}>
          <Download size={17} /> Exportar Excel
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Metric title="Casos totales" value={totals.total} icon={<BarChart3 size={20} />} />
        <Metric title="Con docs pendientes" value={totals.pendingDocumentCases} icon={<FileText size={20} />} tone="warn" />
        <Metric title="Con alerta" value={totals.alerts} icon={<AlertTriangle size={20} />} tone="danger" />
        <Metric title="Sin movimiento" value={totals.stale} icon={<CalendarClock size={20} />} tone="warn" />
        <Metric title="Cálculo completo" value={totals.completeCalculations} icon={<Check size={20} />} />
      </div>

      <section className="panel mt-6">
        <div className="panel-title">
          <div>
            <h3>Indicadores por handler</h3>
            <p className="mt-1 text-sm font-normal text-slate-500">Cobertura documental promedio por caso y alertas activas según las reglas del Dashboard.</p>
          </div>
          <span>Cobertura portafolio: {portfolioCoverage}%</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[820px]">
            <thead>
              <tr>
                <th>Handler</th>
                <th>Casos</th>
                <th>Docs pendientes</th>
                <th>Alertas</th>
                <th>Sin movimiento</th>
                <th>Cobertura docs</th>
                <th>Cálculo completo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.handler}>
                  <td className="font-semibold">{row.handler}</td>
                  <td>{row.total}</td>
                  <td><StatusPill label={String(row.pendingDocumentCases)} tone={row.pendingDocumentCases > 0 ? "warn" : "ok"} /></td>
                  <td><StatusPill label={String(row.alerts)} tone={row.alerts > 0 ? "danger" : "ok"} /></td>
                  <td><StatusPill label={String(row.stale)} tone={row.stale > 0 ? "warn" : "ok"} /></td>
                  <td className="min-w-48">
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span>{row.coverage}%</span>
                      <span className="text-slate-400">promedio</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-accent" style={{ width: `${row.coverage}%` }} />
                    </div>
                  </td>
                  <td>{row.completeCalculations} / {row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="notice mt-4">
          Docs pendientes = al menos un documento del checklist faltante. Alerta = prescripción no verde o más de 15 días sin movimiento.
        </div>
      </section>
    </AppShell>
  );
}

function CasesPage() {
  const visibleCases = useVisibleCases();
  const { documentos, calculosPerdida, bitacora, usuario } = useDemoStore();
  const location = useLocation();
  const vesselGroup = new URLSearchParams(location.search).get("group") || "";
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todos");
  const filtered = visibleCases.filter((caso) => {
    const caseDocs = documentos.filter((documento) => documento.casoId === caso.id);
    const text = [
      caso.id,
      caso.assured,
      caso.opponent,
      caso.vessel,
      caso.claimHandler,
      caso.voyage,
      caso.cargo,
      ...caseDocs.flatMap((documento) => [documento.originalName, documento.nombreArchivo, documento.textoExtraido])
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return text.includes(query.toLowerCase()) && (status === "Todos" || caso.estado === status) && (!vesselGroup || vesselVoyageKey(caso) === vesselGroup);
  });
  return (
    <AppShell>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Lista de casos</p>
          <h2>{usuario.role === "Handler" ? "Mis casos" : usuario.role === "Inspector" ? "Casos asignados" : "Portafolio completo"}</h2>
          <p className="section-subtitle">Busca, filtra y entra al expediente para continuar el ciclo preclaim.</p>
        </div>
        {usuario.role === "Handler" && (
          <Link className="button-primary" to="/casos/nuevo">
            <Plus size={17} /> Nuevo caso
          </Link>
        )}
      </div>
      <div className="toolbar">
        <div className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={usuario.role === "Inspector" ? "Buscar por referencia o contenedor..." : "Buscar por referencia, asegurado, nave..."}
          />
        </div>
        <select className="input w-64" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option>Todos</option>
          {STATUS_LABELS.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <button className="button-secondary" type="button" onClick={() => exportCaseTrackingXlsx(filtered, documentos, calculosPerdida, bitacora, `seguimiento-casos-${new Date().toISOString().slice(0, 10)}.xlsx`)}>
          <Download size={16} /> Exportar Excel
        </button>
      </div>
      {vesselGroup && (
        <div className="notice mb-4" role="status">
          Filtro activo: casos de la misma nave y viaje. <Link className="text-link" to="/casos">Quitar filtro</Link>
        </div>
      )}
      <div className="panel overflow-hidden p-0">
        <table className="data-table">
          <thead>
            <tr>
              <th>Reference No</th>
              <th>Asegurado</th>
              <th>Oponente / nave</th>
              <th>Handler</th>
              <th>Prescripción</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((caso) => {
              const pres = prescriptionStatus(caso);
              return (
                <tr key={caso.id}>
                  <td>
                    <Link className="font-semibold text-accent" to={`/casos/${encodeURIComponent(caso.id)}`}>
                      {caso.id}
                    </Link>
                  </td>
                  <td>{caso.assured || "Sin asegurado"}</td>
                  <td>
                    {caso.opponent || "Sin oponente"}
                    <span className="block text-xs text-slate-500">{caso.vessel || "Sin nave"}</span>
                  </td>
                  <td>{caso.claimHandler}</td>
                  <td>
                    <StatusPill label={pres.label} tone={pres.tone} />
                  </td>
                  <td>
                    <StatusPill label={caso.estado} tone={caso.estado.includes("Traspasado") ? "ok" : caso.estado === "Datos incompletos" ? "missing" : "warn"} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState text="No hay casos para los filtros seleccionados." />}
      </div>
    </AppShell>
  );
}

function HistoricalMemoryPage() {
  const { historico, ultimaImportacionHistorico, historicoCargando, importHistoricalCases, hydrateHistoricalCases } = useDemoStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [selectedId, setSelectedId] = useState<string>();
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importNotice, setImportNotice] = useState("");
  const duplicateKeys = new Set(
    [...historico.reduce((counts, record) => counts.set(record.referenceKey, (counts.get(record.referenceKey) || 0) + 1), new Map<string, number>())]
      .filter(([, count]) => count > 1)
      .map(([referenceKey]) => referenceKey)
  );
  useEffect(() => {
    void hydrateHistoricalCases();
  }, [hydrateHistoricalCases]);
  const filtered = historico.filter((record) => {
    const haystack = [
      record.reference,
      record.claimHandler,
      record.assured,
      record.opponent,
      record.vessel,
      record.voyage,
      record.csClaimNo,
      record.incidentSummaryRaw,
      record.missingDocumentsRaw
    ].join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase()) && (category === "Todos" || record.category === category);
  });
  const selected = historico.find((record) => record.id === selectedId);
  const historicalCalculationCount = historico.filter((record) => record.calculoHistorico).length;

  const importFile = async (file?: File) => {
    if (!file) return;
    setIsImporting(true);
    setImportError("");
    setImportNotice("");
    try {
      const { historicalRecordKey, parseHistoryWorkbook } = await import("./lib/historyImport");
      const batch = await parseHistoryWorkbook(file);
      if (batch.records.length === 0) {
        setImportError("No se encontraron referencias de casos reconocibles en el archivo.");
        return;
      }
      const importedCount = await importHistoricalCases(batch, file);
      const firstRecordKey = historicalRecordKey(batch.records[0]);
      const selectedRecord = useDemoStore.getState().historico.find((record) => historicalRecordKey(record) === firstRecordKey);
      setSelectedId(selectedRecord?.id);
      setImportNotice(`${importedCount} registros históricos nuevos incorporados desde ${batch.sheets.filter((sheet) => sheet.importedRows > 0).length} hojas. ${importedCount < batch.records.length ? `${batch.records.length - importedCount} registros duplicados fueron omitidos. ` : ""}Los datos activos no fueron modificados.`);
    } catch {
      setImportError("No fue posible leer el Excel. Revisa que sea un archivo .xlsx o .xls válido.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <AppShell>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Memoria operativa</p>
          <h2>Historial de casos</h2>
          <p className="section-subtitle">Consulta los casos migrados sin mezclarlos con el trabajo activo. Cada registro conserva su origen y campos identificados, junto con el Excel fuente asociado.</p>
        </div>
        <label className="button-primary history-import-button">
          <FolderUp size={17} /> {isImporting ? "Procesando Excel..." : "Importar historial Excel"}
          <input type="file" accept=".xlsx,.xls" disabled={isImporting} onChange={(event) => importFile(event.target.files?.[0])} />
        </label>
        <button className="button-secondary" type="button" disabled={historico.length === 0} onClick={() => exportHistoricalMemoryXlsx(historico, `memoria-historica-${new Date().toISOString().slice(0, 10)}.xlsx`)}>
          <Download size={17} /> Descargar memoria
        </button>
      </div>

      {importError && <div className="form-error">{importError}</div>}
      {importNotice && <div className="notice mb-4">{importNotice}</div>}

      <section className="history-metrics">
        <Metric title="Registros históricos" value={historico.length} icon={<History size={20} />} />
        <Metric title="Referencias repetidas" value={duplicateKeys.size} icon={<AlertTriangle size={20} />} tone={duplicateKeys.size > 0 ? "warn" : "ok"} />
        <Metric title="Hojas importadas" value={ultimaImportacionHistorico?.sheets.filter((sheet) => sheet.importedRows > 0).length || 0} icon={<FileText size={20} />} />
        <Metric title="Con cálculo histórico" value={historicalCalculationCount} icon={<BarChart3 size={20} />} tone={historicalCalculationCount > 0 ? "ok" : undefined} />
      </section>

      <p className="history-memory-note">
        Los cálculos históricos son evidencia de referencia. El sistema no los convierte en una decisión automática para los casos activos.
      </p>

      <section className="history-layout mt-5">
        <div className="history-list-panel panel">
          <div className="panel-title">
            <div>
              <h3>Registros conservados</h3>
              <p className="panel-kicker">La memoria histórica no modifica los casos activos.</p>
            </div>
            <span>{historico.length} total</span>
          </div>
          <div className="toolbar history-toolbar">
            <div className="search-box">
              <Search size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar referencia, cliente, nave..." />
            </div>
            <select className="input history-category-filter" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option>Todos</option>
              {["Preclaim", "FIS", "Presentar", "Traspasado", "Descartado"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          {historicoCargando ? (
            <EmptyState text="Cargando memoria histórica..." />
          ) : historico.length === 0 ? (
            <EmptyState text="Importa el Excel histórico para crear la memoria consultable." />
          ) : (
            <div className="history-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Referencia</th>
                    <th>Asegurado</th>
                    <th>Nave / viaje</th>
                    <th>Handler</th>
                    <th>Origen</th>
                    <th>Clase</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((record) => (
                    <tr key={record.id} className={cx("history-row", selectedId === record.id && "selected")} onClick={() => setSelectedId(record.id)}>
                      <td>
                        <button type="button" className="history-record-button">
                          <strong>{record.reference}</strong>
                          {duplicateKeys.has(record.referenceKey) && <span>Referencia repetida</span>}
                        </button>
                      </td>
                      <td>{record.assured || "Sin dato"}</td>
                      <td>{record.vessel || "Sin nave"}<span className="block text-xs text-slate-500">{record.voyage || "Sin viaje"}</span></td>
                      <td>{record.claimHandler || "Sin asignar"}</td>
                      <td>{record.sourceSheet}<span className="block text-xs text-slate-500">Fila {record.sourceRow}</span></td>
                      <td><StatusPill label={record.category} tone={record.category === "Descartado" ? "missing" : record.category === "Traspasado" ? "ok" : "warn"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <EmptyState text="No hay registros para los filtros seleccionados." />}
            </div>
          )}
        </div>

        <HistoricalRecordDetail record={selected} duplicate={selected ? duplicateKeys.has(selected.referenceKey) : false} />
      </section>
    </AppShell>
  );
}

function HistoricalRecordDetail({ record, duplicate }: { record?: HistoricalCase; duplicate: boolean }) {
  if (!record) {
    return <section className="panel history-detail"><EmptyState text="Selecciona un registro para consultar su memoria original." /></section>;
  }
  return (
    <section className="panel history-detail">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Registro protegido</p>
          <h3>{record.reference}</h3>
        </div>
        <StatusPill label="Solo lectura" tone="missing" />
      </div>
      {duplicate && <div className="notice mb-4">Esta referencia aparece en más de una hoja o fila. Los registros se conservaron separados.</div>}
      <div className="history-detail-grid">
        <HistoricalValue label="Categoría" value={record.category} />
        <HistoricalValue label="Estado original" value={record.legacyStatus} />
        <HistoricalValue label="Handler" value={record.claimHandler} />
        <HistoricalValue label="CS Claim No" value={record.csClaimNo} />
        <HistoricalValue label="Asegurado" value={record.assured} />
        <HistoricalValue label="Oponente" value={record.opponent} />
        <HistoricalValue label="Nave / viaje" value={[record.vessel, record.voyage].filter(Boolean).join(" / ")} />
        <HistoricalValue label="Pérdida declarada" value={record.claimAmount !== undefined ? record.claimAmount.toLocaleString("es-CL") : undefined} />
        <HistoricalValue label="Carga" value={record.commodity} />
        <HistoricalValue label="Fecha de embarque" value={record.dateOfLoading} />
        <HistoricalValue label="Fecha de descarga" value={record.dateOfDischarge} />
        <HistoricalValue label="Inspector" value={record.surveyor} />
      </div>
      {record.calculoHistorico && <HistoricalCalculationDetail insight={record.calculoHistorico} />}
      <div className="history-detail-block">
        <strong>Documentos o pendientes registrados</strong>
        <p>{record.missingDocumentsRaw || "Sin detalle documental estructurado en la fuente."}</p>
      </div>
      <div className="history-detail-block">
        <strong>Resumen o incidente original</strong>
        <p>{record.incidentSummaryRaw || "Sin resumen registrado en la fuente."}</p>
      </div>
      <div className="history-source-note">
        Fuente: hoja <strong>{record.sourceSheet}</strong>, fila <strong>{record.sourceRow}</strong>. Importado el {new Date(record.importedAt).toLocaleString("es-CL")}. El archivo Excel original permanece asociado al lote de importación.
      </div>
      <details className="history-raw-details">
        <summary>Ver trazabilidad de la fila original</summary>
        <p className="history-source-note">Los valores completos se conservan en el archivo Excel asociado. Esta ficha muestra los campos identificados para consulta rápida, junto con la hoja y fila de origen.</p>
      </details>
    </section>
  );
}

function HistoricalCalculationDetail({ insight }: { insight: NonNullable<HistoricalCase["calculoHistorico"]> }) {
  return (
    <div className="history-detail-block">
      <div className="panel-title">
        <strong>Evidencia de cálculo histórico</strong>
        <StatusPill label={insight.confidence} tone={insight.confidence === "Completo" ? "ok" : insight.confidence === "Parcial" ? "warn" : "missing"} />
      </div>
      <div className="history-detail-grid">
        <HistoricalValue label="Método identificado" value={insight.method} />
        <HistoricalValue label="Fórmula observada" value={insight.formula} />
        <HistoricalValue label="Valor de referencia" value={insight.referenceValue !== undefined ? insight.referenceValue.toLocaleString("es-CL") : undefined} />
        <HistoricalValue label="Valor real / venta" value={insight.actualValue !== undefined ? insight.actualValue.toLocaleString("es-CL") : undefined} />
        <HistoricalValue label="Resultado reconstruido" value={insight.result !== undefined ? `${insight.result.toLocaleString("es-CL")}${insight.currency ? ` ${insight.currency}` : ""}` : undefined} />
        <HistoricalValue label="Tipo de cambio" value={insight.exchangeRate !== undefined ? insight.exchangeRate.toLocaleString("es-CL") : undefined} />
      </div>
      <p className="history-source-note">Campos fuente: {insight.sourceFields.join(", ")}{insight.note ? ` · ${insight.note}` : ""}</p>
    </div>
  );
}

function HistoricalValue({ label, value }: { label: string; value?: string }) {
  return <div className="history-value"><span>{label}</span><strong>{value || "Sin dato"}</strong></div>;
}

function NewCasePage() {
  const { usuario, casos, createCase, prepareUpload, confirmUpload } = useDemoStore();
  const navigate = useNavigate();
  const [input, setInput] = useState<NewCaseInput>({ claimHandler: usuario.nombre, dateOfDischargeType: "Real" });
  const [drafts, setDrafts] = useState<UploadDraft[]>([]);
  const [proposal, setProposal] = useState<ExtractedCaseData>();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState("");
  const [error, setError] = useState("");
  const hasData = Object.values(input).some(Boolean);
  if (usuario.role !== "Handler") return <Navigate to="/casos" replace />;

  const update = (key: keyof NewCaseInput, value: string) => {
    setInput((current) => ({
      ...current,
      [key]: key === "claimAmount" ? (value ? Number(value) : undefined) : value || undefined
    }));
  };
  const processFolder = async (files: FileList | File[]) => {
    if (files.length === 0) return;
    setProcessingError("");
    setIsProcessing(true);
    try {
      const processed = await processDocumentFiles(Array.from(files));
      const extracted = mergeExtractedData(processed, input.id || "");
      setDrafts(processed);
      setProposal(extracted);
      setInput((current) => ({
        ...current,
        id: current.id || extracted.referencia,
        claimHandler: suggestHandler(extracted.assured) || current.claimHandler || usuario.nombre,
        csClaimNo: current.csClaimNo || extracted.csClaimNo,
        assured: current.assured || extracted.assured,
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
    if (event.target.files) processFolder(event.target.files);
  };
  const onFolderDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    processFolder(event.dataTransfer.files);
  };
  const validateComplete = () => {
    if (!hasRequiredMinimum(input)) return "Completa handler, asegurado, oponente, nave, fecha de descarga y jurisdicción.";
    if (input.dateOfDischarge && input.dateOfDischarge > new Date().toISOString().slice(0, 10) && input.dateOfDischargeType !== "ETA") {
      return "La fecha efectiva de descarga no puede ser futura. Selecciona ETA si corresponde.";
    }
    if (input.claimAmount !== undefined && input.claimAmount <= 0) return "El monto reclamado debe ser positivo.";
    if (input.id && casos.some((caso) => caso.id === input.id)) return "La referencia ya existe en el expediente. Abre el caso existente o corrige la referencia antes de continuar.";
    return "";
  };
  const save = (complete: boolean) => {
    const validation = complete ? validateComplete() : "";
    if (validation) {
      setError(validation);
      return;
    }
    const caso = createCase(input, complete);
    if (drafts.length > 0) confirmUpload(caso.id, drafts);
    navigate(`/casos/${encodeURIComponent(caso.id)}?tab=documentos`);
  };

  return (
    <AppShell>
      <Link to="/casos" className="back-link">
        <ArrowLeft size={16} /> Volver a casos
      </Link>
      <form className="panel mt-4" onSubmit={(event) => event.preventDefault()}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Nuevo caso</p>
            <h2>Ingreso documental del caso</h2>
          </div>
          <StatusPill label="Carpeta + extracción asistida" tone="ok" />
        </div>
        {error && <div className="form-error">{error}</div>}
        <section className="new-case-intake">
          <div className="panel-title">
            <div>
              <h3>Carga la carpeta documental</h3>
              <p>El sistema leerá los archivos compatibles, identificará el caso y preparará una propuesta editable.</p>
            </div>
            {drafts.length > 0 && <span className="upload-count">{drafts.length} archivos</span>}
          </div>
          <label
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
              <small>También puedes seleccionar una carpeta completa</small>
            </span>
            <input type="file" multiple onChange={onFolderChange} {...({ webkitdirectory: "", directory: "" } as Record<string, string>)} />
          </label>
          {isProcessing && <p className="notice mt-3">Procesando documentos y preparando la propuesta...</p>}
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
            </div>
          )}
          {proposal && (
            <div className="extraction-review mt-5">
              <div className="panel-title">
                <div>
                  <h3>Propuesta detectada para revisión humana</h3>
                  <p>Los datos quedan editables y se guardan junto con la carpeta al continuar.</p>
                </div>
                <span>{proposal.referencia || "Referencia pendiente"}</span>
              </div>
              <div className="extraction-grid">
                <ExtractionValue label="Asegurado" value={input.assured} />
                <ExtractionValue label="Transportista / oponente" value={input.opponent} />
                <ExtractionValue label="Nave / viaje" value={[input.vessel, input.voyage].filter(Boolean).join(" / ")} />
                <ExtractionValue label="Carga" value={input.cargo} />
                <ExtractionValue label="Embarque" value={[input.placeOfShipment, input.dateOfShipment].filter(Boolean).join(" · ")} />
                <ExtractionValue label="Descarga" value={[input.placeOfDischarge, input.dateOfDischarge].filter(Boolean).join(" · ")} />
                <ExtractionValue label="Inspector" value={input.surveyor} />
                <ExtractionValue label="CS Claim No" value={input.csClaimNo} />
              </div>
              <p className="notice mt-3">Handler sugerido por cliente: <strong>{input.claimHandler}</strong>. Puedes modificarlo antes de guardar.</p>
              {proposal.propuestaPerdida && <LossProposalSummary proposal={proposal.propuestaPerdida} />}
            </div>
          )}
        </section>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Reference No editable">
            <input className="input" value={input.id || ""} onChange={(event) => update("id", event.target.value)} placeholder="Autogenerado si queda vacío" />
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
          <Field label="Asegurado *">
            <input className="input" value={input.assured || ""} onChange={(event) => update("assured", event.target.value)} />
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
          <Field label="Inspector">
            <input className="input" value={input.surveyor || ""} onChange={(event) => update("surveyor", event.target.value)} />
          </Field>
          <Field label="Monto reclamado">
            <input className="input" type="number" min="0" value={input.claimAmount || ""} onChange={(event) => update("claimAmount", event.target.value)} />
          </Field>
          <Field label="Jurisdicción *">
            <select className="input" value={input.jurisdiccion || ""} onChange={(event) => update("jurisdiccion", event.target.value as Jurisdiccion)}>
              <option value="">Seleccionar manualmente</option>
              <option value="LaHaya">La Haya · 1 año</option>
              <option value="Hamburgo">Hamburgo · 2 años Chile/Perú</option>
            </select>
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
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              if (!hasData || window.confirm("¿Seguro que quieres salir sin guardar?")) navigate("/casos");
            }}
          >
            <X size={17} /> Cancelar
          </button>
          <button type="button" className="button-secondary" onClick={() => save(false)}>
            <Save size={17} /> Guardar borrador
          </button>
          <button type="button" className="button-primary" onClick={() => save(true)}>
            <Check size={17} /> Guardar y continuar
          </button>
        </div>
      </form>
    </AppShell>
  );
}

function CaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const decodedId = decodeURIComponent(id || "");
  const { casos, documentos, calculosPerdida, bitacora, usuario, generateReviewReport, transitionCase, revertCase, updateCaseDetails, assignInspector } = useDemoStore();
  const caso = casos.find((item) => item.id === decodedId);
  const params = new URLSearchParams(window.location.search);
  const [tab, setTab] = useState(params.get("tab") || "documentos");
  const [showTransfer, setShowTransfer] = useState<"Traspasado a FIS" | "Traspasado a Lawgistic" | null>(null);
  const [revertReason, setRevertReason] = useState("");
  const [revertStatus, setRevertStatus] = useState<CaseStatus>("Preclaim");
  const [notice, setNotice] = useState("");
  const [isEditingCase, setIsEditingCase] = useState(false);
  const [editReference, setEditReference] = useState("");
  const [editDateOfDischarge, setEditDateOfDischarge] = useState("");
  const [editDateType, setEditDateType] = useState<DischargeDateType>("Real");
  const [editJurisdiccion, setEditJurisdiccion] = useState<Jurisdiccion | "">("");
  const [editError, setEditError] = useState("");
  const [inspectorDraft, setInspectorDraft] = useState(caso?.inspectorAsignado || "");
  const [inspectorNotice, setInspectorNotice] = useState("");
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
  const caseDocs = documentos.filter((doc) => doc.casoId === caso.id);
  const calculo = calculosPerdida.find((item) => item.casoId === caso.id);
  const events = bitacora.filter((event) => event.casoId === caso.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const pres = prescriptionStatus(caso);
  const staleDays = daysWithoutMovement(caso);
  const canWrite = usuario.role === "Handler" && caso.claimHandler === usuario.nombre;
  const isTransferred = caso.estado === "Traspasado a FIS" || caso.estado === "Traspasado a Lawgistic";
  const canMutateCase = canWrite && !isTransferred;
  const canEditCaseDetails = canMutateCase && canEditCalculation(caso);
  const nextStatus = nextStatusFromCase(caso, caseDocs, calculo);
  const canAdvance = nextStatus !== caso.estado;
  const isInspector = usuario.role === "Inspector";
  const activeTab = isInspector ? "inspeccion" : tab;

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
    transitionCase(caso.id, nextStatus, `Estado actualizado automáticamente a ${nextStatus}.`);
  };
  const openTransfer = (destination: TransferDestination) => {
    generateReviewReport(caso.id, destination);
    setShowTransfer(destination === "FIS" ? "Traspasado a FIS" : "Traspasado a Lawgistic");
  };
  const confirmTransfer = () => {
    if (!showTransfer) return;
    if (!caso.informeRevision?.ready) {
      setNotice("El traspaso está bloqueado: primero debes resolver las observaciones del informe de revisión.");
      setShowTransfer(null);
      return;
    }
    const destination = showTransfer.replace("Traspasado a ", "");
    transitionCase(
      caso.id,
      showTransfer,
      `Caso traspasado a ${destination}. Informe de revisión listo. Edición del expediente bloqueada.`
    );
    setShowTransfer(null);
  };
  const submitRevert = () => {
    const result = revertCase(caso.id, revertStatus, revertReason);
    setNotice(result.ok ? "Estado revertido y registrado en bitácora." : result.error || "No se pudo revertir.");
    if (result.ok) setRevertReason("");
  };
  const beginCaseEdit = () => {
    setEditReference(caso.id);
    setEditDateOfDischarge(caso.dateOfDischarge || "");
    setEditDateType(caso.dateOfDischargeType || "Real");
    setEditJurisdiccion(caso.jurisdiccion || "");
    setEditError("");
    setIsEditingCase(true);
  };
  const cancelCaseEdit = () => {
    setEditError("");
    setIsEditingCase(false);
  };
  const saveCaseDetails = () => {
    const nextReference = editReference.trim();
    const today = new Date().toISOString().slice(0, 10);
    if (!nextReference) {
      setEditError("La referencia interna es obligatoria.");
      return;
    }
    if (casos.some((item) => item.id !== caso.id && item.id.trim().toLocaleLowerCase() === nextReference.toLocaleLowerCase())) {
      setEditError("La referencia ya existe en otro caso.");
      return;
    }
    if (editDateOfDischarge && editDateOfDischarge > today && editDateType !== "ETA") {
      setEditError("La fecha efectiva no puede ser futura. Selecciona ETA si corresponde.");
      return;
    }
    const result = updateCaseDetails(caso.id, {
      id: nextReference,
      dateOfDischarge: editDateOfDischarge || undefined,
      dateOfDischargeType: editDateOfDischarge ? editDateType : undefined,
      jurisdiccion: editJurisdiccion || undefined
    });
    if (!result.ok) {
      setEditError(result.error || "No se pudieron guardar los cambios.");
      return;
    }
    setIsEditingCase(false);
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
            {staleDays > INACTIVITY_ALERT_DAYS && <StatusPill label={`${staleDays} días sin movimiento`} tone="warn" />}
          </div>
        </div>
        <div className="case-actions">
          {notice && <p className="notice">{notice}</p>}
          {staleDays > INACTIVITY_ALERT_DAYS && (
            <p className="notice" role="status">
              Aviso de gestión: este caso lleva más de {INACTIVITY_ALERT_DAYS} días sin movimiento. Registra una actualización para retirarlo.
            </p>
          )}
          {canEditCaseDetails && !isEditingCase && (
            <button className="button-secondary" onClick={beginCaseEdit}>
              <Pencil size={16} /> Editar datos clave
            </button>
          )}
          {canWrite && isTransferred && (
            <p className="notice">Caso traspasado: expediente en modo solo lectura. Gerencia puede revertir el estado si se requiere una corrección.</p>
          )}
          {usuario.role === "Handler" && !canWrite && (
            <p className="notice">
              Este caso está asignado a <strong>{caso.claimHandler}</strong>. Selecciona ese Handler para editarlo.
            </p>
          )}
          {usuario.role === "Inspector" && (
            <p className="notice">Caso asignado a <strong>{caso.inspectorAsignado}</strong>. Esta vista permite registrar la inspección.</p>
          )}
          {canMutateCase && (
            <>
              {caso.estado !== "Cálculo completo" ? (
                <button
                  className="button-primary"
                  onClick={actionPrimary}
                  disabled={!canAdvance}
                  title={canAdvance ? `Avanzar a ${nextStatus}` : "Completa los documentos y el cálculo antes de avanzar."}
                >
                  <Check size={17} /> {canAdvance ? `Avanzar a ${nextStatus}` : "Revisar pendientes"}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button className="button-primary" onClick={() => openTransfer("FIS")}>Traspasar a FIS</button>
                  <button className="button-secondary" onClick={() => openTransfer("Lawgistic")}>Traspasar a Lawgistic</button>
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
                {STATUS_LABELS.filter((status) => status !== caso.estado).map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
              <textarea className="input mt-2 min-h-20" value={revertReason} onChange={(event) => setRevertReason(event.target.value)} placeholder="Motivo obligatorio" />
              <button className="button-secondary mt-2 w-full" onClick={submitRevert}>
                <RefreshCcw size={16} /> Revertir estado
              </button>
            </div>
          )}
          {usuario.role === "Gerente" && (
            <div className="revert-box">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ClipboardCheck size={15} /> Asignación de inspección
              </div>
              <select className="input mt-2" value={inspectorDraft} onChange={(event) => setInspectorDraft(event.target.value)}>
                <option value="">Sin inspector asignado</option>
                {INSPECTORS.map((inspector) => <option key={inspector}>{inspector}</option>)}
              </select>
              <button className="button-secondary mt-2 w-full" onClick={saveInspectorAssignment}>
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
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Referencia interna *">
              <input className="input" value={editReference} onChange={(event) => setEditReference(event.target.value)} autoFocus />
            </Field>
            <Field label="Jurisdicción">
              <select className="input" value={editJurisdiccion} onChange={(event) => setEditJurisdiccion(event.target.value as Jurisdiccion | "")}>
                <option value="">Sin definir</option>
                <option value="LaHaya">La Haya · 1 año</option>
                <option value="Hamburgo">Hamburgo · 2 años Chile/Perú</option>
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
            <button className="button-secondary" onClick={cancelCaseEdit}><X size={16} /> Cancelar</button>
            <button className="button-primary" onClick={saveCaseDetails}><Save size={16} /> Guardar cambios</button>
          </div>
        </section>
      )}

      <div className="case-summary-grid">
        <CaseSummaryMetric
          label="Riesgo de prescripción"
          value={pres.label}
          detail={caso.fechaPrescripcion ? `${caso.dateOfDischargeType === "ETA" ? "Estimación según ETA · vence" : "Vence"} ${new Date(caso.fechaPrescripcion).toLocaleDateString("es-CL")}` : "Fecha o jurisdicción pendiente"}
          icon={<AlertTriangle size={19} />}
          tone={pres.tone === "danger" ? "danger" : pres.tone === "warn" ? "warn" : "ok"}
        />
        <CaseSummaryMetric
          label="Días sin movimiento"
          value={`${staleDays} días`}
          detail={`Último cambio ${new Date(caso.ultimaActualizacion).toLocaleDateString("es-CL")}`}
          icon={<CalendarClock size={19} />}
          tone={staleDays > INACTIVITY_ALERT_DAYS ? "warn" : "ok"}
        />
        <CaseSummaryMetric
          label="Recupero estimado"
          value={calculo?.montoFinalReclamo !== undefined ? currency(calculo.montoFinalReclamo, calculo.moneda) : "Sin cálculo"}
          detail={calculo?.metodoSeleccionado ? `Método ${calculo.metodoSeleccionado} seleccionado` : "Pendiente de cálculo"}
          icon={<BarChart3 size={19} />}
          tone="ok"
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
            Revisa el informe antes de confirmar. El traspaso es simulado y bloqueará la edición de todo el expediente.
          </p>
          {caso.informeRevision && <ReviewReportContent report={caso.informeRevision} compact />}
          {caso.informeRevision && !caso.informeRevision.ready && (
            <div className="form-error mt-4" role="alert">
              Traspaso bloqueado: resuelve las {caso.informeRevision.pendingActions.length} observaciones del informe antes de derivar el caso.
            </div>
          )}
          <div className="mt-5 flex justify-end gap-3">
            <button className="button-secondary" onClick={() => setShowTransfer(null)}>Cancelar</button>
            {caso.informeRevision && (
              <>
                <button
                  className="button-secondary"
                  onClick={() => downloadTextFile(`${caso.id}_informe_revision.txt`, buildReviewReportText(caso.informeRevision!))}
                >
                  <Download size={16} /> Descargar informe
                </button>
                <button className="button-primary" disabled={!caso.informeRevision.ready} onClick={confirmTransfer} title={caso.informeRevision.ready ? "Confirmar traspaso" : "Resuelve las observaciones antes de traspasar"}>
                  <Check size={16} /> Confirmar traspaso
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
        ].filter(([, key]) => !isInspector || key === "Inspección").concat((usuario.role === "Inspector" || usuario.role === "Gerente") ? [["inspeccion", "Inspección", <ClipboardCheck size={16} key="i" />] as const] : []).map(([key, label, icon]) => (
          <button key={String(key)} className={cx("tab", activeTab === key && "active")} onClick={() => changeTab(String(key))}>
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
      {(isInspector || usuario.role === "Gerente") && activeTab === "inspeccion" && <InspectionTab caso={caso} canWrite={isInspector && !isTransferred} />}
    </AppShell>
  );
}

function CaseSummaryMetric({
  label,
  value,
  detail,
  icon,
  tone
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone: "ok" | "warn" | "danger";
}) {
  return (
    <div className={cx("case-summary-metric", tone)}>
      <div className="case-summary-heading">
        <span>{label}</span>
        <div className="case-summary-icon">{icon}</div>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  );
}

function ExtractionValue({ label, value }: { label: string; value?: string }) {
  return (
    <div className="extraction-value">
      <span>{label}</span>
      <strong>{value || "No detectado"}</strong>
    </div>
  );
}

function LossProposalSummary({ proposal }: { proposal: ExtractedLossProposal }) {
  const methods = [
    {
      label: "Embarque comparable",
      reference: proposal.metodo1_liquidacionComparativa,
      actual: proposal.metodo1_liquidacionReal
    },
    {
      label: "Reporte de mercado",
      reference: proposal.metodo2_valorReporteMercado,
      actual: proposal.metodo2_liquidacionReal
    },
    {
      label: "Factura vs. venta destino",
      reference: proposal.metodo3_valorFactura,
      actual: proposal.metodo3_ventaBrutaDestino
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
            <small>{method.reference !== undefined ? `Base ${currency(method.reference, proposal.moneda)}` : "Base pendiente"}</small>
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

function DocumentsTab({ caso, docs, canWrite }: { caso: Caso; docs: ReturnType<typeof useDemoStore.getState>["documentos"]; canWrite: boolean }) {
  const { prepareUpload, confirmUpload, removeDocument, updateCase } = useDemoStore();
  const [drafts, setDrafts] = useState<UploadDraft[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState("");
  const [extractionProposal, setExtractionProposal] = useState<ExtractedCaseData>();
  const [reviewSummary, setReviewSummary] = useState("");
  const [reviewCause, setReviewCause] = useState("");
  const [reviewType, setReviewType] = useState("");
  const [extractionApplied, setExtractionApplied] = useState(false);
  const completeness = documentCompleteness(docs);
  const grouped = DOCUMENT_TYPES.map((type) => ({ type, docs: docs.filter((doc) => doc.tipoDocumento === type && doc.disponible) }));
  const addFiles = async (files: FileList | File[]) => {
    if (files.length === 0) return;
    setProcessingError("");
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
    if (event.target.files) addFiles(event.target.files);
  };
  const onDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (canWrite) setIsDragging(true);
  };
  const onDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (canWrite) addFiles(event.dataTransfer.files);
  };
  const applyExtraction = () => {
    if (!canWrite || !extractionProposal) return;
    const patch: Partial<Caso> = {
      csClaimNo: extractionProposal.csClaimNo,
      assured: extractionProposal.assured,
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
      propuestaPerdida: extractionProposal.propuestaPerdida
    };
    if (extractionProposal.causaPotencial?.toLowerCase().includes("térmica")) patch.causaDano = "Temperatura";
    updateCase(caso.id, Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as Partial<Caso>);
    setExtractionApplied(true);
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
                <button
                  className="button-primary"
                  disabled={drafts.length === 0}
                  onClick={() => {
                    confirmUpload(caso.id, drafts);
                    setDrafts([]);
                  }}
                >
                  <Check size={17} /> Confirmar carga
                </button>
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
        {docs.length === 0 && <EmptyState text="Carga al menos un documento para continuar el caso." />}
        <div className="mt-5 space-y-2">
          {docs.map((doc) => (
            <div className="doc-row" key={doc.id}>
              <FileText size={17} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{doc.nombreArchivo}</p>
                <p className="text-xs text-slate-500">{doc.tipoDocumento} · {doc.pathMock}</p>
              </div>
              {canWrite && (
                <button
                  className="icon-button"
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
          <h3>Checklist documental</h3>
          <span>{completeness.completed}/{completeness.total}</span>
        </div>
        <div className="checklist-grid">
          {grouped.map((item) => (
            <div key={item.type} className={cx("check-item", item.docs.length > 0 && "done")}>
              {item.docs.length > 0 ? <Check size={16} /> : <AlertTriangle size={16} />}
              <div>
                <p>{item.type}</p>
                {item.docs.length > 1 && <span>{item.docs.length} archivos</span>}
              </div>
            </div>
          ))}
        </div>
        <MissingDocsText caso={caso} missing={completeness.missing} />
      </div>
    </section>
  );
}

function MissingDocsText({ caso, missing }: { caso: Caso; missing: DocumentType[] }) {
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">("idle");
  const text =
    missing.length === 0
      ? `Caso ${caso.id}: documentación completa para revisión preclaim.`
      : `Caso ${caso.id}: favor remitir los siguientes documentos pendientes para continuar el análisis preclaim:\n\n${missing.map((item) => `- ${item}`).join("\n")}`;
  const copy = async () => {
    const copied = await copyText(text);
    setCopyState(copied ? "success" : "error");
  };
  return (
    <div className="mt-5 rounded-md border border-line bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <strong>Texto para solicitar faltantes</strong>
        <button className="button-secondary small" onClick={copy}>
          <Copy size={15} /> {copyState === "success" ? "Copiado" : "Copiar"}
        </button>
      </div>
      {copyState === "error" && <p className="form-error mb-3">No fue posible copiar automáticamente. Selecciona el texto y cópialo manualmente.</p>}
      <pre className="whitespace-pre-wrap text-sm text-slate-700">{text}</pre>
    </div>
  );
}

function AnalysisTab({ caso, docs, canWrite }: { caso: Caso; docs: ReturnType<typeof useDemoStore.getState>["documentos"]; canWrite: boolean }) {
  const { saveAnalysis, usuario } = useDemoStore();
  const hasThermograph = docs.some((doc) => doc.tipoDocumento === "Registros de termógrafos" && doc.disponible);
  const applies = caso.causaDano?.toLowerCase() === "temperatura" && hasThermograph;
  const [registered, setRegistered] = useState(caso.analisisCausa?.temperaturaRegistrada?.toString() || "");
  const [min, setMin] = useState(caso.analisisCausa?.rangoMinimo?.toString() || "");
  const [max, setMax] = useState(caso.analisisCausa?.rangoMaximo?.toString() || "");
  const [conclusion, setConclusion] = useState(caso.analisisCausa?.conclusionFinal || "");
  const suggestion = applies && registered && min && max ? suggestDamageMerit(Number(registered), Number(min), Number(max)) : undefined;
  const suggestedText = suggestion
    ? `Desviación de ${Math.abs(suggestion.deviation).toFixed(1)}° sobre lo requerido — mérito sugerido: ${suggestion.meritoSugerido}.`
    : "";
  const save = () => {
    if (conclusion.trim().length < 10) return;
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
  };
  return (
    <section className="panel">
      <div className="panel-title">
        <h3>Análisis de causa de daño</h3>
        <span>Confirmación humana obligatoria</span>
      </div>
      {!canWrite && <ReadonlyBanner />}
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
            <button className="button-secondary small mt-3" onClick={() => setConclusion(suggestedText)}>
              Usar como base editable
            </button>
          )}
        </div>
      )}
      <Field label="Conclusión final del handler">
        <textarea className="input min-h-36" disabled={!canWrite} value={conclusion} onChange={(event) => setConclusion(event.target.value)} placeholder="El handler debe confirmar o escribir la conclusión final." />
      </Field>
      {canWrite && (
        <button className="button-primary mt-4" disabled={conclusion.trim().length < 10} onClick={save}>
          <Save size={17} /> Confirmar análisis
        </button>
      )}
    </section>
  );
}

function CalculationTab({ caso, calculo, canWrite }: { caso: Caso; calculo?: CalculoPerdida; canWrite: boolean }) {
  const { saveCalculation, calculationMethods } = useDemoStore();
  const [form, setForm] = useState<CalculoPerdida>(
    calculo || {
      casoId: caso.id,
      moneda: "USD",
      monedaOrigen: "USD",
      tipoCambioFecha: new Date().toISOString().slice(0, 10),
      rubrosAdicionales: [],
      ventaAFirme: false,
      updatedAt: new Date().toISOString()
    }
  );
  const [error, setError] = useState("");
  const computed = useMemo(() => calculateLoss(form), [form]);
  const updateNumber = (key: keyof CalculoPerdida, value: string) => {
    setForm((current) => ({ ...current, [key]: value === "" ? undefined : Number(value) }));
  };
  const updateRubro = (index: number, patch: Partial<RubroAdicional>) => {
    setForm((current) => ({
      ...current,
      rubrosAdicionales: current.rubrosAdicionales.map((rubro, itemIndex) => (itemIndex === index ? { ...rubro, ...patch } : rubro))
    }));
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    const result = saveCalculation(computed);
    setError(result.ok ? "" : result.error || "No se pudo guardar.");
  };
  const loadProposal = () => {
    if (!caso.propuestaPerdida || !canWrite) return;
    setForm((current) => ({
      ...current,
      moneda: caso.propuestaPerdida?.moneda || current.moneda,
      monedaOrigen: caso.propuestaPerdida?.monedaOrigen || caso.propuestaPerdida?.moneda || current.monedaOrigen || current.moneda,
      tipoCambio: caso.propuestaPerdida?.tipoCambio,
      tipoCambioFecha: caso.propuestaPerdida?.tipoCambioFecha || current.tipoCambioFecha || new Date().toISOString().slice(0, 10),
      tipoCambioFuente: caso.propuestaPerdida?.tipoCambioFuente || current.tipoCambioFuente,
      metodo1_liquidacionReal: caso.propuestaPerdida?.metodo1_liquidacionReal,
      metodo1_liquidacionComparativa: caso.propuestaPerdida?.metodo1_liquidacionComparativa,
      metodo2_valorReporteMercado: caso.propuestaPerdida?.metodo2_valorReporteMercado,
      metodo2_liquidacionReal: caso.propuestaPerdida?.metodo2_liquidacionReal,
      metodo3_valorFactura: caso.propuestaPerdida?.metodo3_valorFactura,
      metodo3_ventaBrutaDestino: caso.propuestaPerdida?.metodo3_ventaBrutaDestino,
      rubrosAdicionales: caso.propuestaPerdida?.rubrosAdicionales || [],
      fuentes: caso.propuestaPerdida?.fuentes || [],
      metodoSeleccionado: undefined,
      justificacionSeleccion: ""
    }));
  };
  const methods = [
    { id: "1" as const, fallbackTitle: "Método 1 · Embarque comparable", result: computed.metodo1_resultado, fallbackFormula: "liquidación comparativa - liquidación real" },
    { id: "2" as const, fallbackTitle: "Método 2 · Reporte de mercado", result: computed.metodo2_resultado, fallbackFormula: "valor reporte mercado - liquidación real" },
    { id: "3" as const, fallbackTitle: "Método 3 · Factura vs. venta", result: computed.metodo3_resultado, fallbackFormula: "valor factura exportación - venta destino" }
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
        {!canWrite && <ReadonlyBanner text={caso.estado.includes("Traspasado") ? "El caso fue traspasado; la edición de todo el expediente está bloqueada." : undefined} />}
        <div className="notice">
          Cada resultado es una recomendación preliminar. Antes de guardar, verifica los valores y el documento que sustenta el método elegido.
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
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Moneda de origen">
            <select className="input" disabled={!canWrite} value={form.monedaOrigen || form.moneda} onChange={(event) => setForm((current) => ({ ...current, monedaOrigen: event.target.value as CurrencyCode }))}>
              <option value="USD">USD · dólar estadounidense</option>
              <option value="CLP">CLP · peso chileno</option>
              <option value="EUR">EUR · euro</option>
            </select>
          </Field>
          <Field label="Moneda de cálculo">
            <select className="input" disabled={!canWrite} value={form.moneda} onChange={(event) => setForm((current) => ({ ...current, moneda: event.target.value as CurrencyCode }))}>
              <option value="USD">USD · dólar estadounidense</option>
              <option value="CLP">CLP · peso chileno</option>
              <option value="EUR">EUR · euro</option>
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
                <input className="input" disabled={!canWrite} type="date" value={form.tipoCambioFecha || ""} onChange={(event) => setForm((current) => ({ ...current, tipoCambioFecha: event.target.value }))} />
              </Field>
              <Field label="Fuente o criterio">
                <input className="input" disabled={!canWrite} value={form.tipoCambioFuente || ""} onChange={(event) => setForm((current) => ({ ...current, tipoCambioFuente: event.target.value }))} placeholder="Ej. Banco Central / tasa configurada" />
              </Field>
            </div>
            <p className="notice mt-3">Los valores de respaldo se ingresan en {form.monedaOrigen} y los resultados se muestran en {form.moneda}. La conversión se aplica antes de comparar.</p>
          </div>
        )}
        {form.monedaOrigen === form.moneda && <p className="notice mt-3">Los valores de respaldo y el resultado están expresados en {form.moneda}; no se requiere conversión.</p>}
        {form.fuentes && form.fuentes.length > 0 && <p className="history-source-note">Valores cargados desde: {form.fuentes.join(", ")}</p>}
      </div>

      {form.ventaAFirme ? (
        <div className="panel">
          <Field label="Valor nota de crédito">
            <input className="input" disabled={!canWrite} type="number" value={form.notaCreditoValor || ""} onChange={(event) => updateNumber("notaCreditoValor", event.target.value)} placeholder={`Monto en ${form.monedaOrigen || form.moneda}`} />
          </Field>
          <FinalClaim value={computed.montoFinalReclamo} moneda={form.moneda} />
        </div>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-3">
            <MethodInputs title={calculationMethods.find((method) => method.id === "1")?.title || "Método 1 · Embarque comparable"}>
              <NumberField label={`Liquidación real (${form.monedaOrigen || form.moneda})`} disabled={!canWrite} value={form.metodo1_liquidacionReal} onChange={(value) => updateNumber("metodo1_liquidacionReal", value)} />
              <NumberField label={`Liquidación comparativa (${form.monedaOrigen || form.moneda})`} disabled={!canWrite} value={form.metodo1_liquidacionComparativa} onChange={(value) => updateNumber("metodo1_liquidacionComparativa", value)} />
            </MethodInputs>
            <MethodInputs title={calculationMethods.find((method) => method.id === "2")?.title || "Método 2 · Reporte de mercado"}>
              <NumberField label={`Valor reporte mercado (${form.monedaOrigen || form.moneda})`} disabled={!canWrite} value={form.metodo2_valorReporteMercado} onChange={(value) => updateNumber("metodo2_valorReporteMercado", value)} />
              <NumberField label={`Liquidación real (${form.monedaOrigen || form.moneda})`} disabled={!canWrite} value={form.metodo2_liquidacionReal} onChange={(value) => updateNumber("metodo2_liquidacionReal", value)} />
            </MethodInputs>
            <MethodInputs title={calculationMethods.find((method) => method.id === "3")?.title || "Método 3 · Factura vs. venta"}>
              <NumberField label={`Valor factura exportación (${form.monedaOrigen || form.moneda})`} disabled={!canWrite} value={form.metodo3_valorFactura} onChange={(value) => updateNumber("metodo3_valorFactura", value)} />
              <NumberField label={`Venta bruta destino (${form.monedaOrigen || form.moneda})`} disabled={!canWrite} value={form.metodo3_ventaBrutaDestino} onChange={(value) => updateNumber("metodo3_ventaBrutaDestino", value)} />
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
          <h3>Rubros adicionales y justificación</h3>
        </div>
        <div className="space-y-3">
          {form.rubrosAdicionales.map((rubro, index) => (
            <div className="grid gap-3 md:grid-cols-[1fr_180px_44px]" key={index}>
              <input className="input" disabled={!canWrite} value={rubro.concepto} onChange={(event) => updateRubro(index, { concepto: event.target.value })} placeholder="Concepto" />
              <input className="input" disabled={!canWrite} type="number" value={rubro.monto} onChange={(event) => updateRubro(index, { monto: Number(event.target.value) })} />
              {canWrite && (
                <button type="button" className="icon-button" onClick={() => setForm((current) => ({ ...current, rubrosAdicionales: current.rubrosAdicionales.filter((_, itemIndex) => itemIndex !== index) }))}>
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
          {canWrite && (
            <button type="button" className="button-secondary small" onClick={() => setForm((current) => ({ ...current, rubrosAdicionales: [...current.rubrosAdicionales, { concepto: "", monto: 0 }] }))}>
              <Plus size={15} /> Agregar rubro
            </button>
          )}
        </div>
        {!form.ventaAFirme && (
          <Field label="Justificación del método seleccionado">
            <textarea className="input min-h-28" disabled={!canWrite} value={form.justificacionSeleccion || ""} onChange={(event) => setForm((current) => ({ ...current, justificacionSeleccion: event.target.value }))} />
          </Field>
        )}
        <FinalClaim value={computed.montoFinalReclamo} moneda={form.moneda} />
        {canWrite && (
          <button className="button-primary mt-4" type="submit">
            <Save size={17} /> Guardar cálculo auditable
          </button>
        )}
      </div>
    </form>
  );
}

function MethodInputs({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel">
      <h3 className="mb-4 font-semibold">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function NumberField({ label, value, disabled, onChange }: { label: string; value?: number; disabled?: boolean; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <input className="input" disabled={disabled} type="number" value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

function FinalClaim({ value, moneda }: { value?: number; moneda: CurrencyCode }) {
  return (
    <div className="final-claim">
      <span>Monto final a reclamar</span>
      <strong>{currency(value, moneda)}</strong>
    </div>
  );
}

function ReviewReportTab({
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
          {report && (
            <button className="button-secondary" type="button" onClick={download}>
              <Download size={17} /> Descargar
            </button>
          )}
          <button className="button-secondary" type="button" onClick={exportCase}>
            <Download size={17} /> Exportar Excel
          </button>
        </div>
      </section>

      {report ? (
        <ReviewReportContent report={report} />
      ) : (
        <section className="panel review-report-empty">
          <FileCheck2 size={28} />
          <strong>Aún no hay un informe generado</strong>
          <p>Selecciona el destino y genera el informe para dejar registrada la revisión previa al traspaso.</p>
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

function ReviewReportContent({ report, compact = false }: { report: ReviewReport; compact?: boolean }) {
  const availableCount = report.availableDocuments.length;
  const pendingCount = report.pendingActions.length;
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

function HistoryTab({ events }: { events: ReturnType<typeof useDemoStore.getState>["bitacora"] }) {
  return (
    <section className="panel">
      <div className="panel-title">
        <h3>Bitácora no editable</h3>
        <span>{events.length} eventos</span>
      </div>
      <div className="timeline">
        {events.map((event) => (
          <div className="timeline-event" key={event.id}>
            <div className="timeline-dot" />
            <div>
              <p className="font-semibold">{event.detalle}</p>
              <p className="text-sm text-slate-500">
                {new Date(event.timestamp).toLocaleString("es-CL")} · {event.usuario} · {event.tipoEvento}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function InspectionTab({ caso, canWrite }: { caso: Caso; canWrite: boolean }) {
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

function LettersTab({ caso, docs, canWrite }: { caso: Caso; docs: ReturnType<typeof useDemoStore.getState>["documentos"]; canWrite: boolean }) {
  const { registerLetter, calculosPerdida, templateConfigs } = useDemoStore();
  const calculo = calculosPerdida.find((item) => item.casoId === caso.id);
  const configuredTemplates = LETTER_TEMPLATES.map((item) => getLetterTemplate(item.id, templateConfigs));
  const firstActiveTemplate = configuredTemplates.find((item) => item.active) || configuredTemplates[0];
  const [templateId, setTemplateId] = useState<LetterTemplateId>(firstActiveTemplate.id);
  const [text, setText] = useState(() => buildLetterTemplate(firstActiveTemplate.id, { caso, docs, calculo }, templateConfigs));
  const template = getLetterTemplate(templateId, templateConfigs);
  const conflicts = templateConflicts({ caso, docs, calculo });
  const context = { caso, docs, calculo };
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">("idle");

  const changeTemplate = (nextId: LetterTemplateId) => {
    const nextTemplate = getLetterTemplate(nextId, templateConfigs);
    if (!nextTemplate.active) return;
    setTemplateId(nextId);
    setText(buildLetterTemplate(nextId, context, templateConfigs));
  };
  const resetTemplate = () => setText(buildLetterTemplate(templateId, context, templateConfigs));
  const copy = async () => {
    const copied = await copyText(text);
    setCopyState(copied ? "success" : "error");
    if (copied) registerLetter(caso.id, `${template.title} copiado al portapapeles.`);
  };
  const download = () => {
    const safeId = caso.id.replace(/[^\w-]+/g, "-");
    downloadHtmlFile(`${safeId}_${template.shortTitle.replace(/\s+/g, "_").toLowerCase()}.html`, buildPrintableHtml(template, text));
    registerLetter(caso.id, `${template.title} descargado como documento imprimible.`);
  };
  const print = () => {
    if (printHtmlFile(buildPrintableHtml(template, text))) {
      registerLetter(caso.id, `${template.title} enviado a impresión / guardado como PDF.`);
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
        {!template.active && <div className="notice template-inactive">Este template está inactivo en el mantenedor y no puede seleccionarse para nuevas generaciones.</div>}
        <div className="template-fields">
          <span>Campos parametrizados</span>
          <div>{template.fields.map((field) => <small key={field}>{field}</small>)}</div>
        </div>
        {conflicts.length > 0 && (
          <div className="form-error template-conflicts">
            <strong>Revisión requerida</strong>
            {conflicts.map((conflict) => <span key={conflict}>{conflict}</span>)}
            <small>El sistema usa el primer valor detectado hasta que el handler lo corrija.</small>
          </div>
        )}
        <div className="template-editor-heading">
          <div>
            <strong>Contenido editable</strong>
            <small>Los campos pendientes deben completarse antes de usar el documento.</small>
          </div>
          {canWrite && <button type="button" className="button-secondary small" onClick={resetTemplate}><RefreshCcw size={15} /> Restablecer base</button>}
        </div>
        <textarea className="input template-editor" disabled={!canWrite} value={text} onChange={(event) => setText(event.target.value)} />
        {copyState === "error" && <p className="form-error mt-3">No fue posible copiar automáticamente. Selecciona el contenido y cópialo manualmente.</p>}
        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <button className="button-secondary" type="button" onClick={copy}><Copy size={17} /> {copyState === "success" ? "Copiado" : "Copiar"}</button>
          <button className="button-secondary" type="button" onClick={print}><FileCheck2 size={17} /> Imprimir / PDF</button>
          <button className="button-primary" type="button" onClick={download}><Download size={17} /> Descargar documento</button>
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
        <TemplatePreview text={text} />
      </div>
    </section>
  );
}

function TemplatePreview({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <article className="template-preview-sheet">
      <header className="template-preview-brand">
        <span className="template-preview-mark">IP</span>
        <span><strong>FRUIT INSURANCE SERVICES</strong><small>CHILE · EST. 2015</small></span>
      </header>
      <div className="template-preview-copy">
        {blocks.map((block, index) => <p key={`${index}-${block.slice(0, 20)}`}>{block.split("\n").map((line, lineIndex) => <span key={`${lineIndex}-${line.slice(0, 12)}`}>{line}{lineIndex < block.split("\n").length - 1 && <br />}</span>)}</p>)}
      </div>
      <footer>Intervent Preclaim · Documento generado para revisión humana</footer>
    </article>
  );
}

function MaintainersPage() {
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
    updateTemplateConfig(draft.id, {
      title: draft.title.trim(),
      shortTitle: draft.shortTitle.trim(),
      description: draft.description.trim(),
      language: draft.language.trim() || "English",
      baseContent: draft.baseContent,
      active: draft.active
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

function ManualPage() {
  const { usuario } = useDemoStore();
  const modules = [
    {
      title: "1. Selector de rol",
      body:
        "Permite entrar como Handler, Gerente, CEO o Inspector. El rol cambia los permisos y el alcance de datos: Handler ve sus casos; Gerente y CEO ven todo el portafolio; Inspector solo ve los casos que le fueron asignados."
    },
    {
      title: "2. Dashboard",
      body:
        "Muestra totales de casos, alertas activas, casos sin movimiento y documentos cargados. En vista Gerente/CEO incluye filtro por handler y distribución por estado."
    },
    {
      title: "3. Lista de casos",
      body:
        "Centraliza todos los casos visibles para el rol. Permite buscar por reference, asegurado, oponente, nave o handler, y filtrar por estado."
    },
    {
      title: "4. Nuevo caso",
      body:
        "Puedes iniciar el caso cargando una carpeta documental o completando el formulario. La carpeta propone referencia, handler, datos del embarque, tipo de caso, resumen y causa; el handler revisa y corrige antes de guardar."
    },
    {
      title: "5. Documentos y checklist",
      body:
        "Permite cargar múltiples archivos o una carpeta, leer contenido compatible, ejecutar OCR bajo demanda para PDFs escaneados, sugerir tipo documental y extraer datos para revisión humana. La carga de una carpeta completa evita duplicar entradas ya presentes en el expediente. Nunca guarda binarios ni base64."
    },
    {
      title: "6. Análisis de causa de daño",
      body:
        "Si la causa es Temperatura y existe termógrafo, calcula desviación frente al rango exigido y sugiere mérito Alto, Medio o Bajo. La conclusión final siempre requiere confirmación humana."
    },
    {
      title: "7. Cálculo de pérdida",
      body:
        "Muestra tres métodos en paralelo: SMV, Reporte de mercado y Factura vs. venta bruta. Si los documentos contienen valores comparables, presenta una propuesta preliminar con fuentes para cargarla como base editable. Permite venta a firme, rubros adicionales y exige justificación mínima para guardar un método seleccionado."
    },
    {
      title: "8. Seguimiento e historial",
      body:
        "Registra cambios de estado, documentos, cálculos, cartas y reversiones con timestamp automático no editable. La reversión de estado solo está disponible para Gerente con motivo obligatorio."
    },
    {
      title: "9. Alertas de prescripción",
      body:
        `Calcula fecha de prescripción solo si existen fecha de descarga y jurisdicción explícita. Usa semáforo verde, ámbar o rojo y muestra un aviso persistente cuando un caso lleva más de ${INACTIVITY_ALERT_DAYS} días sin movimiento.`
    },
    {
      title: "10. Cartas automatizadas",
      body:
        "Permite seleccionar Claim Notice, AoR, Harvest o LoA, completar sus campos parametrizados, editar el contenido, copiarlo y descargar un documento listo para imprimir."
    },
    {
      title: "11. Mantenedores",
      body:
        "Gerente puede activar o desactivar métodos de cálculo, ajustar sus nombres y descripciones, y editar el contenido base de los cuatro templates contractuales. La fórmula matemática queda protegida y toda generación sigue requiriendo revisión humana."
    },
    {
      title: "12. Benchmark por handler",
      body:
        "Vista gerencial que compara por handler los casos totales, documentación pendiente, alertas activas, casos sin movimiento, cobertura documental promedio y cálculos completos. El dashboard también agrupa naves y viajes con dos o más casos y permite abrir el conjunto relacionado."
    },
    {
      title: "13. Informe de revisión y traspaso",
      body:
        "Desde la pestaña Informe, el handler selecciona FIS para recupero extrajudicial o Lawgistic para recupero judicial y genera un resumen con documentación disponible y pendiente, causa propuesta, mérito preliminar y cálculo seleccionado. El informe queda en el historial, se puede descargar y debe revisarse antes de confirmar el traspaso. Si existen observaciones, el traspaso queda bloqueado hasta resolverlas."
    },
    {
      title: "14. Memoria histórica",
      body:
        "La memoria se precarga automáticamente con el historial incluido en el demo. También permite importar otro Excel si se necesita ampliar la historia. Conserva los registros reconocibles, su hoja, fila, campos identificados y referencias repetidas. La memoria se puede buscar y filtrar, pero no modifica los casos activos ni permite editar directamente el registro histórico."
    },
    {
      title: "15. Operación de inspección",
      body:
        "El perfil Inspector solo visualiza los casos que Gerente le haya asignado. Dentro de la pestaña Inspección puede registrar fecha, indicar si participará la naviera, escribir observaciones y descargar la Carta JSI. Gerente administra la asignación desde la ficha del caso."
    }
  ];
  const roleGuides = [
    {
      role: "Handler",
      guide:
        "Crear casos, cargar documentos, confirmar análisis, guardar cálculos, avanzar estados y generar cartas para sus propios casos."
    },
    {
      role: "Gerente",
      guide:
        "Supervisar todos los casos, comparar desempeño por handler, filtrar alertas, revertir estados con motivo obligatorio y administrar los mantenedores."
    },
    {
      role: "CEO",
      guide:
        "Revisar el portafolio completo, comparar indicadores por handler, riesgos de prescripción y estado ejecutivo sin editar documentos ni cálculos."
    },
    {
      role: "Inspector",
      guide:
        "Buscar y revisar solo casos asignados, registrar antecedentes de inspección y descargar la Carta JSI. No puede crear casos, editar documentos ni modificar cálculos."
    }
  ];
  return (
    <AppShell>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Manual de usuario</p>
          <h2>Guía funcional del demo</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Esta pantalla describe todas las funcionalidades disponibles y el recorrido recomendado para probar el sistema. Rol actual:{" "}
            <strong>{usuario.role}</strong>.
          </p>
        </div>
        <Link className="button-primary" to="/dashboard">
          <LayoutDashboard size={17} /> Ir al dashboard
        </Link>
      </div>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.4fr]">
        <div className="space-y-5">
          <div className="panel">
            <div className="panel-title">
              <h3>Recorrido recomendado</h3>
              <span>Prueba punta a punta</span>
            </div>
            <ol className="manual-steps">
              <li>Entrar como Handler.</li>
              <li>Crear un caso desde Nuevo caso.</li>
              <li>Cargar documentos y corregir clasificación si hace falta.</li>
              <li>Revisar checklist y copiar solicitud de faltantes.</li>
              <li>Confirmar análisis de causa.</li>
              <li>Guardar cálculo con método seleccionado y justificación.</li>
              <li>Generar el informe de revisión, seleccionar destino FIS o Lawgistic y revisar las observaciones.</li>
              <li>Confirmar el traspaso y, si corresponde, generar la carta.</li>
              <li>Cambiar a Gerente para revisar dashboard, benchmark, avisos de inactividad y reversión.</li>
              <li>Entrar a Mantenedores para revisar o actualizar métodos y templates base.</li>
              <li>Entrar a Memoria para importar y consultar el historial completo desde Excel.</li>
              <li>Cambiar a Gerente para asignar un Inspector desde la ficha de un caso.</li>
              <li>Cambiar a Inspector para buscar un caso asignado, registrar la inspección y descargar la Carta JSI.</li>
            </ol>
          </div>
          <div className="panel">
            <div className="panel-title">
              <h3>Permisos por rol</h3>
            </div>
            <div className="space-y-3">
              {roleGuides.map((item) => (
                <div className="manual-role" key={item.role}>
                  <strong>{item.role}</strong>
                  <p>{item.guide}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="panel-title">
              <h3>Reglas críticas</h3>
            </div>
            <ul className="manual-list">
              <li>No se guardan archivos reales, solo metadata.</li>
              <li>El aviso de inactividad se activa cuando pasan más de 15 días sin una actualización.</li>
              <li>No hay jurisdicción por defecto.</li>
              <li>No hay prescripción sin fecha de descarga y jurisdicción.</li>
              <li>No hay cálculo guardado sin justificación suficiente.</li>
              <li>No hay edición de cálculo después del traspaso.</li>
            </ul>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            <h3>Descripción de funcionalidades</h3>
            <span>{modules.length} secciones</span>
          </div>
          <div className="manual-grid">
            {modules.map((item) => (
              <article className="manual-card" key={item.title}>
                <h4>{item.title}</h4>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "ok" | "warn" | "danger" | "missing" }) {
  return <span className={cx("status-pill", tone)}>{label}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function ReadonlyBanner({ text = "Este rol tiene vista de solo lectura para esta sección." }: { text?: string }) {
  return (
    <div className="readonly-banner">
      <Lock size={16} /> {text}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="panel-title">
          <h3>{title}</h3>
          <button className="icon-button" onClick={onClose}>
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RoleSelectorPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/casos" element={<CasesPage />} />
      <Route path="/historial" element={<HistoricalMemoryPage />} />
      <Route path="/casos/nuevo" element={<NewCasePage />} />
      <Route path="/casos/:id" element={<CaseDetailPage />} />
      <Route path="/benchmark" element={<BenchmarkPage />} />
      <Route path="/mantenedores" element={<MaintainersPage />} />
      <Route path="/manual" element={<ManualPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
