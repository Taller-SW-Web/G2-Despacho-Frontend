# Implementación y evidencia de CR-08 EstadoVista

**Fecha:** 16/10/2026, America/Lima.

**Responsable:** Gerardo. Implementación asistida por Codex.

**Rama:** `feature/f04-estado-vista`, sobre frontend `d2bc27d0167fa20b4ee6608f388d4d1010c11e13`.

**Estado:** Implementación y verificación aislada realizadas. Base de pruebas en `3b522a8`; código y pruebas de CR-08 en `957e4e2603b64ebca51c6c6a82317d82604648df`. Revisión humana de Max, PR de entrega e integración consumidora pendientes.

## 1. Entradas del incremento

Repositorio de especificaciones en `dd614bdfeb439ded41c74b73b5d59d9c1724f5fb`:

- [ECR-01, CR-08 y CCR-08-01](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/dd614bdfeb439ded41c74b73b5d59d9c1724f5fb/disenio/componentes-react.md#cr-08-estadovista): propiedades, estados, eventos, accesibilidad, reparto y ubicación del componente. Aplican también las reglas transversales y el patrón CR-01 para la acción de recuperación [cite: 1].
- [Sistema de diseño](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/dd614bdfeb439ded41c74b73b5d59d9c1724f5fb/disenio/SYSTEM-DESIGN.md): §§12.7, 13.4, 13.12 y 17; estados visuales, tipografía, tokens, foco y movimiento reducido [cite: 2].
- [Tareas de ES-F04-01](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/dd614bdfeb439ded41c74b73b5d59d9c1724f5fb/especificaciones/ES-F04-01-ConsultarEntregasFallidas/tasks.md): soporte para T-01 y componente de T-02. La composición de la página pertenece a T-04 y la integración real a T-08 [cite: 3].

La instrucción de Gerardo fue implementar el primer componente en la rama propuesta y preparar lo necesario para verificarlo. Se conservan identificadores y contratos; no se modifican requisitos ni se generan resultados de servicios simulados como evidencia real.

## 2. Preparación e implementación

- Se reutilizan los workspaces, Vite, Mantine, tema, fuentes y tokens existentes. Se configura la escala de espaciados del diseño en el tema común, preservando su exportación `tema`.
- Se añaden Vitest, Testing Library, JSDOM y scripts de pruebas. El paquete compartido declara sus dependencias directas y su propio chequeo TypeScript. No se cambian las versiones de dependencias previamente fijadas en el lockfile.
- [EstadoVista.tsx](../../packages/componentes-compartidos/src/feedback/EstadoVista.tsx) implementa las siete variantes, contenido solo en `datos`, skeleton recibido del consumidor y recuperación mediante `alAccionar(id)`.
- [tipos-ui.ts](../../packages/componentes-compartidos/src/tipos-ui.ts) contiene los modelos de presentación `EstadoConsulta` y `AccionUi`. No son DTO de transporte.
- La acción usa un botón nativo de Mantine con `type="button"`, bloqueo por `disabled`/`loading`, motivo asociado y etiqueta visible durante la operación. Si falta `alAccionar`, el botón permanece deshabilitado. El consumidor controla el bloqueo sincrónico de su operación.
- [EstadoVista.module.css](../../packages/componentes-compartidos/src/feedback/EstadoVista.module.css) adapta los tokens, H4 en Inter, foco signal, área táctil de al menos 44 px y reglas para retirar animaciones de skeleton/loader con `prefers-reduced-motion`.
- [Ejemplo de desarrollo](../../apps/despacho-administrativo/ejemplos/estado-vista.tsx) sirve para comprobar estados con fixtures. Usa el servidor de la app administrativa y no modifica sus rutas de producción.

No hay HTTP, lectura de tokens ni decisiones de autorización en el componente. Ante `sinPermiso`, el componente retira sus hijos; el consumidor debe envolver también los filtros del recurso. Los controles externos de selección de estado del ejemplo son herramientas de demostración, no filtros del recurso protegido.

## 3. Consumo

```tsx
import { EstadoVista } from '@despacho/componentes-compartidos';

<EstadoVista
  estado="error"
  titulo="No pudimos cargar las entregas fallidas"
  descripcion="Inténtalo nuevamente."
  accion={{ id: 'reintentar', etiqueta: 'Reintentar' }}
  alAccionar={() => consultarEntregasFallidas()}
/>
```

`consultarEntregasFallidas` representa el callback de la pantalla consumidora; no pertenece al paquete compartido. En `carga`, pasar `esqueleto` con la forma del contenido final; en `datos`, pasar `children`. Los tipos exigen estas entradas. `compacto` ajusta el espacio del bloque y se ignora para la denegación de acceso.

## 4. Evidencia automatizada

Entorno: Windows, Node.js 22.16.0, npm 10.9.2, React 19.3.0 fijado en el lockfile existente, Mantine 9.6.2, Vitest 3.2.7, Testing Library React 16.3.3 y JSDOM 26.1.0.

Comandos desde la raíz del frontend:

```bash
npm ci
npm test
npm run typecheck
npm run build
git diff --check
```

| Registro | Trazabilidad | Resultado observado |
|---|---|---|
| EVCR-08-01 | CR-08 → CCR-08-01 → TCR-02 / ES-F04-01 T-02 → [pruebas](../../packages/componentes-compartidos/src/feedback/EstadoVista.test.tsx) | 18 pruebas aprobadas: variantes, mensajes, recuperación con Enter/Espacio, transición carga/datos, retirada de filas/filtros, bloqueo, doble clic con consumidor controlado, ausencia de envío de formulario y anuncio estable. |
| EVCR-08-02 | Reglas transversales y compatibilidad con ambas aplicaciones | `npm run typecheck` y `npm run build` aprobados. La comprobación TypeScript incluye el ejemplo de desarrollo. |
| EVCR-08-03 | Higiene del cambio | `git diff --check` sin errores. |

Los archivos `pruebas.txt`, `typecheck.txt` y `build.txt` en [evidencia](../evidencia/cr-08/) conservan las salidas de la verificación final. JSDOM sustituye `matchMedia`; estas pruebas no validan layout ni autorización de un backend.

## 5. Evidencia visual e interacción

Revisión en navegador mediante el ejemplo, con el tema real y datos de prueba:

| Caso | Resultado | Captura |
|---|---|---|
| Error, escritorio 1440 × 1024 | H4 en Inter de 20 px, alert con fondo semántico, acción de 44 px y foco signal visible. Enter ejecuta la recuperación y muestra los datos de prueba. | [Error de consulta](../evidencia/cr-08/error-escritorio.png) |
| Acceso denegado tras mostrar datos, móvil 390 × 844 | Tabla y filtro del recurso retirados del DOM; textos completos; ancho de contenido igual al viewport, sin scroll horizontal. | [Sin permiso](../evidencia/cr-08/sin-permiso-movil.png) |
| Error con motivo de bloqueo extenso, móvil 390 × 844 | Motivo completo asociado a la acción deshabilitada, sin desbordamiento horizontal. Durante una operación, la etiqueta mantiene opacidad 1 y el botón está deshabilitado con `aria-busy`. | [Acción bloqueada](../evidencia/cr-08/error-bloqueado-movil.png) |
| Carga, móvil 390 × 844 | Región ocupada y cinco skeletons recibidos del consumidor; fondo `cloud-subtle` calculado como `rgb(237, 234, 226)`. | [Carga](../evidencia/cr-08/carga-movil.png) |
| Sin resultados, tableta 768 × 1024 | Mensaje y acción Limpiar filtros visibles; ancho de contenido 768 px, sin desbordamiento horizontal. | Recorrido observado; sin captura adicional. |

La preferencia de movimiento reducido del navegador estaba desactivada. Se revisó la regla CSS que anula las animaciones; no se ejecutó una emulación de esa preferencia. No se declara una auditoría completa WCAG ni una prueba con lector de pantalla.

## 6. Límites y entrega

- Este incremento verifica el componente aislado y la base de pruebas necesaria para él. No acredita todos los componentes, tokens, patrones de CR-01/02 ni la conciliación documental completa de DC-01.
- La consulta real, los permisos del servidor y los criterios CA/CUI de ES-F04-01 siguen pendientes de su integración. Su EV-02 puede enlazar esta evidencia compartida y añadir las pruebas de consumo cuando se prepare esa entrega.
- `spec.md`, `ui.md`, `plan.md`, `tasks.md` y `evidence.md` permanecen en el repositorio de especificaciones; este registro documenta el código y las comprobaciones del frontend.
- Código y pruebas guardados en `957e4e2603b64ebca51c6c6a82317d82604648df`; PR pendiente. Las referencias de código de este registro apuntan a los archivos de la rama. Revisión humana funcional y visual propuesta: Max. El uso de Codex no acredita esa revisión.

## 7. Referencias

1. ECR-01 de la revisión indicada en §1: CR-08, CCR-08-01 y §§1.3–1.5, 4.2, 4.5 y 4.6.
2. Sistema de diseño de la misma revisión: §§4–8, 12.7, 13.4, 13.12 y 17.
3. ES-F04-01 de la misma revisión: T-01/T-02 y registro previsto EV-02.
