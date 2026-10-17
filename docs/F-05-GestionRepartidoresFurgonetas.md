# Frontend F-05: gestión de repartidores y furgonetas

**Responsable:** Kevin Rhamses Bohorquez. **Revisión:** identificada por el historial de Git.
**Alcance:** ES-F05-01 a ES-F05-09. Implementación frontend; integración real y aceptación visual pendientes.

## 1. Fuentes y decisiones de alcance

Se revisaron la funcionalidad F-05, sus nueve especificaciones atómicas, el catálogo de componentes React, el sistema de diseño, los wireframes y alta fidelidad de F-05, el modelo de datos §3.2 y los contratos de Operación §4.1 y de Seguridad §8.4 del repositorio de Specs [cite: 1].

Se aplican React/TypeScript, Mantine 9.6.2, Tabler, tema y tokens compartidos. Se reutilizan CR-03 ShellAdministrativo, CR-05 EncabezadoPagina, CR-06 BarraFiltros, CR-07 TablaDatos, CR-08 EstadoVista, CR-09 BadgeEstado, CR-12 ModalConfirmacion y CR-15 NotificacionOperacion. Los formularios usan controles Mantine y validación Zod existente. No se agregan dependencias.

Las rutas de la aplicación son `/repartidores` y `/furgonetas`. `/flota/*` redirige a `/repartidores` por compatibilidad. La navegación mantiene Programación, Entregas fallidas, Repartidores, Vehículos y Zonas y tarifas; no crea pantallas de monitoreo ni jornadas de F-06.

### 1.1. Alineación contractual

Operación §4.1 concreta los DTO, filtros, paginación, límites, estados y errores. Se contrastaron con el proveedor backend y las nueve carpetas SDD. El alta es local; la asociación manual recibe el UUID de una cuenta creada previamente por Seguridad, sin credenciales ni provisión automática.

Los estados locales de vínculo son `PENDIENTE` y `VINCULADO`. Un estado heredado desconocido conserva una etiqueta neutral y no habilita el vínculo. La API usa `FUERA_DE_SERVICIO`; el backend lo traduce a `INACTIVA` en persistencia. Jornadas y monitoreo siguen fuera del alcance F-05.

## 2. Implementación

| Área | Ubicación en `apps/despacho-administrativo/src/features/flota/` |
|---|---|
| Modelos, límites, validación y transiciones | `modelo.ts` |
| Adaptación de transporte y lectura segura de errores | `api.ts` |
| Consultas cancelables, URL, paginación y permisos | `useCatalogoFlota.ts` |
| Búsqueda con debounce y filtros compartidos | `FiltrosFlota.tsx`, `CatalogoFlota.tsx` |
| Bloqueo de envíos y resultados desconocidos | `useOperacionFlota.ts`, `ModalFormularioFlota.tsx` |
| Repartidores | `PaginaRepartidores.tsx`, `FormularioRepartidor.tsx`, `VinculacionRepartidor.tsx` |
| Furgonetas | `PaginaFurgonetas.tsx`, `FormularioFurgoneta.tsx` |
| Baja y transiciones confirmadas | `ConfirmacionEstadoFlota.tsx` |

Los filtros se guardan en la URL y se restauran al volver con el historial. La búsqueda de placa espera 300 ms; limpiar o cambiar la entrada de URL cancela la búsqueda pendiente. La UI comienza en página 1 y tamaño 50; la conversión HTTP queda en el adaptador del contrato. No se recortan ni se vuelven a paginar localmente las filas del servidor.

Se descartan respuestas obsoletas incluso si el transporte ignora la cancelación. Un fallo de refresco conserva los datos previos con advertencia y bloquea acciones hasta confirmar una consulta válida. Un `401/403` elimina resultados, filtros, acciones y formularios protegidos. Una página que ya no existe se corrige según el total confirmado. Respuestas incompletas o incoherentes producen error, nunca un vacío fabricado.

La edición de repartidor permite solo teléfono, correo, brevete y turno; nombres, apellidos y DNI quedan en solo lectura. La edición de furgoneta envía solo sus límites; placa y estado no se modifican por ese comando. Los valores vacíos no se convierten en cero. El peso admite hasta tres decimales y 9999999.999 kg; el volumen hasta cuatro y 999999.9999 m³. Ambos son positivos y los paquetes admiten enteros de 1 a 32767. La UI rechaza exceso de precisión sin redondear los valores enviados.

Las mutaciones tienen un bloqueo síncrono contra doble envío. Los errores corregibles permanecen en el modal y se asocian a campos conocidos sin imprimir `detail` ni trazas. Un resultado perdido, malformado o incierto no genera éxito ni se reenvía automáticamente: se conserva el formulario y se pide consultar el listado. Las notificaciones se emiten después de la respuesta confirmada; los datos de pantalla se renuevan mediante consulta, sin transiciones optimistas.

## 3. Trazabilidad y comprobación

| Especificación | Comportamiento frontend | Pruebas |
|---|---|---|
| ES-F05-01 | Alta, campos requeridos, DNI de 8 dígitos, correo, duplicados y resultado pendiente de vinculación. | `modelo.test.tsx`; caso de alta/duplicado de `PaginasFlota.test.tsx`. |
| ES-F05-02 | Listado, filtros combinados, URL/historial, vacío, acceso denegado y recuperación. | Casos de listado, URL, respuestas anteriores y permisos. |
| ES-F05-03 | Precarga y edición exclusiva de contacto, doble envío y registro inexistente. | Casos de edición, payload permitido y respuesta perdida. |
| ES-F05-04 | Confirmación/cancelación, conflicto con despachos en curso y baja confirmada conservando el registro. | Casos de baja y cambio a Inactivo. |
| ES-F05-05 | Asociación del identificador de Seguridad sin gestionar credenciales. | Validación UUID y caso de vinculación con `usuarioId`. Se aplica el contrato vigente de §1.1. |
| ES-F05-06 | Alta de furgoneta con límites numéricos válidos. | Caso de alta, vacío/cero y paquetes fraccionarios. |
| ES-F05-07 | Listado, placa con debounce, limpieza, paginación y estados desconocidos. | Casos de búsqueda, limpieza, página desaparecida y respuesta incoherente. |
| ES-F05-08 | Edición de límites, placa inmutable y aviso sobre jornadas futuras. | Caso de payload exclusivo de capacidades. |
| ES-F05-09 | Selección de transiciones válidas, confirmación, actualización y retiro de datos sin permiso. | Casos de mantenimiento, rechazo `401` y nueva consulta. |

Los fixtures de `fixtures.prueba.ts` son sintéticos. Las pruebas de páginas usan los componentes reales y el adaptador con un cliente HTTP simulado. No verifican unicidad, auditoría, JWT real, jornadas, reglas de capacidad ni integración de Seguridad en el servidor.

```bash
npm run test:f05
npm run test:administrativo
npm test
npm run typecheck
npm run build
```

| Comprobación | Resultado |
|---|---|
| `npm run test:administrativo` | 45 pruebas aprobadas: 37 de F-05 (14 de modelo, 20 de páginas y 3 de rutas), 7 de F-04 y 1 de sesión. |
| `npm test` | 148 pruebas compartidas aprobadas; incluye la nueva presentación de Fuera de servicio. |
| `npm run typecheck` | Aprobado para paquete compartido y ambas aplicaciones, incluidas las pruebas. |
| `npm run build` | Aprobado para ambas aplicaciones después del ajuste visual. Bundle administrativo: 899,90 kB (276,63 kB gzip); repartidor: 371,98 kB (116,75 kB gzip). Vite conserva el aviso administrativo de chunk superior a 500 kB; no bloquea la construcción. |

Se limitan los workers administrativos a 2 y se usa un límite de 15 s por caso de interacción: una ejecución simultánea con toda la suite compartida saturó el entorno y alcanzó los límites de tiempo anteriores. La ejecución posterior completa con esa configuración aprobó los 45 casos. El alta completa del repartidor verifica entradas por teclado y requiere alrededor de 9 s en este equipo.

Se revisaron en navegador las pantallas de repartidores y furgonetas con API no disponible y la navegación administrativa; también el apilado móvil y Drawer a 390 px, su cierre con Escape y el retorno de foco. La revisión encontró que un color Mantine con tono explícito (`red.8`) producía un fondo intenso incluso en variante light; los avisos locales se corrigieron a paletas semánticas light con texto ink. Se comprobó visualmente el aviso corregido. No se acreditan todavía los estados con datos y los formularios en navegador real, ni una medición completa de contraste.

La [captura de furgonetas sin API disponible](./evidencias/f05/furgonetas-api-no-disponible.png) muestra ese estado real de desarrollo, sin datos simulados ni operaciones de negocio realizadas. No constituye evidencia de integración exitosa.

## 4. Ejecución y pendientes de aceptación

Configurar `VITE_API_BASE_URL` con el origen del Gateway y ejecutar `npm run dev:administrativo`. Abrir `/repartidores` o `/furgonetas`. Las pantallas de producción no incorporan fixtures ni simulan un alta exitosa cuando el backend no responde.

Pendientes para cerrar integración: autorización real de Gestor, canal administrativo de Seguridad, recorridos con datos de integración y revisión visual con Max en móvil, tableta y escritorio. JSDOM no certifica layout, contraste ni una auditoría WCAG. No se declara cumplimiento de los 200 ms del servidor.

Los estados SDD de Specs no se modifican ni se marcan completados por esta verificación aislada. La implementación utiliza la sesión provisional existente y no acredita el flujo definitivo de autenticación.

## 5. Referencias

| Commit frontend | Incremento |
|---|---|
| `0ffbd40` | Modelos, validación, adaptación API, consultas y composiciones compartidas locales. |
| `c6769b9` | Panel y formulario de repartidores, baja y vinculación. |
| `5f6cb2b` | Panel y formulario de furgonetas, capacidades y estados. |
| `9ca2ed0` | Rutas administrativas, recorridos de prueba y scripts de ejecución. |

Los commits se preparan en `develop` con autor y committer `KevinBohorquez <kevinbohorquez0211@gmail.com>`, identidad confirmada por Kevin Rhamses. Se sincronizó la rama con `git pull --rebase origin develop` antes de comenzar. La documentación y la captura se registran en un commit separado.

- [cite: 1] Specs `91db8f8`, `funcionalidades/F-05-GestionRepartidoresVehiculos.md`, ES-F05-01 a ES-F05-09, `disenio/componentes-react.md` (incluido DC-04), `disenio/SYSTEM-DESIGN.md`, `arquitectura/modelo-datos.md` §3.2, contrato de Operación §4.1 y contrato externo §8.4. La conciliación posterior del stack `f3849d9` conserva estas fuentes.
- [cite: 2] [Componentes compartidos y ejecución](../README.md), [CR-03](./componentes/CR-03-ShellAdministrativo.md), [CR-09](./componentes/CR-09-BadgeEstado.md) y [CR-15](./componentes/CR-15-NotificacionOperacion.md).

## 6. Verificación de la alineación

La revisión añade casos de precisión y extremos numéricos, URL inválida, estado heredado y edición de furgoneta inexistente. Las ejecuciones y totales de §3 corresponden al incremento anterior; la ejecución actual de `npm run test:f05` aprobó 51 pruebas en tres archivos, sin fallos. `npm run typecheck` también aprobó los tres espacios de trabajo y `npm run build` generó ambas aplicaciones. El aviso del bundle administrativo superior a 500 kB se conserva; no impide la construcción. Las pruebas de interfaz usan transporte simulado; no acreditan el recorrido con Render y Seguridad real. El origen configurado para producción es `https://taller-api-gateway.onrender.com`, sin agregar `/api/v1` en `VITE_API_BASE_URL`.
