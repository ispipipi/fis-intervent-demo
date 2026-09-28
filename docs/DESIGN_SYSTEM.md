# Design System | Intervent Preclaim

## Principios

1. **Operativo antes que decorativo:** cada elemento debe ayudar a revisar, decidir o ejecutar.
2. **Jerarquía silenciosa:** el color, el peso tipográfico y el espacio guían la lectura sin competir con los datos.
3. **Densidad inteligente:** más información visible en tablas y expedientes, con suficiente aire entre contextos.
4. **Estado explícito:** los estados de caso, documentos y alertas siempre tienen texto, color y contexto.
5. **Consistencia:** una misma acción y un mismo estado se ven igual en toda la aplicación.

## Tokens

### Color

| Token | Uso |
| --- | --- |
| `--canvas` | Fondo general de la aplicación. |
| `--surface` | Superficie principal. |
| `--surface-raised` | Paneles elevados y menú lateral. |
| `--ink` | Texto principal y títulos. |
| `--body` | Texto de lectura. |
| `--muted` | Metadatos y labels secundarios. |
| `--line` | Separadores y bordes. |
| `--accent` | Acción principal y navegación activa. |
| `--accent-strong` | Hover y foco de acciones principales. |
| `--success` | Confirmaciones y estados completos. |
| `--warning` | Pendientes y riesgo. |
| `--danger` | Errores y alertas críticas. |

La paleta evita gradientes y usa el color solo para comunicar prioridad, acción o estado.

### Tipografía

- Display: títulos de página, máximo 28 px.
- Heading: secciones, 18 a 22 px.
- Body: 13 a 14 px.
- Label: 11 a 12 px, peso 650.
- Metadata: 11 a 12 px, color muted.
- KPI: 24 a 32 px, peso 700.

### Spacing

Escala base: `4 / 8 / 12 / 16 / 24 / 32 / 48`.

### Radios

- Control: 8 px.
- Panel: 12 px.
- Modal o superficie destacada: 16 px.
- Pill: solo para estados o navegación compacta.

### Motion

- Transición estándar: 160 ms.
- Transición de panel: 200 ms.
- Easing: `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- No se usan animaciones decorativas.

## Primitives

- `Button` y `IconButton`: acción, jerarquía, loading, disabled y focus.
- `PageHeader`: breadcrumb, título, descripción y acciones.
- `Section`: título, metadata y contenido.
- `StatusBadge`: estado semántico con texto visible.
- `FilterBar`: búsqueda, filtros, contador y exportación.
- `DataTable`: encabezado, filas, hover, selección, acciones y empty state.
- `EmptyState`: explicación y siguiente acción.
- `Feedback`: notice, error, success y toast.
- `Modal` y `Drawer`: acciones acotadas y revisión contextual.

## Composición de pantallas

1. App Shell y navegación.
2. Page Header.
3. Barra de filtros o tabs.
4. Contenido principal.
5. Feedback y acciones de cierre.

## Accesibilidad mínima

- Contraste WCAG AA cuando razonablemente corresponda.
- Focus visible en links, botones, inputs y selects.
- Labels persistentes en formularios.
- `aria-label` para acciones iconográficas.
- No usar el color como único indicador.
- Filas y estados de tabla legibles con teclado.
- Targets interactivos de al menos 32 px en desktop y 40 px en touch.
