# Entrega de diseño — Intervent Preclaim

Carpeta para adjuntar a la sesión de Codex, junto con `FIS_PROMPT-CODEX_v2.0_DISENO.md` y `FIS_MD-FUNCIONAL_v1.1.md`.

## Qué es cada cosa

| Archivo | Para qué sirve | Quién lo usa |
|---|---|---|
| `prototipo-intervent-preclaim.html` | Prototipo navegable completo, archivo único sin dependencias. Se abre con doble clic en cualquier navegador. **Contiene cada valor exacto**: hex, píxeles, radios, sombras, grillas y el copy definitivo en español. | Codex lo lee como código fuente. Es la verdad visual. |
| `capturas/` | Ocho capturas a 1400px de ancho, una por pantalla. Muestran el primer pliegue de cada vista. | Revisión humana y contexto rápido. |
| `../FIS_PROMPT-CODEX_v2.0_DISENO.md` | Especificación de implementación: tokens, componentes, estados, pantalla por pantalla, responsive y criterios de aceptación. | Es el prompt de la sesión. |

## Cómo pasárselo a Codex

1. Copia esta carpeta dentro del repo, en `design/`, y haz commit. Así Codex la tiene en el árbol de archivos y puede abrirla cuando la necesite.
2. Abre la sesión con el contenido de `FIS_PROMPT-CODEX_v2.0_DISENO.md` como prompt.
3. Añade una línea al principio del prompt:

   > La verdad visual está en `design/prototipo-intervent-preclaim.html`. Ábrelo y léelo antes de tocar nada. Es un archivo HTML autocontenido con las seis pantallas: extrae de ahí los valores exactos de color, tipografía, espaciado, radios, sombras y grillas, y el copy en español tal cual está. Las capturas en `design/capturas/` son referencia visual, no fuente de valores.

4. Si Codex tiene visión activada, adjunta además las capturas. Si no, no pasa nada: el HTML basta.

## Cómo leer el prototipo si eres un modelo

- El archivo declara un componente con dos partes: el marcado dentro de `<x-dc>` y una clase de lógica.
- **Todos los estilos son inline.** No hay hojas de estilo ni clases: cada valor está escrito en el atributo `style` del elemento. Eso lo hace directamente traducible a clases de Tailwind.
- Los valores que dependen de datos (colores de semáforo, porcentajes de barra) se calculan en la clase de lógica y llegan al marcado como variables. Los métodos `tone()`, `estadoTone()` y `pres()` contienen el mapeo completo de estado a color.
- El seed de datos del prototipo es copia literal del de `src/store/useDemoStore.ts`. No es un dato nuevo que haya que replicar: ya está en el repo.

## Recorrido sugerido del prototipo

1. **Dashboard** como Handler. Cambia el selector de rol a Gerente para ver el portafolio completo y cómo cambian métricas, alertas y la acción principal.
2. **Casos** → abre `PRE-FIS-MSC-2025-07-4042`. Es el caso con cálculo guardado: en la pestaña Cálculo se ven los cuatro estados visuales de los tres métodos y el monto final.
3. **Ficha** → pestaña Documentos: arrastra archivos reales al selector para ver la clasificación automática por nombre y el checklist actualizándose.
4. **Ficha** → pestaña Cartas: la plantilla pre-llenada, con `[PENDIENTE COMPLETAR]` en los campos sin dato.
5. Con rol Gerente, entra a cualquier ficha para ver el bloque de reversión con motivo obligatorio.
6. **Sistema de diseño**, al pie de cualquier pantalla: tokens, componentes, los siete estados y el dashboard móvil.
