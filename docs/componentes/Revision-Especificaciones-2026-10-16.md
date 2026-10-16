# Revisión de los cuatro componentes de Gerardo

**Fecha:** 16/10/2026, America/Lima. **Responsable:** Gerardo, con asistencia de Codex.

Se comparó Specs `dd614bdfeb439ded41c74b73b5d59d9c1724f5fb`, usado al iniciar los componentes, con la revisión local actual `54b785d13f25bc3017cc407332446b3ac83b243e`. Los contratos de propiedades, eventos y CCR de CR-08/12/18/19 no cambiaron [cite: 1].

## 1. Resultado y cambios

| Componente y rama | Efecto de las especificaciones actualizadas | Acción realizada |
|---|---|---|
| CR-08 EstadoVista, `feature/f04-estado-vista` | El detalle distingue despacho inexistente de despacho sin incidencia; el refresco fallido conserva datos autorizados y la pérdida de permisos los retira. | Sin cambio de código: el consumidor ya puede proporcionar mensajes propios y controlar la composición. Revisión documentada en `5b2d368`. También incorporada a las ramas que dependen de CR-08. |
| CR-12 ModalConfirmacion, `feature/f04-modal-confirmacion` | Recepción, reprogramación y cierre tienen formularios locales, identidad/versión y recuperación de resultados desconocidos. | Sin cambio del modal genérico. Su consumidor controla procesamiento, confirmación deshabilitada y cierre; las reglas de esos formularios se implementan al desarrollar sus especificaciones. Revisión documentada en `806c165`. |
| CR-18 VisorEvidencia, `feature/f04-visor-evidencia` | Operación §3.4 concreta autorización por evidencia, correspondencia de identificadores, vencimiento y retirada por cambio de incidencia. | Se corrige la guía de consumo para validar despacho/evidencia y vincular también la incidencia. Se amplían pruebas del consumidor simulado en `a341433`; documentación en `e08bb5f`. El código visual mantiene su API. |
| CR-19 HistorialEstados, `feature/f04-historial-estados` | Gestión §5.3 define el DTO, presentación en Lima y desempate contractual por identificador. | Ya incorporado al cerrar CR-19: `532f788` fija Lima y prueba medianoche; `8d617ca` documenta el contrato. Se confirma compatibilidad, sin otro cambio de ejecución. El componente conserva el orden recibido en empates; el servidor entrega ese orden por identificador. |

El adaptador futuro del historial debe traducir operación, autoría, origen y datos relevantes a sus textos de presentación, sin inventar nombres ni volcar JSON interno. La recepción conserva `FALLIDO`; no es un nuevo estado del despacho. Las comunicaciones con Ventas se componen en un bloque aparte del detalle [cite: 2].

En evidencia, el consumidor usa `venceEn`; el visor no fija un TTL ni autoriza desde un identificador. Los errores de autorización no se convierten en ausencia legítima. «No intentado — sin foto» y «Falta la referencia de evidencia» corresponden a situaciones diferentes del detalle [cite: 2, 3].

## 2. Verificación

- Se ejecutó nuevamente `npm test` en las ramas de CR-08 y CR-12: 18 y 14 pruebas aprobadas, respectivamente.
- En CR-18, `npm test` aprobó 26 pruebas del visor y 18 de su dependencia CR-08: 44 en total. Se comprobó cambio de despacho, evidencia dentro del mismo despacho e incidencia dentro del mismo despacho, además de respuestas con identificadores ajenos. `npm run typecheck` aprobó paquete, ejemplo y ambas aplicaciones.
- CR-19 conserva la verificación ya realizada contra esta misma revisión de Specs: 59 pruebas aprobadas con `TZ=Asia/Tokyo`, TypeScript y builds de ambas aplicaciones. No se repitieron esas pruebas ni los builds al cambiar solo documentación.
- Las implementaciones visuales permanecen iguales a las ya capturadas; esta revisión cambia documentación y pruebas. Se comprobaron enlaces locales y `git diff --check`.

Cada componente conserva su rama de origen. Las comprobaciones con consumidores simulados acreditan presentación y composición, no los endpoints reales, permisos del servidor ni la integración completa de F-04. La preparación conjunta de la entrega se registra en §4; revisión humana y PR pendientes.

## 3. Referencias

1. [Componentes React, Specs 54b785d](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/54b785d13f25bc3017cc407332446b3ac83b243e/disenio/componentes-react.md): CR-08/12/18/19 y límites entre componentes y consumidores.
2. [Contrato de Gestión, misma revisión](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/54b785d13f25bc3017cc407332446b3ac83b243e/integraciones/api-contract-gestion-despachos.md): §§5.2 y 5.3; [UI del detalle](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/54b785d13f25bc3017cc407332446b3ac83b243e/especificaciones/ES-F04-02-ConsultarDetalleIncidencia/ui.md).
3. [Contrato de Operación §3.4, misma revisión](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/54b785d13f25bc3017cc407332446b3ac83b243e/integraciones/api-contract-operacion-reparto.md#34-autorizar-la-lectura-de-evidencia): acceso temporal y recurso correcto.

## 4. Entrega conjunta hacia develop

**Rama preparada:** `feature/f04-componentes-compartidos`. **Destino del PR manual:** `develop`. **Base remota incorporada:** `a79d30e0b59c0db6ca18f83e082fe7d8303bba7e`. Código integrado y verificado en `37ada78`, antes de este registro documental.

Se incorporaron las cuatro ramas de componentes y `origin/develop`, tras actualizar el remoto. La unión con `develop` fue limpia. Hubo dos conflictos al combinar las exportaciones de las ramas de componentes en `packages/componentes-compartidos/src/index.ts`; se resolvieron conservando `tema`, CR-08/12/18/19, sus tipos y el soporte de CR-09 para despacho. Se verificó que las cuatro ramas son antecesoras de la entrega.

La implementación administrativa de zonas, tarifas, sesión y cliente API incorporada desde `develop` conserva su contenido: `git diff --exit-code origin/develop -- apps/despacho-administrativo/src packages/cliente-api apps/despacho-repartidor/src` terminó sin diferencias.

| Comprobación conjunta | Resultado |
|---|---|
| `npm test` con `TZ=Asia/Tokyo` | 99 pruebas aprobadas en cinco archivos: CR-08 (18), CR-12 (14), CR-18 (26), CR-19 (28) y soporte de estados (13). |
| `npm run typecheck` | Paquete, pruebas, ejemplos y ambas aplicaciones aprobados. |
| `npm run build` | Ambas aplicaciones compiladas. Vite emitió un aviso por el chunk administrativo de 761,54 kB; no impidió la compilación. |
| Higiene y preparación | `git diff --check` y enlaces locales sin errores; `origin/develop` es antecesor de la entrega. |

Las pruebas conjuntas verifican la convivencia de los componentes en el frontend actualizado. La consulta y las mutaciones reales de F-04 siguen en sus tareas SDD. El PR debe usar `develop` como base y esta rama como origen; su creación y revisión quedan a cargo del usuario y del equipo.
