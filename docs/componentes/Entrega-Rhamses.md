# Entrega de componentes compartidos de Rhamses

**Fecha:** 16/10/2026, America/Bogota. **Responsable:** Rhamses.
**Base revisada:** Specs `91db8f8`; frontend `10d2e9e`. Implementación registrada en los commits de §5. Destinos de publicación autorizados: frontend `origin/develop` y documentación `origin/main`, sin PR.

## 1. Asignación y alcance

Según `despacho-docs/disenio/componentes-react.md` §4.5, Rhamses mantiene F-05 y DevOps y asume estos tres componentes compartidos [cite: 1]:

| Componente | Entrega | Evidencia y criterios |
|---|---|---|
| CR-03 ShellAdministrativo | Completar estructura administrativa, navegación controlada, usuario, marca, menú móvil y cierre de sesión. | [CR-03](./CR-03-ShellAdministrativo.md), CCR-03-01/02, TCR-03. |
| CR-09 BadgeEstado | Completar los ocho contextos, traducción centralizada de etiquetas/iconos/variantes y fallback desconocido. | [CR-09](./CR-09-BadgeEstado.md), CCR-09-01/02, TCR-02. |
| CR-15 NotificacionOperacion | Adaptar el proveedor Mantine existente, persistencia, actualización por id y acciones. | [CR-15](./CR-15-NotificacionOperacion.md), CCR-15-01, TCR-02. |

También corresponde a Rhamses conciliar el stack y verificar dependencias, scripts y pruebas con Max (§4.5.1). Se actualizó `despacho-docs/arquitectura/stack-frontend.md` para reflejar React 19.2, Mantine 9.6.2 y las herramientas realmente declaradas. Se reutilizan los workspaces y el lockfile existentes. Tema, tokens y fuentes completos continúan bajo responsabilidad de Max, con apoyo de Rhamses.

Max revisa estos componentes; Gerardo revisa los estados de recepción y resultados de F-04. Coordinar evidencia/almacenamiento con Max y acceso autorizado con Gerardo también forma parte del reparto, pero no implica implementar sus componentes CR-17/18 ni mover HTTP al paquete visual.

## 2. Cambios y compatibilidad

Los componentes se exportan desde `@despacho/componentes-compartidos`, manteniendo `tema` y las exportaciones anteriores. Se utilizan controles Mantine, CSS Modules y tokens existentes. Los breakpoints del tema se alinean con los definidos en Specs; esto afecta a ambas aplicaciones y requiere revisión visual conjunta.

La aplicación administrativa consume el contrato ampliado del shell. No dispone todavía de identidad confirmada ni logo autorizado; utiliza textos provisionales explícitos. Al cerrar sesión se bloquea la recuperación automática del token de desarrollo hasta guardar una nueva sesión explícita. Ese comportamiento cuenta con una prueba de regresión.

El ejemplo de desarrollo utiliza el Vite administrativo existente, sin crear otra aplicación ni entrada de producción. Después de `npm run dev:administrativo`, abrir [componentes de Rhamses](http://localhost:5173/ejemplos/componentes-rhamses.html). Muestra datos simulados, navegación, estados en superficies clara/ink y notificaciones.

## 3. Verificación reproducible

Entorno: Windows, Node.js 22.16.0, npm 10.9.2. Se restauraron 236 paquetes mediante `npm ci --ignore-scripts --no-audit --no-fund`, sin modificar manifiestos ni lockfile. La primera instalación del entorno restringido falló con EPERM; la restauración autorizada terminó correctamente. No se ejecutaron scripts de instalación.

```bash
npm test
npm run test:f04
npm run typecheck
npm run build
git diff --check
```

| Comando | Resultado real |
|---|---|
| `npm test` | 147 pruebas aprobadas, 7 archivos: BadgeEstado 54, ShellAdministrativo 3, NotificacionOperacion 4 y las 86 pruebas existentes de EstadoVista, ModalConfirmacion, VisorEvidencia e HistorialEstados. |
| `npm run test:f04` | 8 pruebas aprobadas: 7 de la pantalla F-04 y 1 de cierre de sesión. |
| `npm run typecheck` | Aprobado para paquete compartido, sus pruebas, ejemplo y ambas aplicaciones. |
| `npm run build` | Aprobado para ambas aplicaciones. Vite advierte de un chunk administrativo de 870,92 kB (267,93 kB gzip); el repartidor genera 371,98 kB (116,75 kB gzip). No bloquea la construcción; la división de bundles queda fuera de este incremento. |
| `git diff --check` | Aprobado en frontend y documentación; Git avisa únicamente de normalización LF/CRLF en la guía de stack. |

La prueba inicial del temporizador necesitó esperar la salida de la notificación del DOM después de los 4000 ms: se corrigió el uso de temporizadores simulados, se verificó primero la retirada del store y después la transición visual; la suite completa posterior pasó. Las pruebas de interacción usan JSDOM y los controles/proveedor reales de Mantine; las rutas, identidad y resultados de negocio son simulados.

Una construcción intermedia coincidió con la escritura del archivo del badge y leyó contenido incompleto. Se repitió la construcción completa después de finalizar los cambios de código y terminó con éxito en ambas aplicaciones. El intento de comprobar el ejemplo por HTTP local no conectó desde el entorno de herramientas; no cuenta como evidencia de ejecución en navegador.

## 4. Límites y pendientes de aceptación

- Revisión visual responsive, capturas, contraste medido y revisión de Max: pendientes. El navegador integrado agotó el tiempo de conexión. El control nativo de navegador se detuvo por no poder determinar con confianza la URL actual; no se continuaron acciones de interfaz.
- Identidad y destinos autorizados del proveedor definitivo de Seguridad y Usuarios y logo inverso autorizado: pendientes de integración del consumidor. La sesión temporal no acredita autenticación completa.
- Los componentes no llaman APIs, confirman comandos ni entregan notificaciones a Ventas; la integración real corresponde a cada funcionalidad.
- No se modifican los estados de tareas SDD de los consumidores ni se los declara completos por estas pruebas aisladas. No se acredita auditoría WCAG o prueba con lector de pantalla.
- Revisión humana: pendiente. Kevin Rhamses solicita entrega directa en frontend `develop` y documentación `main`, en lugar de abrir PR.

## 5. Referencias

| Repositorio y rama | Commit | Contenido |
|---|---|---|
| G2-Despacho-Frontend, develop | `0bed9c8` | CR-09: estados, API pública, pruebas y documentación. |
| G2-Despacho-Frontend, develop | `b64778e` | CR-03: shell, integración y cierre de sesión con pruebas. |
| G2-Despacho-Frontend, develop | `9d01d59` | CR-15: adaptador de notificaciones con pruebas. |
| despacho-docs, main | `f3849d9` | Conciliación del stack frontend. |

Autor y committer confirmados por Kevin Rhamses: `KevinBohorquez <kevinbohorquez0211@gmail.com>`. Antes de los commits se ejecutaron `git fetch origin --prune` y `git pull --ff-only origin develop/main`, respectivamente: ambas bases estaban al día y sin conflictos. El ejemplo y esta evidencia se entregan en un commit documental separado del código.

- [cite: 1] Specs local `91db8f8`, `disenio/componentes-react.md` §§1.3–1.5, CR-03/09/15, §§4.2, 4.5 y 4.6. `disenio/SYSTEM-DESIGN.md` §§6, 11.7, 12.7, 15, 16, 17 y 18.
- [cite: 2] [README frontend](../../README.md), los tres registros de evidencia anteriores y pruebas junto a los componentes.
