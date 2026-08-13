export type UserRole = "Handler" | "Gerente" | "CEO";

export type CaseStatus =
  | "Datos incompletos"
  | "Preclaim"
  | "Documentación pendiente"
  | "Cálculo completo"
  | "Traspasado a FIS"
  | "Traspasado a Logistic";

export type Jurisdiccion = "Hamburgo" | "LaHaya";

export type DocumentType =
  | "Carta de notificación a la naviera"
  | "AoR"
  | "Carta de subrogación o LoA"
  | "BL"
  | "Booking"
  | "Factura de exportación"
  | "DUS"
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
  | "Sin clasificar";

export type EventType =
  | "cambio_estado"
  | "documento_cargado"
  | "calculo_generado"
  | "carta_generada"
  | "reversion_estado"
  | "analisis_confirmado"
  | "extraccion_revisada"
  | "informe_generado";

export type TransferDestination = "FIS" | "Logistic";

export type SessionUser = {
  role: UserRole;
  nombre: string;
};

export type Caso = {
  id: string;
  claimHandler: string;
  csClaimNo?: string;
  assured: string;
  opponent: string;
  vessel: string;
  voyage?: string;
  cargo?: string;
  placeOfShipment?: string;
  dateOfShipment?: string;
  placeOfDischarge?: string;
  dateOfDischarge?: string;
  surveyor?: string;
  claimAmount?: number;
  jurisdiccion?: Jurisdiccion;
  fechaPrescripcion?: string;
  causaDano?: string;
  tipoCaso?: string;
  resumenCaso?: string;
  causaPotencial?: string;
  fuentesCausa?: string[];
  propuestaPerdida?: ExtractedLossProposal;
  informeRevision?: ReviewReport;
  estado: CaseStatus;
  ultimaActualizacion: string;
  createdAt: string;
  analisisCausa?: DamageAnalysis;
};

export type Documento = {
  id: string;
  casoId: string;
  tipoDocumento: DocumentType;
  nombreArchivo: string;
  originalName?: string;
  pathMock: string;
  disponible: boolean;
  fechaCarga: string;
  relativePath?: string;
  textoExtraido?: string;
  datosExtraidos?: ExtractedCaseData;
  ocrUsado?: boolean;
};

export type ExtractedCaseData = {
  referencia?: string;
  csClaimNo?: string;
  assured?: string;
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
  propuestaPerdida?: ExtractedLossProposal;
};

export type ExtractedLossProposal = {
  moneda: "USD" | "CLP";
  metodo1_liquidacionReal?: number;
  metodo1_liquidacionComparativa?: number;
  metodo2_valorReporteMercado?: number;
  metodo2_liquidacionReal?: number;
  metodo3_valorFactura?: number;
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
    currency?: "USD" | "CLP";
    justification?: string;
  };
  checklist: Array<{
    label: string;
    status: "Disponible" | "Pendiente";
  }>;
};

export type UploadDraft = {
  originalName: string;
  tipoDocumento: DocumentType;
  relativePath?: string;
  textoExtraido?: string;
  datosExtraidos?: ExtractedCaseData;
  estadoExtraccion?: "procesado" | "procesado con OCR" | "parcial" | "no soportado" | "requiere OCR";
  ocrUsado?: boolean;
};

export type RubroAdicional = {
  concepto: string;
  monto: number;
};

export type CalculoPerdida = {
  casoId: string;
  moneda: "USD" | "CLP";
  tipoCambio?: number;
  metodo1_liquidacionReal?: number;
  metodo1_liquidacionComparativa?: number;
  metodo1_resultado?: number;
  metodo2_valorReporteMercado?: number;
  metodo2_liquidacionReal?: number;
  metodo2_resultado?: number;
  metodo3_valorFactura?: number;
  metodo3_ventaBrutaDestino?: number;
  metodo3_resultado?: number;
  rubrosAdicionales: RubroAdicional[];
  ventaAFirme: boolean;
  notaCreditoValor?: number;
  metodoSeleccionado?: "1" | "2" | "3";
  justificacionSeleccion?: string;
  montoFinalReclamo?: number;
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
  claimHandler: string;
  csClaimNo?: string;
  assured?: string;
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
  jurisdiccion?: Jurisdiccion;
  causaDano?: string;
  tipoCaso?: string;
  resumenCaso?: string;
  causaPotencial?: string;
  fuentesCausa?: string[];
  propuestaPerdida?: ExtractedLossProposal;
};
