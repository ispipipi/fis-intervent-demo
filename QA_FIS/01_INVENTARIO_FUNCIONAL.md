# Inventario funcional

## Rutas y módulos

| Ruta | Actor | Funcionalidad observada en código | Estado |
|---|---|---|---|
| `/` | Todos | Selector de Handler, Gerente y CEO; enlace al manual. | ✅ |
| `/dashboard` | Todos | Totales, alertas de prescripción, días sin movimiento, cobertura documental y casos recientes. Gerente/CEO filtran por handler. | 🟡 |
| `/casos` | Todos | Búsqueda por referencia, asegurado, oponente, nave y handler; filtro de estado; acceso a ficha. | ✅ |
| `/casos/nuevo` | Handler | Alta manual, carga de carpeta, drag and drop, procesamiento y propuesta editable. | 🟡 |
| `/casos/:id` | Todos | Cabecera, estados, prescripción, expediente y tabs de Documentos, Análisis, Cálculo, Informe, Historial y Cartas. | 🟡 |
| `/historial` | Todos | Precarga del Excel incluido, importación adicional, búsqueda, categoría, duplicados y detalle de fila. | 🟡 |
| `/benchmark` | Gerente/CEO | Comparación por handler de casos, documentación pendiente, alertas, movimiento, cobertura y cálculos. | ✅ |
| `/mantenedores` | Gerente/CEO | Mantenedor de cálculos y de cuatro templates base. Gerente edita; CEO consulta. | 🟡 |
| `/manual` | Todos | Descripción de módulos, permisos, recorrido recomendado y reglas operativas. | ✅ |

## Acciones y controles

| Control | Ubicación | Resultado esperado | Resultado implementado | Estado |
|---|---|---|---|---|
| Seleccionar perfil | `/` y header | Cambiar vista y alcance | Guarda el rol en Zustand y navega a dashboard. | 🟡 |
| Reiniciar demo | Header | Restablecer datos simulados | Ejecuta `resetDemo`. No solicita confirmación. | 🟡 |
| Crear nuevo caso | Dashboard / Casos | Abrir formulario | Navega a `/casos/nuevo`; solo visible para Handler. | ✅ |
| Guardar borrador | Nuevo caso | Crear caso incompleto | Crea estado `Datos incompletos` y abre la ficha. | ✅ |
| Guardar y continuar | Nuevo caso | Validar mínimos y crear | Valida handler, asegurado, oponente, nave, descarga y jurisdicción. | ✅ |
| Cancelar | Nuevo caso | Volver sin guardar | Pide confirmación si hay datos. | ✅ |
| Cargar carpeta/documentos | Nuevo caso / Documentos | Procesar varios archivos | Lee tipos compatibles y prepara borradores. | 🟡 |
| Confirmar carga | Ficha / Documentos | Persistir documentos clasificados | Guarda metadata, nombre renombrado y extracción. | 🟡 |
| Corregir tipo documental | Ficha / Documentos | Cambiar clasificación | Select editable antes de confirmar carga. | ✅ |
| Eliminar documento | Ficha / Documentos | Quitar documento | Elimina metadata; no registra evento en bitácora. | 🟡 |
| Copiar faltantes | Ficha / Documentos | Copiar solicitud documental | Llama al portapapeles, pero no muestra confirmación de copia. | 🟡 |
| Confirmar datos detectados | Ficha / Documentos | Aplicar extracción al caso | Actualiza datos y crea evento de extracción revisada. | ✅ |
| Usar sugerencia de causa | Ficha / Análisis | Pasar recomendación a conclusión | Copia el texto sugerido al textarea. | ✅ |
| Confirmar análisis | Ficha / Análisis | Registrar decisión humana | Exige al menos 10 caracteres y guarda análisis. | ✅ |
| Cargar propuesta al cálculo | Ficha / Cálculo | Llevar valores extraídos a base editable | Copia valores, rubros y fuentes; no selecciona método. | ✅ |
| Seleccionar método | Ficha / Cálculo | Elegir criterio aplicable | Tarjetas clicables si hay resultado y método activo. | ✅ |
| Guardar cálculo | Ficha / Cálculo | Persistir resultado auditable | Exige método/venta firme y justificación de 10 caracteres. | 🟡 |
| Generar informe | Ficha / Informe | Consolidar revisión | Genera estado listo u observaciones y lo guarda en caso/bitácora. | ✅ |
| Descargar informe | Ficha / Informe | Obtener documento | Descarga TXT, no Excel ni PDF. | 🟡 |
| Traspasar a FIS/Lawgistic | Cabecera de ficha | Confirmar derivación | Modal y estado local; no integra con sistema destino. La etiqueta actual dice `Logistic`. | 🟡 |
| Revertir estado | Ficha / Gerente | Volver a estado con motivo | Solo store Gerente; exige 10 caracteres y registra evento. | ✅ |
| Generar carta | Ficha / Cartas | Completar template base | Selecciona cuatro templates, permite editar y descargar HTML. | 🟡 |
| Copiar carta | Ficha / Cartas | Copiar texto | Llama al portapapeles y registra evento aun si la promesa falla. | 🟡 |
| Guardar mantenedor | Mantenedores | Persistir textos/activación | Zustand/localStorage; las fórmulas quedan protegidas. | 🟡 |
| Restaurar mantenedor | Mantenedores | Volver a base | Usa confirmación nativa y restablece configuración. | ✅ |
| Importar historial Excel | Memoria | Incorporar lotes históricos | Parsea filas reconocibles y guarda registros en IndexedDB. | 🟡 |
| Buscar y filtrar memoria | Memoria | Consultar histórico | Búsqueda textual y categoría; detalle de registro seleccionado. | ✅ |

## Campos de alta

La pantalla de nuevo caso expone: Reference No, Claim handler, CS Claim No, Asegurado, Oponente/transportista, Nave, Viaje, Puerto de descarga, Fecha de descarga, Inspector, Monto reclamado, Jurisdicción, Causa de daño, Tipo de caso, Resumen automático y Causa potencial. El formulario no expone un campo de fecha de carga/embarque manual; ese dato depende de la extracción documental.

## Checklist documental

El inventario declara 17 tipos: Carta de notificación a la naviera, AoR, Carta de subrogación o LoA, BL, Booking, Factura de exportación, DUS, Packing List, Certificado fitosanitario, Certificado de origen, Liquidaciones comparativas o informe de mercado, Liquidación por contenedor, Tracking de naviera, Informes de QC en origen y destino, Reportes de inspección, Certificado de cosecha y Registros de termógrafos.

## Datos y persistencia

- Casos, documentos como metadata, cálculos, bitácora y configuración se guardan en `localStorage` bajo `fis-intervent-demo:`.
- El historial se guarda adicionalmente en IndexedDB.
- El Excel incluido se obtiene desde `public/data/preclaim-history.xlsx` al abrir Memoria.
- El documento cargado no se guarda como binario/base64 y el `pathMock` no permite recuperar el archivo.

## Nota de verificación

La cobertura de botones se levantó mediante lectura de JSX, handlers y store. La ejecución visual completa quedó **REQUIERE VALIDACIÓN FUNCIONAL** por la imposibilidad del navegador de auditoría de conectarse de forma estable al servidor local.

