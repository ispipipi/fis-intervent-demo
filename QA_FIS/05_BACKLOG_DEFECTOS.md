# Backlog de defectos y brechas

## Prioridad P1: bloquear antes de operación real

| ID | Trabajo | Criterio de aceptación | Dependencia |
|---|---|---|---|
| QA-001 | Autenticación, autorización y almacenamiento de servidor | Cada operación valida usuario/rol/caso en backend; dos sesiones no comparten datos accidentalmente; queda auditoría de servidor. | Arquitectura y proveedor de identidad. |
| QA-002 | Storage documental real | Un archivo cargado queda recuperable, descargable según permiso y asociado a caso/tipo/versión. | Storage privado, antivirus y política de retención. |
| QA-003 | Edición de referencia, fecha efectiva y ETA | Handler autorizado puede editar; se valida duplicidad y fecha; se recalcula prescripción y se registra antes/después. | Definición de ETA vs descarga real. |
| QA-004 | Monedas y FX | USD, CLP, EUR y monedas acordadas; tasa, fecha, fuente y redondeo quedan en cálculo; las fórmulas aplican conversión. | Definición financiera/contable. |

## Prioridad P2: cerrar antes de aceptación ampliada

| ID | Trabajo | Criterio de aceptación |
|---|---|---|
| QA-005 | Bloqueo transversal post-traspaso | Ninguna mutación de expediente traspasado pasa sin permiso y transición explícita. |
| QA-006 | Importación idempotente | Reimportar mismo archivo no duplica; referencias repetidas reales sí quedan separadas y justificadas. |
| QA-007 | Exportación XLSX | Archivo contiene columnas acordadas, filtros, pérdida, fechas e historial de gestión. |
| QA-008 | Templates y documentos formales | Catálogo aprobado, tokens validados, versiones, salida PDF/DOCX o formato acordado y campos pendientes destacados. |
| QA-009 | Perfil Inspector | Rol, asignación por caso, búsqueda limitada, fecha, inspección conjunta, resumen y descarga JSI. |
| QA-010 | Avisos de inactividad | Umbral acordado, aviso persistente, destinatarios, estado leído y auditoría. |
| QA-011 | Agrupación de naves masivas | Conteo por nave/viaje, acceso al conjunto y regla temporal documentada. |
| QA-012 | Política de traspaso con observaciones | El sistema bloquea o exige excepción autorizada según regla aprobada. |
| QA-014 | Marca Lawgistic | Copy, enum, estados, informes y datos existentes quedan consistentes. |
| QA-015 | Auditoría de eliminación | Borrado con confirmación, motivo opcional/obligatorio y evento de bitácora. |
| QA-017 | Evaluación de extracción | Corpus real con métrica por tipo/campo, score, colisiones y ruta de corrección humana. |
| QA-013 | Build reproducible | CI ejecuta lint, build y smoke test en tiempo objetivo acordado. |

## Prioridad P3: experiencia y mantenibilidad

| ID | Trabajo | Criterio de aceptación |
|---|---|---|
| QA-016 | Confirmación de portapapeles | Éxito/error visibles y evento solo cuando la operación funciona. |
| QA-018 | Ruta file/documentación | No hay pantalla blanca ni enlace a puerto incorrecto; README y despliegue coinciden. |
| TECH-001 | Separar App.tsx | Pantallas y componentes por módulo sin cambiar contratos existentes. |
| TECH-002 | Suite automatizada | Casos de negocio, store y UI crítica ejecutables en CI. |

## Orden recomendado de ejecución

1. Definir alcance contractual versus evolución.
2. Cerrar arquitectura de seguridad, persistencia y documentos.
3. Formalizar reglas de cálculo, FX, jurisdicción y traspaso.
4. Implementar exportación y memoria idempotente.
5. Incorporar Inspector/notificaciones/agrupación solo si se aprueban como alcance.
6. Automatizar regresión y repetir prueba con los tres casos PDF.

