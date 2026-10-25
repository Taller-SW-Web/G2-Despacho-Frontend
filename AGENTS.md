# Instrucciones para trabajar en el frontend

## Especificaciones y contratos

- Antes de implementar, consultar la funcionalidad y la carpeta `especificaciones/ES-...` correspondientes en [G2-Despacho-Specs](https://github.com/Taller-SW-Web/G2-Despacho-Specs), junto con su [AGENTS.md](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/main/AGENTS.md) y [CONTRIBUTING.md](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/main/CONTRIBUTING.md). El checkout local habitual está en `../G2-Despacho-Specs`.
- Leer `spec.md`, `ui.md` cuando aplique, `plan.md`, `tasks.md` y `evidence.md`. Conservar sus identificadores y distinguir implementación local, APIs simuladas, integración real y aceptación humana.
- Respetar los contratos de [Gestión](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/main/integraciones/api-contract-gestion-despachos.md), [Operación](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/main/integraciones/api-contract-operacion-reparto.md) y las [convenciones externas](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/main/integraciones/api-contract.md). Los cambios contractuales se definen allí; no inventar rutas, payloads, permisos ni copias del contrato en el frontend.
- Consultar el [sistema de diseño](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/main/disenio/SYSTEM-DESIGN.md), los [componentes React](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/main/disenio/componentes-react.md) y el [stack frontend](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/main/arquitectura/stack-frontend.md). Mantener código, comentarios y documentación del equipo en español, respetando nombres propios de librerías y convenciones existentes.

## Alcance y componentes

- Mantener las dos aplicaciones y los paquetes npm existentes. Instalar desde la raíz con el lockfile; no reinicializar el proyecto ni agregar una biblioteca o sistema de estilos sin necesidad justificada.
- Reutilizar `@despacho/componentes-compartidos`, su tema y tokens, además del cliente API y tipos existentes. Mantener las reglas de negocio en las funcionalidades consumidoras; una composición exclusiva de pantalla puede ser local.
- Al modificar un componente compartido, comprobar sus consumidores y pruebas. Conservar estados de carga/error/permisos, etiquetas, teclado, foco y adaptación móvil; no presentar fixtures como datos reales.
- Respetar el alcance autorizado. Trabajar en el frontend no autoriza modificar servicios backend, sus bases, contratos o funcionalidades de otros responsables. Registrar y coordinar las dependencias externas.

## Ramas y comprobaciones

- El flujo habitual parte de `develop`, usa nombres descriptivos sin `codex/` e integra mediante PR a `develop`; las entregas se promueven por PR a `main`. Seguir las instrucciones explícitas del usuario para excepciones de alcance, rama o publicación.
- Para cambios de código, ejecutar las pruebas apropiadas de la aplicación o paquete afectado, `npm run typecheck` y `npm run build`; consultar [README.md](./README.md) para los scripts y sus requisitos. Ajustar pruebas cuando cambie un comportamiento; no deshabilitarlas ni debilitar aserciones para ocultar fallos.
- `npm test` cubre componentes compartidos; `npm run test:administrativo`, la aplicación administrativa. Los scripts `test:f01`, `test:f02`, `test:f04`, `test:f05` y `test:f06` permiten comprobaciones focalizadas. La app del repartidor dispone de su suite propia mediante `npm run test -w @despacho/repartidor` desde la integración de F-03 posterior a la línea base.
- JSDOM y APIs simuladas no acreditan layout, accesibilidad manual ni servicios reales. Verificar en navegador los cambios visuales/interactivos cuando corresponda y registrar los límites.
- Las pruebas E2E F-01 escriben mediante APIs reales y no aíslan su base automáticamente. Comprobar un entorno de prueba autorizado antes de ejecutarlas; no apuntar pruebas a bases compartidas o de producción. F-02 E2E utiliza APIs simuladas.
- Para cambios exclusivamente documentales, comprobar enlaces, comandos, trazabilidad y `git diff --check`; no atribuirles una ejecución nueva de las pruebas de código. Respetar las restricciones de ejecución y comunicar los resultados reales.

## Configuración y datos

- Las aplicaciones consumen APIs a través del Gateway; no acceden a tablas de microservicios. El backend conserva la autoridad de permisos y reglas de negocio.
- Mantener `.env`, JWT reales y secretos fuera de Git y de capturas/reportes. Las variables `VITE_*` son públicas; `VITE_DEV_TOKEN` se limita a identidades de prueba para desarrollo.
- Conservar la separación entre demos y composición de producción. La demo F-03 es estado en memoria; no equivale a una entrega o incidencia persistida en Operación/Gestión.

## Documentación y entregas

- El [README](./README.md) concentra arranque, configuración, pruebas y despliegue; actualizarlo cuando cambien esas instrucciones.
- Actualizar [CHANGELOG.md](./CHANGELOG.md) únicamente al preparar y publicar una nueva línea base en `main`; no añadir entradas por especificación ni durante el desarrollo de ramas funcionales. En ese corte se consolidan los cambios de la entrega con versión y fecha, sin mezclarlos con la línea base `v0.1.0`.
- Mantener el seguimiento por especificación en Specs: plan, tareas y evidencia con commits, resultados, simulaciones y pendientes. No crear automáticamente otro documento por especificación en frontend; conservar guías locales solo si aportan instrucciones técnicas distintas y enlazarlas desde la evidencia canónica.
- Usar Conventional Commits en español. Los tags se crean manualmente sobre el commit de `main` elegido para una entrega; no crear/mover tags, publicar una Release ni dar por realizada una aprobación a partir de una actualización documental.
