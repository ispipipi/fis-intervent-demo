# Especificación técnica de desarrollo

## Intervent Preclaim: OCR, cálculos y flujo completo

**Versión:** 1.0  
**Fecha:** 22 de septiembre de 2026  
**Repositorio:** https://github.com/ispipipi/fis-intervent-demo  
**Documento base:** Reunion_Milenko_Que_debe_hacer_y_que_probar.docx  
**Objetivo:** transformar el demo en una solución productiva, auditable y operable.

---

## 1. Regla de lectura para desarrollo

Este documento convierte los ocho pasos de la reunión de Milenko en requisitos ejecutables. El equipo debe implementarlos como una única cadena de trabajo:

1. Crear o identificar el caso.
2. Cargar la carpeta documental.
3. Procesar todos los archivos.
4. Revisar el expediente e inventario.
5. Analizar el caso como propuesta para revisión humana.
6. Calcular la pérdida mediante los métodos disponibles.
7. Generar documentos desde templates versionados.
8. Cerrar y traspasar a FIS o Lawgistic.

La solución no puede presentar datos OCR, causa, mérito ni cálculo como decisión definitiva sin revisión humana.

### 1.1 Reglas que no se pueden inventar

Las siguientes decisiones quedaron abiertas en la revisión QA y deben vivir en mantenedores/configuración versionada hasta recibir aprobación escrita de FIS:

- fórmula matemática final de cada método, especialmente bruto versus neto;
- ventana de similitud del embarque comparable;
- fuente, fecha y dirección del tipo de cambio;
- convención canónica de la referencia y fuente del correlativo;
- matriz de prescripción por jurisdicción, transporte, fecha base y excepción;
- checklist documental por tipo de caso y documentos no aplicables;
- equivalencia entre Claim Notice y carta de notificación a la naviera;
- textos, campos, firmas y formato oficial de las cuatro cartas;
- umbral, calendario y destinatarios de las alertas de inactividad;
- condiciones exactas de traspaso a FIS y Lawgistic.

Si una de estas reglas no está configurada, el sistema debe mostrar “Pendiente de definición FIS” y bloquear la salida que dependa de ella. No debe utilizar una constante oculta en código.

### 1.2 Alcance contractual de esta entrega

Incluido:

- carpeta ya descargada como entrada;
- PDF, XLSX, XLS y CSV;
- preservación del original;
- OCR, clasificación, renombrado y extracción asistida;
- expediente e inventario documental;
- resumen, tipo, causa y mérito como propuesta editable;
- tres métodos de cálculo y caso especial de venta a firme/nota de crédito;
- USD, CLP y EUR mediante catálogo configurable;
- AoR, Harvest, LoA y Claim Notice parametrizados;
- roles, auditoría, memoria histórica, dashboard, reportes y traspaso local.

Fuera de esta entrega, salvo cambio formal de alcance:

- API o robot para entrar a la plataforma del asegurador;
- lectura de correo entrante o envío automático de solicitudes;
- integración automática con FIS/Lawgistic;
- Inspector y Carta JSI;
- SUBRO y certificados de destrucción;
- procesos posteriores al traspaso.

---

## 2. Criterios de producción obligatorios

### 2.1 Persistencia y seguridad

La versión productiva debe reemplazar localStorage, IndexedDB y pathMock por:

- base de datos multiusuario;
- storage privado para binarios originales y derivados;
- URLs de descarga con autorización y expiración;
- autenticación y autorización de servidor;
- auditoría de cada mutación sensible;
- backup y recuperación;
- antivirus y límites de tamaño/tipo;
- separación por ambiente: desarrollo, QA y producción.

El frontend no puede ser la autoridad de permisos. Cada endpoint debe verificar usuario, rol, caso y acción.

### 2.2 Identidad, trazabilidad e idempotencia

Cada archivo debe conservar:

- documentId;
- caseId;
- nombre original;
- ruta relativa de la carpeta de entrada;
- hash SHA-256;
- tamaño, MIME y fecha de carga;
- nombre normalizado propuesto y aplicado;
- tipo documental y score;
- página, coordenadas y texto fuente de cada campo extraído;
- versión del OCR/modelo/parser;
- estado de procesamiento;
- usuario y fecha de corrección.

El hash evita duplicar un archivo en el mismo caso. Una nueva versión del mismo archivo no debe sobrescribir la anterior: debe crear versión y evento de auditoría.

### 2.3 No pérdida de lote

El procesamiento debe ser aislado por archivo. Un error de un PDF no puede abortar los demás.

Estados mínimos de archivo:

recibido, procesando, procesado, procesado_con_ocr, parcial, requiere_revision, no_soportado, error_reintentable, error_permanente.

Estados mínimos del lote:

recibido, procesando, requiere_revision, completo, completo_con_excepciones, fallido.

Debe existir reintento idempotente por archivo y descarga de un reporte de excepciones.

---

## 3. Flujo funcional completo y puertas de salida

### Paso 1 — Crear o identificar el caso

#### Comportamiento

- El Handler puede crear un caso manual o iniciar la carga de una carpeta.
- La referencia es editable antes y después de abrir el caso.
- Se normaliza a mayúsculas, sin tildes ni separadores ambiguos.
- Se valida duplicidad exacta y duplicidad normalizada.
- Una duplicidad advierte y bloquea el cierre hasta que el Handler elija corregir, continuar como duplicado justificado o abrir como nueva versión.
- Se conserva valor anterior, valor nuevo, usuario, fecha y motivo.
- El Handler queda visible en la cabecera.
- La sugerencia Cliente → Handler es una recomendación, no una asignación silenciosa.

#### Datos mínimos

reference, claimHandler, assured, opponent, vessel, dateOfDischarge o ETA, jurisdiccion.

#### Puerta

No se permite pasar a Preclaim si falta un dato mínimo, salvo guardar como Datos incompletos.

### Paso 2 — Cargar la carpeta

#### Comportamiento

- Aceptar drag and drop y selección de carpeta.
- Aceptar archivos individuales.
- Aceptar PDF, XLSX, XLS y CSV.
- Rechazar MIME/extensión no soportada sin perder el lote.
- Preservar el archivo original sin cambiarlo.
- Crear un nombre normalizado como propuesta, nunca borrar el original.
- Mostrar progreso por archivo y progreso total.
- Mostrar errores por archivo con opción de reintentar.
- Registrar un lote y asociar cada archivo a un caso.

#### Puerta

El lote se considera recibido cuando todos los archivos tienen registro, aunque algunos tengan estado de excepción.

### Paso 3 — Procesar los documentos

Para cada archivo, el pipeline es:

1. calcular hash y detectar duplicado;
2. identificar formato y página;
3. extraer texto nativo cuando existe;
4. ejecutar OCR si la capa de texto es insuficiente;
5. clasificar el documento;
6. extraer campos específicos del tipo;
7. normalizar fechas, montos, monedas, unidades y códigos;
8. validar contra reglas documentales y otros documentos;
9. calcular score de documento y score por campo;
10. guardar evidencia y propuesta;
11. enviar a revisión humana si hay conflicto, baja confianza o campo obligatorio faltante.

#### Umbrales de confianza

| Score | Estado | Acción |
|---:|---|---|
| 0.90 o superior | Alta | Proponer automáticamente; siempre queda confirmable por Handler. |
| 0.75 a 0.899 | Media | Proponer y enviar a revisión obligatoria. |
| Menor que 0.75 | Baja | No aplicar al expediente; mostrar evidencia y pedir corrección. |
| Sin score o documento contradictorio | Revisión | No seleccionar valor ganador automáticamente. |

El score nunca reemplaza la aprobación humana. El score debe calcularse también por campo.

#### Conflictos entre documentos

Prioridad operativa por dato:

- logística: BL > Tracking con evento real > Booking > otros;
- descarga real: Tracking con evento real > BL confirmado > reporte de inspección > Booking/ETA;
- asegurado/cliente: AoR/LoA > BL > factura;
- valores de pérdida: liquidación o factura correspondiente > texto libre de otros documentos;
- causa: QC/inspección/termógrafo > cartas narrativas > inferencia por nombre de archivo.

Si dos documentos con igual prioridad difieren, no se debe sobrescribir. Se crea conflicto con ambos valores, sus fuentes y una decisión requerida del Handler.

### Paso 4 — Revisar el expediente

La ficha debe mostrar por separado:

- documentos disponibles;
- documentos faltantes;
- documentos no aplicables;
- documentos solicitables;
- documentos con error;
- campos extraídos y fuente;
- conflictos;
- porcentaje de cobertura sobre documentos aplicables.

El checklist es parametrizable por tipo de caso. No aplica requiere motivo y usuario.

### Paso 5 — Analizar el caso

La automatización puede proponer:

- resumen de lo ocurrido;
- tipo de caso;
- causa potencial;
- documentos que sustentan la causa;
- mérito preliminar: alto, medio, bajo o pendiente.

El Handler debe poder editar y confirmar. La confirmación guarda texto anterior, texto final, documentos y campos usados, usuario, fecha y versión del análisis. Si se continúa con mérito bajo, se exige justificación.

La propuesta no puede impedir continuar por una razón comercial que el Handler documente.

### Paso 6 — Calcular la pérdida

Ver la sección 6. La salida siempre muestra los tres métodos, los faltantes de cada método, el cálculo firmado, ajustes, moneda y evidencia.

### Paso 7 — Generar documentos

Generar solo desde una versión aprobada y activa de template. Los campos deben provenir de datos confirmados, no de valores OCR pendientes.

Antes de generar:

- validar campos obligatorios;
- informar campos faltantes;
- mostrar versión del template;
- mostrar fuentes de los datos;
- permitir preview;
- exigir aprobación del Handler.

La descarga debe conservar formato, checksum, versión de template y usuario que aprobó.

### Paso 8 — Cerrar y traspasar

Generar un informe con:

- resumen ejecutivo;
- documentos disponibles, faltantes y no aplicables;
- causa propuesta y sustento;
- mérito preliminar y confirmación humana;
- tres cálculos y método seleccionado;
- prescripción y fecha base;
- cartas generadas y aprobadas;
- pendientes;
- auditoría;
- destino FIS o Lawgistic.

El traspaso cambia el estado local y bloquea modificaciones sensibles. No transmite datos a otro sistema en esta fase.

La reversa solo la puede hacer Gerente o Administración, con motivo obligatorio y evento de auditoría.

---

## 4. OCR y extracción por documento

### 4.1 Convenciones comunes

#### Referencias y códigos

- reference: conservar valor original y valor normalizado.
- CS Claim No: conservar alfanumérico con guiones internos.
- BL number, booking number, invoice number, DUS number, certificados y reportes: no quitar ceros iniciales.
- contenedor: patrón ISO con cuatro letras y siete dígitos; validar dígito verificador y marcar inválido sin corregirlo automáticamente.
- sello: conservar como texto exacto.

#### Fechas

- aceptar DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD y formatos escritos;
- guardar ISO YYYY-MM-DD y valor original;
- no intercambiar día y mes silenciosamente;
- si la fecha es ambigua, score bajo y revisión;
- distinguir fecha real, ETA, ETD, fecha de documento y fecha de evento;
- una ETA nunca se usa como fecha real de descarga para cerrar prescripción.

#### Montos

- extraer símbolo/código de moneda, separadores y signo;
- interpretar separadores solo si la configuración regional o el documento lo confirma;
- no convertir moneda durante OCR;
- guardar valor original, valor normalizado, moneda y unidad;
- no usar un monto sin moneda para calcular, salvo confirmación explícita del Handler.

#### Cantidades y unidades

Guardar cantidad, unidad y texto original. No mezclar cajas, pallets, bins, kg, toneladas, libras, unidades o contenedores sin conversión configurada.

#### Evidencia

Cada dato debe guardar documentId, página, fragmento OCR y, cuando sea posible, bounding box. La interfaz debe permitir abrir el documento en la página de origen.

### 4.2 Matriz específica de extracción

#### 1. Carta de notificación a la naviera

Señales: notificación, notice, carrier, naviera, reclamo, claim.

Extraer: referencia, fecha de carta, destinatario, remitente, asegurado/cliente, oponente, BL, contenedor, nave, viaje, fecha/lugar de descarga, descripción del daño, causa alegada, monto reclamado, plazo o reserva de derechos.

Validar: destinatario debe corresponder al transportista/oponente; referencia/BL/contenedor deben vincular a un caso; la fecha de carta no puede ser posterior a la fecha de carga sin advertencia; la causa del texto no se considera confirmada.

Uso: evidencia de notificación y datos de la carta. No sustituye la decisión del Handler ni la fecha real de descarga.

#### 2. AoR

Señales: AoR, appointment, authority, appointed representative.

Extraer: asegurado, aseguradora, representante designado, número de reclamo, póliza, fecha, alcance de autoridad, firma/nombre del otorgante, monto si aparece.

Validar: debe existir otorgante y representante; número de reclamo o referencia debe vincular al expediente; firma ausente se marca como excepción documental.

Uso: identidad del asegurado, autorización y campos de AoR. No crear una autorización válida si el documento está incompleto.

#### 3. Carta de subrogación o LoA

Señales: subrogation, subrogación, LoA, letter of authority.

Extraer: asegurado, aseguradora, parte subrogada/autorizada, póliza, claim number, fecha, monto indemnizado, transporte/oponente, referencia, firma.

Validar: el documento se registra aunque SUBRO no sea una salida contractual; no debe generarse desde el sistema en esta fase. Conflictos con AoR se envían a revisión.

Uso: evidencia de autoridad y datos de cartas. No habilita por sí solo el traspaso.

#### 4. BL / Bill of Lading

Señales: B/L, BL, bill of lading, conocimiento de embarque.

Extraer obligatoriamente cuando aparezca: BL number, shipper, consignee, notify party, carrier, vessel, voyage, puerto/lugar de embarque, puerto/lugar de descarga, fecha de embarque/on board, contenedores, sellos, carga/producto, variedad, calibre, bultos, peso bruto/neto, unidad, temperatura/set point e Incoterm.

Validar: contenedores ISO; nave/viaje no vacíos si aparecen; origen y destino distintos; fechas coherentes; peso bruto no menor que peso neto; vinculación con referencia o caso por contenedor/BL.

Uso: fuente principal de identidad logística y de carga. El BL no determina por sí solo la causa ni la fecha real de descarga.

#### 5. Booking

Señales: booking, booking confirmation, reserva.

Extraer: booking number, carrier, vessel, voyage, puerto de origen/destino, ETD, ETA, cut-off, contenedor, carga, cantidad, peso, temperatura, shipper/consignee.

Validar: ETA/ETD se etiquetan como estimadas; nunca reemplazan descarga real; cruzar nave/viaje/contenedor con BL y tracking.

Uso: completar logística faltante y obtener ETA diferenciada.

#### 6. Factura de exportación

Señales: invoice, export invoice, factura, commercial invoice.

Extraer: invoice number, fecha, vendedor/exportador, comprador/importador, moneda, Incoterm, líneas, producto, variedad/calibre, cantidad/unidad, precio unitario, subtotal, descuentos, flete/seguro si están separados, total, BL/booking/contenedor y destino.

Validar: total debe conciliar con líneas dentro de tolerancia configurable; moneda obligatoria; cantidad y unidad; invoice date; relación con DUS, packing y BL.

Uso: Método 3; referencia de valor de factura; no usar el total para métodos 1/2.

#### 7. DUS

Señales: DUS, declaración única de salida, customs, aduana.

Extraer: número DUS, fecha, exportador, consignatario, aduana, país destino, mercancía, código arancelario, cantidad/unidad, valor FOB/aduanero, moneda, contenedor/BL si aparece.

Validar: no confundir valor FOB con venta destino; cruzar exportador, destino, producto, cantidad y fecha con factura/BL.

Uso: corroboración de exportación, mercancía, fecha y valor base. No reemplaza factura ni liquidación.

#### 8. Packing List

Señales: packing list, lista de empaque, packing.

Extraer: número/fecha, exportador, comprador, contenedores, sellos, pallets/bins/cajas, producto, variedad/calibre, cantidad, peso bruto/neto, dimensiones y distribución.

Validar: sumar líneas y comparar contra BL/factura; peso neto no mayor que bruto; contenedores ISO.

Uso: cantidades, unidades y trazabilidad física. No calcular pérdida solo con Packing List.

#### 9. Certificado fitosanitario

Señales: phytosanitary, fitosanitario, phyto, organismo sanitario.

Extraer: número, fecha de emisión, exportador, consignatario, país de origen/destino, producto, variedad, cantidad/unidad, lote, contenedor y tratamiento si existe.

Validar: certificado vigente para fecha de embarque; país y producto compatibles; comparar cantidad y contenedor cuando aparezcan.

Uso: respaldo de origen, producto y trazabilidad. No inferir causa de daño.

#### 10. Certificado de origen

Señales: certificate of origin, origen, cámara/autoridad emisora.

Extraer: número, fecha, exportador, productor, importador, país de origen, destino, descripción, código arancelario, cantidad/unidad, factura relacionada.

Validar: la factura relacionada y país deben coincidir; diferencias quedan como conflicto.

Uso: corroboración de origen y operación comercial.

#### 11. Liquidaciones comparativas o informe de mercado

Señales: comparative settlement, liquidación comparativa, market report, USDA, FreshFruit, FreshTech, mercado.

Extraer: fuente, fecha de publicación, plaza/mercado, periodo, producto, variedad, calibre, calidad, condición, destino, cantidad, unidad, precio, moneda, cargos/descuentos, valor bruto/neto, embarque/BL de referencia y metodología.

Validar: un comparable debe registrar variedad, calibre, destino y fecha similar; si falta cualquiera, el método queda requiere revisión; el reporte debe conservar archivo/fuente y fecha.

Uso: Método 1 como embarque gemelo o Método 2 como referencia de mercado. No mezclar un valor neto con una liquidación bruta.

#### 12. Liquidación por contenedor

Señales: settlement, liquidación, liquidación por contenedor.

Extraer: número de liquidación, fecha, contenedor, BL, producto, cantidad, moneda, venta bruta, descuentos, gastos, comisión, salvataje, liquidación real, total y comprador/destino.

Validar: conciliar total; separar bruto, descuentos y neto; comparar contenedor con BL/Packing; conservar cada rubro, no solo el total.

Uso: liquidación real para Métodos 1 y 2; venta bruta destino para Método 3 cuando corresponda.

#### 13. Tracking de naviera

Señales: tracking, trace, container status, naviera.

Extraer: contenedor, BL, booking, nave, viaje, puerto, eventos, fecha/hora de cada evento, ETA, ETD, gate-in, loaded, departed, arrived, discharged, delivered.

Validar: distinguir evento real de estimación; la fecha de descarga real solo puede salir de un evento real identificado como discharged o equivalente, o de una fuente aprobada; si solo existe ETA, guardar dateOfDischargeType=ETA.

Uso: logística y fecha de descarga real; base para prescripción solo cuando la regla lo autorice.

#### 14. Informes de QC en origen y destino

Señales: QC, quality control, quality inspection, origen, destino.

Extraer: lugar, fecha/hora, inspector, empresa, contenedor, producto, variedad/calibre, estado, defectos, porcentajes, temperatura, humedad, condición de embalaje, fotografías referenciadas, recomendaciones.

Validar: distinguir origen/destino; conservar unidades y denominadores; no convertir porcentaje a pérdida monetaria automáticamente; cruzar contenedor y fechas.

Uso: evidencia de condición y causa potencial; puede alimentar mérito, nunca cerrar responsabilidad automáticamente.

#### 15. Reportes de inspección

Señales: survey, inspection, inspection report, reporte de inspección.

Extraer: número, fecha, inspector/surveyor, ubicación, partes presentes, inspección conjunta sí/no, contenedor, BL, daño observado, causa indicada, alcance, fotos, reservas y conclusión.

Validar: fecha y ubicación; vinculación al caso; diferenciar observación del inspector de conclusión propia del sistema; la inspección conjunta se guarda como dato.

Uso: surveyor, daño observado, causa sugerida y evidencia para revisión humana.

#### 16. Certificado de cosecha / Harvest

Señales: harvest, cosecha, crop certificate.

Extraer: certificado, productor/exportador, fecha de cosecha, lote, campo/origen, producto, variedad, calibre, cantidad/unidad, destino y firma.

Validar: fecha de cosecha anterior a embarque; lote/producto consistentes con Packing/BL; no convertirlo en certificado de pérdida.

Uso: contexto de origen, producto y carta Harvest.

#### 17. Registros de termógrafos

Señales: thermograph, temperature logger, temp, termógrafo, logger.

Extraer: dispositivo/serial, contenedor, sensor, fecha/hora de inicio y término, zona horaria, set point, rango requerido, temperatura mínima/máxima/promedio, lecturas, duración fuera de rango, alarmas y unidad.

Validar: zona horaria; continuidad temporal; unidad Celsius/Fahrenheit; contenedor ISO; rango requerido proveniente de BL, instrucción aprobada o configuración; detectar lecturas imposibles o saltos del sensor.

Regla de causa: calcular desviación = temperatura observada - límite configurado y duración fuera de rango. Esto genera evidencia de desviación, no una conclusión jurídica automática.

Uso: propuesta de causa por temperatura y sustento visible.

#### 18. Nota de crédito, caso especial

Aunque no forma parte de los 17 documentos mínimos del checklist inicial, debe existir como tipo documental condicional porque el cálculo de venta a firme la requiere.

Extraer: número, fecha, emisor, receptor, invoice relacionada, referencia/BL/contenedor, motivo, moneda, monto neto/impuestos/total, signo y estado.

Validar: invoice relacionada, venta a firme, monto y moneda; el documento debe ser legible y no anulado; conservar signo original.

Uso: cálculo especial de venta a firme. Sin nota de crédito válida, el sistema no puede cerrar ese método.

---

## 5. Reglas de clasificación y renombrado

### 5.1 Clasificación

La clasificación combina:

1. nombre del archivo;
2. texto extraído/OCR;
3. patrones de campos del documento;
4. consistencia con el caso;
5. modelo/clasificador versionado si se incorpora.

El nombre de archivo por sí solo no es suficiente cuando el contenido contradice la etiqueta.

Estados de clasificación:

- clasificado_alto;
- clasificado_revisar;
- sin_clasificar;
- clasificacion_conflictiva.

### 5.2 Renombrado

Formato base:

REFERENCIA_TIPO_NORMALIZADO_SECUENCIA.EXTENSION_ORIGINAL

Ejemplos:

PRE-FIS-MSC-2025-07-4042_BL_01.pdf  
PRE-FIS-MSC-2025-07-4042_LIQUIDACION_CONTENEDOR_01.pdf  
PRE-FIS-MSC-2025-07-4042_TERMOGRAFOS_01.pdf

Reglas:

- conservar extensión original;
- conservar nombre original en metadata;
- generar secuencia estable por hash/orden de carga;
- no renombrar automáticamente un documento con clasificación baja;
- si se cambia manualmente el tipo, generar nuevo nombre y evento;
- nunca sobrescribir dos archivos con el mismo nombre normalizado.

---

## 6. Reglas de cálculo de pérdida

### 6.1 Modelo común

Cada cálculo debe guardar:

- calculationId y caseId;
- método y versión de fórmula;
- entradas originales;
- documento fuente de cada entrada;
- moneda de cada entrada;
- moneda resultado;
- tipo de cambio, fecha, fuente y dirección;
- unidades y cantidad usada;
- ajustes firmados;
- resultado firmado;
- resultado final;
- usuario, fecha y justificación;
- estado: incompleto, calculable, seleccionado, bloqueado.

### 6.2 Moneda y tipo de cambio

Definir siempre:

1 unidad de MONEDA_ORIGEN = TIPO_CAMBIO unidades de MONEDA_RESULTADO

Conversión:

valor_resultado = valor_origen × tipo_cambio

Si la moneda de origen y resultado son iguales, el tipo de cambio es 1 y se registra como sin conversión.

Si son distintas, son obligatorios:

- moneda origen;
- moneda resultado;
- tipo de cambio positivo;
- fecha del tipo de cambio;
- fuente o configuración que lo generó;
- usuario que confirmó.

No invertir la tasa automáticamente. Si el usuario entrega la tasa en dirección inversa, debe seleccionarla explícitamente o el sistema debe pedir su recíproco.

Guardar cálculo sin FX solo como incompleto; no producir monto final.

### 6.3 Método 1 — embarque comparable / SMV

#### Condiciones de aplicabilidad

El comparable debe registrar:

- mismo producto y variedad;
- mismo calibre o rango compatible;
- mismo destino/plaza;
- fecha de arribo o venta similar;
- cantidad/unidad comparable;
- fuente documental identificable.

La ventana de días de fecha similar debe ser un parámetro del mantenedor. Si no existe valor aprobado, el método debe quedar requiere revisión FIS.

#### Entradas

- liquidación_comparable_bruta;
- liquidación_real_bruta;
- moneda y unidad;
- cantidad comparable, si el valor no es ya total;
- documento fuente de cada entrada.

#### Fórmula base explicada por FIS

resultado_m1_signed = liquidación_comparable_bruta - liquidación_real_bruta

Si ambas cifras son unitarias:

resultado_m1_signed = (precio_comparable - precio_real) × cantidad_afectada

No mezclar un valor bruto con un valor neto. Si solo existe una base neta, el método queda incompleto o requiere una regla FIS explícita.

#### Salida

Mostrar resultado firmado, resultado reclamable según configuración, diferencias de unidad y evidencia del comparable. No seleccionar automáticamente aunque sea el mayor.

### 6.4 Método 2 — reporte de mercado

#### Condiciones de aplicabilidad

El reporte debe contener fuente, fecha, plaza, producto, calidad/condición, unidad y moneda. El valor debe ser comparable con el caso o dejar explícita la diferencia.

#### Entradas

- valor_reporte_mercado_bruto normalizado a la cantidad del caso;
- liquidación_real_bruta;
- mercado/plaza;
- fecha del reporte;
- unidad, cantidad y moneda;
- documento o fuente.

#### Fórmula

resultado_m2_signed = valor_reporte_mercado_bruto - liquidación_real_bruta

Si el reporte es precio unitario, normalizar primero a la cantidad afectada. La normalización debe quedar visible.

### 6.5 Método 3 — factura versus venta bruta destino

#### Condiciones de aplicabilidad

Requiere factura de exportación y una liquidación/venta de destino vinculada al mismo embarque, contenedor o carga.

#### Entradas

- valor_factura_exportación;
- venta_bruta_destino;
- moneda, cantidad y unidad;
- documentos fuente;
- rubros separados si se requiere reconciliación.

#### Fórmula

resultado_m3_signed = valor_factura_exportación - venta_bruta_destino

No usar la venta neta en este método salvo que FIS lo apruebe expresamente. Los descuentos y gastos se conservan separados y no se restan silenciosamente.

### 6.6 Venta a firme / nota de crédito

Cuando ventaAFirme=true, no se deben comparar automáticamente los tres métodos como si fueran libres de consignación.

Requiere:

- factura de venta a firme;
- nota de crédito válida;
- invoice relacionada;
- motivo;
- fecha;
- moneda;
- monto y signo original.

Regla operativa:

resultado_firme = monto_reclamable_de_nota_de_crédito

El sistema conserva el signo original y muestra el monto reclamable normalizado. Si la nota no está validada, el cálculo queda incompleto.

### 6.7 Rubros adicionales

Cada rubro debe tener:

- concepto;
- monto;
- moneda;
- signo adición o deducción;
- documento fuente;
- justificación;
- usuario y fecha.

Fórmula:

resultado_final_preliminar = resultado_método_signed + suma de rubros_firmados_convertidos

No permitir un rubro sin fuente o justificación. Los rubros no deben quedar escondidos dentro del valor principal.

### 6.8 Resultado negativo, cero y selección

- conservar el resultado firmado sin truncarlo;
- mostrar sin diferencial positivo cuando sea cero o negativo;
- nunca borrar el cálculo negativo;
- sugerir revisión de Método 3 si existe y M1/M2 no producen diferencial positivo;
- el Handler selecciona el método aplicable;
- la selección requiere justificación;
- el sistema no debe seleccionar automáticamente el monto mayor.

La regla de si un diferencial negativo se convierte en cero reclamable debe ser un parámetro FIS. Mientras no exista aprobación, el sistema mostrará el signo y bloqueará el cierre del monto final.

### 6.9 Redondeo

- guardar cálculos internos con precisión completa;
- redondear solo al mostrar o al materializar el monto final;
- CLP: 0 decimales por defecto;
- USD/EUR: 2 decimales por defecto;
- guardar la política de redondeo con la versión de fórmula;
- no redondear cada línea antes de sumar salvo regla aprobada.

### 6.10 Mantenedor de cálculos

El mantenedor debe permitir activar/desactivar métodos y configurar:

- título y descripción;
- campos de entrada;
- base bruta/neta;
- fórmula declarativa;
- unidades y normalización;
- tolerancias;
- ventana de comparable;
- tipo de cambio;
- redondeo;
- regla de negativo;
- vigencia;
- aprobador;
- versión.

No permitir editar una fórmula publicada si ya fue usada en un cálculo. Crear nueva versión y conservar la anterior.

---

## 7. Reglas de resumen, causa y mérito

### Resumen

El resumen debe incluir, cuando exista evidencia:

- qué carga fue transportada;
- desde dónde y hacia dónde;
- qué evento ocurrió;
- qué daño se observó;
- qué documento sustenta cada afirmación;
- qué información falta.

No usar frases de certeza si la fuente es solo una inferencia.

### Causa potencial

La recomendación debe clasificarse, como mínimo, en:

- temperatura;
- demora/tiempo de tránsito;
- manipulación/daño físico;
- condición de origen;
- embalaje;
- humedad/agua;
- desconocida/mixta.

La causa debe mostrar sus documentos fuente. Termógrafos, QC e inspección tienen mayor peso que el nombre del archivo o una carta narrativa.

### Mérito

El mérito es recomendación y debe considerar:

- evidencia del daño;
- relación temporal y logística;
- consistencia entre documentos;
- diferencial monetario calculable;
- documentación faltante;
- prescripción;
- excepciones comerciales registradas por Handler.

No construir una regla que impida continuar únicamente por mérito bajo.

---

## 8. Templates y generación documental

Templates incluidos en esta fase:

- AoR;
- Harvest;
- LoA;
- Claim Notice.

Cada template debe tener:

- templateId estable;
- nombre visible;
- idioma;
- versión;
- vigencia;
- campos obligatorios y opcionales;
- texto legal parametrizado;
- logo y firma configurables;
- formato de salida;
- aprobador;
- checksum de la versión utilizada.

Variables no confirmadas deben aparecer como faltantes, nunca rellenarse con datos inventados. Solo datos confirmados por Handler pueden entrar a una carta aprobada.

El sistema debe bloquear la generación final si faltan campos obligatorios o existe una contradicción sin resolver.

---

## 9. Estados, checklist y traspaso

### Estados de caso

Datos incompletos → Preclaim → Documentación pendiente → Cálculo completo → Traspasado a FIS o Traspasado a Lawgistic.

En procesamiento debe manejarse como estado de job/lote, no como reemplazo de los estados contractuales del caso.

### Checklist mínimo de cierre

1. referencia y handler confirmados;
2. asegurado, oponente y nave confirmados;
3. fecha de descarga y tipo Real/ETA identificados;
4. jurisdicción y prescripción calculadas o bloqueadas por regla pendiente;
5. checklist documental revisado;
6. faltantes confirmados o marcados No aplica con motivo;
7. resumen confirmado;
8. causa y sustento confirmados;
9. mérito revisado;
10. cálculo seleccionado y justificado;
11. cartas requeridas generadas y aprobadas;
12. informe de revisión generado;
13. destino FIS o Lawgistic seleccionado.

El checklist debe ser configurable y auditable. La configuración vigente debe quedar congelada dentro del informe.

### Traspaso

- destino FIS: recupero extrajudicial;
- destino Lawgistic: recupero judicial;
- el traspaso es local en esta fase;
- cálculo, resumen, causa y documentos quedan bloqueados;
- reversar requiere Gerente/Administración, motivo y auditoría.

---

## 10. Memoria, dashboard y reportes

### Memoria histórica

Precargar la memoria entregada por FIS: aproximadamente 4.240 registros en 39 hojas, separada de los casos activos. Conservar hoja, fila, archivo, versión y fecha de importación.

No presentar el histórico como expediente documental activo. No mezclar sus cifras con el flujo de casos nuevos sin indicar el universo.

### Dashboard

Mostrar por Handler y cartera:

- casos por estado;
- documentación pendiente;
- alertas de prescripción;
- pérdida calculada;
- casos sin movimiento;
- cobertura documental;
- casos listos para traspaso;
- agrupación por nave/viaje;
- tiempos desde recepción hasta cierre/traspaso.

### Excel de seguimiento

Exportar al menos:

Reference, Container, Missing documents status, Loss amount, Loading date, Discharge date, Voyage, Surveyor, Opponent, Vessel, Assured, CS Claim No, status, handler, receivedAt, reviewedAt, calculatedAt, closedAt, transferredAt.

El reporte debe indicar fecha/hora de generación, zona horaria, filtros aplicados y universo incluido.

---

## 11. Pruebas de aceptación obligatorias

### 11.1 Pruebas P0 de flujo

| ID | Prueba | Resultado obligatorio |
|---|---|---|
| P0-01 | Cargar Caso_Completo_Prueba_2_PRE-FIS-MSC-2025-07-4042.zip. | Los 17 archivos quedan registrados, ninguno se pierde y el lote termina con estado visible. |
| P0-02 | Procesar PDFs con nombres oficiales y variaciones. | Cada archivo recibe tipo, score, nombre propuesto y estado. |
| P0-03 | Corregir un tipo y un campo extraído. | Se guarda valor anterior, nuevo, usuario, fecha y evidencia. |
| P0-04 | Revisar expediente incompleto. | Faltantes, No aplica y solicitudes aparecen separados. |
| P0-05 | Ejecutar M1, M2 y M3. | Los tres muestran inputs, fuentes, moneda y resultado o motivo de incompletitud. |
| P0-06 | Cambiar moneda con FX. | La dirección, fecha, fuente y tasa son visibles; sin FX no hay monto final. |
| P0-07 | Generar y aprobar las cuatro cartas. | Se bloquean campos faltantes y se conserva template/versionado/aprobación. |
| P0-08 | Intentar traspaso incompleto y completo. | El incompleto se bloquea; el completo genera informe y bloquea edición sensible. |

### 11.2 Pruebas P1 de OCR

Para cada tipo documental de la sección 4:

- clasificación correcta;
- campos obligatorios extraídos o marcados faltantes;
- evidencia por página;
- score por campo;
- fecha y monto normalizados;
- conflicto con otro documento visible;
- corrección humana persistida;
- documento original descargable.

Probar además PDF nativo, PDF escaneado, archivo ilegible, archivo no compatible, idiomas español/inglés, separadores de miles y decimales, fecha ambigua, doble archivo con mismo hash y documentos contradictorios.

### 11.3 Pruebas P1 de cálculos

Construir fixture de cálculo con resultado conocido para:

1. M1 positivo, cero y negativo;
2. M2 sin comparable;
3. M3 con factura y venta bruta;
4. venta a firme con nota de crédito;
5. rubro adicional positivo;
6. rubro de deducción;
7. USD a CLP;
8. EUR a USD;
9. FX ausente;
10. FX inverso informado;
11. moneda sin código;
12. redondeo de CLP y USD/EUR;
13. cambio de versión de fórmula;
14. intento de editar después de traspaso.

Cada fixture debe validar monto, signo, moneda, versión, fuentes y snapshot.

### 11.4 Pruebas P2 de calidad productiva

- sesión y permisos por rol;
- acceso por URL a caso no autorizado;
- descarga de documento no autorizado;
- dos usuarios editando el mismo caso;
- reintento de un archivo fallido;
- recuperación de un job interrumpido;
- backup y restauración;
- responsive desktop y móvil;
- manual alineado con la versión desplegada;
- exportación Excel con filtros y zona horaria.

---

## 12. Definition of Done para Milenko

El trabajo se considera completo solo cuando:

- los ocho pasos funcionan de punta a punta en ambiente QA;
- los archivos originales se almacenan y recuperan de forma segura;
- OCR, clasificación y extracción tienen score y evidencia;
- cada documento de la matriz tiene pruebas;
- ningún error de un archivo detiene el lote;
- los tres cálculos tienen fórmulas versionadas y fixtures aprobados;
- las monedas y FX dejan snapshot reproducible;
- las cuatro cartas usan templates versionados y aprobación;
- el informe de cierre contiene checklist y auditoría;
- el traspaso FIS/Lawgistic bloquea según regla configurada;
- memoria, dashboard y Excel distinguen histórico de activos;
- los permisos se verifican en servidor;
- existen pruebas unitarias, integración y aceptación;
- se actualiza el Manual de usuario;
- lint, build y la suite de pruebas pasan;
- se entrega documentación de despliegue, backup, soporte y recuperación.

### No se acepta como terminado

- una clasificación basada solo en el nombre del archivo;
- un monto calculado sin fuente, moneda o versión;
- un resultado de OCR sin evidencia de página;
- un cambio de fórmula que modifica cálculos históricos;
- un traspaso que borra o deja editable el expediente;
- una carta con campos inventados;
- un botón que solo cambia estado local sin persistencia real;
- una integración simulada presentada como conexión productiva.

---

## 13. Fuentes de prueba incluidas en el repositorio

- Caso_Completo_Prueba_2_PRE-FIS-MSC-2025-07-4042.zip
- pruebas-intervent-preclaim/01_caso_completo/
- pruebas-intervent-preclaim/02_caso_incompleto/
- pruebas-intervent-preclaim/04_caso_con_excepcion/
- pruebas-intervent-preclaim/03_memoria_historica/PreClaim_historico_entregado.xlsx
- Archivos_Prueba_Intervent_Preclaim.zip

El caso completo MSC es distinto del caso HLC usado en la primera validación y debe formar parte de la prueba P0-01.

---

## 14. Pendientes que bloquean la aprobación contractual

Antes de marcar la entrega como aprobada por FIS, obtener respuesta formal para:

1. fórmula exacta de M1, M2, M3 y venta a firme;
2. bruto/neto, costos, unidades, límites y redondeos;
3. convención final de referencia;
4. matriz de prescripción;
5. equivalencia Claim Notice/notificación a naviera;
6. templates oficiales y firmas;
7. checklist y documentos No aplica;
8. condiciones de traspaso;
9. inactividad y alertas;
10. corpus definitivo y precisión mínima de OCR.

Estas preguntas no deben resolverse dentro del código. Deben convertirse en registros versionados de configuración y quedar asociadas a una aprobación de FIS.

