# Matriz de requerimientos

## Criterio

- ✅ Cumplido: existe el flujo y la evidencia está alineada con el requerimiento.
- 🟡 Parcial: existe una parte demostrable, pero falta alcance, robustez o integración.
- 🔴 No cumplido: no existe una implementación funcional del requerimiento.
- ⚪ No verificable: falta evidencia de ejecución confiable.
- 🔵 Implementado distinto: existe, pero el comportamiento elegido difiere del pedido.

## Alcance contractual y base funcional

| ID | Requerimiento | Fuente base | Evidencia de implementación | Estado |
|---|---|---|---|---|
| C-001 | Acceso de prueba con Handler, Gerente y CEO | Contrato / MD funcional | Selector de perfil y alcance condicional en `App.tsx`. | ✅ |
| C-002 | Lista de casos con búsqueda, estados y expediente | Contrato / MD funcional | `/casos`, `/casos/:id` y `STATUS_LABELS`. | ✅ |
| C-003 | Alta manual y por carpeta documental | Contrato / MD funcional | Formulario y `<input webkitdirectory>` en Nuevo caso. | 🟡 |
| C-004 | Drag and drop de archivos | MD funcional | `onDrop` en Nuevo caso y Documentos. | 🟡 |
| C-005 | Procesamiento automático de archivos compatibles | Contrato / MD funcional | `processDocumentFiles` para PDF, XLS/XLSX, CSV, TXT, JSON, XML y MD. | 🟡 |
| C-006 | Identificación, clasificación y renombrado documental | Contrato / MD funcional | Alias/fuzzy matching por nombre y `renamedFile`. | 🟡 |
| C-007 | Expediente digital persistente | Contrato / MD funcional | Zustand persiste metadata; no binario ni almacenamiento remoto. | 🟡 |
| C-008 | Inventario de disponibles y faltantes | Contrato / MD funcional | `documentCompleteness` y checklist de 17 tipos. | ✅ |
| C-009 | Solicitud de faltantes | Contrato / MD funcional | Texto copiable; no correo ni seguimiento de solicitud. | 🟡 |
| C-010 | Extracción asistida de datos del caso | Contrato / MD funcional | Regex/etiquetas en `extractCaseData`; revisión antes de aplicar. | 🟡 |
| C-011 | Resumen, tipo, causa y mérito preliminar | Contrato / MD funcional | Resumen heurístico, causa por tipo/texto y análisis térmico humano. | 🟡 |
| C-012 | Revisión humana editable | Contrato / MD funcional | Confirmación de extracción, análisis y cálculo. | ✅ |
| C-013 | Tres métodos de cálculo y venta a firme | Contrato / MD funcional | Métodos 1-3, nota de crédito, rubros y selección visual. | 🟡 |
| C-014 | Evidencia de cálculo histórico | Memoria / contrato | `calculationInsight` reconstruye algunos campos con confianza parcial. | 🟡 |
| C-015 | Estados y avance hasta traspaso | Contrato / MD funcional | Secuencia de estados y transición local. | 🟡 |
| C-016 | Prescripción por jurisdicción | Contrato / MD funcional | La Haya 1 año y Hamburgo 2 años; semáforo. | 🟡 |
| C-017 | Dashboard y benchmark general por handler | Contrato / solicitud cliente | `/dashboard` y `/benchmark` con indicadores. | ✅ |
| C-018 | Memoria histórica precargada | Solicitud cliente / README | `historySeed.ts` carga `public/data/preclaim-history.xlsx` al abrir Memoria. | 🔵 |
| C-019 | Mantenedor de cálculos y templates base | Solicitud cliente | `/mantenedores`, cuatro templates y métodos con activación. | 🟡 |
| C-020 | Manual de usuario accesible | Solicitud explícita cliente | `/manual` enlazado desde shell, portada y footer. | ✅ |
| C-021 | Derivación a FIS y recupero judicial | Contrato / MD funcional | Informe y estados locales FIS/Logistic. | 🟡 |
| C-022 | Bitácora e historial de cambios | Contrato / MD funcional | `bitacora` para estados, cargas, análisis, cálculo, cartas e informe. | 🟡 |

## Solicitudes posteriores del cliente

Estas filas se mantienen separadas para no confundir una expectativa posterior con el alcance contractual confirmado.

| ID | Solicitud posterior | Evidencia actual | Estado |
|---|---|---|---|
| N-001 | Migración automática de aproximadamente 1.000/4.000 casos desde Excel | Existe precarga e importación de filas reconocibles, sin proceso productivo de migración ni validación de lote. | 🟡 |
| N-002 | Generar SUBRO y certificados de destrucción además de AoR, Harvest, LoA y claim notice | Solo existen Claim Notice, AoR, Harvest y LoA. | 🔴 |
| N-003 | Cálculo desde facturas/liquidaciones sin ingreso manual | Propuesta heurística carga valores a una base editable, no confirma ni normaliza automáticamente. | 🟡 |
| N-004 | EUR y más monedas con conversión por fecha configurable | Tipos y selector limitados a USD/CLP; `tipoCambio` no se aplica en `calculateLoss`. | 🔴 |
| N-005 | Solicitudes documentales, correos, planillas y dashboard Excel | Solo texto copiable y descarga TXT/HTML. | 🔴 |
| N-006 | Categorías Loss pre/FIS | Tipos históricos limitados; no hay flujo de categorías operativas nuevas. | 🔴 |
| N-007 | Perfil Inspector restringido por asignación | No existe rol Inspector ni asignación de inspectores. | 🔴 |
| N-008 | Referencia editable después de abrir el caso | No existe formulario de edición general en la ficha. | 🔴 |
| N-009 | Fecha de descarga/ETA editable | Solo se captura en alta o extracción; en alta no se aceptan fechas futuras. | 🔵 |
| N-010 | Jurisdicción terrestre 6 meses y aérea 2 años | Enum solo La Haya/Hamburgo y cálculo 1/2 años. | 🔴 |
| N-011 | Cambiar Logistic por Lawgistic | El enum, destino y textos siguen diciendo `Logistic`. | 🔴 |
| N-012 | Aviso por más de 15 días sin movimiento | Se muestra alerta desde 14 días, pero no hay notificación automática. | 🔵 |
| N-013 | Agrupar naves/viajes masivos | No existe agrupación ni contador por nave/viaje. | 🔴 |
| N-014 | Excel de gestión con hitos y fechas de todo el historial | Bitácora por caso existe, pero no hay reporte exportable ni fecha de recepción formal. | 🟡 |

## Lectura contractual

Las solicitudes N-002, N-004, N-005, N-007, N-010, N-013 y otras extensiones deben confirmarse como cambio de alcance si el contrato vigente las excluye. La matriz no las marca como defectos contractuales automáticamente; las deja como brechas de producto o backlog de evolución.

