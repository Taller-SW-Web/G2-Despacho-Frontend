# CR-18 VisorEvidencia: uso y evidencia

**Fecha:** 16/10/2026, America/Lima. **Responsable:** Gerardo; implementación asistida por Codex.

**Rama:** `feature/f04-visor-evidencia`, creada desde `main` e incorporando CR-08 en `abce8df` como dependencia. **Implementación:** `7606ef949cac5007cb875c525ab1c38985dbbbbe`.

**Estado:** Implementado y verificado de forma aislada. Revisión humana de Max/Rhamses, PR e integración con el servicio real pendientes.

## 1. Fuentes y alcance

- [Contrato CR-18 y reglas transversales, revisión dd614bd](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/dd614bdfeb439ded41c74b73b5d59d9c1724f5fb/disenio/componentes-react.md#cr-18-visorevidencia): propiedades, eventos, `CCR-18-01/02`, CR-08 y subconjunto CR-18 de `TCR-07` [cite: 1].
- [Sistema de diseño, misma revisión](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/dd614bdfeb439ded41c74b73b5d59d9c1724f5fb/disenio/SYSTEM-DESIGN.md): §§12.6, 17, 22 y 23; imagen completa, diálogo y hoja inferior móvil [cite: 2].
- [API de Operación §3](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/dd614bdfeb439ded41c74b73b5d59d9c1724f5fb/integraciones/api-contract-operacion-reparto.md#3-api-de-f-03-operación-del-repartidor): autorización temporal de lectura mediante `POST /api/v1/evidencias/{idEvidencia}/acceso`. CR-18 aplica esta fuente canónica conforme a DC-03; no redefine almacenamiento ni payloads [cite: 3].

El visor presenta una evidencia autorizada y distingue carga, imagen lista, ausencia, expiración, error y falta de permisos. No consulta APIs, deduce autorizaciones ni construye rutas de almacenamiento.

## 2. Uso y responsabilidades

Se exportan `VisorEvidencia`, `PropiedadesVisorEvidencia` y `EstadoVisorEvidencia` desde `@despacho/componentes-compartidos`. [Código](../../packages/componentes-compartidos/src/dominio/VisorEvidencia.tsx) y [estilos](../../packages/componentes-compartidos/src/dominio/VisorEvidencia.module.css).

```tsx
const accesoVigente = consulta?.idDespacho === idDespacho
  ? consulta.acceso
  : { estado: 'carga' as const };

<VisorEvidencia
  {...accesoVigente}
  abierto={abierto}
  descripcion={`Evidencia de entrega del despacho ${codigoDespacho}`}
  alCerrar={cerrarYRetirarReferencia}
  alSolicitarAcceso={solicitarNuevaAutorizacion}
  alFallarImagen={clasificarFalloDeImagen}
/>
```

El contenedor vincula cada respuesta con el despacho solicitado, descarta respuestas tardías y entrega carga sin URL anterior al cambiar de recurso. CR-18 no recibe un identificador del despacho con el que pueda verificar esa correspondencia. Al cerrar, el contenedor retira su referencia temporal; al reabrir solicita el acceso pertinente. Las URLs no se guardan en almacenamiento del navegador, logs ni evidencia de pruebas.

En `lista` los tipos requieren `urlAutorizada`; una cadena vacía se trata como error sin crear una imagen. La foto permanece oculta tras un skeleton hasta completar su carga, usa `fit="contain"` y se vuelve a montar al cambiar la referencia. Al salir de `lista`, cerrar o fallar la imagen, la foto y su URL se retiran del DOM, incluso durante la transición de cierre. No hay enlace público ni imagen alternativa de respaldo.

`alFallarImagen` se emite sin argumentos y una sola vez por fallo; el visor muestra un error genérico y el contenedor determina si hubo expiración u otro problema. Volver a cargar/Reintentar emiten `alSolicitarAcceso`; Esc, cierre y Volver emiten `alCerrar`. La apertura sigue controlada por el consumidor.

Se reutiliza CR-08 para las respuestas de consulta. `mensajeSinEvidencia` permite explicar una ausencia confirmada; no se presupone «No intentado». En escritorio se usa un modal amplio; bajo 576 px se adapta por CSS a hoja inferior manteniendo la misma instancia y espacio para la zona segura. El marco de carga es 4:3. La escala de títulos, radios y movimiento reducido del tema quedan alineados con los ya utilizados en CR-12.

## 3. Verificación

Entorno: Windows, Node.js 22.16.0, npm 10.9.2, React 19.3.0, Mantine 9.6.2 y Vitest 3.2.7. Verificación sobre el código del commit indicado, sin dependencias nuevas.

| Trazabilidad | Comprobación | Resultado |
|---|---|---|
| CR-18 → CCR-18-01 → TCR-07/CR-18 | [Pruebas](../../packages/componentes-compartidos/src/dominio/VisorEvidencia.test.tsx): expiración, renovación solicitada al consumidor y ausencia de rutas alternativas. | Aprobado. |
| CR-18 → CCR-18-02 → TCR-07/CR-18 | Mismas pruebas: retirada de foto/URL al cerrar y cambiar de estado/recurso; rechazo de respuestas tardías con un contenedor y adaptador simulados. | Aprobado. |
| Estados y accesibilidad | Apertura controlada, alt, skeleton, fallo de imagen, ausencia contextual, callbacks, foco inicial/retorno y foco tras renovar. | 22 pruebas de CR-18 aprobadas. |
| Regresión y compatibilidad | `npm test`: 40 pruebas, incluidas las 18 de CR-08. `npm run typecheck` y `npm run build`: ambas aplicaciones y el paquete compartido según sus scripts. | Todos aprobados. |
| Higiene | `git diff --check` y enlaces locales de este documento. | Sin errores. |

## 4. Revisión en navegador

Ejecutar `npm run dev:administrativo` y abrir [visor-evidencia.html](http://localhost:5173/ejemplos/visor-evidencia.html). El [ejemplo](../../apps/despacho-administrativo/ejemplos/visor-evidencia.tsx) utiliza SVG y un archivo no gráfico como fixtures; no emplea autorizaciones reales ni se incluye como entrada en la construcción de producción.

- Escritorio 1440 × 1024: imagen horizontal completa con `contain`, alt descriptivo, foco contenido con Tab y retorno al disparador con Esc. Al cerrar quedan cero imágenes. [Captura](../evidencia/cr-18/imagen-escritorio.png).
- Móvil 390 × 844: expiración sin imagen y renovación explícita; el foco permanece en el visor al sustituir la acción por carga. [Captura](../evidencia/cr-18/enlace-expirado-movil.png).
- Revocación móvil: se observó primero la imagen abierta y después acceso denegado con cero imágenes en el DOM. [Captura](../evidencia/cr-18/permiso-revocado-movil.png).
- Respuesta fuera de orden: DEMO-B mantiene su imagen vertical después de llegar la respuesta tardía de DEMO-A. Sin desbordamiento horizontal. [Captura](../evidencia/cr-18/despacho-cambiado-movil.png).
- Fallo de decodificación: se informa al contenedor, se retira la imagen, no se deduce expiración y Reintentar obtiene nuevamente la imagen de prueba.

## 5. Límites

Estas comprobaciones no acreditan el endpoint de autorización, permisos reales, almacenamiento ni los criterios funcionales de ES-F03-08/ES-F04-02. JSDOM no comprueba layout; esa parte se revisó en navegador. No se emuló movimiento reducido ni se ejecutó una auditoría WCAG o con lector de pantalla. La revisión humana y la publicación permanecen pendientes.

## 6. Referencias

1. ECR-01 de la revisión indicada: CR-18, CCR-18-01/02, CR-01/08, reglas transversales y DC-03.
2. Sistema de diseño de la misma revisión: superposiciones, evidencias y accesibilidad.
3. Contrato de Operación de la misma revisión: API de F-03 y autorización temporal de evidencia.
