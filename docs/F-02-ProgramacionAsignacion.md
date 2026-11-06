# F-02: programación, simulación y asignación

**Fecha:** 17/10/2026.

**Rama:** `feature/f02-completar-frontend`, creada desde `develop`.

**Estado:** cola, simulación y asignación implementadas y verificadas con APIs simuladas. El incremento del 05/11/2026 añade barras de ocupación absoluta y proyección con el contrato F-06 vigente. Integración real y aceptación humana pendientes.

## 1. Alcance y fuentes

La aplicación administrativa sustituye el placeholder de `/programacion` por la composición de ES-F02-02, ES-F02-03 y ES-F02-04. ES-F02-01 es una integración de Ventas y no tiene formulario administrativo [cite: 1].

Se aplican el sistema de diseño vigente (§21), los `ui.md` de las tres atómicas y los contratos públicos de Gestión §3.2 y Operación §4.2. El sistema de diseño prevalece sobre las guías antiguas en caso de diferencia, conforme a DC-07 [cite: 2, 3].

El transporte de la cola se contrastó también con `ModelosProgramacion`, `ParametrosPendientes` y `ControladorProgramacion` del backend en `feature/f02-implementacion-specs`, revisión `797d209`. El adaptador respeta `paginaActual`, `idZona` y la fecha del servidor. Los esquemas Zod son validadores del cliente, no un contrato alternativo; el detalle pendiente de formalizar en el contrato canónico sigue identificado por DC-04 [cite: 3, 4].

## 2. Funcionalidad disponible

- **Cola:** filas de pendientes, carga física, intentos consumidos, marca de reintento independiente del contador, fecha programada y espera. El resumen permite consultar los campos ocultos en tableta, incluidos los despachos futuros.
- **Filtros:** rango de fechas civiles, zona, tipo de intento, tamaño 10/20/50/100 y paginación desde uno. Se conservan en la URL. Los cambios de filtros reinician la página; una página desaparecida se corrige sin fabricar registros.
- **Indicadores:** los tres agregados provienen del servidor, no de las filas visibles. Sus acciones filtran por fechas de `America/Lima` usando `fechaActualServidor` o por reintento, y un segundo clic retira el filtro rápido.
- **Simulación:** el botón principal envía `{}`; la flecha abre el formulario personalizado con zona activa, peso, volumen y observaciones. La confirmación refresca la cola, conserva los filtros y marca la fila visible como «Nuevo» durante cinco segundos. Se informa si puede quedar fuera de la página o los filtros actuales.
- **Asignación:** resumen, búsqueda por nombre/identificador y selección única de repartidores, priorizando la zona. Las tres dimensiones se comparan con la capacidad remanente publicada. El POST transmite repartidor y jornada de la selección, sin aceptar identidades editadas manualmente. Tras éxito se consulta nuevamente la cola.
- **Errores:** carga, vacío y sin coincidencias se distinguen de fallo de consulta. Un conflicto exige actualizar; un rechazo de capacidad reconsulta repartidores y retira la selección. Una respuesta de mutación perdida no se reenvía automáticamente.
- **Sesión y concurrencia:** las lecturas se cancelan y las respuestas antiguas se descartan aunque el transporte ignore la cancelación. Un `401/403` retira contenido, filtros y modal; un cambio de sesión desmonta las operaciones anteriores y evita sus notificaciones tardías.

La cola se actualiza cada 30 segundos mientras no hay formularios abiertos, y al recuperar el foco de la ventana. La disponibilidad se renueva mientras está activa y no hay un envío o rechazo pendiente de revisión. El backend vuelve a validar fecha, estado y capacidad al confirmar.

## 3. Disposición, estilo y componentes

- Se reutilizan el shell, tema y tokens existentes: superficies cloud/blanco, texto ink, acciones naranja, selección naranja suave, estados semánticos y foco signal de 2 px. El estado Disponible conserva el badge definido por el sistema de diseño vigente.
- H1 y valores de KPI con Oswald; controles y contenido con Inter. Espaciados de 4/8/16/24 px, radios 8/12/16 px y controles de al menos 44 px en las acciones del flujo.
- Encabezado → dos pestañas → tres KPI → filtros → tabla y paginador. La simulación es secundaria `outline`; la confirmación del modal es primaria.
- Modal de asignación de 880 px, con resumen cloud-subtle y catálogo desplazable. El modal personalizado mide 560 px. La selección tiene borde naranja; un bloqueo de capacidad muestra borde y motivo rojos. Un bloqueo temporal durante el envío no se representa como error de capacidad.
- En 1024 × 768 se conserva la barra lateral compacta y se ocultan pedido, volumen y espera. El resumen ofrece esos campos. En móvil, el desplazamiento horizontal se limita al contenedor de tabla.
- Se integran CR-05/06/07/08/09/10/15/20 y los controles Mantine. CR-20 admite alternativamente un slot `detalleCapacidad` cuando el proveedor solo informa remanente; sus barras anteriores siguen disponibles para consumidores con métricas completas. CR-07 permite configurar los tamaños de página manteniendo sus valores previos por defecto.
- Se verifican navegación con flechas sobre candidatos habilitados, cierre con Escape, foco visible y retorno al disparador. El ajuste en la prueba histórica del shell espera su devolución asíncrona de foco; no cambia el comportamiento del shell.

## 4. Ejecución local

Desde la raíz del frontend:

```bash
npm ci
npm run dev:administrativo
```

Abrir `http://localhost:5173/programacion`. Configurar el origen público del Gateway en `apps/despacho-administrativo/.env`, siguiendo `.env.example`, y utilizar el proveedor de sesión existente con un JWT humano autorizado. El inicio de sesión definitivo sigue perteneciendo a Seguridad.

Gestión debe ejecutarse con PostgreSQL y los endpoints de la rama de backend indicada en §1; el perfil `integracion-local` no publica F-02. El Gateway debe publicar Gestión y la consulta de disponibilidad de Operación. Se necesitan zonas activas para crear pruebas y jornadas habilitadas con capacidad para asignar.

La aplicación no incorpora datos de demostración como fallback. Para recorrerla sin esos servicios se utiliza exclusivamente la interceptación declarada de las pruebas de navegador:

```bash
npm exec -- playwright install chromium
npm run test:f02:e2e
```

Playwright inicia Vite en `127.0.0.1:4182` con el origen de API configurado para la prueba. Las fixtures se encuentran en `src/features/programacion/fixtures.prueba.ts` dentro de la aplicación administrativa; no se importan desde el código de producción.

## 5. Verificación ejecutada

Entorno: Linux, Node.js 26.11.1, npm 12.2.1, Mantine 9.6.2, Vitest 3.2.7 y Chromium de Playwright 1.64.1.

```bash
NODE_OPTIONS=--no-experimental-webstorage npm run test:administrativo
NODE_OPTIONS=--no-experimental-webstorage npm test
npm run typecheck
npm run build
PLAYWRIGHT_BROWSERS_PATH=/tmp/opencode/browsers npm run test:f02:e2e
git diff --check
```

En Node 26 se desactiva su Web Storage experimental durante Vitest para utilizar el de JSDOM; sin esa opción fallaban las pruebas existentes de sesión y cotización. La ruta temporal de navegadores corresponde a esta ejecución; con la instalación habitual basta `npm run test:f02:e2e`.

| Comprobación | Resultado |
|---|---|
| Aplicación administrativa completa | **90 pruebas aprobadas**, incluidas regresiones de F-01/F-04/F-05 y sesión. |
| F-02, incluido dentro del total anterior | **13 pruebas aprobadas**: URL/KPI/fechas, carga pequeña sin redondear a cero, creación rápida/personalizada, doble envío, capacidad tridimensional, asignación pública, conflictos/rechazos, retirada de datos, respuestas antiguas y cambio de sesión. |
| Componentes compartidos | **202 pruebas aprobadas**. |
| Chromium | **4 recorridos aprobados**: tres tamaños y generación seguida de asignación. |
| TypeScript y construcción | Comprobación de tipos y construcción de ambas aplicaciones correctas. |

La prueba de navegador confirma ausencia de desbordamiento de página en 1440 × 1024, 1024 × 768 y 390 × 844; también ausencia de scroll horizontal de tabla en tableta, navegación con flechas, foco signal y retorno del foco. Las capturas son de datos sintéticos, no de un ambiente integrado:

- Cola: [escritorio](./evidencia/f02/cola-1440.png), [tableta](./evidencia/f02/cola-1024.png), [móvil](./evidencia/f02/cola-390.png).
- Asignación: [escritorio](./evidencia/f02/asignacion-1440.png), [tableta](./evidencia/f02/asignacion-1024.png), [móvil](./evidencia/f02/asignacion-390.png).

## 6. Dependencias para completar F-02

**Ocupación absoluta — ES-F02-04, CUI-03:** la limitación anterior corresponde a la revisión del 17/10. Al contrastar el 05/11 el contrato vigente de Operación §4.2 y su captura sintética `contratos/f06-respuestas-backend.json`, ya se publican placa, límites y ocupación. `ModalAsignacion` ahora conserva esos datos, permite buscar por placa y reutiliza CR-20/CR-11 para las tres barras y la proyección del candidato seleccionado. La respuesta incompleta o con remanente incoherente bloquea la asignación; no hay fallback de límites inventados. Pruebas y límites actuales se registran en la [evidencia canónica de ES-F02-04](../../despacho-docs/especificaciones/ES-F02-04-AsignarDespachoRepartidor/evidence.md), EV-04. No acredita servicios reales.

Las capturas nuevas de navegador con API simulada se guardan separadas de las históricas: [escritorio](./evidencia/f02/hito4/asignacion-1440.png), [tableta](./evidencia/f02/hito4/asignacion-1024.png) y [móvil](./evidencia/f02/hito4/asignacion-390.png).

**Rutas y reasignación — ES-F02-05/06:** la pestaña ya está habilitada para consulta de jornadas/rutas por las APIs existentes. Permite reordenar con arrastre nativo o botones de teclado en fotografías continuas, guardando con versión de ruta y UUID; los huecos históricos se muestran sin renumerar y bloquean ese guardado hasta aclaración. El modal de reasignación excluye al conductor actual, exige motivo y capacidad suficiente y utiliza la versión numérica de la parada, distinta del ETag de ruta. Ante resultado incierto se conserva y recupera el mismo comando; no se crea otro automáticamente. La consulta se renueva al guardar o cambiar de jornada, sin caché de rutas destino. Los comandos requieren los proveedores y las credenciales vigentes, sin omitir seguridad.

El perfil `render` del Gateway ahora conserva la precedencia de ruta/secuencia hacia Gestión frente al resto de jornadas de Operación. Se precisaron los transportes en los contratos canónicos de Gestión §3.2.1/2 y Operación §5.5, sin cambiar la identidad interna pendiente ni la regla de huecos. El incremento está verificado localmente con APIs simuladas; sus resultados actuales se registran en EV-04 de ES-F02-05 y ES-F02-06 en Specs. Capturas de [ruta móvil](./evidencia/f02/hito4/ruta-390.png) y [reasignación móvil](./evidencia/f02/hito4/reasignacion-390.png), exclusivamente sintéticas.

**Integración real:** los tests verifican el consumidor con respuestas simuladas; aún corresponde ejecutar el recorrido con Gateway, Gestión, Seguridad y Operación reales. La verificación de teclado y responsive descrita no equivale a una auditoría integral con lector de pantalla.

## 7. Referencias

1. `despacho-docs/especificaciones/ES-F02-02-GenerarDespachoPrueba/`, `ES-F02-03-ConsultarColaPendientes/` y `ES-F02-04-AsignarDespachoRepartidor/`: `spec.md` y `ui.md`.
2. `despacho-docs/disenio/SYSTEM-DESIGN.md`, §21, y `disenio/componentes-react.md`, CR-05/06/07/20, DC-04 y DC-07.
3. Contratos canónicos `despacho-docs/integraciones/api-contract-gestion-despachos.md`, §3.2, y `api-contract-operacion-reparto.md`, §4.2; convenciones comunes en `api-contract.md`.
4. Backend `797d209`, rama `feature/f02-implementacion-specs`, `servicio-gestion-despachos/.../programacion/application/ModelosProgramacion.java` y `programacion/api/`.
