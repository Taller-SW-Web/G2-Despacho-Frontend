# F-01: ejecución local y evidencia de integración

## 1. Acceso rápido

- Preparar sesión y probar cotizaciones: <http://localhost:5173/desarrollo/f01>.
- Administrar zonas y tarifas: <http://localhost:5173/zonas>.
- Gateway: <http://localhost:8080>.
- Swagger de Gestión: <http://localhost:8081/swagger-ui.html>.

Abrir primero el probador, mantener el perfil **Gestor de Despacho**, pulsar **Generar sesión de prueba** y después **Abrir zonas y tarifas**. La sesión dura 15 minutos; al vencer, generar otra desde el probador. Usar el mismo origen del navegador (`localhost`) durante el recorrido, ya que la sesión se guarda por origen.

## 2. Arranque

### 2.1. Backend

Desde `/home/elesel/Escritorio/G2-Despacho-Backend`, con Docker activo:

```bash
docker compose -f compose.f01.yaml up --build -d --wait
docker compose -f compose.f01.yaml ps
```

El archivo `compose.f01.yaml` inicia Gateway, Gestión y el emisor temporal. Gestión carga `servicio-gestion-despachos/.env`, donde deben existir `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME` y `SPRING_DATASOURCE_PASSWORD` de su base Supabase. Se utiliza el perfil `default`, con APIs persistidas, Flyway deshabilitado y sin generación de esquema por Hibernate. El esquema debe estar preparado previamente conforme a la [guía del backend](../../G2-Despacho-Backend/docs/f01-zonas-codigos-postales.md) [cite: 1].

La configuración local incluye un pool de hasta seis conexiones, validación y tiempos de espera acotados, renovación de conexiones y red Docker con MTU 1400. Durante la preparación se detectaron esperas TCP/TLS y conexiones cerradas hacia el pooler de Supabase; las comprobaciones finales se realizaron con esos ajustes.

Para consultar registros o detener este entorno:

```bash
docker compose -f compose.f01.yaml logs -f
docker compose -f compose.f01.yaml down
```

Al recrear el emisor se generan claves nuevas: generar también nuevos tokens desde el probador.

### 2.2. Frontend

Desde `/home/elesel/Escritorio/G2-Despacho-Frontend`:

```bash
npm install
npm run dev:administrativo
```

La aplicación usa el puerto fijo `5173`. Su destino predeterminado es `http://localhost:8080`; puede configurarse con `VITE_API_BASE_URL` en `apps/despacho-administrativo/.env.local`, indicando el origen del Gateway sin `/api/v1`.

## 3. Recorrido manual

### 3.1. Zonas y tarifas

1. Generar la sesión de gestor y abrir zonas.
2. Pulsar **Nueva zona**, ingresar un nombre único y seleccionar distritos del catálogo. Elegir distritos que no estén asignados a otra zona activa.
3. Agregar los códigos postales dentro de cada distrito; pulsar Enter para incorporarlos. Los códigos son opcionales. Seleccionar un distrito cubre todo ese distrito [cite: 1].
4. Guardar y recargar la página: el registro debe permanecer.
5. Editar nombre o cobertura y guardar. En la edición el estado permanece en solo lectura.
6. Abrir **Tarifas** en una zona activa. Por ejemplo: base `10`, peso incluido `3`, recargo `2`, factor volumétrico `1.25`, plazo `2` y moneda fija PEN.
7. Guardar y volver a abrir: debe precargarse la tarifa vigente. Al sustituirla, la regla anterior se conserva en el histórico del backend.
8. Comprobar filtros por nombre, distrito y estado. Las búsquedas y la página se reflejan en la URL.
9. Desactivar y reactivar desde la tabla, confirmando cada operación. La configuración de tarifas está bloqueada en zonas inactivas.

### 3.2. Cobertura y cotización

1. Volver al probador y pulsar **Generar token de servicio**, con scope `cotizaciones:calcular`.
2. Ingresar un distrito de una zona activa y enviar sin productos: debe devolver cobertura y zona, sin costo.
3. Activar **Incluir productos para calcular el costo**. Con los SKU predeterminados, `POL-NEG-M` por 5 y `ZAP-RUN-42` por 1, se obtienen `2.65 kg` y `0.021 m³`.
4. Con la tarifa del ejemplo, el costo esperado es `S/ 10.00`. Si se cambia la base a `12`, la siguiente cotización debe devolver `S/ 12.00`.
5. Consultar un distrito fuera de cobertura o una zona desactivada: debe devolver `coberturaDisponible=false`.
6. Una zona activa sin tarifa confirma cobertura, pero no devuelve costo ni plazo.

El probador muestra la solicitud enviada, el estado HTTP y la respuesta. La resolución se ejercita mediante `POST /api/v1/cotizaciones` sin líneas; el backend revisado no expone un endpoint HTTP independiente para la resolución interna.

### 3.3. Casos de error

- Nombre o cobertura duplicados: el formulario conserva los valores y muestra el conflicto `409`.
- Peso incluido cero: el formulario de tarifa impide guardar y muestra la validación.
- Token técnico vacío: la cotización responde `401`.
- Token con scope `seguimientos:leer`: la cotización responde `403`.
- Perfil humano **Usuario sin rol**: zonas muestra acceso denegado sin tabla ni filtros.
- SKU desconocido: respuesta `422` con `DESP_ERROR_PRODUCTO_NO_ENCONTRADO`.
- Cantidad cero: respuesta `400` con `DESP_ERROR_CANTIDAD_INVALIDA`.
- Distrito vacío: respuesta `400` con `DESP_ERROR_DESTINO_REQUERIDO`.
- **Editar JSON** permite enviar líneas vacías y otros cuerpos inválidos. Un JSON sintácticamente incorrecto se detecta antes del envío.

## 4. Pruebas y resultados

Verificación realizada el **16 de octubre de 2026, America/Lima** (17 de octubre UTC), con Chromium, Gateway y Gestión locales y PostgreSQL 17.11 en Supabase.

| Comprobación | Resultado |
|---|---|
| `npm run test:f01` | 9 pruebas aprobadas: contrato agrupado, edición, conflictos, cancelación de consultas, permisos, 404 y validación de tarifas; separación de token técnico/humano. |
| `npm run test:administrativo` | 54 pruebas aprobadas, incluidas las suites existentes de flota, entregas fallidas y sesión. |
| `npm run test:f01:e2e` | 2 recorridos aprobados en Chromium: operaciones persistidas y cotización; permisos, JSON inválido y viewport móvil de 390 × 844. |
| `npm run typecheck` | Aprobado para componentes compartidos y ambas aplicaciones. |
| `npm run build` | Ambas aplicaciones construidas correctamente. Vite informa el tamaño del paquete administrativo. |
| Suite de componentes compartidos | 201 de 202 pruebas aprobadas. Falla `ShellAdministrativo / CCR-03-02`, por la expectativa inmediata de recuperación de foco al cerrar el menú con Escape (`ShellAdministrativo.test.tsx:44`). Los archivos del componente y su prueba no forman parte de los cambios de esta integración. |

Las operaciones de negocio verificadas mediante solicitudes originadas en el navegador fueron:

| Operación | Evidencia funcional |
|---|---|
| `GET /api/v1/distritos` | Catálogo de 50 distritos y selección en el formulario. |
| `GET /api/v1/zonas` | Listado persistido y consulta filtrada. |
| `POST /api/v1/zonas` | `201`, conservación de CP por distrito y persistencia tras recargar. |
| `GET /api/v1/zonas/{id}` | Precarga de edición y datos del panel de tarifas. |
| `PUT /api/v1/zonas/{id}` | Nombre y cobertura modificados. |
| `PATCH /api/v1/zonas/{id}/estado` | Desactivación y reactivación confirmadas; cambio de cobertura observable. |
| `GET /api/v1/zonas/{id}/tarifa` | Tarifa ausente y posterior lectura de tarifa vigente. |
| `PUT /api/v1/zonas/{id}/tarifa` | Alta y sustitución de tarifa, con cambio del costo cotizado. |
| `POST /api/v1/cotizaciones` | Cobertura, sin cobertura, sin tarifa, cotización y errores `400/401/403/422`. |

El código reproducible está en `pruebas/f01/flujo.spec.ts`. Las precondiciones se consultan por API; las altas, ediciones, tarifas, cambios de estado y cotizaciones se realizan mediante la interfaz. La prueba crea zonas con prefijo **Prueba UI F01**, elige dos distritos libres y deja sus registros inactivos al finalizar. Los registros generados durante verificaciones interrumpidas también se desactivaron al completar la revisión.

Para repetir las pruebas de navegador, con el backend disponible:

```bash
npx playwright install chromium
npm run test:f01:e2e
```

Las capturas `zonas.png` y `cotizacion.png` y la matriz HTTP sin tokens se generan en `test-results/`. Este directorio es local, está ignorado por Git y se renueva en cada ejecución. No se activan trazas HTTP que guarden JWT.

## 5. Alcance comprobado y dependencias

Esta evidencia corresponde a **integración local con emisor temporal de G2**. La integración con Seguridad real permanece pendiente. El catálogo físico de Productos y Ofertas continúa siendo el stub existente en el backend; zonas y tarifas sí se consultan y persisten en Supabase. La auditoría y el histórico se gestionan en el backend: estas pantallas no presentan una consulta de esos históricos [cite: 1, 2].

El probador se carga condicionalmente con `import.meta.env.DEV`. Su ruta y la emisión auxiliar no se incluyen en la construcción de producción. El proxy de Vite permite únicamente las dos rutas de emisión del emisor local en `8090`; no forma parte del Gateway ni de un inicio de sesión de producción.

## 6. Referencias

1. [Contrato implementado de distritos y CP y pruebas del backend](../../G2-Despacho-Backend/docs/f01-zonas-codigos-postales.md).
2. [Funcionalidad F-01](../../TALLER_WEB/despacho-docs/funcionalidades/F-01-Gestor_ZonasGeograficas.md) y [contrato de Gestión](../../TALLER_WEB/despacho-docs/integraciones/api-contract-gestion-despachos.md).
3. [Emisor temporal local](../../G2-Despacho-Backend/docs/seguridad-temporal-local.md).
