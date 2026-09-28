# Informe de rediseño UX/UI

## Alcance ejecutado

Se implementó una primera pasada de rediseño visual sobre el demo funcional de Intervent Preclaim, manteniendo las rutas, roles, reglas de negocio, datos locales y capacidades existentes.

## Cambios principales

- Se preservó la versión funcional anterior en el tag `v1.0.0-functional`.
- Se creó la rama `codex/ux-ui-redesign` para aislar el trabajo visual.
- Se reemplazó el encabezado horizontal por un App Shell con navegación lateral en desktop y navegación horizontal adaptable en pantallas estrechas.
- Se agregó una jerarquía consistente para contexto de sesión, rol activo, navegación operativa y navegación de gestión.
- Se centralizaron tokens visuales de color, tipografía, bordes, radios, sombras y movimiento en estilos premium separados.
- Se normalizaron botones, campos, tablas, pestañas, estados, paneles, carga documental, modales y estados vacíos.
- Se mejoraron los estados de foco y la lectura de la navegación mediante etiquetas y nombres accesibles.
- El benchmark adapta sus indicadores a una cuadrícula responsive para evitar una columna excesivamente larga en pantallas estrechas.
- Se mantuvo el acceso al Manual de usuario desde el shell, el dashboard, el pie de página y la pantalla de selección de rol.
- Se verificaron visualmente dashboard, listado de casos, expediente, cálculo, cartas, nuevo caso, historial, benchmark, mantenedores y manual.

## Validación funcional realizada

- El dashboard carga el portafolio según el rol y permite cambiar entre Handler, Gerente y CEO.
- El listado de casos conserva búsqueda, filtro por estado, acceso al expediente y exportación.
- El expediente conserva las pestañas de documentos, análisis, cálculo, informe, historial y cartas.
- Los documentos y estados del checklist se mantienen operables.
- La vista de cálculo conserva monedas, métodos, resultados paralelos y guardado auditable.
- Las cartas permanecen bloqueadas hasta completar la revisión humana y los respaldos requeridos.
- El historial se precarga con 4.240 casos importados y los casos generados desde el sistema, diferenciando ambos orígenes.
- Benchmark y mantenedores se mantienen restringidos a perfiles de gestión.
- El manual continúa describiendo las funcionalidades y las reglas críticas del demo.

## Resultado técnico

- `npm run build`: aprobado.
- `git diff --check`: aprobado.
- Los archivos de código fuente y estilos quedan bajo el límite de 700 líneas definido para el proyecto.
- No se agregaron dependencias nuevas.

## Riesgos y próximos pasos

- La validación visual realizada corresponde al viewport disponible del demo; antes de publicar conviene repetirla en desktop amplio y móvil real.
- La persistencia, OCR, exportaciones y generación de documentos siguen siendo capacidades de demo local según el alcance existente; no se modificaron para esta pasada visual.
- La siguiente iteración recomendada es aplicar el mismo lenguaje visual a estados avanzados del expediente y ejecutar una prueba punta a punta con un caso nuevo, sin alterar la versión funcional etiquetada.
