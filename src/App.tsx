import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
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
  RubroAdicional
} from "./types/domain";
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
  suggestDamageMerit
} from "./lib/business";

const STATUS_LABELS: CaseStatus[] = [
  "Datos incompletos",
  "Preclaim",
  "Documentación pendiente",
  "Cálculo completo",
  "Traspasado a FIS",
  "Traspasado a Logistic"
];

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
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
  return (
    <div className="min-h-screen bg-slatewash text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-ink text-white">
              <ShieldCheck size={21} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Intervent Preclaim</p>
              <h1 className="text-lg font-semibold">{shellTitle(usuario.role)}</h1>
            </div>
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            <NavLink to="/dashboard" icon={<LayoutDashboard size={18} />} label="Dashboard" />
            <NavLink to="/casos" icon={<ClipboardList size={18} />} label="Casos" />
            {usuario.role === "Handler" && <NavLink to="/casos/nuevo" icon={<Plus size={18} />} label="Nuevo caso" />}
            <NavLink to="/manual" icon={<HelpCircle size={18} />} label="Manual" />
          </nav>
          <div className="flex items-center gap-2">
            <Link className="button-secondary" to="/manual" title="Abrir manual de usuario">
              <HelpCircle size={17} /> Manual
            </Link>
            <select
              className="input h-10 w-44"
              value={`${usuario.role}|${usuario.nombre}`}
              onChange={(event) => {
                const [role, nombre] = event.target.value.split("|");
                setUsuario({ role: role as typeof usuario.role, nombre });
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
      </header>
      <main className="mx-auto max-w-7xl px-5 py-6">{children}</main>
    </div>
  );
}

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="nav-link">
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
    <div className="grid min-h-screen place-items-center bg-slatewash px-5">
      <section className="w-full max-w-5xl">
        <div className="mb-8">
          <p className="eyebrow">Demo funcional completo</p>
          <h1 className="mt-2 text-4xl font-semibold text-ink">Plataforma Intervent Preclaim</h1>
          <p className="mt-3 max-w-2xl text-base text-slate-600">
            Selecciona un rol simulado para recorrer el flujo: crear caso, clasificar documentos, calcular pérdida, gestionar prescripción y generar cartas.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {roles.map((item) => (
            <button
              key={item.role}
              className="card text-left transition hover:-translate-y-0.5 hover:border-accent"
              onClick={() => {
                setUsuario({ role: item.role, nombre: item.nombre });
                navigate("/dashboard");
              }}
            >
              <UserRound className="mb-5 text-accent" size={30} />
              <h2 className="text-xl font-semibold">{item.title}</h2>
              <p className="mt-2 min-h-14 text-sm text-slate-600">{item.copy}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                Entrar <ChevronRight size={16} />
              </span>
            </button>
          ))}
        </div>
      </section>
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

  return (
    <AppShell>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>Resumen de preclaims</h2>
        </div>
        {usuario.role !== "Handler" && (
          <select className="input w-56" value={handlerFilter} onChange={(event) => setHandlerFilter(event.target.value)}>
            <option>Todos</option>
            {HANDLERS.map((handler) => (
              <option key={handler}>{handler}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric title="Total casos" value={filtered.length} icon={<BarChart3 size={20} />} />
        <Metric title="Alertas activas" value={riskCount} icon={<AlertTriangle size={20} />} tone="danger" />
        <Metric title="Sin movimiento" value={staleCount} icon={<CalendarClock size={20} />} tone="warn" />
        <Metric title="Documentos cargados" value={documentos.filter((doc) => filtered.some((caso) => caso.id === doc.casoId)).length} icon={<FileText size={20} />} />
      </div>

      <Link to="/manual" className="manual-callout">
        <HelpCircle size={22} />
        <div>
          <strong>Manual de usuario</strong>
          <p>Ver recorrido completo, permisos por rol, módulos y reglas críticas del demo.</p>
        </div>
        <ChevronRight size={18} />
      </Link>

      <section className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="panel">
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
        <div className="space-y-5">
          <div className="panel">
            <div className="panel-title">
              <h3>Casos por estado</h3>
            </div>
            <div className="space-y-2">
              {statusCounts.map((item) => (
                <Distribution key={item.status} label={item.status} value={item.count} total={Math.max(filtered.length, 1)} />
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="panel-title">
              <h3>Distribución por handler</h3>
            </div>
            <div className="space-y-2">
              {byHandler.map((item) => (
                <Distribution key={item.handler} label={item.handler} value={item.count} total={Math.max(filtered.length, 1)} />
              ))}
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
          <h2>Portafolio visible para {usuario.role}</h2>
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
  const { usuario, createCase } = useDemoStore();
  const navigate = useNavigate();
  const [input, setInput] = useState<NewCaseInput>({ claimHandler: usuario.nombre });
  const [error, setError] = useState("");
  const hasData = Object.values(input).some(Boolean);
  if (usuario.role !== "Handler") return <Navigate to="/casos" replace />;

  const update = (key: keyof NewCaseInput, value: string) => {
    setInput((current) => ({
      ...current,
      [key]: key === "claimAmount" ? (value ? Number(value) : undefined) : value || undefined
    }));
  };
  const validateComplete = () => {
    if (!hasRequiredMinimum(input)) return "Completa handler, asegurado, oponente, nave, fecha de descarga y jurisdicción.";
    if (input.dateOfDischarge && input.dateOfDischarge > new Date().toISOString().slice(0, 10)) return "La fecha de descarga no puede ser futura.";
    if (input.claimAmount !== undefined && input.claimAmount <= 0) return "El monto reclamado debe ser positivo.";
    return "";
  };
  const save = (complete: boolean) => {
    const validation = complete ? validateComplete() : "";
    if (validation) {
      setError(validation);
      return;
    }
    const caso = createCase(input, complete);
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
            <h2>Alta manual de metadatos</h2>
          </div>
          <StatusPill label="No se deriva de documentos" tone="missing" />
        </div>
        {error && <div className="form-error">{error}</div>}
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
        </div>
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
  const { casos, documentos, calculosPerdida, bitacora, usuario, transitionCase, revertCase } = useDemoStore();
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
  const confirmTransfer = () => {
    if (!showTransfer) return;
    transitionCase(caso.id, showTransfer, `Caso traspasado a ${showTransfer.replace("Traspasado a ", "")}. Edición de cálculo bloqueada.`);
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
          {canWrite && caso.estado !== "Traspasado a FIS" && caso.estado !== "Traspasado a Logistic" && (
            <>
              {caso.estado !== "Cálculo completo" ? (
                <button className="button-primary" onClick={actionPrimary}>
                  <Check size={17} /> Marcar documentación completa
                </button>
              ) : (
                <div className="flex gap-2">
                  <button className="button-primary" onClick={() => setShowTransfer("Traspasado a FIS")}>Traspasar a FIS</button>
                  <button className="button-secondary" onClick={() => setShowTransfer("Traspasado a Logistic")}>Traspasar a Logistic</button>
                </div>
              )}
            </>
          )}
          {usuario.role !== "Handler" && (
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

      {showTransfer && (
        <Modal title="Confirmar traspaso" onClose={() => setShowTransfer(null)}>
          <p>Esto notificará el traspaso simulado y bloqueará la edición de la pestaña Cálculo. ¿Confirmar?</p>
          <div className="mt-5 flex justify-end gap-3">
            <button className="button-secondary" onClick={() => setShowTransfer(null)}>Cancelar</button>
            <button className="button-primary" onClick={confirmTransfer}>Confirmar</button>
          </div>
        </Modal>
      )}

      <div className="tabs">
        {[
          ["documentos", "Documentos", <FolderUp size={16} key="i" />],
          ["analisis", "Análisis", <ShieldCheck size={16} key="i" />],
          ["calculo", "Cálculo", <BarChart3 size={16} key="i" />],
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
      {tab === "historial" && <HistoryTab events={events} />}
      {tab === "cartas" && <LettersTab caso={caso} docs={caseDocs} canWrite={canWrite} />}
    </AppShell>
  );
}

function DocumentsTab({ caso, docs, canWrite }: { caso: Caso; docs: ReturnType<typeof useDemoStore.getState>["documentos"]; canWrite: boolean }) {
  const { prepareUpload, confirmUpload, removeDocument } = useDemoStore();
  const [drafts, setDrafts] = useState<Array<{ originalName: string; tipoDocumento: DocumentType }>>([]);
  const completeness = documentCompleteness(docs);
  const grouped = DOCUMENT_TYPES.map((type) => ({ type, docs: docs.filter((doc) => doc.tipoDocumento === type && doc.disponible) }));
  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    setDrafts(prepareUpload(event.target.files));
  };
  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <div className="panel">
        <div className="panel-title">
          <h3>Ingesta y clasificación</h3>
          <span>Metadata only</span>
        </div>
        {!canWrite && <ReadonlyBanner />}
        {canWrite && (
          <>
            <label className="upload-box">
              <FolderUp size={24} />
              <span>Seleccionar múltiples documentos</span>
              <input type="file" multiple onChange={onFiles} />
            </label>
            {drafts.length > 0 && (
              <div className="mt-4 space-y-3">
                {drafts.map((draft, index) => (
                  <div key={`${draft.originalName}-${index}`} className="upload-draft">
                    <div>
                      <p className="font-semibold">{draft.originalName}</p>
                      <p className="text-xs text-slate-500">Se guardará solo nombre, tipo, fecha y pathMock.</p>
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
        "Formulario de alta manual. Guardar borrador permite datos incompletos; Guardar y continuar exige handler, asegurado, oponente, nave, fecha de descarga y jurisdicción."
    },
    {
      title: "5. Documentos y checklist",
      body:
        "Permite cargar múltiples archivos, sugiere tipo documental por nombre y deja corregirlo manualmente. Solo guarda metadata, nunca binarios ni base64. El checklist se actualiza en tiempo real."
    },
    {
      title: "6. Análisis de causa de daño",
      body:
        "Si la causa es Temperatura y existe termógrafo, calcula desviación frente al rango exigido y sugiere mérito Alto, Medio o Bajo. La conclusión final siempre requiere confirmación humana."
    },
    {
      title: "7. Cálculo de pérdida",
      body:
        "Muestra tres métodos en paralelo: SMV, Reporte de mercado y Factura vs. venta bruta. Permite venta a firme, rubros adicionales y exige justificación mínima para guardar un método seleccionado."
    },
    {
      title: "8. Seguimiento e historial",
      body:
        "Registra cambios de estado, documentos, cálculos, cartas y reversiones con timestamp automático no editable. La reversión de estado solo está disponible para Gerente/CEO con motivo obligatorio."
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
        "Supervisar todos los casos, filtrar por handler, revisar alertas y revertir estados con motivo obligatorio."
    },
    {
      role: "CEO",
      guide:
        "Revisar el portafolio completo, riesgos de prescripción y estado ejecutivo sin editar documentos ni cálculos."
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
              <li>Avanzar estado y generar carta.</li>
              <li>Cambiar a Gerente para revisar dashboard, alertas y reversión.</li>
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
      <Route path="/manual" element={<ManualPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
