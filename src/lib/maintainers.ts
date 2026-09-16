import { CalculationMethodConfig } from "../types/domain";

export const DEFAULT_CALCULATION_METHODS: CalculationMethodConfig[] = [
  {
    id: "1",
    title: "Método 1 · Embarque comparable",
    description: "Compara la liquidación del embarque con una liquidación comparable.",
    formula: "Liquidación comparativa - liquidación real",
    active: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: "2",
    title: "Método 2 · Reporte de mercado",
    description: "Compara el valor respaldado por el reporte de mercado con la liquidación real.",
    formula: "Valor reporte de mercado - liquidación real",
    active: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: "3",
    title: "Método 3 · Factura vs. venta",
    description: "Compara el valor de la factura de exportación con la venta bruta en destino.",
    formula: "Valor factura de exportación - venta destino",
    active: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: "firm",
    title: "Venta a firme · nota de crédito",
    description: "Usa el valor de la nota de crédito cuando la venta fue a firme.",
    formula: "Valor de nota de crédito + rubros adicionales",
    active: true,
    updatedAt: new Date().toISOString()
  }
];

