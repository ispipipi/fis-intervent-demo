# Intervent Preclaim Demo

Demo funcional completo para FIS / Intervent. Digitaliza el flujo Preclaim: alta de caso, ingesta de documentos, checklist, análisis de causa, cálculo de pérdida por 3 métodos, seguimiento, alertas de prescripción, cartas y dashboard de gerencia.

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- Zustand con persistencia en `localStorage`
- Fuse.js para clasificación fuzzy de documentos

SheetJS se utiliza para leer el historial operativo incluido en Excel. La primera vez que se abre Memoria, el demo precarga el archivo incluido, conserva todos los registros reconocibles, incluyendo hoja y fila, y los deja disponibles sin mezclarlos con los casos activos.

## Alcance de la memoria histórica

La memoria precargada representa el universo histórico contractual: aproximadamente 4.240 registros reconocibles distribuidos en 39 hojas. El demo los incorpora automáticamente como memoria de solo lectura; el usuario no necesita subir el Excel. Los aproximadamente 1.000 casos activos masivos futuros corresponden a un universo distinto y quedan fuera de esta carga y de la memoria histórica.

El perfil Inspector, la asignación de inspectores y la Carta JSI se mantienen fuera de Fase 1 y deben tratarse como evolución o Change Request. Los documentos y campos de inspección que formen parte del expediente contractual sí pueden conservarse como antecedentes del caso.

## Fuente de entrada de Fase 1

La solución recibe una carpeta documental ya descargada. No incluye descarga directa desde la plataforma del cliente, integraciones API, lectura de correo ni robots externos; cualquiera de esas capacidades requiere una evolución aprobada o Change Request.

## Decisiones técnicas del demo

El procesamiento de una carpeta se realiza por archivo. Cuando un archivo no es legible, requiere OCR o no está soportado, se conserva identificado con su estado y el procesamiento puede continuar con los demás. Esta tolerancia y aislamiento son decisiones técnicas internas del demo; no constituyen criterios contractuales de aceptación ni reemplazan la validación de FIS para producción.

## Glosario de nomenclatura

- `Claim Notice`: notificación y solicitud de reembolso a la naviera.
- `FIS`: destino de recupero extrajudicial.
- `Lawgistic`: destino de recupero judicial.

Las variantes antiguas `Logistic` y `claim notice` solo se reconocen para migrar datos heredados; la interfaz usa los nombres canónicos anteriores.

## Convención de referencia del demo

Las referencias generadas automáticamente usan el formato:

```text
PRE-FIS-OPONENTE-AÑO_DE_ASIGNACIÓN-MM/AA_DE_PRESCRIPCIÓN-CORRELATIVO
```

El oponente se representa con sus tres primeros caracteres normalizados, el año corresponde a la creación del caso, el período `MM/AA` se obtiene del vencimiento calculado y el correlativo toma el siguiente número disponible a partir de 4029. Las referencias provenientes de una carpeta o ingresadas por el usuario se conservan, pero pueden corregirse antes de continuar. Una corrección no fusiona ni elimina expedientes: actualiza documentos, cálculos e historial y registra el valor anterior, el nuevo valor, usuario y fecha.

Si la referencia ya existe, el sistema advierte la coincidencia y bloquea el cierre del alta o la corrección hasta resolverla. Si cambia la fecha real de descarga o la jurisdicción y el mes de la referencia deja de coincidir con la prescripción calculada, se muestra una advertencia para revisión humana.

## Prescripción en el alcance contractual

La regla marítima del demo se calcula desde la fecha de descarga: La Haya aplica un año como regla general y Hamburgo aplica dos años para los casos Chile/Perú identificados en la operación. La ETA se conserva como fecha estimativa, se muestra diferenciada y genera una observación pendiente; no se considera confirmación de la fecha base para el traspaso.

Los plazos para otros modos de transporte, extensiones y excepciones requieren una matriz aprobada por FIS antes de incorporarse al alcance productivo.

## Ejecutar localmente

```bash
npm install
npm run dev
```

## Validación

```bash
npm run lint
npm run build
```

## Abrir el demo

Durante desarrollo, abre la URL que imprime Vite:

```bash
npm run dev
```

No abras `index.html` directo desde la carpeta raíz del proyecto: ese archivo es fuente de Vite y Chrome bloquea sus módulos si se carga como `file://`.

Para revisar una versión estática, ejecuta `npm run build` y luego `npm run preview`. Abre la URL HTTP que imprime Vite. No abras `dist/index.html` directamente como `file://`, porque Chrome bloquea los módulos JavaScript y la pantalla queda en blanco.

## Deploy GitHub Pages

El proyecto está configurado con assets relativos y navegación hash para funcionar bien en GitHub Pages.

1. Publicar el repositorio `ispipipi/fis-intervent-demo`.
2. Ejecutar `npm run build`.
3. Publicar la carpeta `dist` en GitHub Pages mediante GitHub Actions o configuración equivalente.

## Persistencia

La app usa `localStorage` con prefijo `fis-intervent-demo:`. Los documentos cargados guardan solo metadata: nombre, tipo, fecha y `pathMock`. No se guarda binario ni base64.

La memoria histórica incluida se carga automáticamente en este demo y conserva los campos identificados, la hoja de origen, la fila, la referencia normalizada, las posibles repeticiones y el archivo original asociado. En una versión productiva estos datos deben migrarse a almacenamiento privado con autenticación y control de permisos.

## Datos demo

Incluye casos ficticios/anonimizados para poder probar dashboard, alertas, documentos y cálculo desde el primer ingreso.
