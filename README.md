# G2 — Frontend de Despacho y Entrega a Domicilio

Monorepositorio con dos aplicaciones React, TypeScript, Vite y Mantine. Administración gestiona distritos, zonas, programación, incidencias y flota. La PWA del repartidor permite consultar la ruta, registrar el resultado de las entregas y cerrar la jornada. Ambas consumen las APIs mediante el Gateway de Despacho.

## Arranque local

Requisitos: Node.js 20 o superior, npm 10 o superior y el [Compose del backend](https://github.com/Taller-SW-Web/G2-Despacho-Backend#arranque-local) para usar APIs locales.

Desde la raíz del frontend, instalar los paquetes y preparar la configuración de cada aplicación en PowerShell:

```powershell
npm ci
if (-not (Test-Path apps/despacho-administrativo/.env)) {
  Copy-Item apps/despacho-administrativo/.env.example apps/despacho-administrativo/.env
}
if (-not (Test-Path apps/despacho-repartidor/.env)) {
  Copy-Item apps/despacho-repartidor/.env.example apps/despacho-repartidor/.env
}
```

En terminales separadas, desde la raíz:

| Aplicación | Comando | Acceso |
|---|---|---|
| Administración | `npm run dev:administrativo` | [localhost:5173/acceso](http://localhost:5173/acceso) |
| Repartidor | `npm run dev:repartidor` | [localhost:5174/repartidor/acceso](http://localhost:5174/repartidor/acceso) |

Las plantillas de [Administración](./apps/despacho-administrativo/.env.example) y [Repartidor](./apps/despacho-repartidor/.env.example) apuntan al Gateway `http://localhost:8080`, usan Seguridad a través del Gateway (`VITE_SEGURIDAD_URL` vacío) y habilitan el buzón OTP local. Ajustar el origen si cambia el puerto del Gateway y reiniciar Vite. Las variables `VITE_*` se exponen al navegador; mantener las credenciales fuera de ellas.

## Acceso, MFA y sesión de ambas apps

- **Gestor local:** `gestor@despacho.pe` con clave ficticia `Ruta2026!`. En `/acceso`, solicitar el código MFA y usar el que muestra el buzón simulado. El proxy de Vite usa Seguridad temporal en `127.0.0.1:8090`.
- **Repartidor local:** `gerardo@despacho.pe` o `kevin@despacho.pe`, con la misma clave ficticia. El gestor debe vincular la cuenta a un perfil activo y abrir una jornada antes de asignarle despachos. Entrega y fallo con foto requieren Storage en Operación.
- **Herramientas de desarrollo:** `/desarrollo/f01` conserva el probador de cobertura y el generador de sesión temporal. Para recorrer la PWA sin backend, usar `VITE_MODO_DEMO=true` y el usuario de demostración `repartidor.prueba` con la clave ficticia anterior. La demo guarda sus datos en memoria.

El acceso habitual mantiene la sesión en memoria y pide volver a ingresar al recargar. Para una integración con G7 se deshabilita el buzón temporal con `VITE_SEGURIDAD_LOCAL=false`. Los requisitos del acceso humano se mantienen en el [contrato de integración](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/main/integraciones/api-contract.md#86-acceso-humano-de-ambas-aplicaciones).

## Pruebas y construcción

```powershell
npm test
npm run test:f01
npm run test:administrativo
npm run test -w @despacho/repartidor
npm run typecheck
npm run build
```

Las suites unitarias usan datos y APIs simulados. Los recorridos Playwright tienen requisitos distintos; F-01 escribe en las APIs configuradas y F-04 requiere instancias desechables de Gestión. Consultar la [guía de pruebas y despliegue](./docs/pruebas-y-despliegue.md) antes de ejecutarlos.

`test:f01` incluye zonas y distritos. El botón **Distritos** está en el encabezado de **Zonas y tarifas**, junto a **Actualizar** y **Nueva zona**. Abre `/distritos`, con formulario a la izquierda y listado a la derecha; en móvil se apilan y la tabla tiene desplazamiento horizontal interno. Crear, editar, desactivar y reactivar mantienen abierta la administración y conservan sus filtros. **Volver a zonas** restaura nombre, distrito, estado y página de la consulta original y renueva el catálogo distrital. `/distritos/nuevo` y `/distritos/:id/editar` abren la misma pantalla en alta o edición. Las tres rutas mantienen Zonas y tarifas como sección activa, sin otra entrada en el menú lateral. Los borradores requieren descarte explícito, los conflictos conservan valores y **Actualizar distritos** renueva solo el listado. El formulario de zonas conserva y señala sus distritos asociados inactivos, manteniendo la cobertura exclusivamente postal.

Para `npm run test:distritos:e2e`, preparar primero el [Compose desechable de distritos del backend](https://github.com/Taller-SW-Web/G2-Despacho-Backend/blob/develop/docs/pruebas.md#administración-de-distritos-navegador-y-gateway-aislados). Playwright inicia su Vite en `127.0.0.1:4187` y usa Gateway/Seguridad temporal en `18080/18090`, con JWT y Productos simulados. Requiere una base nueva de ese entorno para cada ejecución. Capturas de escritorio y móvil en `test-results/distritos/`; no representan aceptación humana ni integración con G6/G7 publicados.

## Pipeline CI/CD

El [workflow](./.github/workflows/ci.yaml) prueba y construye ambas apps. En `main`, Vercel puede promoverlas a producción con el check `CI frontend verde` cuando Deployment Checks está configurado. El workflow verifica las URLs publicadas. Los pasos para configurar Vercel, CORS y las variables están en la [guía de despliegue](./docs/pruebas-y-despliegue.md#despliegue-en-vercel).

## Guías y contribuciones

- [Pruebas locales de F-01](./docs/F-01-PruebasLocales.md) y [programación F-02](./docs/F-02-ProgramacionAsignacion.md).
- [Consulta de incidencias F-04](./docs/ES-F04-01-ConsultarEntregasFallidas.md) y [recepción en centro](./docs/ES-F04-03-ConfirmarRecepcionPaquete.md).
- [Catálogos de flota F-05](./docs/F-05-GestionRepartidoresFurgonetas.md) y [jornadas F-06](./docs/F-06-JornadasMonitoreo.md).
- [Especificaciones y contratos](https://github.com/Taller-SW-Web/G2-Despacho-Specs), [reglas de trabajo](./AGENTS.md) e [historial de entregas](./CHANGELOG.md).
