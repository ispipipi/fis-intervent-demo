# Cobertura QA

## Cobertura por módulo

| Módulo | Requisitos revisados | Cobertura estática | Cobertura de ejecución | Resultado |
|---|---:|---|---|---|
| Acceso y roles | 4 | Alta | Parcial | 🟡 |
| Shell y navegación | 5 | Alta | No verificada completamente | 🟡 |
| Dashboard | 8 | Alta | No verificada completamente | 🟡 |
| Lista y ficha de casos | 14 | Alta | No verificada completamente | 🟡 |
| Ingreso documental | 10 | Alta | No verificada con archivo real en navegador | 🟡 |
| Checklist y faltantes | 5 | Alta | No verificada completamente | 🟡 |
| Extracción y OCR | 8 | Alta | No verificada con corpus completo | 🟡 |
| Análisis de causa | 5 | Alta | No verificada completamente | 🟡 |
| Cálculo de pérdida | 10 | Alta | No verificada con casos límite | 🟡 |
| Informe y traspaso | 7 | Alta | No verificada completamente | 🟡 |
| Cartas | 8 | Alta | No verificada salida descargada | 🟡 |
| Historial/memoria | 10 | Alta | No verificada con importación UI | 🟡 |
| Benchmark | 7 | Alta | No verificada completamente | 🟡 |
| Mantenedores | 8 | Alta | No verificada completamente | 🟡 |
| Manual | 4 | Alta | No verificada completamente | 🟡 |
| Responsive/accesibilidad | 8 | Media | No verificada | ⚪ |
| Seguridad y persistencia multiusuario | 8 | Alta | No aplicable sin backend | 🔴 |

## Cobertura de controles

| Control QA | Resultado | Observación |
|---|---|---|
| Rutas declaradas | ✅ | Las nueve rutas principales están en `App.tsx`. |
| Estados declarados | ✅ | Seis estados en enum y secuencia. |
| Estados alcanzables punta a punta | 🟡 | Dependen de documentos, cálculo y rol; no se ejecutó el ciclo completo en navegador. |
| Validación de mínimos de alta | ✅ | `hasRequiredMinimum` y validación de duplicado/monto. |
| Validación de cálculos | 🟡 | Justificación y selección; faltan controles de moneda, negativos y consistencia de origen. |
| Validación de prescripción | 🟡 | Fecha/jurisdicción explícitas; reglas contractuales adicionales no modeladas. |
| Permisos de edición | 🟡 | UI restringe por rol, pero no hay servidor y el bloqueo post-traspaso es incompleto. |
| Auditoría de mutaciones | 🟡 | Muchos eventos registrados; eliminación documental y cambios de algunos mantenedores no quedan en bitácora de caso. |
| Errores de carga | 🟡 | Hay mensajes de procesamiento, pero no hay detalle por archivo ni reintento granular. |
| Descargas | 🟡 | TXT/HTML funcionan por intención de código; no se validó evento de descarga. |
| Exportación Excel | 🔴 | No existe. |
| Responsive 320-1920 | ⚪ | Requisito documentado, falta prueba visual real. |

## Matriz de evidencia

| Evidencia | Resultado |
|---|---|
| Lectura de estructura y fuentes | ✅ Completa para el repo inspeccionado. |
| Revisión de handlers y store | ✅ Completa para los flujos existentes. |
| `npm run lint` | ✅ PASS. |
| `npm test` | 🔴 No disponible. |
| `npm run build` | 🟡 No finaliza en el entorno auditado. |
| Ejecución local por HTTP | 🟡 Vite inicia, pero el navegador de QA no logra conectarse establemente. |
| Interacción de botones en navegador | ⚪ No verificable completamente. |
| Prueba con los tres casos PDF | ⚪ Pendiente de ejecución UI reproducible. |
| Seguridad real | 🔴 No existe backend/autenticación que auditar. |

## Riesgo de regresión

Alto en cuatro áreas: permisos después del traspaso, persistencia de documentos, memoria histórica al reimportar y cálculos con monedas/tipo de cambio. Medio en clasificación, OCR, plantillas y descargas. Bajo en rutas, navegación declarativa y reglas básicas de validación ya cubiertas por TypeScript.

