import { ChangeEvent, DragEvent, FormEvent, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarClock,
  Check,
  ChevronRight,
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
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
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
  UploadDraft
} from "./types/domain";
import { mergeExtractedData, processDocumentFiles } from "./lib/extraction";
import { buildReviewReportText } from "./lib/review";
import {
  canEditCalculation,
  currency,
  daysWithoutMovement,
  DOCUMENT_TYPES,
  documentCompleteness,
  HANDLERS,
  hasRequiredMinimum,
  nextStatusFromCase,
  pendingField,
  prescriptionStatus,
  suggestDamageMerit,
  suggestHandler
} from "./lib/business";

const STATUS_LABELS: CaseStatus[] = [
  "Datos incompletos",
  "Preclaim",
  "Documentación pendiente",
  "Cálculo completo",
  "Traspasado a FIS",
  "Traspasado a Logistic"
];
const COMPANY_LOGO_SRC = `${import.meta.env.BASE_URL}logo.svg`;

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

function useVisibleCases() {
  const { usuario, casos } = useDemoStore();
  return usuario.role === "Handler" ? casos.filter((caso) => caso.claimHandler === usuario.nombre) : casos;
}

function shellTitle(role: string) {
  if (role === "CEO") return "Vista dirección";
  if (role === "Gerente") return "Panel gerencia";
  return "Mesa handler";
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
            {usuario.role === "Handler" && <NavLink to="/casos/nuevo" icon={<Plus size={18} />} label="Nuevo caso" />}
            {usuario.role !== "Handler" && <NavLink to="/benchmark" icon={<BarChart3 size={18} />} label="Benchmark" />}
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
    { role: "CEO" as const, nombre: "Dirección NPR", title: "CEO", copy: "Revisa riesgos críticos y estado ejecutivo del portafolio." }
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
  const { documentos, usuario } = useDemoStore();
  const [handlerFilter, setHandlerFilter] = useState("Todos");
  const filtered = handlerFilter === "Todos" ? visibleCases : visibleCases.filter((caso) => caso.claimHandler === handlerFilter);
  const alerts = filtered
    .map((caso) => ({ caso, prescription: prescriptionStatus(caso), staleDays: daysWithoutMovement(caso) }))
    .filter((item) => item.prescription.tone !== "ok" || item.staleDays >= 14)
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
  const staleCount = filtered.filter((caso) => daysWithoutMovement(caso) >= 14).length;
  const riskCount = alerts.length;
  const coverage = filtered.length
    ? Math.round(
        filtered.reduce((sum, caso) => {
          const completeness = documentCompleteness(documentos.filter((doc) => doc.casoId === caso.id));
          return sum + (completeness.completed / completeness.total) * 100;
        }, 0) / filtered.length
      )
    : 0;

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
              <Link className="button-primary" to="/casos/nuevo">
                <Plus size={16} /> Nuevo caso
              </Link>
            ) : (
              <>
                <Link className="button-primary" to="/benchmark">
                  <BarChart3 size={16} /> Ver benchmark
                </Link>
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
                    {staleDays >= 14 && <StatusPill label={`${staleDays} días sin movimiento`} tone="warn" />}
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
  const { documentos, usuario } = useDemoStore();
  if (usuario.role === "Handler") return <Navigate to="/dashboard" replace />;

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
      return prescription.tone !== "ok" || daysWithoutMovement(caso) >= 14;
    }).length;
    const stale = handlerCases.filter((caso) => daysWithoutMovement(caso) >= 14).length;
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
          Docs pendientes = al menos un documento del checklist faltante. Alerta = prescripción no verde o 14 días o más sin movimiento.
        </div>
      </section>
    </AppShell>
  );
}

function CasesPage() {
  const visibleCases = useVisibleCases();
  const { usuario } = useDemoStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todos");
  const filtered = visibleCases.filter((caso) => {
    const text = `${caso.id} ${caso.assured} ${caso.opponent} ${caso.vessel} ${caso.claimHandler}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (status === "Todos" || caso.estado === status);
  });
  return (
    <AppShell>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Lista de casos</p>
          <h2>{usuario.role === "Handler" ? "Mis casos" : "Portafolio completo"}</h2>
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
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por reference, asegurado, nave..." />
        </div>
        <select className="input w-64" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option>Todos</option>
          {STATUS_LABELS.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
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

function NewCasePage() {
  const { usuario, casos, createCase, prepareUpload, confirmUpload } = useDemoStore();
  const navigate = useNavigate();
  const [input, setInput] = useState<NewCaseInput>({ claimHandler: usuario.nombre });
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
    if (input.dateOfDischarge && input.dateOfDischarge > new Date().toISOString().slice(0, 10)) return "La fecha de descarga no puede ser futura.";
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
          <Field label="Fecha de descarga *">
            <input className="input" type="date" value={input.dateOfDischarge || ""} onChange={(event) => update("dateOfDischarge", event.target.value)} max={new Date().toISOString().slice(0, 10)} />
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
  const { casos, documentos, calculosPerdida, bitacora, usuario, generateReviewReport, transitionCase, revertCase } = useDemoStore();
  const caso = casos.find((item) => item.id === decodedId);
  const params = new URLSearchParams(window.location.search);
  const [tab, setTab] = useState(params.get("tab") || "documentos");
  const [showTransfer, setShowTransfer] = useState<"Traspasado a FIS" | "Traspasado a Logistic" | null>(null);
  const [revertReason, setRevertReason] = useState("");
  const [revertStatus, setRevertStatus] = useState<CaseStatus>("Preclaim");
  const [notice, setNotice] = useState("");
  if (!caso) {
    return (
      <AppShell>
        <EmptyState text="Caso no encontrado." />
      </AppShell>
    );
  }
  const caseDocs = documentos.filter((doc) => doc.casoId === caso.id);
  const calculo = calculosPerdida.find((item) => item.casoId === caso.id);
  const events = bitacora.filter((event) => event.casoId === caso.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const pres = prescriptionStatus(caso);
  const staleDays = daysWithoutMovement(caso);
  const canWrite = usuario.role === "Handler" && caso.claimHandler === usuario.nombre;
  const nextStatus = nextStatusFromCase(caso, caseDocs, calculo);
  const canAdvance = nextStatus !== caso.estado;

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
    setShowTransfer(destination === "FIS" ? "Traspasado a FIS" : "Traspasado a Logistic");
  };
  const confirmTransfer = () => {
    if (!showTransfer) return;
    const destination = showTransfer.replace("Traspasado a ", "");
    const reportStatus = caso.informeRevision?.status || "Con observaciones";
    transitionCase(
      caso.id,
      showTransfer,
      `Caso traspasado a ${destination}. Informe de revisión: ${reportStatus}. Edición de cálculo bloqueada.`
    );
    setShowTransfer(null);
  };
  const submitRevert = () => {
    const result = revertCase(caso.id, revertStatus, revertReason);
    setNotice(result.ok ? "Estado revertido y registrado en bitácora." : result.error || "No se pudo revertir.");
    if (result.ok) setRevertReason("");
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
            {staleDays >= 14 && <StatusPill label={`${staleDays} días sin movimiento`} tone="warn" />}
          </div>
        </div>
        <div className="case-actions">
          {notice && <p className="notice">{notice}</p>}
          {usuario.role === "Handler" && !canWrite && (
            <p className="notice">
              Este caso está asignado a <strong>{caso.claimHandler}</strong>. Selecciona ese Handler para editarlo.
            </p>
          )}
          {canWrite && caso.estado !== "Traspasado a FIS" && caso.estado !== "Traspasado a Logistic" && (
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
                  <button className="button-secondary" onClick={() => openTransfer("Logistic")}>Traspasar a Logistic</button>
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
        </div>
      </section>

      <div className="case-summary-grid">
        <CaseSummaryMetric
          label="Riesgo de prescripción"
          value={pres.label}
          detail={caso.fechaPrescripcion ? `Vence ${new Date(caso.fechaPrescripcion).toLocaleDateString("es-CL")}` : "Fecha o jurisdicción pendiente"}
          icon={<AlertTriangle size={19} />}
          tone={pres.tone === "danger" ? "danger" : pres.tone === "warn" ? "warn" : "ok"}
        />
        <CaseSummaryMetric
          label="Días sin movimiento"
          value={`${staleDays} días`}
          detail={`Último cambio ${new Date(caso.ultimaActualizacion).toLocaleDateString("es-CL")}`}
          icon={<CalendarClock size={19} />}
          tone={staleDays >= 14 ? "warn" : "ok"}
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
            Revisa el informe antes de confirmar. El traspaso es simulado y bloqueará la edición de la pestaña Cálculo.
          </p>
          {caso.informeRevision && <ReviewReportContent report={caso.informeRevision} compact />}
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
                <button className="button-primary" onClick={confirmTransfer}>
                  <Check size={16} /> Confirmar con {caso.informeRevision.ready ? "informe listo" : "observaciones"}
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
        ].map(([key, label, icon]) => (
          <button key={String(key)} className={cx("tab", tab === key && "active")} onClick={() => changeTab(String(key))}>
            {icon} {label}
          </button>
        ))}
      </div>

      {tab === "documentos" && <DocumentsTab caso={caso} docs={caseDocs} canWrite={canWrite} />}
      {tab === "analisis" && <AnalysisTab caso={caso} docs={caseDocs} canWrite={canWrite} />}
      {tab === "calculo" && <CalculationTab caso={caso} calculo={calculo} canWrite={canWrite && canEditCalculation(caso)} />}
      {tab === "informe" && <ReviewReportTab caso={caso} docs={caseDocs} calculo={calculo} canWrite={canWrite} />}
      {tab === "historial" && <HistoryTab events={events} />}
      {tab === "cartas" && <LettersTab caso={caso} docs={caseDocs} canWrite={canWrite} />}
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
                      <p className="text-xs text-slate-500">{draft.estadoExtraccion || "Pendiente"} · {draft.relativePath || draft.originalName}</p>
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
                <button className="icon-button" title="Eliminar documento" onClick={() => removeDocument(doc.id)}>
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
  const text =
    missing.length === 0
      ? `Caso ${caso.id}: documentación completa para revisión preclaim.`
      : `Caso ${caso.id}: favor remitir los siguientes documentos pendientes para continuar el análisis preclaim:\n\n${missing.map((item) => `- ${item}`).join("\n")}`;
  return (
    <div className="mt-5 rounded-md border border-line bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <strong>Texto para solicitar faltantes</strong>
        <button className="button-secondary small" onClick={() => navigator.clipboard?.writeText(text)}>
          <Copy size={15} /> Copiar
        </button>
      </div>
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
  const { saveCalculation } = useDemoStore();
  const [form, setForm] = useState<CalculoPerdida>(
    calculo || {
      casoId: caso.id,
      moneda: "USD",
      rubrosAdicionales: [],
      ventaAFirme: false,
      updatedAt: new Date().toISOString()
    }
  );
  const [error, setError] = useState("");
  const computed = useMemo(() => {
    const base = {
      ...form,
      metodo1_resultado:
        form.metodo1_liquidacionComparativa !== undefined && form.metodo1_liquidacionReal !== undefined
          ? form.metodo1_liquidacionComparativa - form.metodo1_liquidacionReal
          : undefined,
      metodo2_resultado:
        form.metodo2_valorReporteMercado !== undefined && form.metodo2_liquidacionReal !== undefined
          ? form.metodo2_valorReporteMercado - form.metodo2_liquidacionReal
          : undefined,
      metodo3_resultado:
        form.metodo3_valorFactura !== undefined && form.metodo3_ventaBrutaDestino !== undefined
          ? form.metodo3_valorFactura - form.metodo3_ventaBrutaDestino
          : undefined
    };
    const selected = form.ventaAFirme
      ? form.notaCreditoValor
      : form.metodoSeleccionado === "1"
        ? base.metodo1_resultado
        : form.metodoSeleccionado === "2"
          ? base.metodo2_resultado
          : form.metodoSeleccionado === "3"
            ? base.metodo3_resultado
            : undefined;
    return {
      ...base,
      montoFinalReclamo:
        selected !== undefined ? selected + form.rubrosAdicionales.reduce((sum, rubro) => sum + rubro.monto, 0) : undefined
    };
  }, [form]);
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
      metodo1_liquidacionReal: caso.propuestaPerdida?.metodo1_liquidacionReal,
      metodo1_liquidacionComparativa: caso.propuestaPerdida?.metodo1_liquidacionComparativa,
      metodo2_valorReporteMercado: caso.propuestaPerdida?.metodo2_valorReporteMercado,
      metodo2_liquidacionReal: caso.propuestaPerdida?.metodo2_liquidacionReal,
      metodo3_valorFactura: caso.propuestaPerdida?.metodo3_valorFactura,
      metodo3_ventaBrutaDestino: caso.propuestaPerdida?.metodo3_ventaBrutaDestino,
      rubrosAdicionales: caso.propuestaPerdida?.rubrosAdicionales || [],
      metodoSeleccionado: undefined,
      justificacionSeleccion: ""
    }));
  };
  const methods = [
    { id: "1" as const, title: "Método 1 · SMV", result: computed.metodo1_resultado, formula: "liquidación comparativa - liquidación real" },
    { id: "2" as const, title: "Método 2 · Mercado", result: computed.metodo2_resultado, formula: "valor reporte mercado - liquidación real" },
    { id: "3" as const, title: "Método 3 · Factura vs. venta", result: computed.metodo3_resultado, formula: "valor factura exportación - venta bruta destino" }
  ].sort((a, b) => (b.result ?? -Infinity) - (a.result ?? -Infinity));
  return (
    <form className="space-y-5" onSubmit={save}>
      <div className="panel">
        <div className="panel-title">
          <h3>Cálculo de pérdida</h3>
          <span>{canWrite ? "Editable" : "Solo lectura"}</span>
        </div>
        {!canWrite && <ReadonlyBanner text={caso.estado.includes("Traspasado") ? "El caso fue traspasado; la edición de cálculo está bloqueada." : undefined} />}
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
          <Field label="Moneda">
            <select className="input" disabled={!canWrite} value={form.moneda} onChange={(event) => setForm((current) => ({ ...current, moneda: event.target.value as "USD" | "CLP" }))}>
              <option>USD</option>
              <option>CLP</option>
            </select>
          </Field>
          {form.moneda === "CLP" && (
            <Field label="Tipo de cambio referencial">
              <input className="input" disabled={!canWrite} type="number" value={form.tipoCambio || ""} onChange={(event) => updateNumber("tipoCambio", event.target.value)} />
            </Field>
          )}
          <label className="checkbox-field">
            <input type="checkbox" disabled={!canWrite} checked={form.ventaAFirme} onChange={(event) => setForm((current) => ({ ...current, ventaAFirme: event.target.checked }))} />
            Venta a firme
          </label>
        </div>
      </div>

      {form.ventaAFirme ? (
        <div className="panel">
          <Field label="Valor nota de crédito">
            <input className="input" disabled={!canWrite} type="number" value={form.notaCreditoValor || ""} onChange={(event) => updateNumber("notaCreditoValor", event.target.value)} />
          </Field>
          <FinalClaim value={computed.montoFinalReclamo} moneda={form.moneda} />
        </div>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-3">
            <MethodInputs title="Método 1 · Sound Market Value">
              <NumberField label="Liquidación real" disabled={!canWrite} value={form.metodo1_liquidacionReal} onChange={(value) => updateNumber("metodo1_liquidacionReal", value)} />
              <NumberField label="Liquidación comparativa" disabled={!canWrite} value={form.metodo1_liquidacionComparativa} onChange={(value) => updateNumber("metodo1_liquidacionComparativa", value)} />
            </MethodInputs>
            <MethodInputs title="Método 2 · Reporte de mercado">
              <NumberField label="Valor reporte mercado" disabled={!canWrite} value={form.metodo2_valorReporteMercado} onChange={(value) => updateNumber("metodo2_valorReporteMercado", value)} />
              <NumberField label="Liquidación real" disabled={!canWrite} value={form.metodo2_liquidacionReal} onChange={(value) => updateNumber("metodo2_liquidacionReal", value)} />
            </MethodInputs>
            <MethodInputs title="Método 3 · Factura vs. venta">
              <NumberField label="Valor factura exportación" disabled={!canWrite} value={form.metodo3_valorFactura} onChange={(value) => updateNumber("metodo3_valorFactura", value)} />
              <NumberField label="Venta bruta destino" disabled={!canWrite} value={form.metodo3_ventaBrutaDestino} onChange={(value) => updateNumber("metodo3_ventaBrutaDestino", value)} />
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
                  disabled={!canWrite || method.result === undefined}
                  className={cx("method-card", form.metodoSeleccionado === method.id && "selected")}
                  onClick={() => setForm((current) => ({ ...current, metodoSeleccionado: method.id }))}
                >
                  <span>{method.title}</span>
                  <strong>{currency(method.result, form.moneda)}</strong>
                  <small>{method.result === undefined ? "Sin datos" : method.formula}</small>
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

function FinalClaim({ value, moneda }: { value?: number; moneda: "USD" | "CLP" }) {
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
  const { generateReviewReport } = useDemoStore();
  const [destination, setDestination] = useState<TransferDestination>(caso.informeRevision?.destination || "FIS");
  const report = caso.informeRevision;

  const generate = () => generateReviewReport(caso.id, destination);
  const download = () => {
    if (!report) return;
    downloadTextFile(`${caso.id}_informe_revision_${report.destination}.txt`, buildReviewReportText(report));
  };

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
            <option value="Logistic">Logistic · recupero judicial</option>
          </select>
          <button className="button-primary" type="button" disabled={!canWrite} onClick={generate}>
            <FileCheck2 size={17} /> Generar informe
          </button>
          {report && (
            <button className="button-secondary" type="button" onClick={download}>
              <Download size={17} /> Descargar
            </button>
          )}
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

function LettersTab({ caso, docs, canWrite }: { caso: Caso; docs: ReturnType<typeof useDemoStore.getState>["documentos"]; canWrite: boolean }) {
  const { registerLetter } = useDemoStore();
  const hasBl = docs.some((doc) => doc.tipoDocumento === "BL");
  const initial = `Sres. ${pendingField(caso.opponent)}

Por medio de la presente notificamos formalmente un reclamo preliminar asociado al embarque transportado en la nave ${pendingField(caso.vessel)}, viaje ${pendingField(caso.voyage)}, descargado en ${pendingField(caso.placeOfDischarge)} con fecha ${pendingField(caso.dateOfDischarge)}.

Reference No: ${pendingField(caso.id)}
CS Claim No: ${pendingField(caso.csClaimNo)}
Asegurado: ${pendingField(caso.assured)}
Monto reclamado preliminar: ${pendingField(caso.claimAmount)}
Documento BL: ${hasBl ? "Cargado en expediente demo" : "[PENDIENTE COMPLETAR: BL no cargado]"}

Solicitamos mantener a resguardo todos los antecedentes y confirmar recepción de esta notificación.

Atentamente,
Intervent Preclaim`;
  const [text, setText] = useState(initial);
  const copy = () => {
    navigator.clipboard?.writeText(text);
    registerLetter(caso.id, "Carta de notificación a la naviera copiada al portapapeles.");
  };
  const download = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${caso.id.replace(/[^\w-]+/g, "-")}_notificacion_naviera.txt`;
    link.click();
    URL.revokeObjectURL(url);
    registerLetter(caso.id, "Carta de notificación a la naviera descargada como TXT.");
  };
  return (
    <section className="panel">
      <div className="panel-title">
        <h3>Cartas automatizadas</h3>
        <span>Carta de notificación a la naviera</span>
      </div>
      {!canWrite && <ReadonlyBanner />}
      <textarea className="input min-h-[420px] font-mono text-sm" disabled={!canWrite} value={text} onChange={(event) => setText(event.target.value)} />
      <div className="mt-4 flex flex-wrap justify-end gap-3">
        <button className="button-secondary" type="button" onClick={copy}>
          <Copy size={17} /> Copiar
        </button>
        <button className="button-primary" type="button" onClick={download}>
          <Download size={17} /> Descargar
        </button>
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
        "Permite entrar como Handler, Gerente o CEO. El rol cambia los permisos y el alcance de datos: Handler ve sus casos; Gerente y CEO ven todo el portafolio."
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
        "Calcula fecha de prescripción solo si existen fecha de descarga y jurisdicción explícita. Usa semáforo verde, ámbar o rojo y destaca casos sin movimiento por 14 días o más."
    },
    {
      title: "10. Cartas automatizadas",
      body:
        "Genera una carta editable de notificación a la naviera con datos del caso y marca como [PENDIENTE COMPLETAR] cualquier campo faltante."
    },
    {
      title: "11. Benchmark por handler",
      body:
        "Vista gerencial que compara por handler los casos totales, documentación pendiente, alertas activas, casos sin movimiento, cobertura documental promedio y cálculos completos."
    },
    {
      title: "12. Informe de revisión y traspaso",
      body:
        "Desde la pestaña Informe, el handler selecciona FIS para recupero extrajudicial o Logistic para recupero judicial y genera un resumen con documentación disponible y pendiente, causa propuesta, mérito preliminar y cálculo seleccionado. El informe queda en el historial, se puede descargar y debe revisarse antes de confirmar el traspaso. Si aún existen pendientes, el sistema los muestra como observaciones explícitas."
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
        "Supervisar todos los casos, comparar desempeño por handler, filtrar alertas y revertir estados con motivo obligatorio."
    },
    {
      role: "CEO",
      guide:
        "Revisar el portafolio completo, comparar indicadores por handler, riesgos de prescripción y estado ejecutivo sin editar documentos ni cálculos."
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
              <li>Generar el informe de revisión, seleccionar destino FIS o Logistic y revisar las observaciones.</li>
              <li>Confirmar el traspaso y, si corresponde, generar la carta.</li>
              <li>Cambiar a Gerente para revisar dashboard, benchmark, alertas y reversión.</li>
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
      <Route path="/casos/nuevo" element={<NewCasePage />} />
      <Route path="/casos/:id" element={<CaseDetailPage />} />
      <Route path="/benchmark" element={<BenchmarkPage />} />
      <Route path="/manual" element={<ManualPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
