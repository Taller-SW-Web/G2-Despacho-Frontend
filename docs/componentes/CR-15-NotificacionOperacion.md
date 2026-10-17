# CR-15 NotificacionOperacion

**Responsable:** Rhamses. **Fecha:** 16/10/2026, America/Bogota.
**Fuente:** Specs `91db8f8`, `disenio/componentes-react.md`, CR-15; `SYSTEM-DESIGN.md` §§12.7 y 17 [cite: 1].

## 1. Alcance y contrato

`notificarOperacion` es el adaptador de `@mantine/notifications` en `src/feedback/NotificacionOperacion.tsx`. Reutiliza el proveedor de cada aplicación; no crea otro. Recibe `id`, `tipo`, `mensaje`, `accion?: AccionUi` y `alAccionar?: (id) => void`. Devuelve el identificador registrado.

| Tipo | Presentación | Autocierre |
|---|---|---|
| exito | Verde e icono de confirmación | 4000 ms, sujeto a pausa de interacción de Mantine. |
| efectoPendiente | Amarillo e icono de advertencia | Desactivado. |
| informacion | Azul e icono informativo | Desactivado. |

Se actualiza una notificación visible o en cola con el mismo id; si ya se cerró se vuelve a mostrar. La acción respeta disabled/loading, mantiene el motivo asociado y entrega su id. El cierre tiene nombre accesible y la región usa `role="status"`, `aria-live="polite"`.

## 2. Trazabilidad y verificación

| Criterio | Incremento | Archivo | Comprobación |
|---|---|---|---|
| CCR-15-01 | TCR-02 | `src/feedback/NotificacionOperacion.test.tsx` | Cierre registrado con efecto a Ventas pendiente: mensaje persistente, sin tratar la operación como fallida. |
| Contrato CR-15 | TCR-02 | Mismo archivo | Temporizador de éxito, actualización por id, información persistente, acción contextual, bloqueo y cierre accesible. |

Comandos y resultados reales en [la entrega](./Entrega-Rhamses.md).

## 3. Consumo

```tsx
import { notificarOperacion } from '@despacho/componentes-compartidos';

// Invocar después de la respuesta confirmada y adaptada por el consumidor.
notificarOperacion({
  id: 'cierre-despacho-123',
  tipo: 'efectoPendiente',
  mensaje: 'Cierre registrado. Notificación a Ventas pendiente.',
});
```

No invocar al comenzar una petición. El consumidor determina el resultado confirmado, redacta mensajes de negocio y mantiene errores corregibles en campos/Alert. La información ya anunciada en la página no debe repetirse en una notificación. El proveedor del repartidor permanece arriba y centrado para no cubrir acciones inferiores; el administrativo permanece arriba a la derecha.

## 4. Límites y referencias

La demo usa resultados simulados y no llama a Ventas ni confirma transiciones. JSDOM verifica el proveedor real de Mantine y temporizadores, no la entrega de servicios externos. Revisión visual y con lector de pantalla pendientes.

- [cite: 1] Specs `91db8f8`: CR-15 y CCR-15-01. Frontend base `10d2e9e`; implementación registrada en `9d01d59`.
