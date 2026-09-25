import { CalculationMethodConfig } from "../types/domain";

export const DEFAULT_CALCULATION_METHODS: CalculationMethodConfig[] = [
  {
    id: "1",
    title: "Método 1 · Embarque comparable",
    description: "Compara la liquidación bruta real del embarque con una liquidación bruta comparable.",
    formula: "Liquidación bruta comparable - liquidación bruta real",
    active: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: "2",
    title: "Método 2 · Reporte de mercado",
    description: "Compara el valor bruto respaldado por el reporte de mercado con la liquidación bruta real.",
    formula: "Valor bruto reporte de mercado - liquidación bruta real",
    active: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: "3",
    title: "Método 3 · Factura vs. venta",
    description: "Compara el valor de la factura de exportación con la venta neta consolidada en destino.",
    formula: "Valor factura de exportación - venta neta destino",
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
