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


import { AppShell, HISTORY_PAGE_SIZE, useVisibleCases, cx, EmptyState, vesselVoyageKey, STATUS_LABELS, StatusPill } from "./appShared";
import { Metric } from "./dashboardPages";

export function CasesPage() {
  const visibleCases = useVisibleCases();
  const { documentos, calculosPerdida, bitacora, usuario } = useDemoStore();
  const location = useLocation();
  const vesselGroup = new URLSearchParams(location.search).get("group") || "";
  const metricFilter = new URLSearchParams(location.search).get("metric") || "all";
  const handlerFilter = new URLSearchParams(location.search).get("handler") || "Todos";
  const metricLabels: Record<string, string> = {
    all: "Todos los casos",
    alerts: "Casos con alertas",
    stale: "Casos sin movimiento",
    "documents-loaded": "Casos con documentos cargados",
    "missing-docs": "Casos con documentos pendientes",
    complete: "Casos con cálculo completo"
  };
  const metricLabel = metricLabels[metricFilter];
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
    const matchesMetric = metricFilter === "all"
      || (metricFilter === "alerts" && (prescriptionStatus(caso).tone !== "ok" || inactivityAlert(caso, bitacora).active))
      || (metricFilter === "stale" && inactivityAlert(caso, bitacora).active)
      || (metricFilter === "documents-loaded" && caseDocs.length > 0)
      || (metricFilter === "missing-docs" && missingRequiredDocumentTypes(caso, caseDocs, calculosPerdida.find((item) => item.casoId === caso.id)).length > 0)
      || (metricFilter === "complete" && caso.estado === "Cálculo completo");
    return text.includes(query.toLowerCase())
      && matchesMetric
      && (status === "Todos" || caso.estado === status)
      && (handlerFilter === "Todos" || caso.claimHandler === handlerFilter)
      && (!vesselGroup || vesselVoyageKey(caso) === vesselGroup);
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
      {(vesselGroup || metricFilter !== "all" || handlerFilter !== "Todos") && (
        <div className="notice mb-4" role="status">
          {metricLabel && metricFilter !== "all" && <>KPI activo: <strong>{metricLabel}</strong>. </>}
          {handlerFilter !== "Todos" && <>Handler: <strong>{handlerFilter}</strong>. </>}
          {vesselGroup && <>Filtro activo: casos de la misma nave y viaje. </>}
          <Link className="text-link" to="/casos">Quitar filtros</Link>
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

export function HistoricalMemoryPage() {
  const { historico, casos, documentos, calculosPerdida, bitacora, usuario, historicoCargando, hydrateHistoricalCases } = useDemoStore();
  const [query, setQuery] = useState("");
  const [origin, setOrigin] = useState("Todos");
  const [category, setCategory] = useState("Todos");
  const [quickFilter, setQuickFilter] = useState<"all" | "imported" | "generated" | "duplicates">("all");
  const [historyPage, setHistoryPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string>();
  const duplicateKeys = new Set(
    [...historico.reduce((counts, record) => counts.set(record.referenceKey, (counts.get(record.referenceKey) || 0) + 1), new Map<string, number>())]
      .filter(([, count]) => count > 1)
      .map(([referenceKey]) => referenceKey)
  );
  useEffect(() => {
    if (usuario.role !== "Inspector") void hydrateHistoricalCases();
  }, [hydrateHistoricalCases, usuario.role]);
  if (usuario.role === "Inspector") return <Navigate to="/casos" replace />;
  const visibleActiveCases = casos;
  const unifiedRecords: UnifiedHistoryRecord[] = [
    ...historico.map((record) => ({
      id: `imported:${record.id}`,
      reference: record.reference,
      origin: "Importado" as const,
      category: record.category,
      assured: record.assured,
      opponent: record.opponent,
      vessel: record.vessel,
      voyage: record.voyage,
      handler: record.claimHandler,
      source: `${record.sourceSheet} · fila ${record.sourceRow}`,
      historical: record
    })),
    ...visibleActiveCases.map((caso) => ({
      id: `system:${caso.id}`,
      reference: caso.id,
      origin: "Generado en sistema" as const,
      category: caso.estado,
      assured: caso.assured,
      opponent: caso.opponent,
      vessel: caso.vessel,
      voyage: caso.voyage,
      handler: caso.claimHandler,
      source: "Expediente activo",
      active: caso
    }))
  ];
  const filtered = unifiedRecords.filter((record) => {
    const historical = record.historical;
    const active = record.active;
    const haystack = [
      record.reference,
      record.handler,
      record.assured,
      record.opponent,
      record.vessel,
      record.voyage,
      historical?.csClaimNo,
      historical?.incidentSummaryRaw,
      historical?.missingDocumentsRaw,
      active?.csClaimNo,
      active?.resumenCaso,
      active?.causaPotencial
    ].join(" ").toLowerCase();
    const matchesQuickFilter = quickFilter === "all"
      || (quickFilter === "imported" && record.origin === "Importado")
      || (quickFilter === "generated" && record.origin === "Generado en sistema")
      || (quickFilter === "duplicates" && Boolean(record.historical && duplicateKeys.has(record.historical.referenceKey)));
    return matchesQuickFilter
      && haystack.includes(query.toLowerCase())
      && (origin === "Todos" || record.origin === origin)
      && (category === "Todos" || record.category === category);
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / HISTORY_PAGE_SIZE));
  const currentPage = Math.min(historyPage, pageCount);
  const pagedRecords = filtered.slice((currentPage - 1) * HISTORY_PAGE_SIZE, currentPage * HISTORY_PAGE_SIZE);
  const selected = unifiedRecords.find((record) => record.id === selectedId);
  const scrollToHistoryDetail = () => {
    window.setTimeout(() => document.getElementById("history-selected-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };
  const selectHistoryRecord = (recordId?: string) => {
    setSelectedId(recordId);
    scrollToHistoryDetail();
  };
  const selectHistoryKpi = (filter: "all" | "imported" | "generated" | "duplicates") => {
    setQuickFilter(filter);
    setQuery("");
    setOrigin("Todos");
    setCategory("Todos");
    setHistoryPage(1);
    const target = unifiedRecords.find((record) => filter === "all"
      || (filter === "imported" && record.origin === "Importado")
      || (filter === "generated" && record.origin === "Generado en sistema")
      || (filter === "duplicates" && Boolean(record.historical && duplicateKeys.has(record.historical.referenceKey))));
    setSelectedId(target?.id);
    scrollToHistoryDetail();
  };
  return (
    <AppShell>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Historial operativo</p>
          <h2>Historial de casos</h2>
          <p className="section-subtitle">Consulta en un solo lugar los casos importados y los casos generados desde la plataforma. Cada registro conserva una marca de origen.</p>
        </div>
        <button className="button-secondary" type="button" disabled={unifiedRecords.length === 0} onClick={() => exportUnifiedHistoryXlsx(historico, visibleActiveCases, documentos, calculosPerdida, bitacora, `historial-completo-${new Date().toISOString().slice(0, 10)}.xlsx`)}>
          <Download size={17} /> Descargar historial
        </button>
      </div>

      <section className="history-scope-panel" aria-label="Alcance del historial consolidado">
        <div className="history-scope-icon"><History size={20} /></div>
        <div className="history-scope-copy">
          <p className="eyebrow">Alcance contractual</p>
          <h3>Historial consolidado: {unifiedRecords.length.toLocaleString("es-CL")} registros visibles</h3>
          <p>La carga histórica forma parte del sistema y no requiere subir el Excel manualmente. Los casos importados y los casos generados en la plataforma se mantienen diferenciados por su marca de origen.</p>
        </div>
        <div className="history-scope-facts">
          <div><strong>{historico.length.toLocaleString("es-CL")}</strong><span>importados</span></div>
          <div><strong>{visibleActiveCases.length.toLocaleString("es-CL")}</strong><span>generados en sistema</span></div>
          <div><strong>{HISTORICAL_BASELINE.sheets}</strong><span>hojas fuente</span></div>
        </div>
      </section>

      <section className="history-metrics">
        <Metric title="Registros visibles" value={unifiedRecords.length} icon={<History size={20} />} onClick={() => selectHistoryKpi("all")} buttonLabel="Ver todos los registros" />
        <Metric title="Importados" value={historico.length} icon={<FileText size={20} />} onClick={() => selectHistoryKpi("imported")} buttonLabel="Ver registros importados" />
        <Metric title="Generados en sistema" value={visibleActiveCases.length} icon={<ClipboardList size={20} />} onClick={() => selectHistoryKpi("generated")} buttonLabel="Ver casos generados en el sistema" />
        <Metric title="Referencias repetidas" value={duplicateKeys.size} icon={<AlertTriangle size={20} />} tone={duplicateKeys.size > 0 ? "warn" : "ok"} onClick={() => selectHistoryKpi("duplicates")} buttonLabel="Ver referencias repetidas" />
      </section>

      <p className="history-memory-note">
        Los importados conservan su hoja y fila de origen. Los generados en sistema enlazan al expediente activo y pueden continuar su ciclo operativo. Los cálculos históricos son evidencia de referencia; no se convierten en una decisión automática.
      </p>

      <section className="history-layout mt-5">
        <div className="history-list-panel panel">
          <div className="panel-title">
            <div>
              <h3>Todos los casos</h3>
              <p className="panel-kicker">Cada fila indica si fue importada o generada en el sistema.</p>
            </div>
            <span>{unifiedRecords.length.toLocaleString("es-CL")} total</span>
          </div>
          <div className="toolbar history-toolbar">
            <div className="search-box">
              <Search size={18} />
              <input value={query} onChange={(event) => { setQuery(event.target.value); setQuickFilter("all"); setHistoryPage(1); setSelectedId(undefined); }} placeholder="Buscar referencia, cliente, nave..." />
            </div>
            <select className="input history-category-filter" value={origin} onChange={(event) => { setOrigin(event.target.value); setQuickFilter("all"); setHistoryPage(1); setSelectedId(undefined); }}>
              <option>Todos</option>
              <option>Importado</option>
              <option>Generado en sistema</option>
            </select>
            <select className="input history-category-filter" value={category} onChange={(event) => { setCategory(event.target.value); setQuickFilter("all"); setHistoryPage(1); setSelectedId(undefined); }}>
              <option>Todos</option>
              {["Preclaim", "FIS", "Presentar", "Traspasado", "Descartado", "Datos incompletos", "Documentación pendiente", "Cálculo completo", "Traspasado a FIS", "Traspasado a Lawgistic"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          {historicoCargando ? (
            <EmptyState text="Cargando historial..." />
          ) : unifiedRecords.length === 0 ? (
            <EmptyState text="No fue posible cargar el historial de casos." />
          ) : (
            <div className="history-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Referencia</th>
                    <th>Origen</th>
                    <th>Asegurado</th>
                    <th>Nave / viaje</th>
                    <th>Handler</th>
                    <th>Fuente</th>
                    <th>Clase</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRecords.map((record) => (
                    <tr key={record.id} className={cx("history-row", selectedId === record.id && "selected")}>
                      <td>
                        <button type="button" className="history-record-button" onClick={() => selectHistoryRecord(record.id)}>
                          <strong>{record.reference}</strong>
                          {record.historical && duplicateKeys.has(record.historical.referenceKey) && <span>Referencia repetida</span>}
                        </button>
                      </td>
                      <td><StatusPill label={record.origin} tone={record.origin === "Importado" ? "missing" : "ok"} /></td>
                      <td>{record.assured || "Sin dato"}</td>
                      <td>{record.vessel || "Sin nave"}<span className="block text-xs text-slate-500">{record.voyage || "Sin viaje"}</span></td>
                      <td>{record.handler || "Sin asignar"}</td>
                      <td>{record.source}</td>
                      <td><StatusPill label={record.category} tone={record.category.includes("Traspasado") || record.category === "FIS" ? "ok" : record.category === "Descartado" || record.category === "Datos incompletos" ? "missing" : "warn"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && <EmptyState text="No hay registros para los filtros seleccionados." />}
              {filtered.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3" aria-label="Paginación del historial">
                  <p className="text-xs text-slate-500">
                    Mostrando {((currentPage - 1) * HISTORY_PAGE_SIZE) + 1}-{Math.min(currentPage * HISTORY_PAGE_SIZE, filtered.length)} de {filtered.length.toLocaleString("es-CL")} registros
                  </p>
                  <div className="flex items-center gap-2">
                    <button className="button-secondary small" type="button" disabled={currentPage === 1} onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}>
                      <ChevronLeft size={15} /> Anterior
                    </button>
                    <span className="text-xs text-slate-500">Página {currentPage} de {pageCount}</span>
                    <button className="button-secondary small" type="button" disabled={currentPage === pageCount} onClick={() => setHistoryPage((page) => Math.min(pageCount, page + 1))}>
                      Siguiente <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {selected?.historical ? <HistoricalRecordDetail record={selected.historical} duplicate={duplicateKeys.has(selected.historical.referenceKey)} /> : <SystemCaseHistoryDetail caso={selected?.active} canOpen={selected?.active ? usuario.role !== "Handler" || selected.active.claimHandler === usuario.nombre : false} />}
      </section>
    </AppShell>
  );
}

type UnifiedHistoryRecord = {
  id: string;
  reference: string;
  origin: "Importado" | "Generado en sistema";
  category: string;
  assured?: string;
  opponent?: string;
  vessel?: string;
  voyage?: string;
  handler?: string;
  source: string;
  historical?: HistoricalCase;
  active?: Caso;
};

export function SystemCaseHistoryDetail({ caso, canOpen }: { caso?: Caso; canOpen: boolean }) {
  if (!caso) {
    return <section id="history-selected-detail" className="panel history-detail"><EmptyState text="Selecciona un registro para consultar su detalle." /></section>;
  }
  return (
    <section id="history-selected-detail" className="panel history-detail">
      <div className="panel-title">
        <div>
          <p className="eyebrow">Generado en sistema</p>
          <h3>{caso.id}</h3>
        </div>
        <StatusPill label="Expediente activo" tone="ok" />
      </div>
      <div className="history-detail-grid">
        <HistoricalValue label="Estado" value={caso.estado} />
        <HistoricalValue label="Handler" value={caso.claimHandler} />
        <HistoricalValue label="CS Claim No" value={caso.csClaimNo} />
        <HistoricalValue label="Asegurado" value={caso.assured} />
        <HistoricalValue label="Oponente" value={caso.opponent} />
        <HistoricalValue label="Nave / viaje" value={[caso.vessel, caso.voyage].filter(Boolean).join(" / ")} />
        <HistoricalValue label="Carga" value={caso.cargo} />
        <HistoricalValue label="Fecha de descarga / ETA" value={caso.dateOfDischarge} />
        <HistoricalValue label="Última actualización" value={new Date(caso.ultimaActualizacion).toLocaleString("es-CL")} />
      </div>
      <div className="history-detail-block">
        <strong>Resumen del caso</strong>
        <p>{caso.resumenCaso || caso.causaPotencial || "Sin resumen registrado."}</p>
      </div>
      <div className="history-source-note">Creado el {new Date(caso.createdAt).toLocaleString("es-CL")} desde el flujo de ingreso de la plataforma.</div>
      {canOpen ? (
        <Link className="button-secondary mt-4 inline-flex" to={`/casos/${encodeURIComponent(caso.id)}`}>
          Abrir expediente
        </Link>
      ) : (
        <p className="notice mt-4">El expediente pertenece a otro Handler. Puedes consultar este registro aquí, pero la edición queda restringida al responsable.</p>
      )}
    </section>
  );
}

export function HistoricalRecordDetail({ record, duplicate }: { record?: HistoricalCase; duplicate: boolean }) {
  if (!record) {
    return <section id="history-selected-detail" className="panel history-detail"><EmptyState text="Selecciona un registro para consultar su ficha original." /></section>;
  }
  return (
    <section id="history-selected-detail" className="panel history-detail">
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
        Registro importado desde el historial contractual. Fuente: hoja <strong>{record.sourceSheet}</strong>, fila <strong>{record.sourceRow}</strong>. Cargado el {new Date(record.importedAt).toLocaleString("es-CL")}. El archivo histórico incluido permanece asociado al historial del demo.
      </div>
      <details className="history-raw-details">
        <summary>Ver trazabilidad de la fila original</summary>
        <p className="history-source-note">Los valores completos se conservan en el archivo Excel asociado. Esta ficha muestra los campos identificados para consulta rápida, junto con la hoja y fila de origen.</p>
      </details>
    </section>
  );
}

export function HistoricalCalculationDetail({ insight }: { insight: NonNullable<HistoricalCase["calculoHistorico"]> }) {
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

export function HistoricalValue({ label, value }: { label: string; value?: string }) {
  return <div className="history-value"><span>{label}</span><strong>{value || "Sin dato"}</strong></div>;
}
