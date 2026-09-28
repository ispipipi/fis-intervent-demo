import {
  BitacoraEvento,
  CalculoPerdida,
  CaseStatus,
  Caso,
  DamageAnalysis,
  DocumentType,
  DocumentStatus,
  Documento,
  NewCaseInput,
  ReviewReport,
  SessionUser,
  TransferDestination,
  UploadDraft,
  HistoricalCase,
  HistoryImportBatch,
  CalculationMethodConfig,
  TemplateConfig,
  CalculationMethodId,
  TemplateId,
  DischargeDateType,
  LetterApproval,
  InactivityAlertChannel,
  InactivityAlertState,
  TransportMode,
  ExceptionalTransferAuthorization
} from "../types/domain";

export type DemoState = {
  usuario: SessionUser;
  casos: Caso[];
  documentos: Documento[];
  calculosPerdida: CalculoPerdida[];
  bitacora: BitacoraEvento[];
  historico: HistoricalCase[];
  calculationMethods: CalculationMethodConfig[];
  templateConfigs: TemplateConfig[];
  ultimaImportacionHistorico?: Omit<HistoryImportBatch, "records"> & { records: number };
  historicoCargando: boolean;
  setUsuario: (usuario: SessionUser) => void;
  createCase: (input: NewCaseInput, complete: boolean) => Caso;
  updateCase: (casoId: string, patch: Partial<Caso>) => void;
  updateCaseDetails: (
    casoId: string,
    patch: Partial<Pick<Caso, "id" | "dateOfDischarge" | "dateOfDischargeType" | "fechaRecepcion" | "modoTransporte" | "jurisdiccion">>,
    referenceChangeReason?: string
  ) => { ok: boolean; error?: string };
  prepareUpload: (files: FileList | File[]) => UploadDraft[];
  confirmUpload: (casoId: string, drafts: UploadDraft[], options?: { initialUpload?: boolean }) => Promise<void>;
  updateDocumentStatus: (casoId: string, type: DocumentType, status: DocumentStatus) => { ok: boolean; error?: string };
  requestMissingDocuments: (casoId: string, types: DocumentType[]) => { ok: boolean; error?: string };
  registerInactivityAlertSent: (casoId: string, channel: InactivityAlertChannel) => { ok: boolean; error?: string };
  markInactivityAlertRead: (casoId: string) => { ok: boolean; error?: string };
  resolveInactivityAlert: (casoId: string, action: "cerrar" | "silenciar") => { ok: boolean; error?: string };
  removeDocument: (documentId: string) => void;
  saveAnalysis: (casoId: string, analysis: DamageAnalysis) => void;
  saveCalculation: (calculation: CalculoPerdida) => { ok: boolean; error?: string };
  generateReviewReport: (casoId: string, destination: TransferDestination) => ReviewReport | undefined;
  transitionCase: (casoId: string, nextStatus: CaseStatus, detail: string, exceptionalReason?: string) => { ok: boolean; error?: string };
  revertCase: (casoId: string, previousStatus: CaseStatus, reason: string) => { ok: boolean; error?: string };
  registerLetter: (casoId: string, templateId: TemplateId, fingerprint: string, detail: string) => void;
  approveLetter: (casoId: string, approval: Pick<LetterApproval, "templateId" | "version" | "fingerprint">) => { ok: boolean; error?: string };
  assignInspector: (casoId: string, inspector?: string) => { ok: boolean; error?: string };
  saveInspection: (
    casoId: string,
    patch: Partial<Pick<Caso, "fechaInspeccion" | "inspeccionConjunta" | "resumenInspeccion">>
  ) => { ok: boolean; error?: string };
  updateCalculationMethod: (id: CalculationMethodId, patch: Partial<Omit<CalculationMethodConfig, "id" | "updatedAt">>) => void;
  resetCalculationMethods: () => void;
  updateTemplateConfig: (id: TemplateId, patch: Partial<Omit<TemplateConfig, "id" | "updatedAt">>) => void;
  resetTemplateConfigs: () => void;
  hydrateHistoricalCases: () => Promise<void>;
  resetDemo: () => void;
};

export type StoreSet = (partial: Partial<DemoState> | DemoState | ((state: DemoState) => Partial<DemoState> | DemoState)) => void;
export type StoreGet = () => DemoState;
