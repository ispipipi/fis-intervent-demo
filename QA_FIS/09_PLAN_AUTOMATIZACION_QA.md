# Plan de automatización QA

## Objetivo

Construir una regresión confiable para el flujo Preclaim sin automatizar decisiones jurídicas. Las pruebas deben validar cálculos y reglas determinísticas; la calidad de extracción debe medirse con un corpus etiquetado y siempre conservar revisión humana.

## Fase 1 — base de negocio

Automatizar primero funciones puras:

- `classifyDocument` con los 17 tipos, alias, acentos, mayúsculas y nombres ambiguos.
- `renamedFile` con referencias, extensiones, caracteres especiales y archivos sin extensión.
- `calculatePrescription` con jurisdicciones, fechas inválidas y cambios de año bisiesto.
- `prescriptionStatus` con vencido, menos de 15/15/16/60/61 días y datos faltantes.
- `calculateLoss` con los tres métodos, rubros positivos/negativos, venta a firme y campos faltantes.
- `nextStatusFromCase` con cada combinación de documentos, cálculo y estado.
- parser histórico con filas válidas, encabezados variables, referencias repetidas y reimportación idempotente.

Resultado de salida: cobertura alta de ramas y casos límite, sin depender del navegador.

## Fase 2 — store y persistencia

Probar acciones con un store aislado:

- crear borrador y caso completo;
- actualizar extracción y prescripción;
- cargar, corregir y eliminar documentos;
- guardar análisis y cálculo;
- generar informe y registrar cartas;
- transición y reversión por rol;
- persistencia/hidratación;
- importación histórica y deduplicación.

Cada prueba debe comprobar estado final y evento de bitácora. En la implementación productiva, las mismas reglas deben ejecutarse contra API, no solo contra Zustand.

## Fase 3 — E2E de UI

Usar Playwright o herramienta equivalente una vez que exista un entorno HTTP estable y selectores de prueba estables. No introducir dependencia durante este diagnóstico.

Suites mínimas:

1. Acceso y visibilidad por rol.
2. Alta completa, borrador, duplicado y cancelación.
3. Carga de carpeta, clasificación, corrección y checklist.
4. Extracción del BL, factura y liquidación con fixtures reales.
5. Análisis térmico y confirmación humana.
6. Tres cálculos, validaciones, venta a firme y mantenimiento.
7. Informe, observaciones, FIS/Lawgistic y reversión.
8. Cartas, edición, tokens pendientes y descarga.
9. Memoria precargada, importación, búsqueda, duplicados y exportación.
10. Inspector, notificaciones y agrupación de naves cuando se implementen.

## Fixtures y datos

- Mantener tres carpetas de casos existentes como fixtures de regresión.
- Agregar variantes por documento escaneado, nombre desconocido, PDF corrupto y campos contradictorios.
- Usar datos anonimizados y no incorporar archivos reales del cliente a CI sin autorización.
- Definir un workbook pequeño, uno de volumen y uno con 4.000 registros sintéticos/anonimizados.

## Calidad de extracción

Medir por tipo documental y campo: precisión, recall, campos vacíos, conflictos entre documentos, tiempo por archivo y tasa de OCR. Un resultado automático nunca debe considerarse decisión final sin confirmación humana.

## CI y gates

Orden recomendado:

1. TypeScript/lint.
2. Unitarias de reglas de negocio.
3. Pruebas de store.
4. Build de producción.
5. Smoke E2E de rutas.
6. Regresión completa.

Un release no debe avanzar si falla un P1 de seguridad, persistencia, cálculo o traspaso; si el build no termina; o si no se puede recuperar un documento que el sistema declara disponible.

