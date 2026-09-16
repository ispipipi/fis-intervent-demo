# QA integral FIS / Intervent Preclaim

## Identificación

- Fecha de auditoría: 2026-09-16
- Tipo: diagnóstico funcional, técnico y de riesgos
- Alcance: demo disponible en `fis-intervent-demo`, requisitos contractuales consolidados, antecedentes de reuniones y solicitudes posteriores del cliente
- Regla aplicada: no se modificó la aplicación, no se desplegó y no se alteraron datos productivos

## Conclusión ejecutiva

El estado actual es **apto como demo navegable del flujo Preclaim**, pero **no apto todavía para aceptación contractual como plataforma multiusuario operativa**. La solución tiene una cobertura visible y coherente de las pantallas principales: selección de rol, dashboard, casos, ingreso documental, expediente, checklist de 17 documentos, análisis asistido, cálculo preliminar, benchmark, memoria histórica, cartas base, mantenedores y manual.

Los riesgos más importantes están fuera de la presentación visual del flujo: no existe autenticación ni backend, los archivos reales no se conservan, la edición posterior de referencia y fechas no está resuelta, el cálculo solo trabaja con USD/CLP sin conversión efectiva, no existe exportación Excel ni notificación automática, y algunos controles de permisos se aplican únicamente en la interfaz.

## Estado por área

| Área | Estado | Lectura QA |
|---|---|---|
| Navegación y rutas | ✅ Cumplido | Las rutas principales están declaradas y el shell permite recorrerlas según rol. |
| Casos y expediente | 🟡 Parcial | Existe el alta y la ficha, pero faltan edición posterior y persistencia documental real. |
| Ingesta y clasificación | 🟡 Parcial | Hay lectura PDF/Excel/CSV/TXT, OCR bajo demanda y clasificación heurística; no equivale a procesamiento productivo. |
| Inventario documental | ✅ Cumplido | Checklist de 17 tipos, faltantes y texto copiable disponibles. |
| Extracción de datos | 🟡 Parcial | Extrae etiquetas y patrones conocidos; es sensible al formato y no presenta confianza por campo. |
| Cálculo de pérdida | 🟡 Parcial | Tres fórmulas y venta a firme disponibles; monedas, FX y reglas de validación requieren ampliación. |
| Revisión y traspaso | 🟡 Parcial | Informe y destinos simulados; se permite transferir con observaciones y no hay integración real. |
| Roles y seguridad | 🔴 No cumplido | Los roles son un selector de demo y la información vive en el navegador. |
| Memoria histórica | 🟡 Parcial | El Excel incluido se precarga, pero la deduplicación entre importaciones no es robusta y no hay exportación. |
| Templates | 🟡 Parcial | Hay cuatro templates base editables; faltan formatos adicionales y salida documental más completa. |
| Benchmark y alertas | 🟡 Parcial | Benchmark operativo disponible; faltan avisos reales, agrupación de naves y umbral acordado de 15 días. |
| Calidad técnica | 🟡 Parcial | `npm run lint` pasa; no hay suite de tests y el build queda detenido durante la transformación en el entorno auditado. |

## Hallazgos críticos para decisión

1. **QA-001 / P1:** acceso y permisos solo de frontend; no hay autenticación, backend ni ACL real.
2. **QA-002 / P1:** la carga conserva metadata y `pathMock`, no el binario del documento ni una URL recuperable.
3. **QA-003 / P1:** no existe edición general de referencia y descarga una vez abierto el caso; además, la fecha de descarga no acepta fechas futuras aunque se requiere soportar ETA.
4. **QA-004 / P1:** el tipo de cambio se captura, pero no participa en la fórmula; el modelo no contempla EUR ni una fecha de tipo de cambio.
5. **QA-005 / P2:** después del traspaso se bloquea Cálculo, pero Documentos, Análisis, Informe y Cartas siguen recibiendo `canWrite` para el handler asignado.
6. **QA-006 / P2:** reimportar el mismo Excel puede duplicar registros porque el identificador incorpora el lote de importación.
7. **QA-007 / P2:** no se genera ni descarga un Excel con seguimiento, faltantes, pérdida y fechas de gestión.
8. **QA-009 / P2:** no existe perfil Inspector ni la vista restringida solicitada.

## Puerta de salida recomendada

Antes de una aceptación contractual o de una demo con datos reales se requiere cerrar como mínimo QA-001, QA-002, QA-003 y QA-004, acordar qué solicitudes posteriores quedan fuera del contrato, y repetir la regresión con archivos reales en un entorno HTTP estable. El demo puede seguir utilizándose para validar el flujo y la experiencia, siempre que se presente explícitamente como prototipo frontend con datos simulados.

## Evidencia y limitaciones

- `npm run lint`: **PASS** (`tsc --noEmit`).
- `npm test`: **NO DISPONIBLE**; `package.json` no declara script de test.
- `npm run build`: inició `vite v6.4.3 building for production`, llegó a `transforming...` y no finalizó después de más de tres minutos en el entorno de auditoría; se detuvo para evitar un proceso abierto. Requiere reproducción en CI o una máquina limpia.
- Prueba visual automatizada: **NO VERIFICADA COMPLETAMENTE**. El navegador de QA no logró conectarse de forma estable al servidor local; no se usa esa limitación como evidencia de un defecto visual.

