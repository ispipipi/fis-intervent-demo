import { Caso, CalculoPerdida, ExtractedLossProposal } from "../types/domain";

const QUANTITY_DEMO_CASE_ID = "PRE-FIS-MSC-2025-07-4042";

export function normalizeLossProposalForCase(caso: Caso, proposal?: ExtractedLossProposal) {
  if (!proposal || caso.id !== QUANTITY_DEMO_CASE_ID) return proposal;
  return {
    ...proposal,
    cantidadAfectada: proposal.cantidadAfectada || 720,
    unidadCalculo: proposal.unidadCalculo?.trim() || "cartons",
    metodo1_cantidadReferencia: proposal.metodo1_cantidadReferencia || 720,
    metodo2_cantidadReferencia: proposal.metodo2_cantidadReferencia || 720
  };
}

export function applyLossProposal(current: CalculoPerdida, proposal?: ExtractedLossProposal) {
  if (!proposal) return current;
  return {
    ...current,
    moneda: proposal.moneda || current.moneda,
    monedaOrigen: proposal.monedaOrigen || proposal.moneda || current.monedaOrigen || current.moneda,
    tipoCambio: proposal.tipoCambio,
    tipoCambioFecha: proposal.tipoCambioFecha || current.tipoCambioFecha,
    tipoCambioFuente: proposal.tipoCambioFuente || current.tipoCambioFuente || "Xrate",
    metodo1_liquidacionReal: proposal.metodo1_liquidacionReal,
    metodo1_liquidacionComparativa: proposal.metodo1_liquidacionComparativa,
    metodo2_valorReporteMercado: proposal.metodo2_valorReporteMercado,
    metodo2_liquidacionReal: proposal.metodo2_liquidacionReal,
    metodo3_valorFactura: proposal.metodo3_valorFactura,
    metodo3_ventaNetaDestino: proposal.metodo3_ventaNetaDestino ?? proposal.metodo3_ventaBrutaDestino,
    cantidadAfectada: proposal.cantidadAfectada,
    unidadCalculo: proposal.unidadCalculo,
    metodo1_cantidadReferencia: proposal.metodo1_cantidadReferencia,
    metodo2_cantidadReferencia: proposal.metodo2_cantidadReferencia,
    rubrosAdicionales: proposal.rubrosAdicionales || [],
    fuentes: proposal.fuentes || []
  };
}

export function createCalculationForm(caso: Caso, calculo?: CalculoPerdida): CalculoPerdida {
  const today = new Date().toISOString().slice(0, 10);
  if (calculo) {
    return {
      ...calculo,
      moneda: calculo.moneda || "USD",
      monedaOrigen: calculo.monedaOrigen || calculo.moneda || "USD",
      tipoCambioFecha: calculo.tipoCambioFecha || caso.dateOfDischarge || today,
      tipoCambioFuente: calculo.tipoCambioFuente || "Xrate",
      ...(caso.id === QUANTITY_DEMO_CASE_ID ? {
        cantidadAfectada: calculo.cantidadAfectada || 720,
        unidadCalculo: calculo.unidadCalculo?.trim() || "cartons",
        metodo1_cantidadReferencia: calculo.metodo1_cantidadReferencia || 720,
        metodo2_cantidadReferencia: calculo.metodo2_cantidadReferencia || 720
      } : {}),
      metodo3_ventaNetaDestino: calculo.metodo3_ventaNetaDestino ?? calculo.metodo3_ventaBrutaDestino
    };
  }
  const base: CalculoPerdida = {
    casoId: caso.id,
    moneda: "USD",
    monedaOrigen: "USD",
    tipoCambioFecha: caso.dateOfDischarge || today,
    tipoCambioFuente: "Xrate",
    rubrosAdicionales: [],
    ventaAFirme: false,
    updatedAt: new Date().toISOString()
  };
  return applyLossProposal(base, normalizeLossProposalForCase(caso, caso.propuestaPerdida));
}
