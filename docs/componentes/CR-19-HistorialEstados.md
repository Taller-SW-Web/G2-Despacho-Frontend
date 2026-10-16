# Implementación y evidencia de CR-19 HistorialEstados

**Fecha:** 16/10/2026, America/Lima. **Responsable:** Gerardo, con asistencia de Codex.

**Rama:** `feature/f04-historial-estados`, creada desde `main` e incorporando la dependencia CR-08 hasta `abce8df`. Código, ejemplo y pruebas iniciales: `d5604fa10ba987bd0165c9f88eb25c6671a924f3`; ajuste a la zona de Lima y prueba de medianoche: `532f7884a51ec3305b7f83858c3a60f7c3c5169d`.

**Estado:** implementación y verificación aislada realizadas. Revisión humana de Max, coordinación con Rhamses sobre el soporte de CR-09, PR e integración consumidora pendientes.

## 1. Entradas y alcance

Fuentes del repositorio de especificaciones en `54b785d13f25bc3017cc407332446b3ac83b243e`:

- [CR-19 y CCR-19-01](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/54b785d13f25bc3017cc407332446b3ac83b243e/disenio/componentes-react.md#cr-19-historialestados): propiedades, eventos y trazabilidad ICR-08/TCR-08. CR-08 y CR-09 son sus dependencias [cite: 1].
- [Sistema de diseño](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/54b785d13f25bc3017cc407332446b3ac83b243e/disenio/SYSTEM-DESIGN.md): §§5.5, 16.1 y 23; fechas, catálogo de estados y Timeline dentro de tarjeta [cite: 2].
- [Contrato de Gestión](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/54b785d13f25bc3017cc407332446b3ac83b243e/integraciones/api-contract-gestion-despachos.md): §§5.2.1 y 5.3, recepción sin cambio de `FALLIDO`, DTO de historial y presentación en `America/Lima` [cite: 3].

El componente presenta eventos confirmados por el servidor. Una recepción sin transición muestra su descripción, fecha y estado disponible; no crea un estado «Recibido». No registra pulsaciones locales como auditoría ni consulta servicios.

## 2. Implementación y consumo

[HistorialEstados.tsx](../../packages/componentes-compartidos/src/dominio/HistorialEstados.tsx) exporta el componente y sus modelos de presentación desde `@despacho/componentes-compartidos`. El consumidor adapta el DTO real y controla `estado` y la recuperación:

```tsx
import { HistorialEstados } from '@despacho/componentes-compartidos';

<HistorialEstados
  entradas={entradasDelServidor}
  estado={estadoConsulta}
  orden="ascendente"
  alReintentar={() => consultarHistorial()}
/>
```

Las variables y el callback del ejemplo pertenecen a la pantalla consumidora. Cada entrada requiere `id`, `fechaServidor` y `descripcionEvento`; admite `estadoAnterior`, `estadoNuevo`, `ejecutor` y `observacion` opcionales, también nulos.

Gestión §5.3 ya define el DTO real. Su futuro adaptador debe traducir la operación, origen manual/automático y datos pertinentes a los textos de presentación, sin volcar JSON interno ni inventar nombres de usuario. El servidor entrega empates por `id` ascendente; el componente conserva ese orden recibido. Este incremento mantiene la interfaz de CR-19 y no implementa todavía la consulta del detalle.

- Ordena una copia por instante del servidor y conserva el orden recibido en empates, tanto ascendentes como descendentes. Los campos opcionales ausentes no se deducen de otros eventos.
- Mantiene el instante original en `time[datetime]`. Muestra `DD/MM/YYYY HH:mm` con Day.js y locale español, fijando `America/Lima` conforme a Gestión §5.3 y sin depender de la zona del navegador. La etiqueta visible indica «Hora de Lima».
- Fechas vacías, civiles, sin zona o no interpretables muestran «Fecha no disponible» y quedan al final, con orden estable. Nunca se sustituye una fecha ausente por la hora actual.
- Usa CR-08 para los siete estados de consulta. Fuera de `datos` retira eventos anteriores; `datos` sin entradas muestra vacío. `alReintentar` se emite sin argumentos y solo existe un botón cuando se proporciona el callback.
- Conserva observaciones completas, saltos de línea y ajuste en una columna. La tarjeta tiene encabezado H3 y lista accesible; los eventos tienen descripción H4.

Faltaba CR-09 compartido. Se incorpora únicamente su contexto `despacho` en [BadgeEstado.tsx](../../packages/componentes-compartidos/src/dominio/BadgeEstado.tsx), con catálogo central en [estados.ts](../../packages/componentes-compartidos/src/dominio/estados.ts). Incluye los siete estados definidos, texto e iconos decorativos, tamaños `sm`/`md` y complemento opcional. Un valor desconocido muestra «Estado no disponible», sin exponer el enum. Los demás contextos de CR-09 quedan pendientes de su incremento.

El paquete declara Day.js como dependencia directa, reutilizando la versión ya fijada en el monorepositorio. Se completan tamaños de encabezados, radios y respeto de movimiento reducido en el tema común, con los mismos valores preparados en las ramas de CR-12/18. No se incorporan esos componentes como dependencias de CR-19.

## 3. Verificación realizada

Comandos desde la raíz del frontend: `npm test`, `npm run typecheck`, `npm run build` y `git diff --check`.

| Registro | Evidencia | Resultado observado |
|---|---|---|
| EVCR-19-01 | [Pruebas de CR-19](../../packages/componentes-compartidos/src/dominio/HistorialEstados.test.tsx), CCR-19-01 → TCR-08 | 28 pruebas aprobadas: recepción sin transición, fechas reales, medianoche de Lima, orden estable y por instante, colección inmutable, opcionales, recuperación, estados de consulta y textos completos. |
| EVCR-19-02 | [Pruebas del soporte de estados](../../packages/componentes-compartidos/src/dominio/BadgeEstado.test.tsx) y dependencia CR-08 | 13 pruebas del contexto despacho y 18 de EstadoVista aprobadas; total de esta rama: 59 pruebas en tres archivos. |
| EVCR-19-03 | Compatibilidad e higiene | TypeScript del paquete compartido, ejemplo y ambas aplicaciones aprobado; builds administrativo y repartidor aprobados; diff sin errores de espacios. |

La última ejecución de pruebas usó `TZ=Asia/Tokyo`; Node confirmó esa zona. El caso de medianoche mantuvo `16/10/2026 23:59` y `17/10/2026 00:00` en Lima para instantes UTC consecutivos, conservando sus atributos originales. En PowerShell se reproduce con `$env:TZ = 'Asia/Tokyo'` antes de `npm test`.

[Ejemplo de desarrollo](../../apps/despacho-administrativo/ejemplos/historial-estados.tsx): `http://127.0.0.1:5173/ejemplos/historial-estados.html`. Fechas y personas son fixtures, sin operaciones de backend.

| Recorrido en navegador | Resultado | Captura |
|---|---|---|
| Escritorio, viewport 1440 × 1024 | Cuatro eventos ordenados; se verificó también orden descendente, con recepción primero. | [Historial](../evidencia/cr-19/historial-escritorio.png) |
| Móvil, viewport 390 × 844, recepción | Fecha original conservada; «Fallido» visible una sola vez, sin transición ficticia ni desbordamiento horizontal. | [Recepción](../evidencia/cr-19/recepcion-movil.png) |
| Móvil, observación extensa | Texto completo en varias líneas, incluida la última frase; sin desbordamiento horizontal. | [Observaciones](../evidencia/cr-19/observaciones-movil.png) |
| Móvil, acceso denegado después de datos | Lista, fechas, autoría y observaciones retiradas del DOM. | [Acceso denegado](../evidencia/cr-19/acceso-denegado-movil.png) |

En error se recorrió el botón con Tab y se activó con Enter: foco visible, carga y recuperación de datos del ejemplo. Se revisaron las reglas de movimiento reducido; no se emuló esa preferencia ni se realizó una auditoría completa WCAG o con lector de pantalla.

## 4. Límites y entrega

El contrato vigente ya define el DTO de historial y la zona `America/Lima` para el detalle de F-04. La revisión final incorporó esa decisión a las fechas del componente; las cuestiones generales DC-04/DC-06 no se cierran desde este incremento. La consulta, autorización del servidor y adaptación al detalle de incidencia deben verificarse al integrar el consumidor. Esta evidencia no acredita esos servicios ni cierra las especificaciones funcionales.

El registro se conserva en `docs/` del frontend. Las especificaciones y sus estados no se modifican desde este incremento. Los commits permanecen locales; la revisión humana y entrega por PR siguen pendientes.

## 5. Referencias

1. Documento de componentes de la revisión indicada en §1: CR-19, CCR-19-01, ICR-08/TCR-08, CR-08/09 y DC-04/06.
2. Sistema de diseño de la misma revisión: §§5.5, 16.1 y 23.
3. Contrato de Gestión de la misma revisión: §§5.2.1 y 5.3, recepción física, historial y fechas del detalle.
