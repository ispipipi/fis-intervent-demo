# Archivos para prueba Intervent Preclaim

## Orden recomendado

### 1. Caso completo

Usar la carpeta `01_caso_completo/PRE-FIS-HLC-2025-02-4031`.

Objetivo: recorrer el flujo principal completo.

- Cargar la carpeta.
- Clasificar y renombrar documentos.
- Revisar extracción e inventario.
- Ejecutar los tres cálculos.
- Generar AoR, Harvest, LoA y Claim Notice.
- Completar checklist y preparar traspaso.

La carpeta contiene 17 archivos PDF de un mismo caso.

### 2. Caso incompleto

Usar la carpeta `02_caso_incompleto`.

Objetivo: probar documentos faltantes y solicitudes documentales. Esta carpeta contiene solo una parte del expediente, por lo que el sistema debe marcar faltantes sin bloquear la carga del caso.

### 3. Memoria histórica

Usar `03_memoria_historica/PreClaim_historico_entregado.xlsx`.

Objetivo: verificar que la memoria histórica se consulte separada de los casos activos y que conserve su origen y versión.

### 4. Excepción técnica

Usar la carpeta `04_caso_con_excepcion`.

Objetivo: comprobar que un archivo no compatible quede marcado como excepción y que el resto del procesamiento pueda continuar.

## Resultado esperado

Cada prueba debe registrar:

- Archivos procesados correctamente.
- Documentos identificados y documentos faltantes.
- Datos extraídos y correcciones humanas.
- Resultado de los tres cálculos.
- Templates generados o bloqueados por información faltante.
- Estado final del caso.
- Errores, alertas y trazabilidad.
