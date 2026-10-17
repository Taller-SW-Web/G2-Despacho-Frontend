# Frontend del módulo de Despacho

Monorepositorio con dos aplicaciones React, TypeScript y Vite. La aplicación administrativa cubre F-01, F-02, F-04 y F-05; la aplicación del repartidor cubre F-03. Ambas usan Mantine y se conectan al API Gateway definido en `../despacho-docs/integraciones/api-contract.md`.

## Requisitos

- Node.js 20 o superior y npm 10 o superior.
- API Gateway disponible para consumir datos reales. El listado de entregas fallidas está conectado a la API de ES-F04-01; su [guía de ejecución y evidencia](./docs/ES-F04-01-ConsultarEntregasFallidas.md) describe la demo local. Las demás pantallas mantienen su alcance propio.

## Inicio local

Desde la raíz de `despacho-frontend`:

```bash
npm install
npm run dev:administrativo
npm run dev:repartidor
```

Las aplicaciones usan los puertos 5173 y 5174 respectivamente. Copiar `apps/despacho-administrativo/.env.example` y `apps/despacho-repartidor/.env.example` a `.env` dentro de cada aplicación y ajustar `VITE_API_BASE_URL` al origen público del Gateway, sin `/api/v1` al final.

```bash
npm run typecheck
npm run build
```

## Estructura

```text
apps/
  despacho-administrativo/  # Zonas, programación, entregas fallidas y flota
  despacho-repartidor/       # Ruta y operaciones de campo
packages/
  cliente-api/              # Cliente Axios y lectura de errores Problem Details
  componentes-compartidos/ # Tema, tokens y componentes React compartidos
  tipos-compartidos/        # Tipos transversales
```

Cada app tiene su propio comando de construcción y configuración de Vercel. Al configurar los proyectos, usar `apps/despacho-administrativo` y `apps/despacho-repartidor` como directorios raíz, con el repositorio completo disponible para instalar los workspaces de npm.

## Componentes compartidos y pruebas

Los componentes se importan desde `@despacho/componentes-compartidos`. CR-08 `EstadoVista` recibe el estado de consulta y las acciones del consumidor; solo muestra el contenido cuando el estado es `datos`. La pantalla debe colocar también los filtros protegidos dentro de ese contenido para retirarlos al perder permisos.

```bash
npm test
npm run test:watch
npm run typecheck
npm run build
```

Las pruebas del paquete compartido usan Vitest, Testing Library y JSDOM. `typecheck` comprueba ese paquete, sus pruebas y las dos aplicaciones. JSDOM simula el navegador y no comprueba layout ni autorización de servicios reales.

Para revisar los estados de CR-08, ejecutar `npm run dev:administrativo` y abrir [el ejemplo de desarrollo](http://localhost:5173/ejemplos/estado-vista.html). Utiliza la aplicación Vite existente y datos de prueba; su entrada HTML no se incluye en la construcción de producción. Permite revisar carga, datos, vacío, sin coincidencias, error, acceso denegado, recurso inexistente y acciones bloqueadas.

La [evidencia de CR-08](./docs/componentes/CR-08-EstadoVista.md) registra fuentes, comandos, capturas y límites de la verificación. La integración con la pantalla de F-04 se verifica en su propia tarea SDD.

Los componentes de Tarqui —CR-05 `EncabezadoPagina`, CR-06 `BarraFiltros`, CR-07 `TablaDatos` y CR-20 `TarjetaRepartidor`— están exportados desde el mismo paquete. Su [guía de consumo y evidencia](./docs/componentes/CR-05-06-07-20-Tarqui.md) incluye búsqueda con debounce, orden y paginación controlados, selección accesible y una fixture visual reproducible, además de las dependencias CR-09/11 necesarias para las tarjetas.

Los contratos, pruebas y dependencias están documentados en [CR-03 ShellAdministrativo](./docs/componentes/CR-03-ShellAdministrativo.md), [CR-09 BadgeEstado](./docs/componentes/CR-09-BadgeEstado.md) y [CR-15 NotificacionOperacion](./docs/componentes/CR-15-NotificacionOperacion.md). El [ejemplo de desarrollo](http://localhost:5173/ejemplos/componentes-rhamses.html) permite recorrer navegación, catálogo de estados y notificaciones con datos simulados. No se incluye en producción.

## Frontend de F-02: programación y asignación

`/programacion` integra la cola paginada, tres indicadores con filtros rápidos, filtros conservados en la URL, generación de despachos de prueba y modal de asignación. Reutiliza los componentes y colores del sistema de diseño, con adaptación a tableta y detalle de los campos ocultos. La asignación compara peso, volumen y paquetes con la capacidad remanente confirmada por Operación.

```bash
npm run test:f02
npm run test:f02:e2e
```

La [guía F-02 y su evidencia](./docs/F-02-ProgramacionAsignacion.md) incluye ejecución, capturas y dependencias de integración. Las pruebas usan APIs simuladas. Las barras de ocupación absoluta necesitan límites que la consulta pública aún no suministra; rutas y reasignación corresponden a ES-F02-05/06 y mantienen su pestaña identificada como pendiente.

## Detalle de incidencias de F-04

Desde `Ver detalle` en entregas fallidas se abre `/entregas-fallidas/:idDespacho`, conservando filtros, página y tamaño en la URL para regresar. La vista presenta la última incidencia, su recepción, historial completo, comunicaciones y decisiones permitidas por Gestión. Consulta de nuevo cada 30 segundos mientras está activa, bloquea las decisiones al actualizar o fallar y descarta respuestas de otro recurso.

La fotografía se solicita por separado a Operación y se presenta en el visor compartido. Al vencer, cerrar, cambiar de incidencia o perder autorización se retiran la imagen y la URL temporal. Los destinos de recepción, reprogramación y cierre quedan preparados en `DestinosDetalleIncidencia`, con identidad y versión; sus formularios pertenecen a ES-F04-03/04/05 y siguen pendientes. Se muestran como acciones aún no disponibles cuando no existe un destino integrado.

Las nueve pruebas nuevas utilizan fixtures y APIs simuladas; ejecutar `npm run test -w @despacho/administrativo -- src/features/entregas-fallidas/PaginaDetalleIncidencia.test.tsx`. `npm run test:f04` incluye también la regresión del listado y la sesión. La integración con servicios reales, teclado del visor y revisión visual en móvil siguen registradas en la [evidencia SDD](../G2-Despacho-Specs/especificaciones/ES-F04-02-ConsultarDetalleIncidencia/evidence.md).

## Frontend de F-05

Los catálogos administrativos de repartidores y furgonetas están disponibles en `/repartidores` y `/furgonetas`. Incluyen alta, edición, baja lógica, asociación de cuenta de Seguridad y cambios de estado, reutilizando los componentes compartidos. `/flota` redirige al catálogo de repartidores. El [registro técnico de F-05](./docs/F-05-GestionRepartidoresFurgonetas.md) detalla pruebas, diferencias entre especificaciones y las decisiones de transporte pendientes de ratificar antes de la integración real.

```bash
npm run test:f05
npm run test:administrativo
```


## Frontend y pruebas locales de F-01

Zonas y tarifas están integradas con el contrato vigente del backend: selección desde el catálogo real de distritos y códigos postales agrupados por distrito, creación, edición, filtros, activación/desactivación y configuración de tarifas.

Para probar desde el navegador, abrir [el probador local F-01](http://localhost:5173/desarrollo/f01), generar la sesión de gestor y pulsar **Abrir zonas y tarifas**. El probador permite además emitir un token técnico independiente y consultar cobertura o calcular cotizaciones. La herramienta está disponible únicamente durante el desarrollo.

La [guía F-01 de ejecución y evidencia](./docs/F-01-PruebasLocales.md) explica el arranque con Supabase, las nueve operaciones verificadas y las pruebas automatizadas.

```bash
npm run test:f01
npm run test:f01:e2e
```

El paquete compartido exporta `ShellRepartidor`, `TarjetaDespacho` y
`CapturaEvidencia`; la aplicación del repartidor integra el shell y el estado
bloqueado de captura. Las tarjetas se conectarán a la ruta cuando se integre el
endpoint. La carga de evidencias y las transiciones siguen pendientes de integrar
con la API de Operación. No habilitar la captura real hasta acordar la política
de archivos (formatos, tamaño y procesamiento); los componentes visuales no
realizan llamadas HTTP.


## Integración pendiente de autenticación

Los patrones **CR-01 AccionesUi**, **CR-02 CamposFormulario** y **CR-13 BarraAccionesFija**, asignados a Valqui, se documentan en la [guía de uso y evidencia](./docs/componentes/CR-01-02-13-ControlesValqui.md). El paquete exporta `accionesUi`, `accionesIconoUi`, `camposFormulario` y `BarraAccionesFija`. Para revisar controles, carga, bloqueos y reserva dinámica del pie, abrir [su ejemplo de desarrollo](http://localhost:5173/ejemplos/controles-valqui.html).

## Integración pendiente

La autenticación corresponde al módulo Seguridad y Usuarios. El proveedor provisional existente suministra un JWT humano al cliente API; ES-F04-01 retira contenido protegido ante `401/403`. El flujo de inicio de sesión del equipo permanece pendiente. La demo utiliza únicamente el emisor temporal documentado. La variable `VITE_API_BASE_URL` es pública; no guardar secretos en variables `VITE_*`.

La guía de stack `arquitectura/stack-frontend.md` del repositorio de documentación se concilió con la base existente: React 19.2, TypeScript y Mantine 9.6.2, siguiendo `disenio/SYSTEM-DESIGN.md` §15. La organización de dos apps sigue `arquitectura/c4-contenedores.md` §7.
