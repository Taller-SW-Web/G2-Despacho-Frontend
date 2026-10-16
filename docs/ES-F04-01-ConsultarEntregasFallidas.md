# Frontend de ES-F04-01: Consultar entregas fallidas

Implementación de la consulta administrativa en `/entregas-fallidas`, rama `feature/f04-consultar-entregas-fallidas`, creada desde `origin/develop` `92dc771` y contrastada con el remoto el 16/10/2026. Consume el listado y catálogo por Gateway, usando el cliente y proveedor de sesión existentes. Los contratos canónicos están en [Gestión §§4 y 5.1](../../G2-Despacho-Specs/integraciones/api-contract-gestion-despachos.md); comportamiento, UI y aceptación en la [carpeta SDD](../../G2-Despacho-Specs/especificaciones/ES-F04-01-ConsultarEntregasFallidas/spec.md).

## Ejecución local con la demo

Iniciar el entorno aislado y preparar sus datos siguiendo la [guía backend](../../G2-Despacho-Backend/docs/f04-consulta-entregas-fallidas.md). Desde la raíz del frontend, en PowerShell:

```powershell
npm install
$env:VITE_API_BASE_URL = 'http://localhost:18080'
$sesionF04 = Invoke-RestMethod -Method Post -Uri 'http://localhost:18090/pruebas/token-usuario' -Body @{ perfil = 'gestor' }
$env:VITE_DEV_TOKEN = $sesionF04.accessToken
npm run dev:administrativo
```

Abrir [Entregas fallidas](http://localhost:5173/entregas-fallidas). El token de demo permanece en el proceso de desarrollo; no se incluye en esta entrega. La variable de token solo se lee con `import.meta.env.DEV`. Una sesión existente en `despacho.token` de localStorage tiene prioridad: debe corresponder al entorno consultado. El acceso de producción sigue dependiendo del flujo de Seguridad del equipo.

La demo utiliza servicios G2 y dos PostgreSQL reales, datos sintéticos y un emisor temporal de JWT firmado. No acredita un despliegue con G7 ni el registro de incidencias desde F-03.

## Alcance implementado

- Primera consulta sin fechas implícitas; motivo completo, incluidos históricos, fechas civiles de Lima y recepción.
- URL e historial como estado de la búsqueda; al filtrar se vuelve a página 1; limpiar conserva el tamaño. Paginación remota, tamaños 20/50/100 y restauración de tamaños contractuales de una URL; corrección de páginas que dejan de existir.
- Agregados del servidor, selección coherente de tarjetas y selector, sin deducir cifras de las filas visibles. Los atrasados están incluidos en pendientes.
- Incidencia vigente, contadores acumulados, recepción, evidencia como indicador, pedido anulado y retorno atrasado confirmado. Sin fotografía ni comentario interno.
- Cancelación y descarte de respuestas obsoletas; datos anteriores identificados durante actualización o error; retirada inmediata de filas, motivos e indicadores ante `401/403` de cualquiera de las dos consultas.
- Desconocidos conservados como tales, catálogo recuperable, error de solo atrasados con reintento o vuelta a todos los grupos y validación diferenciada de un vacío.

## Componentes compartidos

Se reutilizan `tema`, tokens, CR-08 `EstadoVista` y CR-09 `BadgeEstado`. Se amplía este último con el contexto `recepcion`.

Por indicación de Gerardo, los faltantes se entregan como TSX básicos en el paquete compartido: CR-03 `ShellAdministrativo`, CR-05 `EncabezadoPagina`, CR-06 `BarraFiltros`, CR-07 `TablaDatos` y CR-10 `TarjetaKpi`. No se añaden pruebas ni documentación independiente por componente. CR-01/02 se aplican directamente mediante Mantine. Este subconjunto cubre la consulta; no declara completa la especificación de todas las variantes compartidas (por ejemplo, búsqueda con debounce u ordenación libre).

Los componentes específicos son `PaginaEntregasFallidas`, `FiltrosEntregasFallidas`, `TablaEntregasFallidas`, el hook de consulta y su adaptador/modelo. `PaginaEntregasFallidas` recibe callbacks opcionales de detalle/recepción y entrega la incidencia y la consulta de retorno. En la aplicación actual, ambas acciones están deshabilitadas con una explicación visible porque ES-F04-02/03 todavía no están implementadas. La pantalla no ejecuta mutaciones ni enlaza destinos inexistentes.

## Verificación

El 16/10/2026 se ejecutan siete pruebas nuevas prioritarias de la funcionalidad con Vitest, Testing Library y JSDOM, reutilizando las herramientas existentes. Cubren datos/indicadores, restauración y corrección de página, respuestas fuera de orden, revocación de permisos, degradación, estados recuperables y validación de URL. Los fixtures están identificados en el archivo de prueba y solo comprueban presentación/interacción. No se agregan pruebas unitarias de los nuevos compartidos. Se ejecutan además las 13 pruebas existentes de `BadgeEstado` como regresión del componente ampliado.

```powershell
npm run test:f04
npm run typecheck
npm run build
# Regresión existente, desde packages/componentes-compartidos:
node ../../node_modules/vitest/vitest.mjs run src/dominio/BadgeEstado.test.tsx
```

Los registros finales se conservan en [pruebas](./evidencia/es-f04-01/pruebas.txt), [tipos](./evidencia/es-f04-01/typecheck.txt) y [construcción](./evidencia/es-f04-01/build.txt). La construcción administrativa conserva el aviso de tamaño de bundle de Vite; no impide generar ambas aplicaciones.

## Recorrido real observado

Navegador integrado, Gateway `18080`, Vite `5173`, servicios de la demo de backend `27c65a0`; sin respuestas HTTP simuladas en este recorrido:

| Comprobación | Resultado |
|---|---|
| Entrada sin parámetros | 12 filas, recibidos primero; indicadores 7/5/2 y recepción correcta. |
| Tarjetas y selector | Solo atrasados devuelve dos filas sin cambiar indicadores. Elegir recibidos desactiva solo atrasados y devuelve cinco filas. |
| Páginas remotas | URL con página 3/tamaño 2: «5–6 de 12»; Siguiente: «7–8 de 12»; Atrás restaura «5–6 de 12». El tamaño 2 se usa solo para verificar una URL válida del contrato. |
| Fechas | Selección de 14/10/2026 como ambos límites: siete filas, indicadores 7/0/2; URL conserva ambos días. Quitar fecha con Enter actualiza el filtro. |
| Filtros inválidos y sin coincidencias | Motivo inexistente: error de filtros, cero filas y ningún vacío engañoso. Fecha futura: mensaje de sin coincidencias recuperable al limpiar. |
| Operación detenida en la demo | Se conservan filas; siete retornos no evaluables, atrasados «No disponible» y deshabilitado. Solo atrasados: error de dependencia y cero filas; conserva motivo/filtro. |
| Recuperación de Operación | Se reinicia el mismo servicio; Reintentar recupera dos atrasados y 7/5/2. Servicio restaurado al finalizar. |
| Perfil sin rol del emisor temporal | Acceso denegado por Gateway; cero filas, indicadores y filtros protegidos. Se restaura el perfil Gestor para revisión. La revocación después de mostrar datos se comprueba además con una de las siete pruebas. |
| Móvil 390 × 844 y teclado | Un H1; ancho de documento igual al viewport disponible (375 px sin scrollbar). Drawer accesible, Escape devuelve foco a Abrir menú. Tabla de 1550 px dentro de región de 342 px; ArrowRight desplaza 40 px sin desbordar la página. |

Capturas: [listado de escritorio](./evidencia/es-f04-01/listado-escritorio.jpg), [móvil](./evidencia/es-f04-01/listado-movil.jpg), [atrasados](./evidencia/es-f04-01/atrasados-escritorio.jpg), [Operación no disponible](./evidencia/es-f04-01/operacion-no-disponible.jpg), [error de solo atrasados](./evidencia/es-f04-01/error-solo-atrasados.jpg) y [acceso denegado](./evidencia/es-f04-01/acceso-denegado.jpg).

Las múltiples incidencias, el desempate y la autoridad de los datos se sustentan en las comprobaciones backend EV-06 a EV-11. No se repite su suite. No se acredita auditoría completa WCAG, lector de pantalla ni integración de destinos ES-F04-02/03. Revisión humana y despliegue con G7 pendientes.
