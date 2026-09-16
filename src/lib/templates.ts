import { CalculoPerdida, Caso, Documento, TemplateConfig, TemplateId } from "../types/domain";
import { currency, pendingField } from "./business";

export type LetterTemplateId = TemplateId;

export type TemplateContext = {
  caso: Caso;
  docs: Documento[];
  calculo?: CalculoPerdida;
};

export type LetterTemplateDefinition = {
  id: LetterTemplateId;
  title: string;
  shortTitle: string;
  description: string;
  language: string;
  fields: string[];
  baseContent: string;
  active: boolean;
  build: (context: TemplateContext) => string;
};

type TemplateValues = {
  reference: string;
  csClaimNo: string;
  assured: string;
  opponent: string;
  vessel: string;
  voyage: string;
  blNumber: string;
  containers: string;
  cargo: string;
  placeOfShipment: string;
  dateOfShipment: string;
  placeOfDischarge: string;
  dateOfDischarge: string;
  surveyor: string;
  claimAmount: string;
  currencyCode: string;
  methodBreakdown: string;
  today: string;
};

export const TEMPLATE_TOKENS = [
  "reference",
  "csClaimNo",
  "assured",
  "opponent",
  "vessel",
  "voyage",
  "blNumber",
  "containers",
  "cargo",
  "placeOfShipment",
  "dateOfShipment",
  "placeOfDischarge",
  "dateOfDischarge",
  "surveyor",
  "claimAmount",
  "methodBreakdown",
  "today"
] as const;

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function extractMatches(text: string, pattern: RegExp) {
  return unique([...text.matchAll(pattern)].map((match) => match[1] || match[0]).map((value) => value.replace(/\s+/g, "")));
}

function documentCorpus(docs: Documento[]) {
  return docs
    .flatMap((doc) => [doc.textoExtraido, doc.originalName, doc.nombreArchivo])
    .filter((value): value is string => Boolean(value))
    .join("\n");
}

function formatDate(value?: string) {
  if (!value) return pendingField(value);
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("es-CL");
}

function buildValues({ caso, docs, calculo }: TemplateContext): TemplateValues {
  const corpus = documentCorpus(docs);
  const blNumbers = extractMatches(
    corpus,
    /(?:B\/L|BL|Bill of Lading|Master Sea Waybill)\s*(?:No\.?|number|N°)?\s*[:#]?\s*([A-Z0-9][A-Z0-9\/-]{5,})/gi
  );
  const containers = extractMatches(corpus, /\b[A-Z]{4}\s?\d{6,7}(?:-\d)?\b/gi);
  const amount = calculo?.montoFinalReclamo ?? caso.claimAmount;
  const currencyCode = calculo?.moneda || "USD";
  const methodBreakdown = calculo?.ventaAFirme
    ? `Venta a firme · nota de crédito: ${calculo.notaCreditoValor !== undefined ? currency(calculo.notaCreditoValor, currencyCode) : pendingField()}`
    : calculo?.metodoSeleccionado
      ? `Método ${calculo.metodoSeleccionado} · ${amount !== undefined ? currency(amount, currencyCode) : pendingField()}`
      : "Método pendiente de confirmación humana";
  return {
    reference: pendingField(caso.id),
    csClaimNo: pendingField(caso.csClaimNo),
    assured: pendingField(caso.assured),
    opponent: pendingField(caso.opponent),
    vessel: pendingField(caso.vessel),
    voyage: pendingField(caso.voyage),
    blNumber: pendingField(blNumbers[0]),
    containers: pendingField(containers.join(", ")),
    cargo: pendingField(caso.cargo),
    placeOfShipment: pendingField(caso.placeOfShipment),
    dateOfShipment: formatDate(caso.dateOfShipment),
    placeOfDischarge: pendingField(caso.placeOfDischarge),
    dateOfDischarge: formatDate(caso.dateOfDischarge),
    surveyor: pendingField(caso.surveyor),
    claimAmount: amount !== undefined ? currency(amount, currencyCode) : pendingField(),
    currencyCode,
    methodBreakdown,
    today: today()
  };
}

function today() {
  return new Date().toLocaleDateString("es-CL", { year: "numeric", month: "long", day: "numeric" });
}

const commonFields = [
  "Referencia",
  "CS Claim No",
  "Asegurado",
  "Oponente / transportista",
  "Nave y viaje",
  "BL y contenedor",
  "Carga",
  "Embarque y descarga",
  "Inspector",
  "Monto calculado"
];

const claimNoticeContent = `FRUIT
INSURANCE
SERVICES
CHILE · EST. 2015

{{today}}

Messrs.
{{opponent}}
Claims Department.

Claim and Reimbursement Request Nº {{reference}}

By these means and on behalf of our principals, {{assured}}, we hereby claim and request reimbursement of {{claimAmount}}, as the amount associated with the damaged goods.

➢ B/L              : {{blNumber}}
➢ CONTAINER        : {{containers}}
➢ VESSEL           : {{vessel}}
➢ VOYAGE           : {{voyage}}
➢ POL              : {{placeOfShipment}}
➢ ETD              : {{dateOfShipment}}
➢ POD              : {{placeOfDischarge}}
➢ ETA / DISCHARGE  : {{dateOfDischarge}}
➢ AMOUNT           : {{claimAmount}}
➢ BREAKDOWN        : {{methodBreakdown}}

This claim is sustained as per the subrogated and/or assigned rights evidenced in the case file. For analysis of this claim and reimbursement request, we attach the documentation available in the digital case file.

This claim and reimbursement request is submitted without prejudice to any applicable statute of limitation.

We would appreciate confirmation of receipt and reimbursement of the corresponding claimed amount to Fruit Insurance Services Chile SpA.

Kind regards,

FRUIT INSURANCE SERVICES CHILE
{{surveyor}}
Claims Handler`;

const aorContent = `ASSIGNMENT OF RIGHTS

CS Claim No.:        {{csClaimNo}}
Broker Claim No.:    {{reference}}
Insured:             {{assured}}
Consignee:           {{opponent}}
Vessel, Voyage:      {{vessel}}, {{voyage}}
Carrier:             {{opponent}}
B/L No.:             {{blNumber}}
Consignment:         {{cargo}} in container {{containers}}

FIRST: Given that the aforementioned cargo arrived at its destination with alleged damages, for all applicable purposes, the undersigned assigns and transfers all rights, titles and/or interests in connection with the above detailed shipment to the designated recovery party.

SECOND: The undersigned undertakes to furnish all documents and correspondence relating thereto and to provide such assistance, affidavits or declarations as may reasonably be required.

THIRD: The receiving party expressly accepts the assignment referred to in the FIRST clause.

Date: {{today}}

Legal representative on behalf of the insured

Signature and stamp: ______________________________

Legal representative on behalf of the receiving party

Signature and stamp: ______________________________`;

const harvestContent = `CERTIFICADO
CERTIFICATE

El firmante certifica que la siguiente carga:
The undersigned certifies that the following cargo:

CS Claim Number                 {{csClaimNo}}
Broker Claim Number            {{reference}}
Especie / Goods                {{cargo}}
Contenedor Nº / Container Nº   {{containers}}
Bill of Lading / CRT / AWB     {{blNumber}}

Fue cosechada entre los días:  [PENDIENTE COMPLETAR]
Was harvested between:         [PENDIENTE COMPLETAR]

Firma / Signature:             ______________________________
Company:                       {{assured}}
Timbre / Stamp:                ______________________________
Fecha / Date:                  {{today}}`;

const loaContent = `LETTER OF AUTHORITY

Vessel:              {{vessel}}
Voyage No.:          {{voyage}}
Bill of Lading:      {{blNumber}}
Container(s):        {{containers}}
Place of loading:    {{placeOfShipment}}
Place of discharge:  {{placeOfDischarge}}
Cargo:               {{cargo}}
Claim No.:           {{csClaimNo}}

We, {{assured}}, herewith instruct and authorize FIS Chile to handle the matter under reference in our name under the applicable laws and to take all measures and make necessary declarations in this connection.

This includes authority for FIS Chile to appoint lawyers, arbitrators, recovery agents, experts or other professionals if necessary.

FIS Chile is herewith authorized to collect funds and sign receipts on our behalf. This grant of authority shall authorize any actions already undertaken by the grantee of this authority.

{{today}}

Name:                            ______________________________
Signature and stamp:             ______________________________`;

function renderTemplateText(content: string, context: TemplateContext) {
  const values = buildValues(context);
  return content.replace(/\{\{([a-zA-Z]+)\}\}/g, (match, key: keyof TemplateValues) => values[key] ?? match);
}

export const LETTER_TEMPLATES: LetterTemplateDefinition[] = [
  {
    id: "claim-notice",
    title: "Claim Notice",
    shortTitle: "Claim notice",
    description: "Carta de notificación y solicitud de reembolso a la naviera.",
    language: "English",
    fields: commonFields,
    baseContent: claimNoticeContent,
    active: true,
    build: (context) => renderTemplateText(claimNoticeContent, context)
  },
  {
    id: "aor",
    title: "Assignment of Rights",
    shortTitle: "AoR",
    description: "Cesión o asignación base de derechos con firma de las partes.",
    language: "English",
    fields: commonFields,
    baseContent: aorContent,
    active: true,
    build: (context) => renderTemplateText(aorContent, context)
  },
  {
    id: "harvest",
    title: "Harvest Certificate",
    shortTitle: "Harvest",
    description: "Certificado bilingüe de fecha de cosecha asociado al embarque.",
    language: "Español / English",
    fields: ["CS Claim Number", "Broker Claim Number", "Especie / Goods", "Contenedor", "BL / CRT / AWB", "Fecha de cosecha", "Firma, timbre y fecha"],
    baseContent: harvestContent,
    active: true,
    build: (context) => renderTemplateText(harvestContent, context)
  },
  {
    id: "loa",
    title: "Letter of Authority",
    shortTitle: "LoA",
    description: "Autorización base para que FIS gestione el recupero del caso.",
    language: "English",
    fields: commonFields,
    baseContent: loaContent,
    active: true,
    build: (context) => renderTemplateText(loaContent, context)
  }
];

export function defaultTemplateConfigs(): TemplateConfig[] {
  return LETTER_TEMPLATES.map(({ id, title, shortTitle, description, language, fields, baseContent, active }) => ({
    id,
    title,
    shortTitle,
    description,
    language,
    fields,
    baseContent,
    active,
    version: 1,
    updatedAt: new Date().toISOString()
  }));
}

export function templateTokenIssues(content: string) {
  const allowed = new Set<string>(TEMPLATE_TOKENS);
  const found = [...content.matchAll(/\{\{([^{}]+)\}\}/g)].map((match) => match[1].trim());
  const unknown = [...new Set(found.filter((token) => !allowed.has(token)))];
  const unmatchedBraces = (content.match(/\{\{/g) || []).length !== (content.match(/\}\}/g) || []).length;
  return { unknown, unmatchedBraces };
}

export function getLetterTemplate(id: LetterTemplateId, configs: TemplateConfig[] = []) {
  const base = LETTER_TEMPLATES.find((template) => template.id === id) || LETTER_TEMPLATES[0];
  const config = configs.find((item) => item.id === base.id);
  if (!config) return base;
  return {
    ...base,
    ...config,
    build: (context: TemplateContext) => renderTemplateText(config.baseContent, context)
  };
}

export function buildLetterTemplate(id: LetterTemplateId, context: TemplateContext, configs: TemplateConfig[] = []) {
  return getLetterTemplate(id, configs).build(context);
}

export function templateConflicts({ docs }: TemplateContext) {
  const corpus = documentCorpus(docs);
  const blNumbers = extractMatches(
    corpus,
    /(?:B\/L|BL|Bill of Lading|Master Sea Waybill)\s*(?:No\.?|number|N°)?\s*[:#]?\s*([A-Z0-9][A-Z0-9\/-]{5,})/gi
  );
  const containers = extractMatches(corpus, /\b[A-Z]{4}\s?\d{6,7}(?:-\d)?\b/gi);
  return [
    blNumbers.length > 1 ? `Se detectaron varios BL: ${blNumbers.join(", ")}.` : "",
    containers.length > 1 ? `Se detectaron varios contenedores: ${containers.join(", ")}.` : ""
  ].filter(Boolean);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character] || character);
}

function textToHtml(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function buildPrintableHtml(template: LetterTemplateDefinition, text: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(template.title)}</title>
  <style>
    @page { size: A4; margin: 18mm 19mm; }
    body { margin: 0; background: #eef2f6; color: #202b36; font-family: Arial, Helvetica, sans-serif; }
    .sheet { box-sizing: border-box; width: 210mm; min-height: 297mm; margin: 0 auto; padding: 19mm; background: white; }
    .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; color: #303d4b; }
    .mark { display: grid; width: 42px; height: 42px; place-items: center; border-radius: 8px; background: #1d3150; color: white; font-weight: 800; }
    .brand strong { display: block; font-size: 14px; letter-spacing: .03em; }
    .brand small { color: #187d80; font-size: 9px; letter-spacing: .12em; }
    .content { font-size: 12px; line-height: 1.46; white-space: normal; }
    .content p { margin: 0 0 15px; }
    .footer { margin-top: 32px; border-top: 1px solid #dce7f5; padding-top: 10px; color: #687991; font-size: 9px; }
    @media print { body { background: white; } .sheet { margin: 0; } }
  </style>
</head>
<body>
  <main class="sheet">
    <header class="brand"><span class="mark">IP</span><span><strong>FRUIT INSURANCE SERVICES</strong><small>CHILE · EST. 2015</small></span></header>
    <section class="content">${textToHtml(text)}</section>
    <footer class="footer">${escapeHtml(template.title)} · Intervent Preclaim · Documento generado para revisión humana</footer>
  </main>
</body>
</html>`;
}
