# Casos de regresión

Formato: ID, precondición, pasos, resultado esperado y prioridad.

| ID | Caso | Pasos resumidos | Resultado esperado | Prioridad |
|---|---|---|---|---|
| TC-001 | Selector Handler | Abrir `/`, elegir cada Handler, ir a Casos. | Cada Handler ve solo sus casos asignados. | P1 |
| TC-002 | Vista Gerente | Elegir Gerente y abrir Dashboard/Casos. | Ve portafolio completo, Benchmark y Mantenedores. | P1 |
| TC-003 | Vista CEO | Elegir CEO y abrir un caso. | Ve portafolio y métricas; controles de edición deshabilitados. | P1 |
| TC-004 | Manual global | Abrir Manual desde portada, header y footer. | La ruta carga y describe funcionalidades y permisos. | P2 |
| TC-005 | Alta completa | Completar mínimos y Guardar y continuar. | Caso queda en Preclaim y aparece en lista. | P1 |
| TC-006 | Alta incompleta | Guardar borrador sin mínimos. | Caso queda en Datos incompletos y no se pierde. | P1 |
| TC-007 | Referencia duplicada | Crear caso con ID existente. | Se bloquea y muestra mensaje de corrección. | P1 |
| TC-008 | Fecha futura | Intentar alta con fecha de descarga futura. | Regla acordada ETA/descarga se aplica y mensaje es claro. | P1 |
| TC-009 | Carpeta documental | Cargar la carpeta de un caso de prueba. | Archivos se listan, proceso no bloquea UI y se genera propuesta. | P1 |
| TC-010 | Drag and drop | Arrastrar varios archivos a Nuevo caso y Ficha. | La carga se recibe; si no, se informa sin perder el formulario. | P1 |
| TC-011 | Clasificación | Cargar los 17 nombres de fixture. | Cada archivo propone tipo correcto o queda claramente corregible. | P1 |
| TC-012 | Renombrado | Confirmar carga con tipos corregidos. | Nombre normalizado usa referencia y abreviatura del tipo. | P2 |
| TC-013 | Duplicado documental | Cargar el mismo archivo dos veces. | No se duplica según ruta/nombre/política definida. | P2 |
| TC-014 | Extracción BL | Cargar BL con datos completos. | Referencia, transportista, nave, viaje, carga y fechas aparecen para revisión. | P1 |
| TC-015 | Extracción factura | Cargar factura/liquidación de fixture. | Valores y fuentes se muestran como propuesta editable, sin decisión automática. | P1 |
| TC-016 | OCR | Cargar PDF escaneado. | Se identifica necesidad de OCR o se procesa; error por archivo es visible. | P2 |
| TC-017 | Checklist | Abrir Documentos con carga parcial y completa. | Contador 0/17, parcial y 17/17 son correctos. | P1 |
| TC-018 | Solicitud faltantes | Copiar texto de faltantes con y sin faltantes. | Texto corresponde al caso y confirma éxito de copia. | P2 |
| TC-019 | Análisis térmico | Caso Temperatura con termógrafo; ingresar valores. | Desviación y mérito sugerido se calculan; solo Handler confirma. | P1 |
| TC-020 | Análisis no aplicable | Caso sin termógrafo o causa distinta. | Se explica por qué no hay sugerencia y se permite conclusión manual según rol. | P2 |
| TC-021 | Métodos de pérdida | Ingresar insumos de los tres métodos. | Resultados correctos, ordenados y seleccionables. | P1 |
| TC-022 | Validación cálculo | Guardar sin método, sin respaldo y con justificación corta. | Cada error bloquea guardado y señala la causa. | P1 |
| TC-023 | Venta a firme | Activar venta a firme sin nota y luego con nota. | Sin nota bloquea; con nota calcula nota más rubros. | P1 |
| TC-024 | Monedas/FX | Comparar USD, CLP, EUR y tasas por fecha. | Solo se acepta cuando las reglas financieras estén implementadas y trazables. | P1 |
| TC-025 | Avance de estado | Completar documentación, análisis y cálculo. | Secuencia termina en Cálculo completo sin saltos indebidos. | P1 |
| TC-026 | Informe con pendientes | Generar informe sin docs o cálculo. | Estado Con observaciones y lista completa de pendientes. | P1 |
| TC-027 | Traspaso listo | Generar informe completo y confirmar FIS/Lawgistic. | Estado, destino, bitácora y bloqueo quedan consistentes. | P1 |
| TC-028 | Traspaso con pendientes | Intentar confirmar informe con observaciones. | Se aplica política aprobada: bloqueo o excepción autorizada. | P1 |
| TC-029 | Reversión | Como Gerente, probar motivo corto y válido. | Corto bloquea; válido revierte y audita. Handler/CEO no pueden revertir. | P1 |
| TC-030 | Post-traspaso | Abrir todas las tabs con caso traspasado. | No hay mutaciones fuera de política autorizada. | P1 |
| TC-031 | Cartas | Generar Claim Notice, AoR, Harvest y LoA. | Tokens se reemplazan, pendientes quedan visibles y descarga registra evento. | P2 |
| TC-032 | Templates | Gerente edita y desactiva template; CEO consulta; Handler intenta acceder. | Permisos y efecto en generación son consistentes. | P2 |
| TC-033 | Memoria precargada | Abrir Memoria en perfil nuevo. | Historial incluido aparece sin carga manual y no altera activos. | P1 |
| TC-034 | Memoria idempotente | Importar mismo Excel dos veces. | No se duplican registros exactos; duplicados reales se explican. | P1 |
| TC-035 | Memoria búsqueda | Buscar por referencia, nave, handler y categoría. | Resultados y detalle de hoja/fila corresponden. | P2 |
| TC-036 | Exportación | Exportar seguimiento e historial a XLSX. | Archivo abre y contiene columnas aprobadas. | P1 |
| TC-037 | Inspector | Login/rol Inspector y caso asignado/no asignado. | Solo ve asignados, puede registrar inspección y descargar JSI. | P1 |
| TC-038 | Inactividad | Crear/ajustar caso a 14, 15 y 16 días. | Umbral aprobado y aviso quedan consistentes. | P2 |
| TC-039 | Naves masivas | Crear casos misma nave/viaje. | Agrupación y contador aparecen conforme a regla. | P2 |
| TC-040 | Persistencia | Modificar caso, refrescar y abrir en otra sesión. | Datos y permisos persisten en backend sin fuga entre usuarios. | P1 |
| TC-041 | Responsive | Probar 320, 768, 1024, 1280 y 1920 px. | Sin scroll horizontal accidental, controles accesibles y tablas utilizables. | P2 |
| TC-042 | Build/deploy | Ejecutar lint, build, preview y rutas hash. | CI pasa, assets cargan y refresco de rutas no rompe la app. | P1 |

