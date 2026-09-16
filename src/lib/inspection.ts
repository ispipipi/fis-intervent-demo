import { Caso } from "../types/domain";
import { pendingField } from "./business";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character] || character);
}

function formatDate(value?: string) {
  if (!value) return pendingField(value);
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("es-CL");
}

export function buildJointInspectionLetter(caso: Caso) {
  const field = (value?: string) => escapeHtml(pendingField(value));
  const jointInspection = caso.inspeccionConjunta === undefined
    ? "[PENDIENTE CONFIRMAR]"
    : caso.inspeccionConjunta ? "YES / SÍ" : "NO";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>JSI - ${field(caso.id)}</title>
  <style>
    @page { size: A4; margin: 18mm 19mm; }
    body { margin: 0; background: #eef2f6; color: #202b36; font-family: Arial, Helvetica, sans-serif; }
    .sheet { box-sizing: border-box; width: 210mm; min-height: 297mm; margin: 0 auto; padding: 19mm; background: white; }
    .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; color: #303d4b; }
    .mark { display: grid; width: 42px; height: 42px; place-items: center; border-radius: 8px; background: #1d3150; color: white; font-weight: 800; }
    .brand strong { display: block; font-size: 14px; letter-spacing: .03em; }
    .brand small { color: #187d80; font-size: 9px; letter-spacing: .12em; }
    h1 { margin: 0 0 6px; font-size: 20px; }
    .subhead { color: #687991; font-size: 11px; }
    .facts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 22px 0; }
    .fact { padding: 10px 12px; border: 1px solid #dce7f5; border-radius: 6px; }
    .fact span { display: block; color: #687991; font-size: 9px; font-weight: bold; text-transform: uppercase; }
    .fact strong { display: block; margin-top: 4px; font-size: 11px; }
    p { font-size: 12px; line-height: 1.5; }
    .observation { min-height: 90px; padding: 12px; border: 1px solid #dce7f5; white-space: pre-wrap; }
    .signature { margin-top: 58px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .signature div { border-top: 1px solid #66758b; padding-top: 8px; font-size: 10px; }
    footer { margin-top: 36px; border-top: 1px solid #dce7f5; padding-top: 10px; color: #687991; font-size: 9px; }
    @media print { body { background: white; } .sheet { margin: 0; } }
  </style>
</head>
<body>
  <main class="sheet">
    <header class="brand"><span class="mark">IP</span><span><strong>FRUIT INSURANCE SERVICES</strong><small>CHILE · EST. 2015</small></span></header>
    <h1>JOINT SURVEY INSPECTION NOTICE</h1>
    <div class="subhead">Carta JSI · Notificación de inspección conjunta · ${field(caso.id)}</div>
    <p>${field(caso.opponent)},</p>
    <p>Por medio de la presente se informa la inspección asociada al caso y embarque indicados a continuación. Esta comunicación queda sujeta a revisión y confirmación del handler responsable.</p>
    <section class="facts">
      <div class="fact"><span>Referencia</span><strong>${field(caso.id)}</strong></div>
      <div class="fact"><span>CS Claim N°</span><strong>${field(caso.csClaimNo)}</strong></div>
      <div class="fact"><span>Asegurado</span><strong>${field(caso.assured)}</strong></div>
      <div class="fact"><span>Nave / viaje</span><strong>${field(caso.vessel)} / ${field(caso.voyage)}</strong></div>
      <div class="fact"><span>Lugar de inspección</span><strong>${field(caso.placeOfDischarge)}</strong></div>
      <div class="fact"><span>Fecha de inspección</span><strong>${escapeHtml(formatDate(caso.fechaInspeccion))}</strong></div>
      <div class="fact"><span>¿Inspección con naviera?</span><strong>${jointInspection}</strong></div>
      <div class="fact"><span>Inspector</span><strong>${field(caso.inspectorAsignado || caso.surveyor)}</strong></div>
    </section>
    <p><strong>Resumen de lo observado / Observations</strong></p>
    <div class="observation">${field(caso.resumenInspeccion)}</div>
    <p>Solicitamos confirmar la recepción de esta comunicación y la participación de las partes que correspondan.</p>
    <div class="signature"><div>Inspector responsable<br>${field(caso.inspectorAsignado)}</div><div>Por la naviera / carrier<br>Firma y timbre</div></div>
    <footer>Carta JSI · Intervent Preclaim · Documento generado para revisión humana</footer>
  </main>
</body>
</html>`;
}
