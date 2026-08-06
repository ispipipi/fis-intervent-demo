# Intervent Preclaim Demo

Demo funcional completo para FIS / Intervent. Digitaliza el flujo Preclaim: alta de caso, ingesta de documentos, checklist, análisis de causa, cálculo de pérdida por 3 métodos, seguimiento, alertas de prescripción, cartas y dashboard de gerencia.

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- Zustand con persistencia en `localStorage`
- Fuse.js para clasificación fuzzy de documentos

SheetJS queda fuera de esta entrega porque el MVP no importa Excel todavía; se puede sumar cuando se construya ese módulo futuro.

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

Para revisar una versión estática, ejecuta `npm run build` y abre `dist/index.html`.

## Deploy GitHub Pages

El proyecto está configurado con assets relativos y navegación hash para funcionar bien en GitHub Pages.

1. Publicar el repositorio `ispipipi/fis-intervent-demo`.
2. Ejecutar `npm run build`.
3. Publicar la carpeta `dist` en GitHub Pages mediante GitHub Actions o configuración equivalente.

## Persistencia

La app usa `localStorage` con prefijo `fis-intervent-demo:`. Los documentos cargados guardan solo metadata: nombre, tipo, fecha y `pathMock`. No se guarda binario ni base64.

## Datos demo

Incluye casos ficticios/anonimizados para poder probar dashboard, alertas, documentos y cálculo desde el primer ingreso.
