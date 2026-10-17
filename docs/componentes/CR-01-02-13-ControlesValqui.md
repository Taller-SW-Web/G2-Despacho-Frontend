# CR-01, CR-02 y CR-13 · Componentes de Valqui

## 1. Fuentes y alcance

Responsable del reparto: **Valqui, F-01 y Arquitectura**. Revisor propuesto: **Max**. Se implementan los tres elementos asignados en ECR-01 §4.5, con sus contratos de §3 [cite: 1].

- Especificaciones locales revisadas: `despacho-docs`, revisión `91db8f89a7e12700b6e7078668ed2c9f3d2f4e92`.
- Diseño: `disenio/SYSTEM-DESIGN.md`, §§11.3–11.6, 12.1–12.2, 13.9 y 15 [cite: 2].
- Implementación: `packages/componentes-compartidos/src/`; ejemplo en `apps/despacho-administrativo/ejemplos/controles-valqui.*`.

CR-01 y CR-02 son patrones de configuración para los controles Mantine existentes. El consumidor mantiene valores, validación, permisos, restricciones contractuales y operaciones. CR-13 presenta las acciones y emite su identificador. El ejemplo utiliza operaciones demoradas simuladas.

## 2. CR-01 AccionesUi

```tsx
import { Button, ActionIcon } from '@mantine/core';
import { accionesUi, accionesIconoUi } from '@despacho/componentes-compartidos';

<Button {...accionesUi.principal} type="submit" loading={enviando} aria-busy={enviando}>
  Guardar zona
</Button>
<Button {...accionesUi.secundaria} type="button" onClick={cancelar}>Cancelar</Button>
<ActionIcon {...accionesIconoUi.movil} type="button" aria-label="Actualizar zonas" onClick={actualizar}>
  <IconRefresh size={20} aria-hidden="true" />
</ActionIcon>
```

`accionesUi` ofrece `principal`, `secundaria`, `terciaria` y `destructiva`. Las acciones de icono ofrecen `escritorio` y `movil` (44 px). Usar una principal por contexto, `size="sm"` en tablas/filtros y `size="lg" fullWidth` en acciones operativas móviles. El tema conserva la etiqueta visible durante `loading`; el hover de botones filled usa texto inverse.

Un bloqueo funcional combina `disabled`, un motivo visible y `aria-describedby` apuntando a ese motivo. Explicitar `type`; solo el envío utiliza `submit`.

El contenedor bloquea sincrónicamente los envíos repetidos antes de esperar la petición:

```tsx
const bloqueo = useRef(false);
async function guardar() {
  if (bloqueo.current) return;
  bloqueo.current = true;
  cambiarEnviando(true);
  try { await ejecutarOperacion(); }
  finally { bloqueo.current = false; cambiarEnviando(false); }
}
```

El consumidor maneja el error y el resultado confirmado. La exclusión local complementa la idempotencia contractual del backend.

## 3. CR-02 CamposFormulario

`camposFormulario` exporta configuraciones `moneda`, `seleccion`, `comentario` y `fecha`. Se combinan con los controles nativos; conservan sus firmas de eventos. El tema comparte tamaños y mensajes de selección para `TextInput`, `PasswordInput`, `NumberInput`, `Textarea`, `Checkbox`, `Radio`, `Select`, `MultiSelect` y `TagsInput`.

```tsx
const [importe, cambiarImporte] = useState<string | number>('');
const [fecha, cambiarFecha] = useState<string | null>(null);

<NumberInput {...camposFormulario.moneda}
  id="tarifa" label="Tarifa base" required
  value={importe} onChange={cambiarImporte}
  min={0} allowNegative={false} error={errores.tarifa}
/>
<DatePickerInput {...camposFormulario.fecha}
  id="fecha" label="Fecha programada" value={fecha} onChange={cambiarFecha}
/>
```

- `moneda` añade `PEN` fuera del valor y dos decimales. El consumidor aporta `min`, `allowNegative` y demás restricciones según su contrato. Validar antes de convertir; no usar `Number('')` como sustituto de validación.
- `fecha` usa español y `DD/MM/YYYY`. Mantine 9 entrega fecha civil `YYYY-MM-DD` o `null`; conservarla al adaptar un campo de fecha civil, sin `new Date(...).toISOString()`. El consumidor aporta los límites acordados.
- Campos con `id`, etiqueta visible, `required` real y `description`/`error` asociados por Mantine. `readOnly` conserva la posibilidad de enfocar; no equivale a `disabled`.
- En selecciones con más de ocho opciones, usar `searchable`; `clearable` para filtros opcionales, con nombre accesible para limpiar. Los controles múltiples conservan listas; no se convierten en una firma universal de `onChange`.
- Sello: `Radio.Group` obligatorio, valor inicial `''`; convertir `'si'` a `true` y `'no'` a `false` después de comprobar que hubo selección. Un checkbox no representa las tres situaciones.
- Comentarios: aportar el límite acordado con `maxLength` y contador asociado. No se deducen límites desde etiquetas.
- En móvil usar controles operativos `size="lg"`, campos apilados y nombres completos.

El paquete declara `@mantine/dates` 9.6.2 explícitamente. Cada consumidor de fechas importa también `@mantine/dates/styles.css`.

## 4. CR-13 BarraAccionesFija

```tsx
import { BarraAccionesFija } from '@despacho/componentes-compartidos';

// Después del último campo, dentro del contenedor de contenido.
<BarraAccionesFija
  principal={{ id: 'guardar', etiqueta: 'Guardar zona', loading: enviando,
    disabled: bloqueada, motivoDeshabilitado: motivo }}
  secundaria={{ id: 'cancelar', etiqueta: 'Cancelar', disabled: enviando }}
  intencionPrincipal="principal"
  alAccionar={(id) => {
    if (id === 'guardar') referenciaFormulario.current?.requestSubmit();
    else cancelar();
  }}
/>
```

Propiedades públicas: `principal: AccionUi`, `secundaria?: AccionUi`, `intencionPrincipal?: 'principal' | 'destructiva'` (predeterminado `principal`), `alAccionar(id)`. Se exporta también `PropiedadesBarraAccionesFija`.

- Región «Acciones de la página», botones nativos `type="button"`, motivos visibles e identificadores de ayuda únicos. Para enviar un formulario se solicita `requestSubmit()` desde el consumidor.
- Bloqueo/carga de cada acción impide su activación. El consumidor puede bloquear ambas durante una operación, como en el ejemplo.
- Escritorio: superficie blanca, borde superior y acciones a la derecha, secundaria primero. Bajo 768 px: secundaria encima, principal abajo, ancho completo y altura mínima de 50 px.
- `ResizeObserver` mide la barra y el contenedor; la reserva coincide con la altura real, incluidos motivos multilínea, etiquetas largas y `safe-area-inset-bottom`. Ancho y posición horizontal siguen al contenedor. Se retiran observador y listeners al desmontar.
- Colocar al final del contenido en flujo normal, sin añadir otra reserva fija ni superponer la navegación inferior. Al usarla en CR-04 se debe elegir `modoPie="acciones"`. Evitar ancestros con `transform` que cambien el bloque de referencia de `position: fixed`.

## 5. Verificación reproducible

```bash
npm install
npm test
npm run typecheck
npm run build
npm run dev:administrativo
```

Abrir <http://localhost:5173/ejemplos/controles-valqui.html>. Es una entrada de desarrollo de Vite; no se agrega a la entrada de producción.

### 5.1. Trazabilidad automatizada

| Criterio | Incremento | Prueba |
|---|---|---|
| CCR-01-01 | ICR-01 / TCR-01, parte Valqui | `src/formularios/patrones.test.tsx`: doble activación síncrona, carga y reintento. |
| CCR-01-02 | ICR-01 / TCR-01, parte Valqui | Mismo archivo: motivo asociado y Cancelar sin submit. |
| CCR-02-01 | ICR-01 / TCR-01, parte Valqui | Mismo archivo: error corregible sin perder otros valores. |
| CCR-02-02 | ICR-01 / TCR-01, parte Valqui | Mismo archivo: vacío frente a No y teclado. |
| CCR-02-03 | ICR-01 / TCR-01, parte Valqui | Mismo archivo: vacío, cero y `PEN` separado del valor. |
| CCR-13-01 | ICR-03 / TCR-03, parte Valqui | `src/estructura/BarraAccionesFija.test.tsx`: reserva dinámica, limpieza, acciones y accesibilidad; comprobación de layout en navegador. |

Las rutas de pruebas son relativas a `packages/componentes-compartidos`. JSDOM usa un `ResizeObserver` simulado: la prueba de medidas acredita la reacción a cambios, no calcula layout.

### 5.2. Revisión en navegador

Pasos: revisar 1440×1024, 1024×768 y 390×844; desplazarse al último campo, escribir `error`, comprobar campo/error por encima del pie con motivo largo; usar Tab/Enter/Espacio; desbloquear, validar y corregir; introducir importe cero, elegir fecha y sello No; enviar dos veces durante carga; revisar error y reintentar tras desactivar «Simular error al guardar». Repetir en 320 px para comprobar desbordamiento.

El script [`verificar.mjs`](../evidencia/cr-01-02-13/verificar.mjs) automatiza esos pasos con Chrome/Playwright, comprueba ausencia de errores de ejecución y genera capturas junto al script. Usa `Asia/Tokyo` para revisar fechas civiles desde otra zona horaria. Playwright es una herramienta opcional de evidencia, instalada fuera del proyecto; `PLAYWRIGHT_MODULE` puede apuntar al módulo instalado y `CHROME_PATH` al navegador local:

```bash
EJEMPLO_URL=http://127.0.0.1:5173/ejemplos/controles-valqui.html PLAYWRIGHT_MODULE=/tmp/opencode/node_modules/playwright/index.mjs node docs/evidencia/cr-01-02-13/verificar.mjs
```

### 5.3. Resultados

Comprobaciones ejecutadas el **16/10/2026**, sobre los cambios locales de esta entrega:

| Comprobación | Resultado real |
|---|---|
| `npm test` | **116 pruebas aprobadas** en siete archivos. Incluye 17 nuevas: nueve de patrones y ocho de barra. |
| `TZ=Asia/Tokyo npm test` | 116 pruebas aprobadas antes del ajuste final de especificidad CSS. La comprobación final ordinaria y la del navegador incluyen ese ajuste. |
| `npm run test:f04` | **7 pruebas aprobadas** de la pantalla consumidora existente. |
| `npm run typecheck` | Paquete compartido, pruebas, ejemplos y ambas aplicaciones aprobados. |
| `npm run build` | Ambas aplicaciones compiladas. Vite conserva el aviso por tamaño del chunk administrativo (841,30 kB); no impide la compilación. |
| Chrome headless con `verificar.mjs` | Correcto en **1440×1024, 1024×768, 390×844 y 320×844**. Sin errores de ejecución de página. |
| Revisión de capturas | Barra alineada, botones apilados y a ancho completo en móvil; motivo largo y último error visibles; etiqueta y loader visibles juntos durante la carga. |
| `git diff --check` | Sin errores de espacios. |

La revisión en navegador detectó dos interferencias del orden de carga de estilos: el ancho del botón móvil y el contenido en carga. Se corrigió la especificidad de los CSS Modules y se amplió el script para comprobar ancho y posición efectiva del texto, además de su opacidad. También se comprobó la reducción de la reserva al retirar el motivo largo.

Capturas generadas por la ejecución final:

| Viewport | Bloqueo y último error | Carga con etiqueta conservada |
|---|---|---|
| Escritorio 1440×1024 | [Captura](../evidencia/cr-01-02-13/escritorio-bloqueo.png) | [Captura](../evidencia/cr-01-02-13/escritorio-carga.png) |
| Tableta 1024×768 | [Captura](../evidencia/cr-01-02-13/tableta-bloqueo.png) | [Captura](../evidencia/cr-01-02-13/tableta-carga.png) |
| Móvil 390×844 | [Captura](../evidencia/cr-01-02-13/movil-bloqueo.png) | [Captura](../evidencia/cr-01-02-13/movil-carga.png) |
| Ancho 320×844 | [Captura](../evidencia/cr-01-02-13/estrecho-bloqueo.png) | [Captura](../evidencia/cr-01-02-13/estrecho-carga.png) |

El navegador simula viewports y movimiento reducido; no se verificó un dispositivo físico con notch ni teclado virtual. La zona segura se contempla mediante `env(safe-area-inset-bottom)`; su valor en esta ejecución de escritorio es cero.

La revisión humana de Max y la integración con endpoints reales de F-01/F-03 corresponden a las entregas consumidoras. Las simulaciones verifican presentación y eventos, no autorización, idempotencia ni operaciones reales del servidor.

## 6. Referencias

1. [ECR-01, especificación y reparto §4.5](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/91db8f89a7e12700b6e7078668ed2c9f3d2f4e92/disenio/componentes-react.md).
2. [Sistema de diseño compartido](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/91db8f89a7e12700b6e7078668ed2c9f3d2f4e92/disenio/SYSTEM-DESIGN.md).
