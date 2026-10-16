# Frontend del módulo de Despacho

Monorepositorio con dos aplicaciones React, TypeScript y Vite. La aplicación administrativa cubre F-01, F-02, F-04 y F-05; la aplicación del repartidor cubre F-03. Ambas usan Mantine y se conectan al API Gateway definido en `../despacho-docs/integraciones/api-contract.md`.

## Requisitos

- Node.js 20 o superior y npm 10 o superior.
- API Gateway disponible para consumir datos reales. El backend actual solo contiene la inicialización de sus tres servicios; las pantallas de este repositorio son puntos de partida sin datos simulados.

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
  componentes-compartidos/ # Tema Mantine y tokens comunes
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

## Integración pendiente

La autenticación corresponde al módulo Seguridad y Usuarios. El frontend aún no inicia sesión ni protege rutas: faltan el flujo de acceso de ese módulo y los endpoints de negocio del backend. Al implementarlos, usar el JWT humano en `Authorization: Bearer`, conectar las páginas con el cliente de `packages/cliente-api` y consultar el contrato único en `../despacho-docs/integraciones/api-contract.md`. La variable `VITE_API_BASE_URL` es pública; no guardar secretos en variables `VITE_*`.

La guía de stack `arquitectura/stack-frontend.md` aún describe React 18 y Tailwind. Esta inicialización sigue la especificación de interfaz más concreta de `disenio/SYSTEM-DESIGN.md` §15: React 19.2, TypeScript y Mantine 9.6.2. La organización de dos apps sigue `arquitectura/c4-contenedores.md` §7.
