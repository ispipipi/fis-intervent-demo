export type UserRole = "Handler" | "Gerente" | "CEO" | "Inspector";

export type CalculationMethodId = "1" | "2" | "3" | "firm";

export type TemplateId = "claim-notice" | "aor" | "harvest" | "loa";

export type TemplateDownloadFormat = "html" | "pdf" | "word";

export type CalculationMethodConfig = {
  id: CalculationMethodId;
  title: string;
  description: string;
  formula: string;
  active: boolean;
  updatedAt: string;
};

export type TemplateConfig = {
  id: TemplateId;
  title: string;
  shortTitle: string;
  description: string;
  language: string;
  fields: string[];
  baseContent: string;
  active: boolean;
  version?: number;
  officialName?: string;
  effectiveDate?: string;
  logoText?: string;
  headerText?: string;
  footerText?: string;
  sender?: string;
  recipient?: string;
  legalText?: string;
  requiredFields?: string[];
  optionalFields?: string[];
  manualEditableFields?: string[];
  lockedFields?: string[];
  signatureRule?: string;
  authorizedSigner?: string;
  downloadFormats?: TemplateDownloadFormat[];
  requiresSerialNumber?: boolean;
  requiredAttachments?: string[];
  updatedAt: string;
};

export type LetterApproval = {
  templateId: TemplateId;
  version: number;
  fingerprint: string;
  approvedAt: string;
  approvedBy: string;
};

export type CaseStatus =
  | "Datos incompletos"
  | "Preclaim"
  | "Documentación pendiente"
  | "Cálculo completo"
  | "Traspasado a FIS"
  | "Traspasado a Lawgistic";

export type Jurisdiccion = "Hamburgo" | "LaHaya";

export type DischargeDateType = "Real" | "ETA";

export type CurrencyCode = "USD" | "EUR" | "CLP" | "CNY" | "HKD" | "GBP";

export type DocumentType =
  | "Carta de notificación a la naviera"
  | "AoR"
  | "Carta de subrogación o LoA"
  | "Carta de asignación de derechos"
  | "BL"
  | "Booking"
  | "Factura de exportación"
  | "Nota de crédito"
  | "Correspondencia de notificación"
  | "DUS"
  | "IVV"
  | "Packing List"
  | "Certificado fitosanitario"
  | "Certificado de origen"
  | "Liquidaciones comparativas o informe de mercado"
  | "Liquidación por contenedor"
  | "Tracking (naviera)"
  | "Informes de QC en origen y destino"
  | "Reportes de inspección"
  | "Certificado de cosecha"
  | "Registros de termógrafos"
  | "Certificado de destrucción"
  | "Factura de destrucción"
  | "Sin clasificar";

export type DocumentStatus =
  | "disponible"
  | "faltante"
  | "solicitado"
  | "recibido"
  | "rechazado"
  | "no aplica"
  | "ilegible"
  | "pendiente de revisión";

export type ExtractionStatus = "procesado" | "procesado con OCR" | "parcial" | "no soportado" | "requiere OCR";

export type EventType =
  | "cambio_estado"
  | "caso_actualizado"
  | "documento_cargado"
  | "documento_solicitado"
  | "documento_eliminado"
  | "calculo_generado"
  | "carta_generada"
  | "carta_aprobada"
  | "reversion_estado"
  | "analisis_confirmado"
  | "extraccion_revisada"
  | "inspeccion_registrada"
  | "informe_generado"
  | "alerta_inactividad_enviada"
  | "alerta_inactividad_leida"
  | "alerta_inactividad_cerrada";

export type TransferDestination = "FIS" | "Lawgistic";

export type SessionUser = {
  role: UserRole;
  nombre: string;
};

export type InactivityAlertChannel = "plataforma" | "correo";

export type InactivityAlertState = {
  estado: "abierta" | "cerrada" | "silenciada";
  lastHandledAt?: string;
  readAt?: string;
  lastPlatformSentAt?: string;
  lastEmailSentAt?: string;
};

export type Caso = {
  id: string;
  codigoCliente?: string;
  documentStatuses?: Partial<Record<DocumentType, DocumentStatus>>;
  claimHandler: string;
  csClaimNo?: string;
  assured: string;
  consignee?: string;
  opponent: string;
  vessel: string;
  voyage?: string;
  cargo?: string;
  placeOfShipment?: string;
  dateOfShipment?: string;
  placeOfDischarge?: string;
  dateOfDischarge?: string;
  dateOfDischargeType?: DischargeDateType;
  surveyor?: string;
  claimAmount?: number;
  jurisdiccion?: Jurisdiccion;
  fechaPrescripcion?: string;
  causaDano?: string;
  tipoCaso?: string;
  resumenCaso?: string;
  causaPotencial?: string;
  fuentesCausa?: string[];
  conflictosExtraccion?: string[];
  propuestaPerdida?: ExtractedLossProposal;
  informeRevision?: ReviewReport;
  estado: CaseStatus;
  alertaInactividad?: InactivityAlertState;
  ultimaActualizacion: string;
  createdAt: string;
  analisisCausa?: DamageAnalysis;
  inspectorAsignado?: string;
  fechaInspeccion?: string;
  inspeccionConjunta?: boolean;
  resumenInspeccion?: string;
  cartasAprobadas?: LetterApproval[];
};

export type HistoricalCategory = "Preclaim" | "FIS" | "Presentar" | "Traspasado" | "Descartado" | "Histórico";

export type HistoricalCase = {
  id: string;
  reference: string;
  referenceKey: string;
  legacyStatus?: string;
  missingDocumentsRaw?: string;
  incidentSummaryRaw?: string;
  claimHandler?: string;
  csClaimNo?: string;
  assured?: string;
  consignee?: string;
  opponent?: string;
  vessel?: string;
  voyage?: string;
  placeOfDischarge?: string;
  dateOfDischarge?: string;
  dateOfLoading?: string;
  surveyor?: string;
  commodity?: string;
  claimAmount?: number;
  calculoHistorico?: HistoricalCalculationInsight;
  category: HistoricalCategory;
  sourceFileName?: string;
  sourceSheet: string;
  sourceRow: number;
  sourceBatchId: string;
  importedAt: string;
};

export type HistoricalCalculationMethod =
  | "SMV vs liquidación"
  | "SMV vs venta destino"
  | "Factura vs venta destino"
  | "Venta firme / nota de crédito"
  | "Monto histórico sin fórmula";

export type HistoricalCalculationInsight = {
  method: HistoricalCalculationMethod;
  formula: string;
  referenceValue?: number;
  actualValue?: number;
  exchangeRate?: number;
  result?: number;
  currency?: string;
  sourceFields: string[];
  confidence: "Completo" | "Parcial" | "Monto informado";
  note?: string;
};

export type HistorySheetSummary = {
  sheetName: string;
  headerRow: number;
  importedRows: number;
  skippedRows: number;
};

export type HistoryImportBatch = {
  batchId: string;
  fileName: string;
  importedAt: string;
  records: HistoricalCase[];
  sheets: HistorySheetSummary[];
  duplicateReferenceKeys: string[];
};

export type Documento = {
  id: string;
  casoId: string;
  tipoDocumento: DocumentType;
  nombreArchivo: string;
  originalName?: string;
  pathMock: string;
  disponible: boolean;
  estadoDocumental?: DocumentStatus;
  fechaCarga: string;
  clasificacionConfianza?: "Alta" | "Media" | "Baja";
  estadoExtraccion?: ExtractionStatus;
  relativePath?: string;
  textoExtraido?: string;
  datosExtraidos?: ExtractedCaseData;
  ocrUsado?: boolean;
};

export type ExtractedCaseData = {
  referencia?: string;
  csClaimNo?: string;
  assured?: string;
  consignee?: string;
  opponent?: string;
  vessel?: string;
  voyage?: string;
  cargo?: string;
  placeOfShipment?: string;
  dateOfShipment?: string;
  placeOfDischarge?: string;
  dateOfDischarge?: string;
  surveyor?: string;
  claimAmount?: number;
  tipoCaso?: string;
  resumenCaso?: string;
  causaPotencial?: string;
  fuentesCausa?: string[];
  referenciasDetectadas?: string[];
  conflictosDetectados?: string[];
  propuestaPerdida?: ExtractedLossProposal;
};

export type ExtractedLossProposal = {
  moneda: CurrencyCode;
  monedaOrigen?: CurrencyCode;
  tipoCambio?: number;
  tipoCambioFecha?: string;
  tipoCambioFuente?: string;
  cantidadAfectada?: number;
  unidadCalculo?: string;
  metodo1_cantidadReferencia?: number;
  metodo1_liquidacionReal?: number;
  metodo1_liquidacionComparativa?: number;
  metodo2_cantidadReferencia?: number;
  metodo2_valorReporteMercado?: number;
  metodo2_liquidacionReal?: number;
  metodo3_valorFactura?: number;
  metodo3_ventaNetaDestino?: number;
  /** @deprecated Se conserva para leer propuestas antiguas del demo. */
  metodo3_ventaBrutaDestino?: number;
  rubrosAdicionales: RubroAdicional[];
  montoFinalReclamo?: number;
  fuentes: string[];
};

export type ReviewReport = {
  caseId: string;
  generatedAt: string;
  generatedBy: string;
  destination: TransferDestination;
  status: "Listo para traspaso" | "Con observaciones";
  ready: boolean;
  executiveSummary: string;
  availableDocuments: string[];
  missingDocuments: string[];
  pendingActions: string[];
  recommendedCause?: string;
  causeSources: string[];
  preliminaryMerit?: "Alto" | "Medio" | "Bajo" | "Pendiente";
  selectedCalculation?: {
    method: string;
    amount?: number;
    currency?: CurrencyCode;
    justification?: string;
  };
  closureChecklist?: ReviewGate[];
  checklist: Array<{
    label: string;
    status: "Disponible" | "Pendiente";
  }>;
};

export type ReviewGate = {
  id: string;
  label: string;
  status: "Cumplido" | "Pendiente";
  detail: string;
};

export type UploadDraft = {
  originalName: string;
  tipoDocumento: DocumentType;
  clasificacionConfianza?: "Alta" | "Media" | "Baja";
  relativePath?: string;
  textoExtraido?: string;
  datosExtraidos?: ExtractedCaseData;
  estadoExtraccion?: ExtractionStatus;
  ocrUsado?: boolean;
};

export type RubroAdicional = {
  concepto: string;
  monto: number;
};

export type CalculoPerdida = {
  casoId: string;
  moneda: CurrencyCode;
  monedaOrigen?: CurrencyCode;
  tipoCambio?: number;
  tipoCambioFecha?: string;
  tipoCambioFuente?: string;
  cantidadAfectada?: number;
  unidadCalculo?: string;
  metodo1_cantidadReferencia?: number;
  metodo1_liquidacionReal?: number;
  metodo1_liquidacionComparativa?: number;
  metodo1_resultado?: number;
  metodo2_cantidadReferencia?: number;
  metodo2_valorReporteMercado?: number;
  metodo2_liquidacionReal?: number;
  metodo2_resultado?: number;
  metodo3_valorFactura?: number;
  metodo3_ventaNetaDestino?: number;
  /** @deprecated Se conserva para leer cálculos antiguos del demo. */
  metodo3_ventaBrutaDestino?: number;
  metodo3_resultado?: number;
  rubrosAdicionales: RubroAdicional[];
  ventaAFirme: boolean;
  notaCreditoValor?: number;
  metodoSeleccionado?: "1" | "2" | "3";
  justificacionSeleccion?: string;
  resultadoSeleccionadoFirmado?: number;
  montoFinalReclamo?: number;
  fuentes?: string[];
  updatedAt: string;
};

export type BitacoraEvento = {
  id: string;
  casoId: string;
  timestamp: string;
  tipoEvento: EventType;
  detalle: string;
  usuario: string;
};

export type DamageAnalysis = {
  temperaturaRegistrada?: number;
  rangoMinimo?: number;
  rangoMaximo?: number;
  desviacion?: number;
  meritoSugerido?: "Alto" | "Medio" | "Bajo";
  conclusionFinal: string;
  confirmadoPor: string;
  confirmadoAt: string;
};

export type NewCaseInput = {
  id?: string;
  codigoCliente?: string;
  claimHandler: string;
  csClaimNo?: string;
  assured?: string;
  consignee?: string;
  opponent?: string;
  vessel?: string;
  voyage?: string;
  cargo?: string;
  placeOfShipment?: string;
  dateOfShipment?: string;
  placeOfDischarge?: string;
  dateOfDischarge?: string;
  dateOfDischargeType?: DischargeDateType;
  surveyor?: string;
  claimAmount?: number;
  jurisdiccion?: Jurisdiccion;
  causaDano?: string;
  tipoCaso?: string;
  resumenCaso?: string;
  causaPotencial?: string;
  fuentesCausa?: string[];
  propuestaPerdida?: ExtractedLossProposal;
  inspectorAsignado?: string;
};
