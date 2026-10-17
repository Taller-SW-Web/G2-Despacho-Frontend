# CR-09 BadgeEstado

**Responsable:** Rhamses. **Fecha:** 16/10/2026, America/Bogota.
**Fuente:** Specs local `91db8f8`, `disenio/componentes-react.md`, CR-09; `SYSTEM-DESIGN.md` §§11.7 y 16 [cite: 1].

## 1. Alcance y contrato

Se completa el componente previo, conservando los consumidores de F-04. `BadgeEstado` recibe `contexto`, `valor: unknown`, `size="md"` y `complemento` opcional. Los ocho contextos están tipados: `despacho`, `operacionRepartidor`, `registro`, `zona`, `vehiculo`, `vinculacion`, `recepcion` y `etiqueta`.

La configuración única reside en `src/dominio/estados.ts`. Se conserva `obtenerEstadoDespacho` para compatibilidad y se incorpora la resolución por contexto. Los valores desconocidos, objetos y claves del prototipo usan «Estado no disponible». Nunca se imprime el enum como recuperación.

Disponible usa volt suave; Nuevo usa signal y texto blanco; Vinculado se presenta como texto e icono sin badge. Tiempo de espera elevado es un icono con nombre accesible y tooltip. Las demás etiquetas conservan texto visible e iconos decorativos. No se atenúan filas ni se cambia el estado al registrar recepción.

## 2. Trazabilidad y verificación

| Criterio | Incremento | Archivo | Comprobación |
|---|---|---|---|
| CCR-09-01 | TCR-02 | `src/dominio/BadgeEstado.test.tsx` | Correspondencias de los ocho contextos, semántica e iconos; Fallido conserva etiqueta con recepción confirmada. |
| CCR-09-02 | TCR-02 | Mismo archivo | Valores desconocidos, objetos, null y claves heredadas sin filtrar información técnica. |

Resultados y comandos en [la entrega](./Entrega-Rhamses.md). El catálogo completo tiene 54 pruebas, incluidas las 13 previas.

## 3. Consumo y límites

Se importa desde `@despacho/componentes-compartidos`. `EN_JORNADA`, `PROGRAMADO` y demás etiquetas de UI son valores del modelo de presentación, no nuevos enums del backend. Para fecha programada se proporciona la fecha ya formateada en `complemento`. El adaptador consumidor deriva esas etiquetas; el componente no interpreta disponibilidad, permisos ni respuestas HTTP.

El consumidor controla cuándo retirar Nuevo (5 s) y los estilos de fila de Retorno atrasado. Este componente no tiene temporizadores ni modifica sus datos.

El ejemplo `/ejemplos/componentes-rhamses.html` muestra el catálogo en superficie clara y una muestra en ink. Pendientes: revisión visual real, contraste medido y aprobación de Max. No se certifican por JSDOM.

## 4. Referencias

- [cite: 1] Specs `91db8f8`: CR-09, CCR-09-01/02 y tablas de estados de §16. Frontend base `10d2e9e`; implementación local sin commit.
