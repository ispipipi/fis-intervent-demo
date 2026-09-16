# Hallazgos QA

## QA-001 — P1 — Permisos y datos solo en frontend

- Módulo: seguridad, roles y persistencia
- Pantallas: `/`, header, todas las rutas
- URL: `/#/dashboard`
- Elemento: selector de rol y Zustand persistido
- Descripción: el cambio de Handler/Gerente/CEO se realiza desde un selector local. No existe autenticación, backend, sesión real ni autorización del lado servidor.
- Requerimiento: perfiles con permisos diferenciados y acceso restringido a información del caso.
- Esperado: el servidor debe validar identidad, rol, propietario y operación antes de leer o modificar datos.
- Obtenido: el alcance se filtra con `useVisibleCases()` y `canWrite` en la UI; los datos están en `localStorage`.
- Pasos de reproducción: 1) abrir la app; 2) cambiar el selector de rol; 3) observar que la vista cambia sin login; 4) revisar `README.md` y la configuración de Zustand.
- Evidencia: `src/App.tsx:109-166`, `src/App.tsx:109-112`, `src/store/useDemoStore.ts:230-568`, `README.md:48-52`.
- Causa probable: demo frontend diseñado sin capa de servicios.
- Recomendación: implementar autenticación, API, autorización por caso/acción, auditoría de servidor y almacenamiento privado antes de producción.
- Estado: Abierto.

## QA-002 — P1 — Los documentos reales no forman un expediente recuperable

- Módulo: documentos y expediente digital
- Pantalla: `/casos/:id?tab=documentos`
- Elemento: confirmación de carga
- Descripción: la carga conserva nombre, tipo, fecha, extracción y `pathMock`; el binario no se persiste ni existe un enlace real para abrirlo posteriormente.
- Requerimiento: expediente digital con todos los documentos disponibles dentro del sistema.
- Esperado: almacenar el archivo de forma segura y permitir consulta/descarga según permiso.
- Obtenido: `confirmUpload` crea metadata y un URI `mock://docs/...`.
- Pasos de reproducción: 1) cargar un PDF; 2) confirmar; 3) recargar o abrir el caso desde otra sesión; 4) observar que solo queda metadata sin visualizador ni descarga del PDF fuente.
- Evidencia: `src/store/useDemoStore.ts:306-321`, `README.md:48-52`.
- Causa probable: alcance deliberado de prototipo.
- Recomendación: separar metadata de objeto documental y usar storage privado con URL firmada, checksum, antivirus, versionado y control de acceso.
- Estado: Abierto.

## QA-003 — P1 — No existe edición posterior de referencia y fecha de descarga/ETA

- Módulo: ficha de caso
- Pantallas: `/casos/nuevo`, `/casos/:id`
- Elemento: Reference No y fecha de descarga
- Descripción: la referencia es editable solo durante el alta. La ficha no tiene formulario de edición general. El alta limita la fecha de descarga a hoy o anterior.
- Requerimiento: modificar referencia por duplicidad y corregir fecha real de descarga; soportar ETA en Intervent.
- Esperado: editar referencia y fecha con validación, historial de cambios y recalculo de prescripción.
- Obtenido: no hay editor en la ficha y `max={new Date().toISOString().slice(0, 10)}` bloquea fechas futuras.
- Pasos de reproducción: 1) crear/abrir un caso; 2) buscar control de edición de referencia/fecha en la ficha; 3) intentar alta con fecha futura; 4) observar ausencia de editor y bloqueo de fecha.
- Evidencia: `src/App.tsx:1044-1086`, `src/App.tsx:1129-1348`.
- Causa probable: el modelo contempla `updateCase`, pero no se expuso un formulario de ficha para esos campos.
- Recomendación: definir diferencia ETA/fecha efectiva, permiso, validación de duplicados y evento de auditoría.
- Estado: Abierto.

## QA-004 — P1 — Moneda y tipo de cambio incompletos

- Módulo: cálculo y extracción
- Pantallas: `/casos/:id?tab=calculo`, nuevo caso
- Elemento: moneda y tipo de cambio
- Descripción: el dominio solo admite USD/CLP. El campo `tipoCambio` se almacena, pero las fórmulas calculan directamente la resta sin convertir.
- Requerimiento: más monedas incluyendo EUR y conversión automática o configurable por fecha.
- Esperado: moneda de origen, moneda de cálculo, fecha/fuente del FX, tasa aplicada, redondeo y trazabilidad.
- Obtenido: selector USD/CLP y tipo de cambio visible solo para CLP; `calculateLoss` no usa `tipoCambio`.
- Pasos de reproducción: 1) abrir Cálculo; 2) seleccionar CLP; 3) ingresar tipo de cambio; 4) comparar el resultado antes/después; 5) observar que la resta no cambia por la tasa.
- Evidencia: `src/types/domain.ts:207-219`, `src/types/domain.ts:262-284`, `src/App.tsx:1868-1879`, `src/lib/business.ts:244-274`.
- Causa probable: tipo de cambio incorporado como dato referencial, no como conversión.
- Recomendación: acordar moneda base y reglas contables antes de modificar fórmulas.
- Estado: Abierto.

## QA-005 — P2 — Un caso traspasado mantiene edición en varias pestañas

- Módulo: permisos de ciclo de vida
- Pantalla: `/casos/:id`
- Elemento: `canWrite`
- Descripción: Cálculo aplica `canEditCalculation`, pero `DocumentsTab`, `AnalysisTab`, `ReviewReportTab` y `LettersTab` reciben `canWrite` sin excluir estados traspasados.
- Requerimiento: el expediente traspasado debe quedar bloqueado o regirse por una política explícita de post-traspaso.
- Esperado: todas las mutaciones del caso deben bloquearse o pasar por una transición autorizada.
- Obtenido: un Handler asignado puede cargar/eliminar documentos, confirmar análisis, regenerar informe o editar carta luego del traspaso.
- Pasos de reproducción: 1) abrir un caso traspasado con el Handler asignado; 2) entrar a Documentos/Análisis/Informe/Cartas; 3) observar controles editables.
- Evidencia: `src/App.tsx:1151-1155`, `src/App.tsx:1342-1347`, `src/App.tsx:1428-1650`, `src/App.tsx:1672-1741`, `src/App.tsx:1999-2069`, `src/App.tsx:2160-2241`.
- Causa probable: el bloqueo se aplicó únicamente al cálculo y a la acción de cabecera.
- Recomendación: centralizar `canMutateCase` y aplicarlo a todos los componentes y al store/API.
- Estado: Abierto.

## QA-006 — P2 — Reimportación del mismo Excel puede duplicar registros

- Módulo: Memoria histórica
- Pantalla: `/historial`
- Elemento: deduplicación del lote
- Descripción: `knownIds` compara el ID completo, pero el ID incluye `sourceBatchId`, generado con la hora de importación. El mismo archivo en otra importación obtiene IDs distintos.
- Requerimiento: migración histórica confiable y memoria sin duplicados accidentales.
- Esperado: idempotencia por referencia normalizada, hoja/fila estable y política explícita de duplicados reales.
- Obtenido: `newRecords` puede volver a incorporar todas las filas del mismo archivo.
- Pasos de reproducción: 1) importar un Excel; 2) volver a importar el mismo Excel; 3) comparar total y referencias repetidas.
- Evidencia: `src/store/useDemoStore.ts:509-525`, `src/lib/historyImport.ts:226-249`, `src/lib/historyImport.ts:253-288`.
- Causa probable: deduplicación por ID técnico de lote en vez de clave de negocio.
- Recomendación: usar clave estable y conservar el lote como relación; diferenciar duplicado exacto, referencia repetida legítima y actualización.
- Estado: Abierto.

## QA-007 — P2 — No existe exportación Excel del seguimiento

- Módulo: reportes, memoria y gestión
- Pantallas: `/historial`, `/casos/:id?tab=informe`
- Elemento: descargas
- Descripción: el informe se descarga como TXT y las cartas como HTML. No hay acción para descargar Excel con referencia, contenedor, estado documental, pérdida, fechas, viaje, inspector, oponente, nave, asegurado, CS Claim No y actualizaciones.
- Requerimiento: dashboard/seguimiento exportable a Excel y memoria de gestión completa.
- Esperado: XLSX generado con columnas acordadas, filtros aplicados, fechas y trazabilidad.
- Obtenido: no existe función de exportación XLSX en `App.tsx`.
- Pasos de reproducción: recorrer Dashboard, Benchmark, Memoria e Informe y buscar acción Excel.
- Evidencia: `src/App.tsx:2014-2047`, `src/App.tsx:2182-2186`; única dependencia XLSX usada en lectura.
- Causa probable: SheetJS está conectado solo a importación.
- Recomendación: definir columnas, formato, zona horaria y exportar desde una consulta de datos, no desde el DOM.
- Estado: Abierto.

## QA-008 — P2 — Mantenedor y salida de templates no cubren todo el pedido posterior

- Módulo: cartas y mantenedores
- Pantallas: `/mantenedores`, `/casos/:id?tab=cartas`
- Elemento: catálogo de templates
- Descripción: existen Claim Notice, AoR, Harvest y LoA. No existen SUBRO ni certificado de destrucción. La descarga es HTML imprimible; no existe DOCX/PDF generado con formato contractual final.
- Requerimiento: templates base parametrizados y, posteriormente, formatos adicionales solicitados por el cliente.
- Esperado: catálogo acordado, tokens validados, versión de template, salida formal y campos pendientes bloqueantes.
- Obtenido: cuatro templates editables, sin validación de tokens ni control de versión/documento formal.
- Pasos de reproducción: abrir Mantenedores y Cartas; revisar opciones disponibles y extensión de descarga.
- Evidencia: `src/lib/templates.ts:231-305`, `src/App.tsx:2160-2241`, `src/App.tsx:2394-2505`.
- Causa probable: se implementó deliberadamente el alcance base del demo.
- Recomendación: separar templates contractuales base de extensiones y cerrar primero modelos de datos, aprobaciones y formatos oficiales.
- Estado: Abierto como brecha de evolución; confirmar si es contractual.

## QA-009 — P2 — No existe perfil Inspector restringido

- Módulo: roles y operación de inspección
- Pantallas: selector, casos y ficha
- Elemento: roles disponibles
- Descripción: el dominio solo declara Handler, Gerente y CEO. No existen asignación de Inspector, búsqueda por contenedor/referencia limitada, fecha de inspección, inspección conjunta, resumen libre ni descarga JSI.
- Requerimiento: nuevo usuario Inspector con acceso solo a casos asignados.
- Esperado: rol, asignación, ACL y vista operacional de inspección.
- Obtenido: ningún campo o ruta específica.
- Pasos de reproducción: revisar `UserRole`, selector de perfiles y rutas declaradas.
- Evidencia: `src/types/domain.ts:1-3`, `src/App.tsx:120-164`, `src/App.tsx:2729-2739`.
- Causa probable: exclusión del alcance contractual inicial.
- Recomendación: tratar como epic separado si el cliente lo confirma.
- Estado: Abierto como brecha de evolución.

## QA-010 — P2 — Alerta de movimiento no coincide con solicitud y no notifica

- Módulo: dashboard y alertas
- Pantallas: `/dashboard`, `/benchmark`, ficha
- Elemento: días sin movimiento
- Descripción: el dashboard alerta desde 14 días (`>= 14`), mientras la solicitud posterior indica más de 15 días. Además, la alerta es solo visual; no existe aviso persistente, correo, bandeja o notificación.
- Requerimiento: avisar cuando un caso no se trabaja por más de 15 días.
- Esperado: umbral acordado y aviso con destinatario, fecha, estado leído y trazabilidad.
- Obtenido: badge y conteo calculados al renderizar.
- Pasos de reproducción: revisar filtros `staleDays >= 14` en Dashboard/Benchmark.
- Evidencia: `src/App.tsx:277-278`, `src/App.tsx:471-472`, `src/lib/business.ts:173-177`.
- Causa probable: implementación previa basada en diseño que fijaba 14 días.
- Recomendación: confirmar si la regla es `>15` o `>=15` y definir canal de notificación.
- Estado: Abierto como cambio de alcance o ajuste.

## QA-011 — P2 — No existe agrupación de naves/viajes masivos

- Módulo: dashboard
- Pantalla: `/dashboard`
- Elemento: alertas y resumen
- Descripción: no hay agrupación por nave/viaje ni comentario de cantidad de casos relacionados.
- Requerimiento: destacar naves masivas, por ejemplo “5 casos misma nave/viaje”.
- Esperado: agrupación configurable, navegación al conjunto y conteo actualizado.
- Obtenido: distribución por estado y handler solamente.
- Evidencia: `src/App.tsx:271-423`.
- Recomendación: definir clave de agrupación, ventana temporal y comportamiento al hacer click.
- Estado: Abierto como brecha de evolución.

## QA-012 — P2 — Se puede confirmar traspaso con observaciones pendientes

- Módulo: traspaso
- Pantalla: `/casos/:id`
- Elemento: modal “Confirmar traspaso”
- Descripción: el informe puede quedar “Con observaciones”, pero el botón sigue permitiendo confirmar con observaciones.
- Requerimiento: estado “Completo para traspaso” y control previo a derivación.
- Esperado: bloquear o requerir una decisión explícita y autorizada sobre pendientes.
- Obtenido: el copy ofrece “Confirmar con observaciones” y cambia el estado de destino.
- Pasos de reproducción: abrir un caso incompleto, generar informe, abrir traspaso y observar botón habilitado.
- Evidencia: `src/App.tsx:1173-1182`, `src/App.tsx:1302-1321`.
- Recomendación: acordar política contractual: bloqueo duro, excepción de Gerente o traspaso a estado distinto.
- Estado: Abierto.

## QA-013 — P2 — Build de producción no finaliza en el entorno auditado

- Módulo: build y despliegue
- Elemento: `npm run build`
- Descripción: TypeScript pasa, pero Vite se queda en `transforming...` por más de tres minutos en el entorno auditado.
- Requerimiento: build reproducible para despliegue.
- Esperado: terminar dentro de un tiempo operativo razonable y producir `dist` verificable.
- Obtenido: proceso detenido manualmente tras superar tres minutos; no se obtuvo un resultado final en esta auditoría.
- Pasos de reproducción: ejecutar `npm run build` desde `fis-intervent-demo`.
- Evidencia: salida de validación del 2026-09-16: `vite v6.4.3 building for production... transforming...`.
- Causa posible: bundle grande de PDF/OCR/XLSX, caché o condición del entorno; requiere profiling.
- Recomendación: reproducir en CI limpio, medir por plugin/chunk y separar OCR pesado mediante lazy loading o worker dedicado si corresponde.
- Estado: Requiere reproducción técnica.

## QA-014 — P2 — Destino implementado como Logistic, no Lawgistic

- Módulo: traspaso y textos
- Pantallas: ficha, informe, manual
- Elemento: destino judicial
- Descripción: enum, botones y textos dicen `Logistic`.
- Requerimiento: reemplazar Logistic por Lawgistic.
- Esperado: copy consistente y, si es valor persistido, migración del enum/datos.
- Obtenido: `TransferDestination = "Logistic"` y estado `Traspasado a Logistic`.
- Evidencia: `src/types/domain.ts:34-68`, `src/App.tsx:75-81`, `src/App.tsx:1228-1229`, `src/App.tsx:2037-2039`.
- Recomendación: confirmar si es solo marca/copy o integración; actualizar de forma transaccional.
- Estado: Abierto como cambio solicitado.

## QA-015 — P2 — Eliminación de documento no deja evidencia en bitácora

- Módulo: auditoría documental
- Pantalla: Documentos
- Elemento: eliminar documento
- Descripción: `removeDocument` filtra el documento, pero no agrega evento ni actualiza `ultimaActualizacion` del caso.
- Requerimiento: historia y memoria de gestión de los cambios del expediente.
- Esperado: registrar quién, cuándo, qué documento y motivo; afectar movimiento del caso.
- Obtenido: desaparición silenciosa de metadata.
- Pasos de reproducción: eliminar documento desde un caso editable y revisar Historial.
- Evidencia: `src/App.tsx:1623-1626`, `src/store/useDemoStore.ts:339-343`.
- Recomendación: evento `documento_eliminado` y confirmación antes de borrar.
- Estado: Abierto.

## QA-016 — P3 — Copiar acciones registra éxito sin comprobar el portapapeles

- Módulo: solicitudes y cartas
- Pantallas: Documentos y Cartas
- Elemento: botones Copiar
- Descripción: se llama `navigator.clipboard?.writeText(...)` sin `await`, manejo de rechazo ni confirmación visible. Cartas registra el evento inmediatamente.
- Requerimiento: botones deben hacer lo que indican y comunicar resultado.
- Esperado: mostrar “Copiado” si funciona y error si el navegador bloquea permisos.
- Obtenido: la UI no confirma resultado; el evento de carta puede afirmar copia aunque haya fallado.
- Evidencia: `src/App.tsx:1654-1667`, `src/App.tsx:2178-2180`.
- Recomendación: envolver en función asíncrona con estado de éxito/error y fallback de selección.
- Estado: Abierto.

## QA-017 — P2 — Extracción y clasificación dependen demasiado del nombre/maquetación

- Módulo: ingesta documental
- Pantallas: Nuevo caso y Documentos
- Elemento: `classifyDocument`, `extractCaseData`
- Descripción: la clasificación prioriza alias y fuzzy matching del nombre; la extracción depende de etiquetas y límites inline. Un PDF real con otra nomenclatura o layout puede quedar “Sin clasificar”, “requiere OCR” o con campos vacíos.
- Requerimiento: identificar y clasificar cada documento y extraer antecedentes relevantes del BL, facturas y liquidaciones.
- Esperado: cobertura validada con el corpus del cliente, confianza por campo, colisiones y revisión clara.
- Obtenido: heurística local sin score visible por campo; el documento puede cargarse como metadata aun sin texto.
- Pasos de reproducción: cargar un archivo con nombre sin alias o un PDF escaneado y observar estado de extracción.
- Evidencia: `src/lib/business.ts:45-108`, `src/lib/extraction.ts:208-256`, `src/lib/extraction.ts:338-364`.
- Recomendación: construir set de evaluación con los casos entregados y medir precisión/recall por tipo y campo.
- Estado: Abierto.

## QA-018 — P3 — Apertura `file://` no es una ruta de ejecución soportada de forma robusta

- Módulo: despliegue y soporte
- Elemento: `index.html`
- Descripción: el HTML muestra un fallback para `file:`, pero sigue incluyendo el módulo `/src/main.tsx` y el enlace de fallback apunta a un puerto fijo 4187, aunque Vite declara 4184.
- Requerimiento: demo compartible y apertura confiable según documentación.
- Esperado: fallback autocontenido o enlace dinámico/instrucción consistente; no pantalla blanca al abrir fuente/dist directamente.
- Obtenido: el repo documenta HTTP, pero la ruta file depende de un servidor concreto no garantizado.
- Pasos de reproducción: abrir `index.html` o `dist/index.html` como archivo local y observar el comportamiento del navegador.
- Evidencia: `index.html:57-64`, `vite.config.ts:7-13`, `README.md:28-38`.
- Recomendación: eliminar la falsa promesa de abrir como archivo o generar un fallback realmente independiente del módulo.
- Estado: Abierto.

