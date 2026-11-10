# Pruebas y despliegue del frontend

## Pruebas focalizadas

Desde la raíz del repositorio, `npm run test:f01`, `npm run test:f02`, `npm run test:f04`, `npm run test:f05` y `npm run test:f06` ejecutan las suites correspondientes. F-04 incluye regresiones de sesión. `npm run test:watch` ejecuta las pruebas de componentes en modo interactivo. Para comprobar el formato, usar `npm run format:check`; `npm run format` aplica Prettier.

## Pruebas en navegador

Instalar Chromium con `npx playwright install chromium` y ejecutar la suite desde la raíz.

| Comando | Entorno y alcance |
|---|---|
| `npm run test:f02:e2e` | Programación y rutas con APIs interceptadas, en el puerto 4182. |
| `npm run test:flota:e2e` | Catálogos, jornadas y cambio de sesión con APIs interceptadas, en el puerto 4186. |
| `npm run test:f01:e2e` | Usa Gateway y Seguridad local. Crea y modifica datos de zonas y tarifas; preparar un entorno de prueba aislado antes de ejecutarla. |
| `npm run test:f04:e2e` | Reprogramación con Gestión desechable en 18085 y proxy de prueba en 4184. |
| `npm run test:f04:cierre:e2e` | Cierre devuelto a origen con Gestión desechable en 18086 y proxy de prueba en 4185. Comprueba recuperación tras perder la respuesta, filtros y teclado. |

Para F-04, iniciar primero el [arranque de pruebas del backend](https://github.com/Taller-SW-Web/G2-Despacho-Backend#pruebas-y-contratos). Para usar Edge instalado, establecer `$env:PLAYWRIGHT_F04_CHANNEL = 'msedge'` en PowerShell. Los resultados de Playwright quedan en `test-results/`; registrar la revisión y el entorno en la evidencia correspondiente de [Specs](https://github.com/Taller-SW-Web/G2-Despacho-Specs/tree/main/especificaciones).

F-02 y flota completan el MFA del gestor con un doble HTTP. Los recorridos de F-04 usan identidades y bases de prueba. Cada informe debe distinguir APIs simuladas, persistencia real local e integración con los demás módulos.

## Despliegue en Vercel

Para revisar una compilación local, ejecutar `npm run build` y luego `npm run preview -w @despacho/administrativo` o `npm run preview -w @despacho/repartidor`. El preview usa la composición de producción; el probador administrativo, el buzón OTP local y la demo del repartidor pertenecen al servidor de desarrollo.

El [workflow](../.github/workflows/ci.yaml) usa Node.js 22 y `npm ci`. Ejecuta las suites de componentes, Administración y Repartidor, comprueba tipos y compilación y corre Playwright para F-02 y flota con APIs simuladas. Construye y conserva `dist-administrativo` y `dist-repartidor` como artefactos. F-01 y los recorridos F-04 que escriben mediante un backend quedan fuera de este workflow.

1. Configurar `VITE_API_BASE_URL` en cada proyecto de Vercel con el origen HTTPS del Gateway y autorizar los orígenes de ambas apps en CORS.
2. En ambos proyectos, mantener activo el despliegue automático de `main` y configurar **Deployment Checks** con el check de GitHub `CI frontend verde`. La protección de las ramas se configura por separado en GitHub.
3. En GitHub Actions, configurar las variables `URL_ADMINISTRATIVO` y `URL_REPARTIDOR` con los orígenes publicados. Opcionalmente, ajustar `VITE_API_BASE_URL` para los artefactos de Actions.

Tras la compuerta, el job `Verificar producción (Vercel)` comprueba que la raíz y una ruta profunda de cada aplicación sirven la SPA. La comprobación valida disponibilidad y reescritura de rutas.

### PWA en un teléfono

Vite expone la app del repartidor en la red local. Abrir `http://<IP-del-PC>:5174`, apuntar `VITE_API_BASE_URL` a un Gateway accesible desde el teléfono y autorizar ese origen en CORS. El Compose local enlaza el Gateway a `127.0.0.1` de forma predeterminada. Para probar instalación y service worker, usar una compilación de producción servida en HTTPS, como la de Vercel.
