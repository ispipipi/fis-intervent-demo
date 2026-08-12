# FIS_PROMPT-CODEX_v2.0 — Pasada de diseño Intervent Preclaim

## CONTEXTO DEL PROYECTO

Proyecto: Plataforma Intervent — Demo Preclaim (FIS / Intervent)
Cliente: FIS / Intervent (Ljubinka Basic)
Tipo de trabajo: **Rediseño visual sobre MVP funcional ya construido.**
Stack: React 18 + Vite + TypeScript + Tailwind + Zustand. Persistencia localStorage (`fis-intervent-demo:`). Hash routing para GitHub Pages.

Esta sesión es la pasada de diseño que `FIS_PROMPT-CODEX_v1.0.md` dejó explícitamente fuera de alcance. La lógica de negocio ya está construida y validada. **No se toca.**

## FUENTES

| Fuente | Uso |
|---|---|
| `FIS_MD-FUNCIONAL_v1.1.md` | Verdad funcional: campos, estados, roles, fórmulas, reglas. Sin cambios. |
| Prototipo `Intervent Preclaim.dc.html` | Verdad visual: layout, tokens, jerarquía, estados, copy de interfaz. |
| `src/lib/business.ts`, `src/store/useDemoStore.ts`, `src/types/domain.ts` | Intocables. Ni una línea. |
| `src/App.tsx` | Se reescribe **solo el marcado**. Hooks, handlers, condicionales de rol y validaciones se conservan tal cual. |
| `src/styles/index.css` | Se reescribe completo contra los tokens de abajo. |

## REGLA CENTRAL DE ESTA SESIÓN

Cada componente de `App.tsx` mantiene su nombre, su firma de props, su estado interno y sus llamadas al store. Lo único que cambia es el JSX que devuelve y las clases que usa.

Si en algún punto el rediseño parece exigir cambiar una condición de rol, una validación o el orden de un cálculo: **no lo cambies, deja el comportamiento actual y anótalo como observación en el retorno.**

---

## 1. TOKENS

Extiende `tailwind.config.js`. No agregues colores fuera de esta lista.

```js
theme: {
  extend: {
    colors: {
      canvas:  '#EAF3FF',
      surface: '#FFFFFF',
      navy:    { DEFAULT: '#1D3150', hover: '#2C4570', active: '#16263F' },
      teal:    { DEFAULT: '#187D80', hover: '#1B9093' },
      ink:     '#1D3150',
      body:    '#41526C',
      muted:   '#687991',
      faint:   '#8C9BB1',
      ghost:   '#A6B6CB',
      line:    '#DCE7F5',
      'line-soft':   '#EDF3FB',
      'line-strong': '#C6D8EE',
      wash:    '#F7FBFF',
      field:   '#FBFDFF',
      ok:      { bg: '#E4F5EC', fg: '#0E7A4E', br: '#BCE6CF' },
      warn:    { bg: '#FDF3DE', fg: '#92610A', br: '#F3DFAE' },
      danger:  { bg: '#FCEAE8', fg: '#AF3227', br: '#F3CBC6' },
      neutral: { bg: '#EDF2F9', fg: '#5A6B84', br: '#D8E3F1' },
      info:    { bg: '#EAF1FB', fg: '#1D3150', br: '#D2E1F5' },
    },
    borderRadius: { field: '11px', btn: '12px', card: '16px', panel: '20px' },
    boxShadow: {
      card:  '0 1px 2px rgba(29,49,80,.05), 0 14px 34px -26px rgba(29,49,80,.7)',
      float: '0 1px 2px rgba(29,49,80,.05), 0 10px 26px -20px rgba(29,49,80,.5)',
      navy:  '0 10px 24px -16px rgba(29,49,80,.9)',
      modal: '0 30px 70px -30px rgba(20,36,60,.7)',
    },
    fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    maxWidth: { shell: '1280px' },
  }
}
```

**Sin dark mode.** No agregues variantes `dark:` en ninguna parte.

### Tipografía

Inter 400/500/600/700 vía Google Fonts en `index.html`. Nunca 800 ni 900.

| Uso | Tamaño / peso | Tracking |
|---|---|---|
| Métrica grande | 42px / 600 | −0.035em, `tabular-nums` |
| Título de pantalla | 29px / 600 | −0.03em |
| Título de ficha | 27px / 600 | −0.03em |
| Métrica de ficha | 26px / 600 | −0.03em, `tabular-nums` |
| Título de tarjeta | 16px / 600 | −0.015em |
| Cuerpo y campos | 13.5px / 400 | línea 1.55 |
| Secundario | 12.5px / 400 | color `muted` |
| Micro / pie | 11.5px / 400 | color `faint` |
| Badge | 11.5px / 600 | — |
| Eyebrow | 10.5px / 600 | .1em, mayúsculas, color `teal` |
| Cabecera de tabla | 10.5px / 600 | .08em, mayúsculas, color `faint` |

Piso duro: nada de texto bajo 10.5px. `text-wrap: pretty` en todo párrafo de más de una línea.

### Espaciado y radios

Escala base 4. Pasos usados: 6, 8, 10, 12, 14, 16, 18, 20, 22, 26, 32.
Gap de grilla del dashboard y entre secciones: **18px**, sin excepción.
Padding interno de panel: 22px vertical / 24px horizontal. Tarjeta compacta: 18-20px.
Radios: campo 11, botón 12, tarjeta 14-16, panel 20, pill 999.

---

## 2. COMPONENTES

Los cinco primeros ya existen en `App.tsx`. Conservan firma; cambian clases.

| Componente | Estado | Especificación |
|---|---|---|
| `AppShell` | Reescribir marcado | Barra flotante sticky, ver §3. |
| `Metric` | Reescribir clases | Punto de color 7px + label 12.5px arriba; número 42px abajo; hint 12px. Alto mínimo 132px, `justify-between`. |
| `StatusPill` | Reescribir clases | `rounded-full px-3 py-1.5 text-[11.5px] font-semibold`, par bg/fg del tono. |
| `Distribution` | Reescribir clases | Label 12.5px `muted` + valor 13px 600 tabular; barra 6px, track `line-soft`, relleno del color del tono. |
| `EmptyState` | Reescribir clases | Borde `dashed line-strong`, radio 14, padding 28-32, centrado. Título afirmativo 13.5px 600 + una línea 12.5px `faint` que diga qué hacer. |
| `Modal` | Reescribir clases | Overlay `rgba(20,36,60,.42)`, panel radio 20, padding 28, ancho máx 440, `shadow-modal`. |
| `MethodCard` | **Nuevo** | Ver §4.3. Cuatro estados visuales. |
| `ChecklistItem` | **Nuevo** | Cuadro 15px radio 5 con ✓ o ! + label 11.5px. Disponible: bg `#F4FBF7`, borde `#D9EFE3`, cuadro `ok.fg`. Faltante: bg `#FEFAF2`, borde `#F5E6C6`, cuadro `#C7900F`. |
| `SectionHeader` | **Nuevo** | Eyebrow + h1 + acción opcional a la derecha, `items-end justify-between`. |

### Estados obligatorios

| Estado | Regla |
|---|---|
| Hover primario | `bg-navy-hover`, transición 150ms sobre `background` y `color` únicamente |
| Hover secundario | Borde a `line-strong`, fondo a `wash` |
| Hover fila | Fondo a `wash`, sin desplazamiento ni sombra |
| Active | Primario `bg-navy-active`; secundario borde `#9DC2F0` |
| Focus | `outline: 2px solid #9DC2F0`, sin offset. No lo quites en ningún control. |
| Disabled | Primario `bg-line text-ghost`; secundario `bg-wash border-line-soft text-[#C0CCDC]`; ambos `cursor-not-allowed` |
| Empty | `EmptyState` |
| Warning | Bloque `warn.bg` / borde `warn.br` / texto `warn.fg` |
| Error | Bloque `danger.bg` / borde `danger.br` / texto `danger.fg`; el campo culpable con borde `#E0857C` y fondo `#FEF7F6`, y su label en `danger.fg` |

Nada de animaciones de entrada, `translate` en hover, ni transiciones sobre `box-shadow` o `transform`.

---

## 3. SHELL

Reemplaza el `<header>` actual completo.

- Barra sticky, `z-40`, padding `18px 32px 14px`, fondo `linear-gradient(180deg,#EAF3FF 62%,rgba(234,243,255,0))`.
- Fila interna `max-w-shell mx-auto flex items-center gap-4`.
- **Marca** (izquierda, `flex-none`): pill blanca radio 999, `shadow-float`. Cuadro navy 30px radio 9 con "IP", luego "Intervent" 14px 600 sobre "PRECLAIM" 10.5px 600 `teal` en mayúsculas con tracking .09em. Navega a `/dashboard`.
- **Navegación** (centro, `flex-1 min-w-0 flex justify-center`): pill blanca radio 999, padding 5, `gap-1`, `shadow-float`, `max-w-full overflow-x-auto`, scrollbar oculta (`scrollbar-width:none` + `::-webkit-scrollbar{display:none}`). Ítems: Dashboard · Casos · Nuevo caso (solo Handler) · Benchmark · Manual. Cada botón `whitespace-nowrap flex-none rounded-full px-[17px] py-[9px] text-[13.5px] font-semibold`. Activo: `bg-navy text-white`. Inactivo: transparente, `text-muted`, hover `bg-[#F1F6FD] text-ink`. "Casos" queda activo también dentro de la ficha.
- **Rol + reset** (derecha, `flex-none`): pill blanca con label "ROL" 10.5px + `<select>` sobre `#F1F6FD` radio 999. Opciones: los tres handlers, `Gerente · Ljubinka`, `CEO · Dirección`. Al cambiar navega a `/dashboard` (regla no negociable del MD). Al lado, botón circular 40px con ↺ que llama `resetDemo`.
- Eliminar el botón "Manual" duplicado del header: **un solo acceso**, el de la pill.
- Contenido: `max-w-shell mx-auto px-8`.
- Pie: línea `border-t border-[#DAE6F6]`, nota de procedencia de los datos a la izquierda.

**Responsive del shell.** Bajo `lg` la pill de navegación es fila desplazable con Manual siempre alcanzable, y marca y rol se mantienen en la fila. Bajo `md` el label "ROL" se oculta. Nunca scroll horizontal en el documento: cada hijo del header lleva `min-w-0` o `flex-none` según corresponda.

---

## 4. PANTALLAS

### 4.1 Dashboard — `/dashboard`

Bento de tres bandas, gap 18px.

**Banda 1** — `grid-cols-[1fr_2fr_1fr]`:
1. Tarjeta navy radio 20, `justify-between`. Eyebrow `#7FC5C7` con el título de rol (`Mesa handler` / `Panel gerencia` / `Vista dirección`), "Hola, {nombre}" 29px en blanco, subtítulo `#A9BFDC` con el conteo real de casos y alertas. Abajo: acción contextual teal (Handler → "Crear nuevo caso"; Gerente/CEO → "Ver benchmark del equipo") y bajo ella el acceso al Manual sobre `rgba(255,255,255,.07)`.
2. Sub-grilla 2×2 de `Metric`: Total de casos · Alertas activas · Sin movimiento · Documentos cargados. Colores del número: navy, `danger.fg` si hay alertas, `warn.fg` si hay casos detenidos, `teal` para documentos.
3. Tarjeta de cobertura documental: anillo SVG `r=52`, `stroke-width=13`, track `#EDF3FB`, relleno `teal`, `stroke-linecap: round`, rotado −90°. Porcentaje 34px al centro. Es el promedio de tipos disponibles sobre 17 entre los casos visibles.

**Banda 2** — `grid-cols-[1.9fr_1fr]`: panel de alertas de prescripción y movimiento a la izquierda; a la derecha, columna con "Casos por estado" y "Distribución por handler". Cada alerta es una fila clicable con borde izquierdo de 3px del color del tono, badge de prescripción, badge ámbar de días sin movimiento cuando aplica, reference 13.5px 600 y meta `asegurado · oponente · handler`. Orden: rojo, gris, ámbar, y dentro de cada grupo por días sin movimiento descendente.

**Banda 3** — `grid-cols-[2.2fr_1fr]`: "Casos recientes" (máximo 5, ordenados por `ultimaActualizacion`, filas separadas por `border-t line-soft`, badge de estado y antigüedad relativa) y tarjeta "Accesos" con Manual y Benchmark.

El filtro por handler para Gerente/CEO se conserva donde está hoy, con estilo de `<select>` de la §5.

**Responsive.** `lg` → banda 1 a `1fr 1fr`, bandas 2 y 3 a una columna. `md` → todo a una columna, métricas 2×2, alertas como tarjetas completas.

### 4.2 Lista de casos — `/casos`

`SectionHeader` con eyebrow "Lista de casos" y título "Mis casos" (Handler) o "Portafolio completo" (Gerente/CEO). Botón "+ Nuevo caso" a la derecha solo para Handler.

Barra de herramientas: buscador que ocupa el espacio disponible (fondo blanco, radio 14, glifo ⌕ `ghost` a la izquierda) y `<select>` de estado de 230px con "Todos" + los seis estados.

Tabla como grilla, no `<table>`: `grid-cols-[1.7fr_1.2fr_1.2fr_1fr_1.1fr_1.1fr_26px]`, gap 14, padding `16px 24px`. Cabecera sobre `wash` con `border-b line-soft`. Cada fila es un `<button>` de ancho completo, hover `wash`, con chevron a la derecha. Reference en `teal` 600. Oponente con la nave debajo en 11.5px `faint`. Prescripción y estado como `StatusPill`.

**Responsive.** Bajo `lg` cada fila pasa a tarjeta apilada: reference arriba, los dos badges en fila, resto en dos columnas de etiqueta/valor. Nunca scroll horizontal.

### 4.3 Ficha de caso — `/casos/:id`

**Cabecera**, panel radio 20, `grid-cols-[1fr_auto]`:
- Izquierda: eyebrow con CS Claim No o "Sin CS Claim No", reference 27px con `break-word`, línea `asegurado · oponente · nave`, y fila de badges: estado, prescripción, y días sin movimiento cuando supera el umbral.
- Derecha, columna de 270px mínimo: aviso contextual cuando lo hay; luego la acción principal según estado y rol; luego el bloque de reversión para Gerente/CEO (selector de estado destino + textarea de motivo + botón), sobre `wash` radio 14; y el aviso de solo lectura cuando corresponda.
- Bajo una `border-t line-soft`, tres métricas en `grid-cols-3`: **Riesgo de prescripción** (fondo del tono del semáforo, valor en días o "Vencido", hint con la fecha exacta), **Días sin movimiento** (ámbar si supera el umbral, hint con el umbral vigente), **Recupero estimado** (monto final del cálculo guardado; si no hay, el monto declarado, y el hint lo dice).

**Tabs**: pill centrada idéntica a la del shell, cinco ítems. Bajo `md`, fila desplazable.

**Documentos** — `grid-cols-[1fr_1.05fr]`.
Izquierda: zona de carga `border-dashed line-strong` radio 16 que en hover pasa a borde `teal` y fondo `#F5FBFB`, con la leyenda "Se guarda nombre, tipo, fecha y pathMock. Nunca el binario." Los borradores aparecen como filas `grid-cols-[1fr_210px]` con el nombre original y el `<select>` de tipo sugerido, siempre corregible. Botón teal "Confirmar carga". Debajo, los documentos ya cargados como filas con punto teal, nombre renombrado y `tipo · pathMock` truncado, con botón de eliminar solo si el usuario puede escribir. Sin documentos → `EmptyState`.
Derecha: checklist de los **17** tipos en `grid-cols-2` con `ChecklistItem`, contador `n / 17` en teal en la cabecera, y bloque `wash` con el texto copiable de faltantes en `<pre>` de 11.5px con `max-h-[190px] overflow-auto` y botón "Copiar" que confirma con "Copiado" por 1.8s.

**Análisis**: panel único de 900px máximo, centrado. Si aplica temperatura con termógrafo, tres campos numéricos en `grid-cols-3`; si no, bloque `neutral` explicando por qué no hay sugerencia. La sugerencia va en bloque teal claro (`#E2F1F1` / borde `#BDE0E0`) con el texto de desviación y mérito, la línea "Sugerencia de apoyo. La decisión queda registrada como del handler." y el botón "Usar como base editable". Textarea de conclusión de 130px mínimo. El botón "Confirmar análisis" está deshabilitado hasta los 10 caracteres, con un hint al lado que dice cuánto falta.

**Cálculo**:
1. Panel de encabezado con badge de modo (Editable / Solo lectura / Bloqueado por traspaso), tarjeta de solo lectura con la conclusión del Módulo 3 (borde izquierdo teal de 3px), bloque de error si lo hay, y la fila moneda + tipo de cambio (solo CLP) + checkbox "Venta a firme".
2. Con venta a firme: un solo campo de nota de crédito y el bloque de monto final.
3. Sin venta a firme: `grid-cols-3` de paneles de input, uno por método, con la fórmula literal al pie en 11px `ghost`. Debajo, panel "Resultados en paralelo" con tres `MethodCard` **ordenados de mayor a menor**:

| Estado | Fondo | Borde | Valor | Badge |
|---|---|---|---|---|
| Sin datos | `#FAFCFE` | `1px dashed neutral.br` | "Sin datos" `#C0CCDC` | "Sin datos" gris, no clicable |
| Disponible | blanco | `1px solid line` | monto `body` | "Disponible" verde |
| Seleccionado | `#F2F7FF` | `2px solid navy` | monto navy | "Método seleccionado" navy sólido |
| Guardado | blanco | `1px solid line` | monto `body` | "Guardado" teal claro |

4. Panel de rubros adicionales (`grid-cols-[1fr_190px_40px]`, botón "+ Agregar rubro") y justificación, cuyo textarea toma borde `#E0857C` mientras haya método seleccionado y menos de 10 caracteres.
5. Cierre: bloque navy radio 16 con "MONTO FINAL A RECLAMAR" en eyebrow `#7FC5C7`, cifra 34px en blanco, hint que nombra el método y los rubros, y el botón teal "Guardar cálculo" a la derecha.

**Historial**: línea de tiempo de 860px máximo. Columna de 16px con punto de 9px del color del evento y línea vertical `line-soft`; a la derecha, badge de tipo de evento, fecha y hora, detalle 13px y usuario 11.5px `faint`. Orden cronológico inverso.

**Cartas**: `<textarea>` de 390px mínimo con la plantilla pre-llenada, radio 14, interlineado 1.75. Los campos sin dato aparecen como `[PENDIENTE COMPLETAR]`. Botones "Copiar carta" (navy) y "Descargar .txt" (secundario). Badge ámbar "No se envía automáticamente" en la cabecera. Ambas acciones registran evento en la bitácora.

### 4.4 Benchmark — `/benchmark`

Grilla `grid-cols-[1.4fr_repeat(6,minmax(0,1fr))]`, filas de 20px de padding vertical. Columnas: Handler (nombre 13.5px + rol 11.5px `faint`), Casos, Docs pendientes, Alertas, Sin movimiento, Cobertura documental, Cálculos completos.

Los cuatro conteos van en 22px 600 tabular. Alertas en `danger.fg` cuando hay, `ink` cuando es cero; sin movimiento en `warn.fg` bajo la misma regla. Cobertura como porcentaje sobre barra de 6px teal. Cálculos completos como `n / total`.

Al pie, nota de 12px `faint` que define cobertura y alerta en palabras, incluyendo el umbral vigente de días sin movimiento.

Bajo `lg`, cada handler pasa a tarjeta con las seis métricas en `grid-cols-3`.

### 4.5 Manual — `/manual`

Ancho máximo 1080px. Cuatro bloques:
1. **Recorrido de un caso**, seis tarjetas numeradas en `grid-cols-3` sobre `wash`: crear el caso, cargar y clasificar documentos, analizar la causa de daño, calcular la pérdida, avanzar el estado, generar la carta.
2. **Qué puede hacer cada rol**, tres tarjetas con los permisos exactos de la sección 1.3 del MD.
3. **Reglas que el sistema no permite saltarse**, lista de siete líneas con viñeta teal, redactadas en positivo.
4. **Cómo leer el semáforo de prescripción**, cuatro tarjetas verde / ámbar / rojo / gris con sus umbrales y la fórmula de la fecha de prescripción por jurisdicción.

Accesible desde la pill de navegación en cualquier pantalla, también en móvil.

---

## 5. CONTROLES DE FORMULARIO

Base común: `bg-field border border-line rounded-field px-3 py-[11px] text-[13.5px]`. Label encima, 11.5px 600 `muted`, gap 7px. Textarea con interlineado 1.55 y `resize-y`.

Campo obligatorio sin completar tras un intento de guardado: borde `#E0857C`, fondo `#FEF7F6`, label en `danger.fg`.

Formulario "Nuevo caso": `grid-cols-3`, gap 16, dentro de un panel de 960px máximo. Los tres botones alineados a la derecha en el orden Cancelar · Guardar borrador · Guardar y continuar. Cancelar con datos ingresados abre confirmación. Las validaciones son las que ya existen; solo cambia cómo se muestran.

---

## 6. RESPONSIVE

| Breakpoint | Regla |
|---|---|
| ≥1280 | Contenedor 1280px, bento completo, tabla en grilla |
| 1024-1279 | Banda 1 del dashboard a `1fr 1fr`, bandas 2 y 3 a una columna |
| 768-1023 | Todo a una columna. Tabla de casos y benchmark pasan a tarjetas. Tabs y navegación como filas desplazables |
| <768 | Métricas 2×2, ficha apilada, formularios a una columna, botones de ancho completo |

Regla dura: `document.documentElement.scrollWidth === clientWidth` en todos los anchos entre 320 y 1920. Todo hijo de un flex lleva `min-w-0` o `flex-none`. Ningún contenedor de página con `overflow-x` propio salvo las dos pills desplazables, cuya barra va oculta.

Objetivo táctil mínimo 44px en móvil: los botones de fila y los tabs suben a `py-3`.

---

## 7. QUÉ NO HACER

- No tocar `business.ts`, `useDemoStore.ts` ni `domain.ts`.
- No cambiar rutas, nombres de campo ni valores de enum.
- No agregar dark mode.
- No agregar una librería de UI, de iconos ni de gráficos. Ya está lucide-react; mantenlo en 16-18px color `muted`. El anillo de cobertura y las barras de distribución son SVG y div, sin librería.
- No agregar gradientes decorativos, blobs, glassmorphism ni sombras de color.
- No inventar datos: todos los números salen del store.
- No agregar botones sin acción real.
- No usar más de dos fondos: `canvas` para la página, `surface` para las superficies. `wash` es un matiz interno, no un tercer fondo.
- No traducir ni reescribir el copy de interfaz del prototipo. Está en español y es el definitivo.

---

## 8. CRITERIOS DE ACEPTACIÓN

- [ ] Los ocho criterios por módulo de la Sección 4 del MD siguen cumpliéndose, sin regresiones.
- [ ] Las seis rutas renderizan con el nuevo sistema y los datos del store, sin números inventados.
- [ ] Handler ve solo sus casos; Gerente y CEO ven el portafolio completo; CEO en lectura.
- [ ] La reversión sigue exigiendo Gerente/CEO y motivo de al menos 10 caracteres.
- [ ] Ningún cálculo se guarda con método seleccionado y sin justificación de 10 caracteres.
- [ ] Ningún caso calcula prescripción sin fecha de descarga y jurisdicción explícitas.
- [ ] Los tres métodos se ven en paralelo, ordenados de mayor a menor, con los cuatro estados visuales distinguibles.
- [ ] El checklist cubre los 17 tipos y el texto de faltantes se copia correctamente.
- [ ] La carta se pre-llena, se copia y se descarga; no se envía.
- [ ] Manual accesible desde la navegación en todos los anchos, incluido móvil.
- [ ] Sin scroll horizontal entre 320 y 1920px.
- [ ] Hover, active, focus, disabled, empty, warning y error presentes en todos los controles.
- [ ] `npm run build` limpio, sin warnings nuevos de TypeScript.
- [ ] Despliegue en GitHub Pages funcionando con hash routing.

## 9. FORMATO DE RETORNO

Formato estándar NPR (`CODEX.md` §7.1): resumen de la pasada, tabla de pantallas rediseñadas con archivos tocados, tabla de criterios cumplidos / parciales / no cumplidos, lista de componentes nuevos creados, confirmación explícita de que `business.ts`, `useDemoStore.ts` y `domain.ts` no fueron modificados, deuda técnica declarada, y estado final.
