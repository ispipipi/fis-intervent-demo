# Deuda técnica

| ID | Deuda | Impacto | Prioridad | Recomendación |
|---|---|---|---|---|
| TECH-001 | `src/App.tsx` concentra shell, pantallas, formularios, modales y lógica de presentación en aproximadamente 2.742 líneas. | Cambios de alcance generan regresiones y revisión difícil. | P2 | Separar por módulos manteniendo contratos y añadir pruebas por pantalla. |
| TECH-002 | No hay script `test` ni framework de pruebas declarado. | No hay regresión automática para cálculos, store o UI. | P1 | Añadir unitarias de negocio/store y pruebas E2E en CI después de fijar arquitectura. |
| TECH-003 | Persistencia de demo en `localStorage` e IndexedDB del navegador. | Sin multiusuario, backup, control de acceso o recuperación centralizada. | P1 | Migrar a API y storage privado con esquema versionado. |
| TECH-004 | `pathMock` representa documentos pero no existe repositorio documental real. | Expediente no auditable ni interoperable. | P1 | Definir servicio documental, metadatos y URLs seguras. |
| TECH-005 | PDF/OCR/XLSX se importan desde el bundle frontend. | Build largo, consumo de memoria y posible bloqueo en dispositivos modestos. | P2 | Lazy loading, Web Worker dedicado o servicio backend según requisitos de privacidad. |
| TECH-006 | Extracción basada en regex/etiquetas y nombres de archivo. | Sensibilidad a variaciones de formato y riesgo de datos incorrectos. | P2 | Corpus versionado, métricas por campo, score y revisión asistida. |
| TECH-007 | El modelo de dominio limita monedas, roles, jurisdicción y destinos mediante unions cerradas. | Cada evolución obliga a cambios coordinados y migraciones. | P2 | Catálogos parametrizados con versionado y migraciones. |
| TECH-008 | Las acciones de store no tienen una capa uniforme de autorización. | La UI puede ocultar controles, pero la regla no está centralizada. | P1 | Policy layer compartida y validación de servidor. |
| TECH-009 | Eventos de bitácora no cubren todas las mutaciones. | Historia incompleta para auditoría y métricas de gestión. | P2 | Catálogo de eventos, actor, antes/después, motivo y origen. |
| TECH-010 | Descargas directas con `URL.createObjectURL` y revocación inmediata. | En algunos navegadores la descarga puede ser intermitente; no hay control de éxito. | P3 | Esperar evento/flujo de descarga y agregar manejo de error. |
| TECH-011 | `window.location.search` se lee directamente en ficha. | Cambios de navegación pueden dejar tab desincronizado o dificultar deep links. | P3 | Usar API de router para query params y sincronización controlada. |
| TECH-012 | Valores seed y handlers están hard-coded. | El demo no representa configuración administrable ni datos reales. | P3 | Fixtures separadas de configuración y carga controlada por entorno. |
| TECH-013 | No hay observabilidad ni reporte de errores de OCR/importación. | Difícil soporte y diagnóstico en archivos reales. | P2 | Telemetría sin datos sensibles, logs estructurados y feedback por archivo. |
| TECH-014 | Build auditado no termina dentro de una ventana razonable. | Riesgo de despliegue y feedback lento. | P2 | Reproducir en CI limpio y perfilar transformación por dependencia. |

