# CR-03 ShellAdministrativo

**Responsable:** Rhamses. **Revisión:** identificada por el historial de Git.
**Fuente:** Specs local `91db8f8`, `disenio/componentes-react.md` §§1, CR-03 y 4.5; `SYSTEM-DESIGN.md` §§6, 17 y 18 [cite: 1].

## 1. Alcance y contrato

Implementación en `packages/componentes-compartidos/src/estructura/ShellAdministrativo.tsx`, exportada desde `@despacho/componentes-compartidos`, con tipos públicos. Recibe `destinos`, `destinoActivo`, `usuario`, `logoUrl`, `rutaInicio`, `children`, `contexto`, `alNavegar(id, ruta)` y `alCerrarSesion()`.

La lista conserva el orden del consumidor y solo contiene destinos que este haya autorizado. El shell no decide permisos, interpreta JWT ni llama APIs. Mantiene un único `main`, enlace para saltar al contenido, logo con alt, menú de usuario y cierre de sesión por evento. Ctrl/clic y otros modificadores conservan la navegación nativa del enlace.

El menú móvil usa Drawer con foco contenido, cierre por Escape y devolución al disparador; se cierra tras navegar. La navegación lateral usa 72 px desde 768 px y 256 px desde 1200 px. Por debajo de 768 px usa Drawer. El tema fija los breakpoints del diseño para ambas apps.

## 2. Trazabilidad y verificación

| Criterio | Incremento | Archivo de prueba | Comprobación |
|---|---|---|---|
| CCR-03-01 | TCR-03 | `src/estructura/ShellAdministrativo.test.tsx` | Cambio controlado de ruta, un destino activo y un main; logo y contenido. |
| CCR-03-02 | TCR-03 | Mismo archivo | Abrir con Enter, recorrer enlaces con Tab, Escape y retorno del foco. |
| Composición | TCR-03 | Mismo archivo | Cierre tras navegar y evento de cierre de sesión. |

`npm test` aprobó las 147 pruebas compartidas, incluidas las 3 del shell. `npm run test:f04` aprobó 8 pruebas administrativas, incluida la regresión de cierre de sesión. `npm run typecheck` y `npm run build` aprobaron para ambas aplicaciones. Las pruebas usan Mantine y JSDOM: no acreditan layout responsive en un navegador real.

## 3. Consumo y dependencias

La aplicación administrativa utiliza ahora el contrato completo. Su sesión sigue siendo provisional: muestra «Sesión provisional / Identidad no disponible», sin inventar la identidad de un JWT. `logoUrl=""` utiliza texto de marca como fallback explícito; falta integrar el logo inverso autorizado. La integración completa de identidad, permisos y login corresponde al proveedor de Seguridad y Usuarios.

El callback de cierre elimina el token local y bloquea su recuperación automática desde `VITE_DEV_TOKEN`; la prueba administrativa `src/sesion/SesionProveedor.test.tsx` verifica esa regresión y la apertura explícita de una nueva sesión.

## 4. Evidencia reproducible y límites

Ejecutar `npm run dev:administrativo` y abrir `/ejemplos/componentes-rhamses.html`: utiliza identidad y destinos simulados. Revisar a 390, 768, 1024 y 1440 px, activar los destinos con teclado, abrir/cerrar Drawer y menú de usuario. La revisión visual no se considera completada: el navegador integrado no se conectó y el control nativo se detuvo al no poder verificar la URL. No hay capturas acreditadas ni auditoría WCAG completa. Revisión de Max pendiente.

## 5. Referencias

- [cite: 1] Repositorio hermano `despacho-docs`, revisión `91db8f8`: catálogo CR-03, CCR-03-01/02 y sistema de diseño. El código parte del frontend `10d2e9e`; implementación registrada en `b64778e`.
