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


import { AppShell, STATUS_LABELS, MASS_VESSEL_MIN_CASES, cx, useVisibleCases, vesselVoyageKey, shellTitle, EmptyState, StatusPill } from "./appShared";

export function DashboardPage() {
  const visibleCases = useVisibleCases();
  const {
    documentos,
    calculosPerdida,
    bitacora,
    usuario,
    registerInactivityAlertSent,
    markInactivityAlertRead,
    resolveInactivityAlert
  } = useDemoStore();
  const [handlerFilter, setHandlerFilter] = useState("Todos");
  const canFilterByHandler = usuario.role === "Gerente" || usuario.role === "CEO";
  const filtered = !canFilterByHandler || handlerFilter === "Todos"
    ? visibleCases
    : visibleCases.filter((caso) => caso.claimHandler === handlerFilter);
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
    .map((caso) => ({ caso, prescription: prescriptionStatus(caso), inactivity: inactivityAlert(caso, bitacora) }))
    .filter((item) => item.prescription.tone !== "ok" || item.inactivity.active)
    .sort((a, b) => {
      const priority = { danger: 0, missing: 1, warn: 2, ok: 3 };
      return priority[a.prescription.tone] - priority[b.prescription.tone] || b.inactivity.staleDays - a.inactivity.staleDays;
    });
  const statusCounts = STATUS_LABELS.map((status) => ({
    status,
    count: filtered.filter((caso) => caso.estado === status).length
  }));
  const byHandler = HANDLERS.map((handler) => ({
    handler,
    count: filtered.filter((caso) => caso.claimHandler === handler).length
  }));
  const staleCount = filtered.filter((caso) => inactivityAlert(caso, bitacora).active).length;
  const riskCount = alerts.length;
  const coverage = filtered.length
    ? Math.round(
        filtered.reduce((sum, caso) => {
          const calculo = calculosPerdida.find((item) => item.casoId === caso.id);
          return sum + documentChecklistCoverage(caso, documentos.filter((doc) => doc.casoId === caso.id), calculo);
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
            <p>Promedio real sobre los documentos aplicables del checklist.</p>
          </div>
        </div>
      </section>

      <div className="notice mt-5" role={staleCount > 0 ? "status" : undefined}>
        <strong>Regla de inactividad</strong>: se toman días corridos en la zona horaria Santiago desde el último movimiento válido. El aviso se activa al cumplir {INACTIVITY_ALERT_DAYS} días, se repite diariamente y llega a {INACTIVITY_ALERT_RECIPIENTS}. Plataforma siempre; correo cuando el caso está cerca de prescribir o llega a 20 días sin movimiento.
        <span> Los casos ya traspasados se excluyen de esta alerta de gestión.</span>
        {staleCount > 0 && <> Hay {staleCount} {staleCount === 1 ? "caso" : "casos"} en alerta.</>}
      </div>

      <section className="dashboard-grid mt-6 grid gap-5 lg:grid-cols-[1.05fr_1.5fr]">
        <div className="panel priority-panel">
          <div className="panel-title">
            <h3>Alertas de prescripción y movimiento</h3>
            <span>{alerts.length} activas</span>
          </div>
          <div className="space-y-3">
            {alerts.length === 0 && <EmptyState text="No hay alertas para el filtro actual." />}
            {alerts.map(({ caso, prescription, inactivity }) => (
              <div key={caso.id} className="alert-row">
                <Link to={`/casos/${encodeURIComponent(caso.id)}`} className="alert-row-link">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill label={prescription.label} tone={prescription.tone} />
                      {inactivity.active && <StatusPill label={`${inactivity.staleDays} días sin movimiento`} tone="warn" />}
                    </div>
                    <p className="mt-2 font-semibold">{caso.id}</p>
                    <p className="text-sm text-slate-600">
                      {caso.assured} · {caso.opponent} · {caso.claimHandler}
                    </p>
                  </div>
                  <ChevronRight size={18} />
                </Link>
                {inactivity.active && (usuario.role === "Handler" || usuario.role === "Gerente") && (
                  <div className="alert-actions">
                    <StatusPill label={inactivity.emailRequired ? "Plataforma + correo" : "Plataforma"} tone="warn" />
                    {inactivity.readAt && <span className="alert-read-label">Leída</span>}
                    <button className="button-secondary small" type="button" onClick={() => markInactivityAlertRead(caso.id)}>
                      Marcar leída
                    </button>
                    <button className="button-secondary small" type="button" onClick={() => registerInactivityAlertSent(caso.id, "plataforma")}>
                      Registrar plataforma
                    </button>
                    {inactivity.emailRequired && (
                      <button className="button-secondary small" type="button" onClick={() => registerInactivityAlertSent(caso.id, "correo")}>
                        Registrar correo
                      </button>
                    )}
                    {usuario.role === "Gerente" && (
                      <>
                        <button className="button-secondary small" type="button" onClick={() => resolveInactivityAlert(caso.id, "cerrar")}>
                          Cerrar alerta
                        </button>
                        <button className="button-secondary small" type="button" onClick={() => resolveInactivityAlert(caso.id, "silenciar")}>
                          Silenciar
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
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

export function Metric({ title, value, icon, tone = "ok" }: { title: string; value: number; icon: React.ReactNode; tone?: "ok" | "warn" | "danger" }) {
  return (
    <div className="metric">
      <div className={cx("metric-icon", tone === "danger" && "bg-red-50 text-red-700", tone === "warn" && "bg-amber-50 text-amber-700")}>{icon}</div>
      <p>{title}</p>
      <strong>{value}</strong>
    </div>
  );
}

export function Distribution({ label, value, total }: { label: string; value: number; total: number }) {
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

export function BenchmarkPage() {
  const visibleCases = useVisibleCases();
  const { documentos, calculosPerdida, bitacora, usuario } = useDemoStore();
  if (usuario.role === "Handler" || usuario.role === "Inspector") return <Navigate to="/dashboard" replace />;

  const rows = HANDLERS.map((handler) => {
    const handlerCases = visibleCases.filter((caso) => caso.claimHandler === handler);
    const coverageValues = handlerCases.map((caso) => {
      const calculo = calculosPerdida.find((item) => item.casoId === caso.id);
      return documentChecklistCoverage(caso, documentos.filter((doc) => doc.casoId === caso.id), calculo);
    });
    const coverage = coverageValues.length
      ? Math.round(coverageValues.reduce((sum, value) => sum + value, 0) / coverageValues.length)
      : 0;
    const pendingDocumentCases = handlerCases.filter(
      (caso) => missingRequiredDocumentTypes(caso, documentos.filter((doc) => doc.casoId === caso.id), calculosPerdida.find((item) => item.casoId === caso.id)).length > 0
    ).length;
    const alerts = handlerCases.filter((caso) => {
      const prescription = prescriptionStatus(caso);
      return prescription.tone !== "ok" || inactivityAlert(caso, bitacora).active;
    }).length;
    const stale = handlerCases.filter((caso) => inactivityAlert(caso, bitacora).active).length;
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
          const calculo = calculosPerdida.find((item) => item.casoId === caso.id);
          return sum + documentChecklistCoverage(caso, documentos.filter((doc) => doc.casoId === caso.id), calculo);
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
          Docs pendientes = al menos un documento del checklist faltante. Alerta = prescripción no verde o inactividad activa al cumplir 15 días corridos; correo adicional desde riesgo de prescripción o 20 días sin movimiento.
        </div>
      </section>
    </AppShell>
  );
}
