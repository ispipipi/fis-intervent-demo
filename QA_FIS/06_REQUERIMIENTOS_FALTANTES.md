# Requerimientos faltantes o por definir

## Faltantes de producto

1. Autenticación, recuperación de acceso, sesión, cierre de sesión y control de concurrencia.
2. Matriz de permisos por rol y por acción: ver, cargar, editar, eliminar, calcular, generar carta, transferir y revertir.
3. Almacenamiento de archivos, versionado, tamaño máximo, formatos, antivirus, retención y recuperación.
4. Edición posterior de referencia, fecha de descarga y distinción formal entre ETA, descarga real y fecha de prescripción.
5. Moneda de origen, moneda de cálculo, EUR y demás monedas, tasa por fecha, fuente del tipo de cambio y política de redondeo.
6. Catálogo final de templates, formatos oficiales, campos obligatorios, firmas, versiones y aprobador.
7. SUBRO y certificados de destrucción si se aprueba su incorporación.
8. Exportación Excel: columnas, filtros, nombre de archivo, zona horaria, formato de montos y datos históricos incluidos.
9. Solicitud documental: destinatario, correo, adjuntos, planilla, estado de solicitud, reenvío y trazabilidad.
10. Perfil Inspector, asignación de casos, búsqueda por contenedor, JSI y restricciones de visibilidad.
11. Regla definitiva de inactividad: “más de 15”, “15 o más”, calendario hábil o días corridos y canal de aviso.
12. Agrupación de nave/viaje: ventana temporal, umbral de masividad y acción al seleccionar grupo.
13. Categorías operativas Loss, Pre, FIS y Lawgistic, incluyendo transiciones y responsables.
14. Definición de “listo para traspaso” y tratamiento de pendientes documentales.
15. Fuente de verdad de cálculo histórico: qué campos son confiables y cómo se audita la reconstrucción.

## Requerimientos de calidad

- Tiempo máximo de procesamiento de una carpeta y de un lote Excel.
- Tamaño máximo de archivo y cantidad máxima de documentos por caso.
- Precisión mínima esperada por tipo documental y campo extraído.
- Compatibilidad de navegadores y comportamiento móvil.
- Accesibilidad objetivo: teclado, foco, contraste y lector de pantalla.
- Disponibilidad, backup, recuperación ante error y trazabilidad de cambios.
- Observabilidad: logs, métricas, alertas de errores y auditoría.
- Criterios de aceptación de contrato y datos de prueba autorizados.

## Decisiones que deben quedar por escrito

El contrato inicial y las solicitudes posteriores no deben mezclarse en una única definición de “cumplido”. Para cada extensión se necesita decidir: entra al contrato, queda como cambio de alcance, o se posterga. En particular: Inspector, EUR/FX, SUBRO/destrucción, notificaciones, agrupación de naves y exportación avanzada.

