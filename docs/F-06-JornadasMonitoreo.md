# Frontend F-06: jornadas, monitoreo y disponibilidad

**Responsable funcional original:** Luis, F-06. **Implementación asumida:** Kevin Rhamses Bohorquez, por solicitud del usuario.

## 1. Alcance y fuentes

Las [ocho especificaciones F-06](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/main/funcionalidades/funcionalidad.md#especificaciones-atómicas-de-f-06) y [Operación §4.2](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/main/integraciones/api-contract-operacion-reparto.md#42-jornadas-y-monitoreo) definen comportamiento y transporte [cite: 1].

La ruta `/jornadas` se incorpora a la navegación compartida; `/monitoreo` redirige allí. Incluye apertura del día en America/Bogota, cierre con confirmación, detalle con despachos proyectados, filtros/paginación en URL, cuatro indicadores globales y ocupación en peso, volumen y paquetes. No reemplaza las pantallas de programación F-02 ni la ruta de entregas F-03.

## 2. Componentes y datos

Se reutilizan CR-03/05/07/08/09/11/12/15, se completa CR-10 con tonos semánticos y se incorpora CR-14 `FranjaEstado`. No se agregan dependencias. Los catálogos de apertura consultan todas las páginas confirmadas de F-05 y zonas activas de F-01; no hay listas ficticias en producción ni recortes silenciosos de candidatos.

Los componentes exclusivos están en `apps/despacho-administrativo/src/features/jornadas/`. El adaptador valida estructura, identidad del recurso, página, fecha y respuestas de mutación. Los KPI consumen agregados del servidor, sin calcularlos a partir de la página visible. Las barras muestran valores reales y conservan el exceso.

## 3. Actualización, permisos y errores

El contenedor actualiza cada 30 segundos mientras la página es visible y permite actualización manual. Cancela solicitudes y descarta respuestas anteriores aunque el transporte ignore AbortSignal. Un error de refresco conserva datos autorizados con franja y bloquea mutaciones; `401/403` retira datos y formularios. Sin conexión no se encolan comandos.

Los formularios y confirmaciones bloquean envíos repetidos. Un resultado incierto conserva lo ingresado y exige consultar antes de repetir; un rechazo permite corregir sin inventar éxito. El cierre informa que no resuelve despachos pendientes ni libera reservas de retornos. La autorización y las reglas definitivas pertenecen al backend.

## 4. Verificación

- `npm run test:f06`: 19 pruebas aprobadas de modelos, interacción, consultas y contrato del proveedor.
- Pruebas CR-10/11/14: 18 casos aprobados sobre indicadores, umbrales, exceso, avisos y recuperación.
- `npm run typecheck`: aprobado en el paquete compartido y ambas aplicaciones.
- `npm run build`: ambas aplicaciones construidas; el aviso preexistente de bundle administrativo mayor de 500 kB no impide generar los artefactos.

Las pruebas usan datos sintéticos y transporte simulado. El caso contractual consume una captura del proveedor con PostgreSQL real, JWT y zona como dobles. Los fixtures se limitan a archivos de prueba. No acreditan layout en navegador real, revisión humana de accesibilidad ni el objetivo de 200 ms del servidor. La regresión administrativa aprobó 96 pruebas y la de componentes compartidos 206. La evidencia de integración y sus límites se registra en Specs.

## 5. Configuración e integración

`VITE_API_BASE_URL=https://taller-api-gateway.onrender.com`, sin agregar `/api/v1`. El cliente compartido envía el token de la sesión existente. El login administrativo sigue dependiendo de la integración transversal con Seguridad; F-06 no emite credenciales ni omite JWT.

Backend implementado: monitoreo, detalle, apertura/cierre y disponibilidad del contrato de Operación. El backend valida la zona en Gestión y conecta reservas/liberaciones/proyecciones con los clientes de F-02/F-04. La adaptación F-06 se aplicó en Supabase después de probarla en copia aislada y en una transacción revertida. El recorrido desplegado sigue requiriendo Seguridad y una sesión integrada; publicar el frontend no acredita esa aceptación.

## 6. Referencias

1. Especificaciones y contrato canónico enlazados en §1 [cite: 1].
2. [Componentes compartidos](../packages/componentes-compartidos/src/index.ts), [CR-10](../packages/componentes-compartidos/src/indicadores/TarjetaKpi.tsx), [CR-11](../packages/componentes-compartidos/src/dominio/BarraOcupacion.tsx) y [CR-14](../packages/componentes-compartidos/src/feedback/FranjaEstado.tsx) [cite: 2].
