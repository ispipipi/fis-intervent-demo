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


import { AppShell } from "./appShared";

export function ManualPage() {
  const { usuario } = useDemoStore();
  const modules = [
    {
      title: "1. Selector de rol",
      body:
        "Permite entrar como Handler, Gerente o CEO. El rol cambia los permisos y el alcance de datos: Handler ve y opera sus casos; Gerente supervisa el portafolio y configura los mantenedores; CEO revisa indicadores en modo lectura. El perfil Inspector y la Carta JSI están fuera de Fase 1 y requieren una evolución aprobada."
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
        "En Fase 1 puedes iniciar el caso cargando una carpeta documental ya descargada o completando el formulario. La solución no descarga información directamente desde plataformas ni lee correo, API o robots externos. La carpeta propone referencia, handler, datos del embarque, tipo de caso, resumen y causa; el handler revisa y corrige antes de guardar. La referencia automática sigue el formato PRE-FIS-CARRIER-AÑO-MM/AA-CORRELATIVO o PRE-FIS/CLIENTE-CARRIER-AÑO-MM/AA-CORRELATIVO. Las referencias antiguas se conservan y los cambios requieren motivo."
    },
    {
      title: "5. Documentos y checklist",
      body:
        "Permite cargar múltiples archivos o una carpeta, leer PDFs nativos, ejecutar OCR en español e inglés para PDFs escaneados e imágenes, y procesar XLS, XLSX y CSV. Sugiere tipo documental, confianza de clasificación y datos extraídos para revisión humana. La matriz separa la exigencia del estado: BL, notificación y su correspondencia PDF son obligatorios; termógrafos, liquidaciones comparativas, factura, liquidación por contenedor, nota de crédito y documentos de destrucción son condicionales según causa, método o tipo de caso; el resto queda como adicional hasta que el caso lo requiera. Cada fila permite registrar Disponible, Faltante, Solicitado, Recibido, Rechazado, No aplica, Ilegible o Pendiente de revisión. Un documento obligatorio o condicional aplicable no puede marcarse como No aplica. Cada archivo conserva diagnóstico de extracción y uso de OCR. Si un archivo no es legible, requiere OCR o no está soportado, el demo lo marca de forma individual y permite continuar con el resto. Si encuentra valores críticos distintos entre documentos, los muestra como conflicto y no elige automáticamente. Los umbrales de precisión y criterios formales de aceptación OCR aún requieren validación de FIS. La carga de una carpeta completa evita duplicar entradas ya presentes en el expediente. Los archivos cargados se conservan localmente en el navegador mediante IndexedDB y permanecen asociados al expediente; los documentos precargados del demo pueden contener solo metadata si no tienen un archivo adjunto original."
    },
    {
      title: "6. Análisis de causa de daño",
      body:
        "Si la causa es Temperatura y existe termógrafo, calcula desviación frente al rango exigido y sugiere mérito Alto, Medio o Bajo. La conclusión final siempre requiere confirmación humana."
    },
    {
      title: "7. Cálculo de pérdida",
      body:
        "Muestra tres métodos en paralelo: SMV con liquidaciones brutas, Reporte de mercado con valores brutos y Factura vs. venta neta de destino. Si los documentos contienen valores comparables, presenta una propuesta preliminar con fuentes para cargarla como base editable. Permite venta a firme, rubros adicionales y exige justificación mínima para guardar un método seleccionado. Admite USD, EUR, CLP, CNY, HKD y GBP; USD es la moneda por defecto. Cuando la moneda de origen difiere de la moneda de resultado, exige una tasa positiva, fecha y fuente, usando la dirección 1 moneda de origen = X moneda de resultado. La fecha aplicable se toma de la descarga del contenedor, la fuente oficial configurada es Xrate, se permite documentar una tasa manual y el monto final se redondea a dos decimales."
    },
    {
      title: "8. Seguimiento e historial",
      body:
        "Registra cambios de estado, documentos, cálculos, cartas, correcciones de referencia y reversiones con timestamp automático no editable. La reversión de estado solo está disponible para Gerente con motivo obligatorio. Si una referencia se repite, el sistema advierte y mantiene los expedientes separados."
    },
    {
      title: "9. Alertas de prescripción",
      body:
        `Calcula la fecha de prescripción desde la fecha de descarga o ETA, según el modo de transporte y la jurisdicción marítima aplicable. El modo terrestre usa 6 meses, el aéreo 2 años y el marítimo aplica La Haya (1 año) o Hamburgo (2 años para Chile/Perú). La fecha de recepción define el año de la referencia y los últimos cuatro dígitos se asignan incrementalmente por llegada. Usa semáforo verde, ámbar o rojo; una ETA se muestra siempre como estimación y exige confirmar la fecha real antes del traspaso. La alerta de inactividad usa días corridos en Santiago y se activa al cumplir ${INACTIVITY_ALERT_DAYS} días. Reinician el contador la carga o solicitud de documentos, el cálculo y el cambio de estado/traspaso; ver la pantalla o corregir datos no lo reinicia. Se muestra en plataforma diariamente al Handler responsable y Gerente; agrega correo cuando el caso está cerca de prescribir o alcanza 20 días. Los envíos, lecturas y cierres quedan en bitácora; solo Gerente puede cerrar o silenciar. En este demo el envío por plataforma/correo se registra como simulado; el envío real requiere un servicio backend.`
    },
    {
      title: "10. Cartas automatizadas",
      body:
        "Permite seleccionar Claim Notice / Notificación a la naviera, AoR, Harvest o LoA, completar sus campos parametrizados y editar el contenido. La carta queda pendiente hasta que el handler responsable la aprueba; recién entonces se habilitan copiar, imprimir, descargar PDF real o descargar Word real en formato DOCX. Claim Notice y notificación a la naviera son el mismo documento y requieren conservar la correspondencia de envío en PDF. No se genera una quinta carta separada para SUBRO o certificados de destrucción en este alcance."
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
        "Desde la pestaña Informe, el Handler responsable selecciona FIS para recupero extrajudicial o Lawgistic para recupero judicial y genera un resumen con documentación disponible y pendiente, causa propuesta, mérito preliminar y cálculo seleccionado. El traspaso normal exige el checklist completo. Si el caso está próximo a prescribir o requiere pedir extensión, judicializar o interrumpir la prescripción, el Handler puede autorizar un traspaso excepcional registrando motivo, usuario, fecha, pendientes y acciones siguientes. El informe queda en el historial y se puede descargar. El traspaso es un cambio de estado, no una entrega a otro sistema ni un bloqueo de lectura: el expediente sigue editable por el Handler responsable. Gerencia puede revertirlo con motivo obligatorio."
    },
    {
      title: "14. Historial consolidado",
      body:
        "El historial se precarga automáticamente con los casos históricos incluidos en el demo y consolida también los casos generados desde la plataforma. Cada registro muestra una marca de origen: Importado o Generado en sistema. Los importados conservan hoja, fila, campos identificados y referencias repetidas; los generados enlazan al expediente activo. El historial se puede buscar, filtrar y descargar."
    },
    {
      title: "15. Alcance de Fase 1",
      body:
        "El alcance contractual de Fase 1 contempla Handler, Gerente y CEO. El perfil Inspector, la asignación restringida de casos y la Carta JSI no forman parte del baseline firmado; quedan documentados como evolución o Change Request para una etapa posterior."
    },
    {
      title: "16. Glosario de nomenclatura",
      body:
        "Los nombres oficiales usados por el demo son Claim Notice para la notificación a la naviera, Lawgistic para el destino de recupero judicial y FIS para el destino de recupero extrajudicial. Las variantes antiguas Logistic y claim notice se normalizan solo al migrar datos heredados."
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
              <li>Entrar a Historial para consultar todos los casos, diferenciando los importados de los generados en la plataforma.</li>
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
              <li>El aviso de inactividad se activa con más de 15 días desde el último evento válido de bitácora; excluye casos traspasados y se muestra al handler responsable y a Gerente/CEO.</li>
              <li>No hay jurisdicción marítima por defecto.</li>
              <li>No hay prescripción sin fecha de descarga y regla de transporte aplicable.</li>
              <li>La ETA no reemplaza la fecha real de descarga para el traspaso normal; un caso con ETA puede derivarse excepcionalmente con autorización y motivo registrado.</li>
              <li>No hay cálculo guardado sin justificación suficiente.</li>
              <li>El traspaso cambia el estado, pero no bloquea la lectura ni la edición posterior del expediente por su Handler responsable.</li>
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
