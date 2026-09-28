# Auditoría UX/UI | Intervent Preclaim

Fecha: 28 de septiembre de 2026  
Alcance: demo funcional completo antes del rediseño UX/UI.

## Objetivo

Elevar la experiencia de Intervent Preclaim a un producto B2B SaaS premium, operativo y consistente, conservando rutas, permisos, estados, cálculos, extracción, historial, exportaciones, cartas y traspasos.

## Inventario auditado

| Área | Ruta | Observación principal |
| --- | --- | --- |
| Selección de perfil | `#/` | Acceso claro, pero con tratamiento visual cercano a una portada de marketing. |
| Dashboard | `#/dashboard` | Tiene buena cobertura funcional; requiere jerarquía más marcada entre riesgos, pendientes y métricas. |
| Casos | `#/casos` | Tabla útil, pero necesita mayor densidad operativa, acciones contextuales y filtros más visibles. |
| Nuevo caso | `#/casos/nuevo` | Flujo completo; necesita agrupación por contexto y mejor lectura del progreso documental. |
| Expediente | `#/casos/:id` | Concentra muchas acciones; requiere mejor separación entre estado, acciones y contenido. |
| Historial | `#/historial` | Memoria consolidada funcional; requiere lectura más eficiente para miles de registros. |
| Benchmark | `#/benchmark` | Comparación por handler implementada; debe priorizar excepciones y decisiones. |
| Mantenedores | `#/mantenedores` | Configuración funcional; necesita una experiencia de edición más controlada. |
| Manual | `#/manual` | Completo; puede mejorar su navegación interna y lectura rápida. |

## Hallazgos priorizados

### P1 | Alta prioridad

- El App Shell usa una navegación superior tipo píldora que no escala con el número de módulos.
- El dashboard distribuye demasiadas superficies con el mismo peso visual.
- El expediente concentra alertas, edición, avance y traspaso en el mismo bloque.
- Las pantallas de cálculo y mantenedores tienen alta densidad sin un patrón común de encabezado y acciones.
- No existe un `PageHeader` compartido para título, contexto, filtros y acciones.
- Los estados vacíos son principalmente texto plano y no siempre ofrecen el siguiente paso.
- No existe una capa común de Toast, Skeleton, Tooltip y feedback transitorio.
- Las tablas requieren una mejora de densidad, jerarquía de columnas, acciones y comportamiento responsive.

### P2 | Mejora importante

- El lenguaje visual actual depende demasiado de canvas azul claro, tarjetas blancas, radios altos y sombras suaves.
- Los estilos están repartidos en cinco hojas CSS y se mezclan utilidades Tailwind con CSS específico.
- Hay helpers compartidos, pero no un sistema explícito de primitives para botones, secciones, estados, tablas y filtros.
- Los archivos CSS más grandes están próximos al límite de 700 líneas.
- Formularios extensos necesitan agrupación por contexto y una lectura más escaneable.
- La navegación móvil se adapta por overflow, pero no ofrece una experiencia específica para acciones frecuentes.
- Se requiere una revisión formal de contraste, teclado, focus visible y semántica de tablas.

### P3 | Polish

- Unificar alturas de controles, radios, espaciados e iconografía.
- Refinar hover, focus, selected, disabled y loading.
- Ajustar copy de acciones para que describa el resultado real.
- Reducir decoración sin valor operativo.
- Alinear badges, metadatos y acciones secundarias.

## Riesgos que se deben controlar

- No cambiar las reglas de negocio ni las transiciones de estado.
- No reemplazar el selector de rol del demo por un mecanismo de seguridad real.
- No alterar fórmulas, documentos obligatorios, historial ni exportaciones.
- Mantener cada archivo de código por debajo de 700 líneas.
- Verificar desktop, laptop, tablet y mobile después de cada bloque de cambios.

## Quick wins aplicados en esta pasada

- App Shell con navegación lateral y contexto de sesión separado.
- Tokens visuales centralizados para color, tipografía, spacing, radios, elevación y motion.
- Patrón común de superficies, encabezados, controles y estados.
- Mejor jerarquía para acciones primarias y secundarias.
- Estados de foco más visibles y controles con dimensiones consistentes.

## Deuda posterior

- Tests automatizados de accesibilidad y regresión visual.
- Integración del sistema visual en un catálogo de componentes.
- Validación con usuarios operativos de FIS.
- Revisión de copy legal y textos de cartas con el cliente.
