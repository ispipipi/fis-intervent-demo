# Pendientes de definición y antecedentes solicitados a FIS

## Intervent Preclaim — cierre funcional para desarrollo

**Versión:** 1.0  
**Fecha:** 22 de septiembre de 2026  
**Objetivo:** obtener de FIS las definiciones y archivos necesarios para que desarrollo implemente el sistema sin interpretar reglas legales, financieras u operativas por su cuenta.

---

## Cómo responder

Para cada punto, FIS debe entregar:

- decisión concreta;
- documento, archivo o template que respalda la decisión;
- responsable que valida;
- fecha de vigencia;
- excepciones, si existen.

No basta con responder “depende”, “lo vemos caso a caso” o “usar criterio del Handler”. En esos casos debe indicarse exactamente qué puede decidir el Handler, qué debe quedar registrado y qué casos deben bloquearse.

Cuando una regla varíe según tipo de caso, transporte, jurisdicción o cliente, entregar una fila independiente por cada combinación.

---

## Resumen de pendientes

| ID | Tema | Respuesta requerida | Prioridad | Impacto |
|---|---|---|---|---|
| FIS-001 | Fórmulas de pérdida | Fichas matemáticas completas y ejemplos aprobados. | Bloqueante | Sin esto no se puede validar ningún monto. |
| FIS-002 | Referencia interna | Fórmula canónica y reglas de edición/duplicidad. | Bloqueante | Afecta identificación, búsqueda y prescripción. |
| FIS-003 | Templates oficiales | Cuatro templates, textos, campos, firmas y formato. | Bloqueante | Sin esto no se puede aprobar la generación documental. |
| FIS-004 | Claim Notice | Confirmar si es el mismo documento que la notificación a la naviera. | Bloqueante | Evita generar documentos duplicados o incorrectos. |
| FIS-005 | Checklist documental | Matriz por tipo de caso y reglas de No aplica. | Bloqueante | Define faltantes y preparación del traspaso. |
| FIS-006 | Traspaso | Condiciones exactas para FIS y Lawgistic. | Bloqueante | Define cuándo el caso puede cerrarse. |
| FIS-007 | Inactividad y alertas | Umbral, eventos, calendario, destinatarios y canales. | Alta | Define alertas operativas. |
| FIS-008 | Monedas y tipo de cambio | Catálogo, fuente, fecha, dirección y redondeo. | Alta | Afecta cálculos en monedas distintas. |
| FIS-009 | Corpus y aceptación OCR | Archivos definitivos, idiomas y precisión mínima. | Alta | Permite validar extracción real. |

---

# Solicitudes detalladas

## FIS-001 — Fórmulas oficiales de cálculo de pérdida

### Decisión requerida

Confirmar la fórmula exacta de cada cálculo y si trabaja con valores brutos, netos o una combinación definida.

### FIS debe entregar

Para cada método:

1. nombre oficial;
2. objetivo del método;
3. documentos de entrada obligatorios;
4. campos exactos que se deben utilizar;
5. fórmula escrita paso a paso;
6. definición de valor bruto y valor neto;
7. costos, descuentos, comisiones, fletes, seguros, salvataje y otros rubros que se incluyen;
8. tratamiento de impuestos;
9. unidad de cálculo;
10. tratamiento cuando los valores son unitarios;
11. tratamiento de cantidades parciales;
12. tratamiento de diferencias negativas o cero;
13. redondeo;
14. moneda de entrada y moneda de salida;
15. tres ejemplos numéricos aprobados: resultado positivo, resultado cero/negativo y caso incompleto.

### Métodos a confirmar

#### Método 1 — Embarque comparable

Confirmar expresamente:

- qué significa embarque gemelo;
- si deben coincidir producto, variedad, calibre, calidad, destino y fecha;
- cuántos días pueden separar ambos embarques;
- si se compara monto total o valor unitario;
- si se utiliza liquidación bruta o neta;
- cómo se normalizan cantidades distintas;
- quién valida que el embarque sea comparable.

Fórmula actualmente documentada como propuesta:

resultado = liquidación comparable − liquidación real

FIS debe confirmar o corregir esta fórmula.

#### Método 2 — Reporte de mercado

Confirmar expresamente:

- fuentes aceptadas, por ejemplo USDA, FreshFruit u otra;
- plaza y mercado aplicable;
- periodo de referencia;
- producto, variedad, calibre y calidad;
- unidad publicada;
- conversión a la cantidad afectada;
- bruto versus neto;
- tratamiento de gastos, comisiones y descuentos;
- fecha del reporte que se debe usar.

Fórmula actualmente documentada como propuesta:

resultado = valor del reporte de mercado − liquidación real

FIS debe confirmar o corregir esta fórmula.

#### Método 3 — Factura versus venta en destino

Confirmar expresamente:

- qué valor de factura se utiliza;
- qué venta o liquidación de destino se utiliza;
- si la venta de destino es siempre bruta;
- tratamiento de descuentos y gastos;
- correspondencia por factura, BL, contenedor o embarque;
- tratamiento de ventas parciales;
- tratamiento de ventas en distintas monedas.

Fórmula actualmente documentada como propuesta:

resultado = valor factura de exportación − venta bruta en destino

FIS debe confirmar o corregir esta fórmula.

#### Venta a firme y nota de crédito

Confirmar:

- cuándo un caso se clasifica como venta a firme;
- qué documento prueba esa condición;
- si el monto reclamable corresponde al total de la nota de crédito;
- cómo se trata el signo del documento;
- si se requiere factura, nota de crédito y liquidación;
- qué hacer si la nota de crédito está pendiente o anulada.

### Impacto si no se responde

El sistema podrá mostrar cálculos de prueba, pero no debe permitir cerrar un monto contractual ni marcar el caso como listo para traspaso.

---

## FIS-002 — Referencia interna del caso

### Decisión requerida

Entregar la estructura canónica de la referencia interna.

### FIS debe entregar

Una tabla con:

| Elemento | Definición solicitada |
|---|---|
| Prefijo | Valor exacto y si siempre es PRE-FIS. |
| Código del transportista/oponente | Fuente, longitud y catálogo. |
| Año de asignación | Qué fecha define el año. |
| Periodo de prescripción | Formato exacto y fecha que lo determina. |
| Correlativo | Fuente, secuencia, reinicio y responsable. |
| Separadores | Guiones, barras y otros caracteres permitidos. |
| Mayúsculas | Si son obligatorias. |
| Correcciones | Quién puede modificar y con qué motivo. |
| Duplicados | Qué casos se consideran duplicados y qué acción se permite. |
| Casos antiguos | Cómo se conservan referencias históricas que no cumplen la estructura. |

### Ejemplos obligatorios

Entregar al menos:

- una referencia nueva correcta;
- una referencia histórica correcta;
- una referencia con mes de prescripción corregido;
- una referencia duplicada;
- una referencia que no debe modificarse aunque no siga el formato nuevo.

### Impacto si no se responde

No se puede cerrar correctamente la generación automática de referencias, la detección de duplicados ni la validación del periodo de prescripción.

---

## FIS-003 — Templates oficiales de documentos

### Decisión requerida

Entregar o aprobar la versión oficial de los cuatro templates incluidos en Fase 1:

1. AoR.
2. Harvest.
3. LoA.
4. Claim Notice.

### Para cada template FIS debe entregar

- archivo base preferentemente en DOCX;
- idioma;
- nombre oficial;
- versión;
- fecha de vigencia;
- logo;
- encabezado y pie;
- remitente;
- destinatario;
- textos legales;
- campos obligatorios;
- campos opcionales;
- reglas de firma;
- firmante autorizado;
- formato final de descarga;
- campos que pueden editarse manualmente;
- campos que deben quedar bloqueados;
- si requiere número correlativo;
- si requiere adjuntos.

### Regla de datos

Confirmar que solo pueden ingresar a la versión final:

- datos confirmados por Handler;
- datos con fuente identificable;
- cálculos seleccionados y justificados;
- información sin conflictos abiertos.

### Impacto si no se responde

El sistema solo puede mostrar templates de demostración y no cartas oficiales aptas para uso operativo.

---

## FIS-004 — Claim Notice versus carta de notificación a la naviera

### Decisión requerida

Confirmar si son:

- el mismo documento con dos nombres;
- dos documentos distintos;
- un documento principal y una variante por jurisdicción/transportista.

### Si son distintos, FIS debe indicar

- objetivo de cada documento;
- cuándo se genera cada uno;
- destinatario;
- campos;
- texto legal;
- firma;
- plazo;
- adjuntos;
- formato.

### Impacto si no se responde

Existe riesgo de generar una carta duplicada, omitir una carta requerida o usar un texto incorrecto.

---

## FIS-005 — Checklist documental por tipo de caso

### Decisión requerida

Entregar el checklist oficial y las reglas de aplicabilidad.

### FIS debe entregar una matriz

| Tipo de caso | Documento | Obligatorio | Condicional | No aplica permitido | Condición |
|---|---|---:|---:|---:|---|
| Ejemplo | BL | Sí | No | No | Siempre |
| Ejemplo | Termógrafos | No | Sí | Sí | Si el daño es temperatura |
| Ejemplo | Liquidación comparable | No | Sí | Sí | Si se usa Método 1 |

La matriz debe cubrir, como mínimo:

- Carta de notificación a la naviera;
- AoR;
- Carta de subrogación o LoA;
- BL;
- Booking;
- Factura de exportación;
- DUS;
- Packing List;
- Certificado fitosanitario;
- Certificado de origen;
- Liquidaciones comparativas/informe de mercado;
- Liquidación por contenedor;
- Tracking;
- QC origen/destino;
- Reporte de inspección;
- Certificado de cosecha;
- Termógrafos;
- Nota de crédito cuando corresponda venta a firme.

### Confirmar estados

- disponible;
- faltante;
- solicitado;
- recibido;
- rechazado;
- no aplica;
- ilegible;
- pendiente de revisión.

### Impacto si no se responde

El sistema no puede distinguir un caso incompleto de uno que ya tiene todos los documentos aplicables.

---

## FIS-006 — Condiciones de cierre y traspaso

### Decisión requerida

Confirmar cuándo un caso puede salir de Preclaim y hacia qué destino.

### FIS debe entregar dos checklists

#### Traspaso a FIS

Confirmar:

- datos mínimos;
- documentación mínima;
- cartas obligatorias;
- causa confirmada;
- mérito mínimo o posibilidad de continuar con mérito bajo;
- cálculo obligatorio o excepción;
- prescripción;
- aprobaciones requeridas.

#### Traspaso a Lawgistic

Confirmar:

- datos mínimos;
- documentación mínima;
- cartas obligatorias;
- causa confirmada;
- mérito mínimo;
- cálculo obligatorio o excepción;
- prescripción;
- aprobaciones requeridas.

### Confirmar además

- si existen pendientes permitidos;
- quién puede traspasar;
- quién puede rechazar;
- si el expediente queda solo lectura;
- quién puede revertir;
- qué motivo exige una reversa;
- qué información debe incluir el informe;
- si el traspaso es solo cambio de estado o requiere entrega formal a otro sistema.

### Impacto si no se responde

No existe una condición objetiva para marcar un caso como Completo para traspaso.

---

## FIS-007 — Inactividad y alertas

### Decisión requerida

Confirmar la regla operativa de casos sin movimiento.

### FIS debe responder

1. ¿El umbral es más de 15 días o 15 días o más?
2. ¿Se cuentan días corridos o hábiles?
3. ¿Qué zona horaria se utiliza?
4. ¿Qué eventos reinician el contador?
5. ¿Una simple visualización cuenta como movimiento?
6. ¿Una corrección, carga, solicitud, cálculo o cambio de estado cuenta?
7. ¿Qué estados se excluyen?
8. ¿Quién recibe la alerta?
9. ¿Por qué canal?
10. ¿Con qué frecuencia se repite?
11. ¿Se registra el envío y la lectura?
12. ¿Quién puede cerrar o silenciar la alerta?

### Impacto si no se responde

El sistema no puede asegurar que las alertas se disparen en el momento y a las personas correctas.

---

## FIS-008 — Monedas y tipo de cambio

### Decisión requerida

Confirmar si EUR y otras monedas forman parte de la entrega contractual o de una evolución.

### FIS debe entregar

- monedas permitidas;
- moneda por defecto;
- moneda de origen y moneda de resultado;
- fuente oficial del tipo de cambio;
- periodicidad;
- fecha aplicable;
- dirección de la tasa;
- tratamiento de fines de semana/feriados;
- quién puede modificar la tasa;
- si se permite tasa manual;
- redondeo por moneda;
- tratamiento de tasas faltantes;
- tratamiento de valores sin moneda.

### Regla que debe aprobarse

La tasa debe expresarse de forma inequívoca:

1 unidad de moneda origen = X unidades de moneda resultado.

### Impacto si no se responde

El sistema puede mostrar entradas, pero no debe materializar un monto final convertido.

---

## FIS-009 — Corpus documental y aceptación del OCR

### Decisión requerida

Entregar el corpus final autorizado para pruebas y la precisión mínima esperada.

### FIS debe entregar

- casos completos reales, sin anonimización, conforme al NDA firmado entre las partes;
- casos incompletos;
- casos con documentos ilegibles;
- casos con documentos ambiguos;
- PDFs nativos;
- PDFs escaneados;
- archivos XLSX, XLS y CSV;
- idiomas esperados;
- formatos de fecha;
- formatos de moneda;
- documentos que deben clasificarse aunque el nombre esté equivocado;
- ejemplos de cada documento de la matriz.

### Para cada tipo documental, confirmar

- campos obligatorios;
- campos opcionales;
- precisión mínima de clasificación;
- precisión mínima por campo crítico;
- qué campos requieren revisión siempre;
- qué campos pueden proponerse automáticamente;
- qué documentos no deben procesarse automáticamente;
- qué hacer si hay conflicto entre documentos.

### Campos críticos sugeridos

- referencia;
- BL;
- contenedor;
- nave;
- viaje;
- asegurado;
- oponente;
- fecha de descarga;
- moneda;
- valor de factura;
- liquidación real;
- valor comparable;
- valor de mercado;
- venta destino;
- número de reclamo.

### Impacto si no se responde

No se puede declarar que el OCR cumple ni establecer una métrica objetiva de aceptación.

---

# Respuesta consolidada que solicitamos a FIS

FIS puede responder usando este formato:

| ID | Decisión | Archivo o respaldo | Responsable FIS | Vigencia | Observaciones |
|---|---|---|---|---|---|
| FIS-001 | Aprobado / corregir / pendiente | Nombre del archivo | Nombre y cargo | Fecha | Excepciones |

Para los puntos matemáticos, adjuntar ejemplos con esta estructura:

| Caso | Método | Entradas | Moneda | Fórmula | Resultado esperado | Documento fuente |
|---|---|---|---|---|---:|---|

Para los templates, adjuntar:

- archivo editable;
- PDF de referencia;
- versión;
- firmante;
- campos obligatorios;
- texto legal aprobado.

---

# Regla de cierre

El desarrollo no debe marcar como “completo para producción” una función que dependa de una respuesta pendiente de FIS.

Las respuestas recibidas deben transformarse en:

- configuración versionada;
- regla de negocio;
- template aprobado;
- caso de prueba;
- evidencia de auditoría.

Cada cambio posterior debe crear una nueva versión y no modificar silenciosamente cálculos, cartas o expedientes ya aprobados.
