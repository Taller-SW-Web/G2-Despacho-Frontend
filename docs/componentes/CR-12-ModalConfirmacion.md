# CR-12 ModalConfirmacion: uso y evidencia

**Fecha:** 16/10/2026, America/Lima. **Responsable:** Gerardo; implementación asistida por Codex.

**Rama:** `feature/f04-modal-confirmacion`, creada desde `main` e incorporando la base de pruebas `3b522a8`. **Implementación:** `ed25104364e64fa405ce360e33d5aa32a79acbd9`.

**Estado:** Implementado y verificado de forma aislada. Revisión humana de Max, PR e integración con los flujos reales pendientes.

## 1. Fuentes y alcance

- [Contrato CR-12 y reglas transversales, revisión dd614bd](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/dd614bdfeb439ded41c74b73b5d59d9c1724f5fb/disenio/componentes-react.md#cr-12-modalconfirmacion): propiedades, eventos y criterios `CCR-12-01/02`; corresponde al subconjunto CR-12 de `TCR-03`, sin declarar completado todo ese incremento [cite: 1].
- [Sistema de diseño, misma revisión](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/dd614bdfeb439ded41c74b73b5d59d9c1724f5fb/disenio/SYSTEM-DESIGN.md): §§7, 12.6, 13.7, 17 y cierre móvil de jornada en §22 [cite: 2].

Confirma una acción y sus efectos sobre un objeto. El consumidor controla apertura, procesamiento, error y resultado; el componente no llama APIs ni se cierra por su cuenta al confirmar. Los formularios complejos se componen por separado.

## 2. Implementación y uso

Se exportan `ModalConfirmacion` y `PropiedadesModalConfirmacion` desde `@despacho/componentes-compartidos`. [Código](../../packages/componentes-compartidos/src/formularios/ModalConfirmacion.tsx) y [estilos](../../packages/componentes-compartidos/src/formularios/ModalConfirmacion.module.css).

```tsx
<ModalConfirmacion
  abierto={abierto}
  titulo="¿Dar de baja el vehículo DEMO-001?"
  descripcion="El vehículo dejará de estar disponible para nuevas jornadas."
  etiquetaConfirmar="Dar de baja"
  intencion="destructiva"
  procesando={procesando}
  error={error}
  alConfirmar={ejecutarOperacion}
  alCancelar={() => cambiarAbierto(false)}
/>
```

El consumidor marca `procesando` al iniciar la operación, lo libera al terminar y decide si cerrar o mostrar un error comprensible. `confirmacionDeshabilitada` permite bloquear solo la confirmación; el motivo funcional se explica en la descripción o el resumen `children`.

- Mantine aporta portal, diálogo modal, contención y devolución de foco. El clic en el fondo no cierra. Durante el envío, Cancelar, Esc, cierre y confirmación están bloqueados; el foco pasa al propio diálogo cuando los botones se deshabilitan.
- En intención destructiva, el foco inicial está en Cancelar. En principal, está en Confirmar si está habilitado; de lo contrario, en Cancelar. Un error conserva el objeto y permite reintentar.
- Ancho de referencia de 480 px; bajo 576 px se adapta a hoja inferior con botones apilados y espacio para la zona segura. Se mantiene la misma instancia de Mantine Modal al redimensionar para conservar contexto y foco.
- Se alinean radios y escala H1–H4 del tema con el diseño, y se activa `respectReducedMotion`. El loader conserva la etiqueta y tiene una regla CSS para detenerse con movimiento reducido. No se incorporan dependencias nuevas.

## 3. Verificación

Windows, Node.js 22.16.0, npm 10.9.2, Mantine 9.6.2 y Vitest 3.2.7. Verificación realizada sobre el código del commit indicado.

| Trazabilidad | Comprobación | Resultado |
|---|---|---|
| CR-12 → CCR-12-01 → TCR-03/CR-12 | [Pruebas](../../packages/componentes-compartidos/src/formularios/ModalConfirmacion.test.tsx): apertura controlada, título/descripción, foco inicial y retorno, cancelación, fondo, bloqueo de envío y doble activación con consumidor controlado. | Aprobado. |
| CR-12 → CCR-12-02 → TCR-03/CR-12 | Mismas pruebas: conservación de objeto/error, recuperación y nueva confirmación. | Aprobado. |
| Compatibilidad | `npm test`: 14 pruebas; `npm run typecheck`: paquete, ejemplo y ambas apps; `npm run build`: ambas apps. | Todos aprobados. |
| Higiene | `git diff --check` y comprobación de enlaces locales de este documento. | Sin errores. |

Revisión adicional en navegador con el [ejemplo de desarrollo](../../apps/despacho-administrativo/ejemplos/modal-confirmacion.tsx), disponible mediante `npm run dev:administrativo` en [modal-confirmacion.html](http://localhost:5173/ejemplos/modal-confirmacion.html). La entrada del ejemplo no se incluye en la construcción de producción.

- Escritorio 1440 × 1024: ancho de 480 px, Cancelar enfocado en la acción destructiva, Tab/Shift+Tab contenidos y devolución al disparador con Esc. [Captura](../evidencia/cr-12/confirmacion-escritorio.png).
- Móvil 390 × 844: cierre de jornada como hoja inferior, acciones apiladas y sin scroll horizontal. [Confirmación](../evidencia/cr-12/confirmacion-movil.png).
- Envío móvil: las tres acciones deshabilitadas, diálogo ocupado, foco dentro y Esc sin cierre. [Captura](../evidencia/cr-12/procesando-movil.png).
- Fallo móvil: error, mismo resumen de jornada y reintento habilitado. [Captura](../evidencia/cr-12/error-movil.png).
- Éxito simulado: el contenedor cierra el diálogo y el foco vuelve a Abrir confirmación. Acción principal verificada en naranja `rgb(247, 103, 7)`, texto ink y altura de 44 px.

## 4. Límites

La simulación demora tres segundos y no modifica datos de negocio. JSDOM no verifica layout; las comprobaciones visuales y de teclado se hicieron en navegador. La preferencia de movimiento reducido no se emuló en esa revisión. No se declara una auditoría completa WCAG, una prueba con lector de pantalla ni la integración real de F-04/F-03. La revisión humana y la publicación siguen pendientes.

## 5. Compatibilidad con las especificaciones actualizadas

Revisión del 16/10/2026 contra Specs `54b785d13f25bc3017cc407332446b3ac83b243e`: CR-12 y CCR-12-01/02 no cambiaron; no requiere modificar el componente. Los nuevos planes de F-04 componen [recepción](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/54b785d13f25bc3017cc407332446b3ac83b243e/especificaciones/ES-F04-03-ConfirmarRecepcionPaquete/plan.md), [reprogramación](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/54b785d13f25bc3017cc407332446b3ac83b243e/especificaciones/ES-F04-04-ReprogramarDespachoFallido/plan.md) y [cierre](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/54b785d13f25bc3017cc407332446b3ac83b243e/especificaciones/ES-F04-05-CerrarDespachoComoDevueltoAOrigen/plan.md) como formularios locales con Mantine, con su propia validación e identidad de comando [cite: 3].

El consumidor debe conservar incidencia, versión y contenido enviados. Una respuesta perdida exige consultar antes de repetir; un conflicto exige renovar y revisar. `procesando` bloquea durante el envío y `confirmacionDeshabilitada` permite mantener bloqueada la confirmación durante esa recuperación. La consulta, el reconocimiento de éxito y la decisión de cerrar pertenecen al consumidor; el modal genérico no interpreta códigos HTTP ni añade reintentos automáticos.

Se volvió a ejecutar `npm test` en `feature/f04-modal-confirmacion`: 14 pruebas aprobadas. La evidencia visual original sigue correspondiendo al código sin cambios.

## 6. Referencias

1. ECR-01 en la revisión indicada: CR-12, CCR-12-01/02, patrón CR-01 y reglas transversales.
2. Sistema de diseño de la misma revisión: superposiciones, confirmación, tokens, accesibilidad y cierre móvil.
3. Specs `54b785d`, CR-12; planes de ES-F04-03/04/05 y Gestión §§5.2.1–5.2.3: formularios y recuperación de comandos.
