# Handoff para Milenko

## Desarrollo completo de Intervent Preclaim

**Fecha:** 21 septiembre 2026  
**Repositorio:** https://github.com/ispipipi/fis-intervent-demo  
**Rama base:** `main`  
**Producto:** plataforma Preclaim para gestión documental, análisis, cálculo de pérdida y derivación de casos FIS.

---

## 1. Objetivo del handoff

Este documento entrega a Milenko el contexto funcional, técnico y documental necesario para transformar el demo actual en una solución completa para producción.

El desarrollo debe mantener la experiencia y los flujos ya validados en el demo, pero reemplazar las simulaciones locales por persistencia, seguridad, procesamiento documental y operación productiva reales.

La línea base debe mantenerse apegada al alcance contractual de la Fase 1. Las mejoras que no estén dentro de ese alcance deben quedar identificadas como evolución o cambio solicitado, no incorporarse silenciosamente.

---

## 2. Fuente de verdad

Usar las fuentes en este orden:

1. Contrato NPR FIS Chile v6.0 firmado y sus anexos.
2. Reuniones y definiciones operativas entregadas por FIS.
3. QA funcional de Sauvalle y matriz de trazabilidad.
4. Documento `Revision_completa_cambios_realizados.docx`.
5. Documento `Preguntas_para_cierre_funcional_FIS_revisado.docx`.
6. Código y comportamiento actual del demo.

Las preguntas revisadas por el usuario todavía son preguntas para FIS. No deben interpretarse como respuestas jurídicas o reglas finales. Las fórmulas, prescripción, plantillas y checklist deben implementarse como parámetros versionables hasta contar con la confirmación oficial.

---

## 3. Estado actual del repositorio

El repositorio contiene el demo funcional de Intervent Preclaim. La rama `main` tiene cambios locales relevantes y no debe limpiarse ni reiniciarse sin revisar el estado de trabajo.

El demo ya incorpora:

- Dashboard operativo y benchmark por Handler.
- Creación y revisión de casos.
- Carga de carpeta documental mediante selección o drag and drop.
- Clasificación y renombrado propuesto de documentos.
- Expediente e inventario documental.
- Propuesta de extracción y revisión humana.
- Resumen, tipo de caso, causa potencial y méritos preliminares.
- Tres métodos de cálculo de pérdida.
- Monedas USD, CLP y EUR con conversión configurable.
- Cartas base AoR, Harvest, LoA y Claim Notice.
- Checklist de cierre y preparación de traspaso a FIS o Lawgistic.
- Memoria histórica precargada y separada de casos activos.
- Manual de usuario.
- Exportaciones y trazabilidad del caso.

El demo todavía usa decisiones locales y persistencia de demostración. El objetivo de Milenko es llevar estos flujos a una implementación completa, segura, auditable y operable.

---

## 4. Alcance contractual que debe desarrollarse

### 4.1 Ingreso y procesamiento documental

- Recibir la carpeta documental de un caso por carga o drag and drop.
- Identificar el caso mediante referencia interna.
- Procesar todos los archivos en forma aislada y trazable.
- Preservar el archivo original.
- Clasificar documentos como booking, claim report, factura, liquidación, BL/VL, nota de crédito, entre otros.
- Proponer y aplicar nombres normalizados según tipo documental.
- Informar archivos incompatibles, ilegibles, parciales o con baja confianza sin detener el lote completo.
- Mantener estado de procesamiento por archivo y por carpeta.

### 4.2 Expediente e inventario

- Crear un expediente digital por caso.
- Mostrar documentos disponibles, faltantes y documentos por solicitar.
- Permitir corrección humana del tipo documental.
- Mantener el historial de cambios y el usuario responsable.
- Permitir consulta y descarga según permisos.

### 4.3 Extracción y análisis

Extraer, cuando aparezca en los documentos:

- Cliente o asegurado.
- Transportista u oponente.
- Nave y número de viaje.
- Tipo de carga.
- Lugar y fecha de embarque.
- Lugar y fecha de descarga.
- Número de reclamo.
- Inspector o surveyor.
- Fecha de prescripción.
- Moneda, valores, cantidades y fechas de respaldo.

El sistema debe mostrar la fuente documental de cada dato, nivel de confianza y permitir que el Handler confirme o corrija la propuesta.

### 4.4 Resumen y evaluación

- Generar un resumen breve del caso.
- Identificar el tipo de caso según antecedentes disponibles.
- Proponer la causa potencial del daño o siniestro.
- Indicar en qué documentos se sustenta la causa.
- Generar una evaluación preliminar de méritos.
- Presentar todo lo anterior como recomendación para revisión humana, nunca como decisión definitiva automática.

### 4.5 Cálculo de pérdida

Implementar y parametrizar los tres criterios funcionales definidos para el demo:

1. Liquidación del embarque versus embarque comparable.
2. Liquidación versus reporte de mercado.
3. Valor factura versus venta o liquidación destino.

El mantenedor de cálculo debe permitir configurar:

- Fórmula.
- Campos de entrada.
- Base bruta o neta.
- Costos y ajustes incluidos.
- Moneda origen y moneda resultado.
- Tipo de cambio.
- Fecha y fuente del tipo de cambio.
- Redondeo, mínimos y topes.
- Justificación obligatoria.
- Versión y vigencia.

El resultado debe mostrar los tres métodos, permitir seleccionar uno, guardar la justificación, mantener el snapshot utilizado y bloquear cambios silenciosos después del traspaso.

### 4.6 Generación documental

La línea base contempla cuatro documentos parametrizados:

- AoR.
- Harvest.
- LoA.
- Claim Notice.

El mantenedor de templates debe permitir:

- Crear y versionar templates base.
- Definir campos y variables.
- Configurar textos parametrizados.
- Marcar campos obligatorios.
- Previsualizar el resultado.
- Aprobar una versión.
- Generar salida descargable.
- Mantener trazabilidad del template y de los datos utilizados.

Los textos legales, logos, firmas, campos definitivos y formatos deben quedar configurables, no hardcodeados.

### 4.7 Revisión humana y traspaso

El Handler debe poder:

- Confirmar o corregir la extracción.
- Corregir clasificación documental.
- Confirmar documentos faltantes.
- Editar resumen y causa potencial.
- Revisar y seleccionar el cálculo aplicable.
- Aprobar cartas.
- Completar checklist.
- Preparar el informe de traspaso.

El caso debe poder quedar listo para:

- **FIS:** recupero extrajudicial.
- **Lawgistic:** recupero judicial.

Las condiciones exactas de cierre, bloqueo y reversa deben estar en un checklist configurable y sujeto a aprobación de FIS.

### 4.8 Estados y alertas

Implementar como estados mínimos:

- En procesamiento.
- Pendiente de revisión.
- Pendiente de documentación.
- Pérdida calculada.
- Completo para traspaso.
- Transferido a FIS.
- Transferido a Lawgistic.

Implementar alertas configurables para:

- Inactividad superior a 15 días, según regla oficial de FIS.
- Prescripción próxima.
- Documentación faltante.
- Error de procesamiento.
- Caso listo para traspaso.
- Cambios relevantes en cálculo o documentos.

Los destinatarios, canales y frecuencia deben salir de un mantenedor o matriz de configuración.

### 4.9 Memoria histórica

- La memoria inicial se basa en el Excel ya entregado por FIS.
- El alcance reconocido es de 39 hojas y aproximadamente 4.240 registros.
- La memoria debe mantenerse separada de los casos activos.
- Debe conservar la fuente, versión, fecha de importación y trazabilidad.
- Correcciones futuras deben manejarse como una nueva versión, conservando la memoria original.
- No solicitar una nueva carga manual para el demo.

### 4.10 Dashboard y reportes

Implementar indicadores por Handler y por cartera:

- Casos en cada estado.
- Documentos pendientes.
- Casos con alertas.
- Pérdida calculada.
- Casos inactivos.
- Casos listos para traspaso.
- Comparación general entre Handlers.
- Casos agrupables por nave y viaje.

Permitir exportar a Excel al menos:

- Referencia.
- Container.
- Estado de documentos faltantes.
- Loss amount.
- Loading date.
- Discharge date.
- Voyage.
- Surveyor.
- Opponent.
- Vessel.
- Assured.
- CS Claim No.
- Fechas de recepción, revisión, cálculo, cierre y traspaso.

---

## 5. Roles y permisos

### Handler

Acceso a crear, cargar, revisar, corregir, calcular, generar documentos y preparar traspasos de sus casos.

### Gerente

Acceso a cartera, benchmark, revisión global, alertas, reversa de traspasos y supervisión de Handlers.

### CEO o Dirección

Acceso de consulta a indicadores, cartera, actividad y resultados consolidados.

### Administración

Debe definirse para administrar usuarios, templates, fórmulas, monedas, tipos de cambio, jurisdicciones y catálogos.

### Fuera de la línea base actual

Inspector, asignación restringida a Inspector y Carta JSI quedan como evolución posterior, salvo que FIS los incorpore formalmente mediante cambio de alcance.

---

## 6. Preguntas pendientes de FIS

Las preguntas están documentadas en `Preguntas_para_cierre_funcional_FIS_revisado.docx`.

Se encuentran revisadas por el usuario, pero requieren respuesta formal de FIS en los siguientes temas:

1. Fórmulas oficiales de pérdida.
2. Estructura de la referencia.
3. Matriz de prescripción.
4. Claim Notice versus carta de notificación.
5. Templates oficiales.
6. Checklist de cierre.
7. Condiciones de traspaso.
8. Regla de inactividad.
9. Destinatarios y canales de alerta.
10. Confirmación del Excel histórico ya entregado y su versionado.
11. Confirmación del corpus documental ya entregado y revisión humana de excepciones.

Hasta recibir las respuestas oficiales, implementar estas reglas como configuración versionable y evitar valores rígidos en la lógica de negocio.

---

## 7. Exclusiones que no deben incorporarse sin aprobación

- Integraciones directas con APIs de navieras.
- Robots de descarga.
- Lectura automática de correo entrante.
- Escritura automática en sistemas externos.
- Rol Inspector y Carta JSI.
- Generación de SUBRO.
- Generación de certificados de destrucción.
- Flujos posteriores al traspaso a FIS o Lawgistic.
- Reimportación avanzada con homologación, deduplicación automática o rollback, salvo cambio aprobado.

---

## 8. Requisitos técnicos para producción

- Reemplazar la persistencia local del demo por backend y base de datos.
- Implementar almacenamiento seguro de documentos.
- Implementar autenticación y autorización por rol.
- Mantener auditoría de cambios y acciones sensibles.
- Procesar documentos de forma asíncrona cuando corresponda.
- Separar extracción, clasificación, cálculo, templates y workflow como módulos mantenibles.
- Registrar versión de reglas, fórmulas y templates usada en cada resultado.
- Evitar secretos en el repositorio.
- Mantener responsive desktop y móvil.
- Mantener el manual de usuario dentro de la plataforma.
- Incorporar pruebas unitarias, integración y aceptación para cálculos y flujos críticos.
- Mantener compatibilidad con Firebase si se conserva esa plataforma como destino.
- No instalar dependencias nuevas salvo necesidad justificada.

---

## 9. Definition of Done

Una funcionalidad se considera terminada cuando:

- Está implementada en frontend y backend.
- Tiene persistencia real.
- Tiene permisos definidos.
- Tiene estados de carga, error, vacío y éxito.
- Tiene auditoría cuando modifica información sensible.
- Tiene pruebas automatizadas o casos de aceptación documentados.
- No rompe el flujo del demo actual.
- Está documentada en el manual.
- Es exportable o descargable cuando corresponde.
- Puede ser validada con los documentos entregados.
- Incluye una nota de configuración si depende de una definición pendiente de FIS.

---

## 10. Orden recomendado de desarrollo

### Fase 0 — Preparación

- Revisar repositorio, demo y fuentes.
- Levantar arquitectura propuesta.
- Identificar decisiones que deben quedar en mantenedores.
- Confirmar entorno, autenticación, base de datos y almacenamiento.

### Fase 1 — Plataforma base

- Usuarios y permisos.
- Casos, estados y eventos.
- Base de datos.
- Storage documental.
- Auditoría.

### Fase 2 — Documentos y extracción

- Carga de carpetas.
- Procesamiento por archivo.
- OCR y clasificación.
- Extracción con fuentes y confianza.
- Inventario y solicitudes.

### Fase 3 — Cálculos y templates

- Mantenedor de fórmulas.
- Tres métodos.
- Monedas y tipos de cambio.
- Mantenedor de templates.
- Preview, aprobación y generación.

### Fase 4 — Workflow y gestión

- Revisión humana.
- Checklist.
- Alertas.
- Inactividad.
- Traspasos FIS/Lawgistic.
- Reversa controlada.

### Fase 5 — Memoria y reporting

- Memoria histórica precargada.
- Versionado histórico.
- Dashboard y benchmark.
- Exportaciones Excel.
- Agrupación por nave/viaje.

### Fase 6 — UAT y salida

- Casos de aceptación.
- Pruebas con documentos reales entregados.
- Validación de fórmulas y templates con FIS.
- Seguridad, respaldo y monitoreo.
- Manual y capacitación.
- Plan de despliegue y soporte.

---

## 11. Comandos del repositorio

Desde `fis-intervent-demo`:

```bash
npm install
npm run dev
npm run lint
npm run build
```

El repositorio no tiene un script `npm test` configurado actualmente. Debe agregarse una estrategia de pruebas para la implementación productiva.

---

## 12. Documentos incluidos en este handoff

El paquete entregable debe contener:

- Este handoff técnico.
- `Revision_completa_cambios_realizados.docx`.
- `Preguntas_para_cierre_funcional_FIS_revisado.docx`.
- `Documento_Funcional_Intervent_Preclaim_Sauvalle.docx`.
- `README.md` del repositorio.
- Contrato firmado en PDF y DOCX.
- Reuniones y contexto operativo de FIS.
- QA funcional completo de Sauvalle.
- Excel histórico entregado por FIS.
- Paquete documental de casos de ejemplo.
- Casos documentales de muestra para validación.

---

## 13. Entrega esperada de Milenko

La especificación ejecutable de OCR, extracción, cálculos, templates, puertas de workflow y pruebas se encuentra en:

`documentos/Especificacion_Tecnica_Milenko_OCR_Calculos.md`

Este documento es un anexo técnico obligatorio de este handoff. En caso de contradicción, prevalece la fuente contractual indicada en la sección 2 y la regla de no inventar definiciones abiertas de FIS.

Milenko debe devolver:

- Arquitectura técnica.
- Backlog priorizado por fase.
- Modelo de datos.
- Plan de integración documental.
- Implementación funcional completa.
- Mantenedores de fórmulas, templates y parámetros.
- Pruebas automatizadas y UAT.
- Manual actualizado.
- Evidencia de validación con documentos reales.
- Instrucciones de despliegue.
- Matriz de riesgos, pendientes y decisiones requeridas de FIS.

## Regla final

No asumir reglas jurídicas, fórmulas, textos legales ni condiciones de traspaso que FIS todavía no haya aprobado. Cuando exista una definición pendiente, construirla como parámetro versionable y dejar la decisión visible para el responsable del negocio.
