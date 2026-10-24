# G2 — Frontend de Despacho y Entrega a Domicilio

Monorepositorio con dos aplicaciones React 19.2, TypeScript y Vite, una administrativa y otra para el repartidor. Comparten Mantine 9.6.2, tema, componentes, tipos y cliente HTTP. Las APIs se consumen mediante el Gateway de Despacho.

Esta rama documenta la primera línea base `v0.1.0` de la semana 1: código de `main` en `5384180` (17/10/2026), con documentación raíz preparada el 24/10/2026. El alcance y sus límites están en [CHANGELOG.md](./CHANGELOG.md); las instrucciones para colaborar, en [AGENTS.md](./AGENTS.md). Los avances posteriores de `develop` o de ramas de trabajo se incorporan en una entrega posterior.

## Requisitos y servicios

- Node.js 20 o superior, npm 10 o superior y Git. Instalar las dependencias desde la raíz para resolver los workspaces.
- Para usar las pantallas administrativas con datos reales: Gateway y servicios de Gestión/Operación disponibles, JWT con el perfil correspondiente y CORS habilitado para el origen del frontend.
- El [backend en develop](https://github.com/Taller-SW-Web/G2-Despacho-Backend/blob/develop/README.md) documenta su entorno local, bases y emisor temporal. El frontend no levanta servicios ni migra bases de datos.

| Aplicación o servicio | Dirección local habitual | Uso |
|---|---|---|
| Administración | `http://localhost:5173` | Zonas, programación, incidencias, flota y jornadas. |
| Repartidor | `http://localhost:5174` | Experiencia de prueba F-03 en desarrollo. |
| Gateway | `http://localhost:8080` | Entrada pública de las APIs bajo `/api/v1`. |
| Seguridad temporal | `http://127.0.0.1:8090` | Emisión de tokens de prueba mediante el proxy del Vite administrativo. |

La interfaz puede arrancar sin backend; las consultas administrativas requieren sus APIs y mostrarán errores o falta de autorización si no están disponibles. La demo F-03 en desarrollo usa datos en memoria.

## Instalación y configuración

Clonar este repositorio, entrar a `G2-Despacho-Frontend` y ejecutar:

```powershell
npm ci
if (-not (Test-Path apps/despacho-administrativo/.env)) {
  Copy-Item apps/despacho-administrativo/.env.example apps/despacho-administrativo/.env
}
if (-not (Test-Path apps/despacho-repartidor/.env)) {
  Copy-Item apps/despacho-repartidor/.env.example apps/despacho-repartidor/.env
}
```

Editar cada `.env` según su [plantilla administrativa](./apps/despacho-administrativo/.env.example) o [plantilla del repartidor](./apps/despacho-repartidor/.env.example):

| Variable | Valor local | Comportamiento |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8080` | Origen público del Gateway, sin `/api/v1` al final; los adaptadores incluyen ese prefijo. |
| `VITE_DEMO_SIN_AUTENTICACION` | `false` | El proveedor administrativo omite el token si vale `true`; no crea APIs ni desactiva la autorización del backend. La demo F-03 se selecciona por el modo de desarrollo, independientemente de esta variable. |
| `VITE_DEV_TOKEN` | Vacío en la plantilla administrativa | JWT humano de prueba opcional, leído solo en desarrollo si no hay sesión guardada ni cierre de sesión. |

Las variables `VITE_*` son públicas y se incluyen en el código del navegador. Mantener `.env` fuera de Git; no colocar contraseñas, claves de servicio ni tokens de producción en estas variables. Reiniciar Vite tras modificar la configuración. La URL del Gateway se fija al construir el frontend.

## Arranque y sesión local

En una terminal desde la raíz:

```powershell
npm run dev:administrativo
```

En otra terminal, si se necesita la aplicación del repartidor:

```powershell
npm run dev:repartidor
```

`Ctrl+C` detiene cada servidor. Administración exige el puerto 5173 libre; repartidor solicita 5174 y Vite puede elegir otro si está ocupado. Revisar la dirección que imprime la terminal.

### Administración con APIs locales

1. Iniciar el entorno backend siguiendo su README y comprobar Gateway en 8080 y Seguridad temporal en 8090.
2. Abrir `http://localhost:5173/desarrollo/f01`, seleccionar **Gestor de Despacho** y pulsar **Generar sesión de prueba**.
3. Abrir **Zonas y tarifas** o navegar a las otras funcionalidades administrativas. Renovar la sesión desde el probador cuando venza.

La sesión provisional guarda el JWT en `localStorage` con la clave `despacho.token`; no sustituye el inicio de sesión definitivo de Seguridad y Usuarios. Conservar el mismo origen (`localhost` y puerto): `127.0.0.1` utiliza otro almacenamiento del navegador. Cerrar sesión retira el token y evita reutilizar el token de desarrollo hasta preparar otra sesión.

El probador `/desarrollo/f01` y su proxy al emisor temporal existen solo en desarrollo, no en preview ni producción. Permiten además probar cobertura/cotización con una identidad técnica de prueba independiente; las pantallas administrativas utilizan la identidad humana.

### Experiencia de prueba del repartidor

En desarrollo, abrir `http://localhost:5174` e ingresar con el usuario ficticio `repartidor.prueba` y la contraseña de demostración `Ruta2026!`. Son valores incluidos en el código de la demo, no cuentas reales de Seguridad.

La experiencia permite recorrer ruta, detalle, traslado, entrega/fallo con evidencia y cierre de jornada mediante estado en memoria. Recargar reinicia los datos; las acciones no se guardan en el backend ni aparecen en Administración. En la construcción de producción se utiliza otra composición: consulta de ruta, detalle y resumen por API; entrega, fallo, carga de evidencia y cierre siguen pendientes de integración real.

## Pantallas incluidas en la línea base

| Funcionalidad | Rutas principales | Alcance y límites de `v0.1.0` |
|---|---|---|
| F-01: zonas y tarifas | `/zonas`, `/zonas/nueva`, `/zonas/:id/editar`, `/zonas/:id/tarifas` | Catálogo, creación, edición, estado, distritos/códigos postales y tarifas; cobertura/cotización en el probador de desarrollo. |
| F-02: programación | `/programacion` | Cola, filtros, indicadores, generación de pedidos de prueba y asignación; rutas/reasignación pendientes. Las simulaciones administrativas pueden persistir en el backend. |
| F-03: repartidor | `/repartidor/ruta`, `/repartidor/despachos/:id`, `/repartidor/resumen`, `/repartidor/cierre` | Demo en memoria en desarrollo; consultas por API y operaciones aún pendientes en producción, como se detalla arriba. |
| F-04: entregas fallidas | `/entregas-fallidas`, `/entregas-fallidas/:idDespacho` | Listado, filtros, indicadores, detalle, historial, comunicaciones y visor de evidencia. Formularios de recepción, reprogramación y cierre no integrados en esta línea base. |
| F-05: repartidores y vehículos | `/repartidores`, `/furgonetas` | Catálogos, formularios, cambios de estado y vinculación de cuenta. `/flota` redirige al catálogo de repartidores. |
| F-06: jornadas y monitoreo | `/jornadas` | Apertura, cierre, detalle, indicadores y ocupación; `/monitoreo` redirige a esta pantalla. |

Las fotografías reales requieren el servicio de evidencias/Storage de Operación. La existencia de una pantalla o demo no acredita la aceptación conjunta con Seguridad, Ventas, Productos y los servicios de Despacho. Los resultados y pendientes de cada comportamiento se mantienen en Specs.

## Pruebas y construcción

Desde la raíz, las comprobaciones locales sin servicios reales son:

```powershell
npm test
npm run test:administrativo
npm run typecheck
npm run build
```

| Comando | Alcance |
|---|---|
| `npm test` / `npm run test:watch` | Pruebas del paquete de componentes compartidos, una ejecución o modo interactivo. |
| `npm run test:administrativo` | Toda la suite de la aplicación administrativa. |
| `npm run test:f01`, `test:f02`, `test:f04`, `test:f05`, `test:f06` | Subconjuntos por funcionalidad; F-04 incluye sesión. |
| `npm run typecheck` | Tipos del paquete compartido y ambas aplicaciones, incluidas sus pruebas donde están configuradas. |
| `npm run build` | Comprueba tipos y construye ambas aplicaciones en sus respectivos `dist/`. |

Las suites Vitest usan Testing Library/JSDOM y APIs simuladas. No comprueban layout real ni autorización de servicios desplegados. La app del repartidor no tiene un script de pruebas propio en esta línea base; sus tipos y compilación están incluidos en los comandos generales.

Las pruebas de navegador disponibles son:

```powershell
npx playwright install chromium
npm run test:f02:e2e
npm run test:f01:e2e
```

F-02 intercepta las APIs con fixtures y utiliza un servidor exclusivo en `127.0.0.1:4182`. F-01 utiliza el Gateway de `localhost:8080`, el emisor temporal y persistencia real; crea/modifica datos de zonas y tarifas. Antes de ejecutarla, comprobar que los servicios apuntan a un entorno de prueba aislado y autorizado; el script heredado no prepara ni aísla la base por sí mismo. No forma parte de las comprobaciones sin servicios.

Los informes de navegador se generan en `test-results/` según el resultado. Esta rama no incorpora un workflow de CI; los comandos anteriores son manuales. Registrar resultados reales en la evidencia correspondiente, diferenciando datos simulados, pruebas con persistencia e integración conjunta.

## Estructura y componentes

```text
G2-Despacho-Frontend/
├── apps/
│   ├── despacho-administrativo/   # F-01, F-02, F-04, F-05 y F-06
│   └── despacho-repartidor/       # F-03
├── packages/
│   ├── cliente-api/              # Axios, JWT y lectura de errores
│   ├── componentes-compartidos/ # Tema, tokens y componentes React
│   └── tipos-compartidos/        # Tipos transversales
├── docs/                        # Guías técnicas y evidencia histórica
├── pruebas/                     # Recorridos Playwright F-01/F-02
├── AGENTS.md
├── CHANGELOG.md
├── package.json
└── package-lock.json
```

Consumir los componentes desde `@despacho/componentes-compartidos`; las reglas de cada funcionalidad permanecen en su aplicación. El tema y los tokens compartidos concretan el sistema de diseño. Ejemplos locales como `/ejemplos/estado-vista.html`, `/ejemplos/componentes-rhamses.html` y `/ejemplos/controles-valqui.html` sirven para revisar controles con datos de prueba; no se incluyen como entradas de producción.

Las guías técnicas existentes conservan instrucciones y verificaciones específicas: [F-01](./docs/F-01-PruebasLocales.md), [F-02](./docs/F-02-ProgramacionAsignacion.md), [listado F-04](./docs/ES-F04-01-ConsultarEntregasFallidas.md), [F-05](./docs/F-05-GestionRepartidoresFurgonetas.md) y [F-06](./docs/F-06-JornadasMonitoreo.md). Son registros de sus incrementos, no prueba automática del estado de otra rama o de una entrega posterior.

## Preview y despliegue

Después de `npm run build`, se puede inspeccionar cada construcción con `npm run preview -w @despacho/administrativo` o `npm run preview -w @despacho/repartidor`. Revisar el puerto anunciado y permitir ese origen en el CORS del Gateway si se necesitan APIs. Preview usa la composición de producción: no ofrece el probador administrativo ni la demo en memoria F-03; necesita una sesión válida para consultar datos protegidos.

Para Vercel, crear un proyecto por aplicación. Usar su directorio como raíz (`apps/despacho-administrativo` o `apps/despacho-repartidor`), habilitar acceso a los archivos del monorepositorio para instalar workspaces, construir con `npm run build` en esa aplicación y publicar `dist`. Ambas conservan `vercel.json` con la reescritura SPA a `index.html`.

Configurar `VITE_API_BASE_URL` en cada proyecto antes de construir, usar HTTPS en el Gateway si el sitio es HTTPS y autorizar el origen publicado en CORS. Este repositorio no contiene una integración definitiva de inicio de sesión ni credenciales de despliegue.

## Especificaciones, contribuciones y versiones

La fuente de requisitos, contratos, diseño y seguimiento SDD es [G2-Despacho-Specs](https://github.com/Taller-SW-Web/G2-Despacho-Specs), normalmente disponible como `../G2-Despacho-Specs`:

- [Índice de funcionalidades y especificaciones](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/main/funcionalidades/funcionalidad.md).
- [Contrato de Gestión](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/main/integraciones/api-contract-gestion-despachos.md), [contrato de Operación](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/main/integraciones/api-contract-operacion-reparto.md) y [convenciones externas](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/main/integraciones/api-contract.md).
- [Sistema de diseño](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/main/disenio/SYSTEM-DESIGN.md), [componentes React](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/main/disenio/componentes-react.md) y [stack frontend](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/main/arquitectura/stack-frontend.md).
- [Reglas del repositorio de especificaciones](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/main/AGENTS.md) y [flujo de contribución](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/main/CONTRIBUTING.md).

El flujo habitual crea ramas descriptivas desde `develop`, integra por PR y promueve entregas de `develop` a `main`. Registrar cambios significativos en `Sin publicar` de [CHANGELOG.md](./CHANGELOG.md) y cerrar la sección con versión/fecha al preparar cada entrega. Revisar el corte aproximadamente cada dos semanas; no obliga a publicar sin cambios ni a adoptar Scrum.

Los tags se crean manualmente sobre el commit de `main` elegido para la entrega. Para esta primera línea base se recomienda el commit documental que incorpora este README, AGENTS y changelog: su código funcional sigue siendo el de `5384180`. El tag será `v0.1.0`; no se crea automáticamente ni requiere una GitHub Release. Evitar mover un tag ya publicado.

El README concentra ejecución/configuración y el changelog resume entregas. `spec.md`, `ui.md`, `plan.md`, `tasks.md` y `evidence.md` de Specs conservan requisitos y evidencia por especificación; no se exige crear otra guía por cada especificación en este repositorio.
