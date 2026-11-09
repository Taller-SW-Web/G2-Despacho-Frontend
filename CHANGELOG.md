# Historial de cambios

Los cambios de cada entrega se consolidan al preparar una línea base en `main`, según la [guía de contribución](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/main/CONTRIBUTING.md). Los tags se crean sobre los commits de entrega aprobados.

## 0.2.0 — 2026-11-09

La fecha identifica la preparación del corte.

### Añadido

- F-03: PWA del repartidor con ruta, detalle, inicio de traslado, entrega y fallo con foto, cierre y resumen. Incluye demo en memoria y carga de evidencia por URL firmada; reduce fotos en el navegador y conserva la clave del comando entre reintentos.
- F-04: confirmación de recepción en centro, reprogramación y cierre administrativo de un despacho fallido como devuelto a origen. Los formularios conservan el contexto y pueden recuperar una respuesta perdida.
- F-02: consulta de rutas por jornada y repartidor, reordenamiento por teclado o arrastre y reasignación con motivo.
- Acceso humano en ambas aplicaciones, MFA para el gestor, renovación rotativa y cierre de sesión.
- CI/CD: suites de las dos apps, artefactos de compilación, check `CI frontend verde` para Vercel y verificación posterior de las URLs de producción.

### Cambiado

- F-04: mejor lectura del listado, el detalle y el historial de incidencias.
- F-05/F-06: vinculación de repartidores y operación de jornadas alineadas con el contrato de Seguridad; aislamiento de consultas al cambiar de sesión.
- Componentes compartidos, legibilidad y pantallas de acceso denegado alineados con el sistema de diseño. La tarjeta de reparto admite destinatario y dirección ausentes y muestra la hora del resultado.

### Integraciones

- El emisor temporal permite probar el acceso local. La validación con cuentas reales de G7 y el recorrido completo de evidencia fotográfica requieren sus servicios correspondientes.

## 0.1.0

Primera línea base del frontend, correspondiente al corte de código de la semana 1 en [5384180](https://github.com/Taller-SW-Web/G2-Despacho-Frontend/tree/5384180b36fb5fcb707a4dbdf7f60dda34459322), incorporado a `main` el **17/10/2026**. Esa fecha identifica el código de referencia, no una publicación ni un tag ya creado.

La documentación raíz de esta línea base se prepara el **24/10/2026** directamente en `main`, por solicitud del usuario, sin cambios funcionales ni integración de las ramas posteriores. Se recomienda crear `v0.1.0` sobre el commit que incorpora estos tres documentos: conserva el código de referencia e incluye las instrucciones de la entrega. La versión ya declarada en los manifiestos es `0.1.0`; no se cambian dependencias ni lockfile.

### Añadido

- Monorepositorio npm con aplicaciones administrativa y de repartidor en React, TypeScript y Vite; paquetes compartidos de cliente API, tipos, tema y componentes Mantine.
- F-01: gestión de zonas, distritos/códigos postales y tarifas; probador local de cobertura/cotización y sesión temporal.
- F-02: cola de programación, indicadores, filtros, generación de pedidos de prueba y asignación a candidatos disponibles.
- F-03: experiencia de desarrollo con ruta, detalle, traslado, entrega/fallo, evidencia y cierre simulados en memoria; composición de producción con consultas por API de ruta, detalle y resumen.
- F-04: listado de entregas fallidas y detalle de incidencia, recepción consultada, historial, comunicaciones, decisiones preparadas y visor de evidencia.
- F-05: catálogos de repartidores/furgonetas, formularios, cambios de estado y vinculación de cuenta.
- F-06: jornadas, apertura/cierre, detalle, monitoreo, indicadores y ocupación.
- Pruebas Vitest de componentes y aplicación administrativa, recorridos Playwright F-01/F-02, ejemplos visuales de desarrollo y configuración SPA de Vercel por aplicación.
- README autosuficiente de ejecución/configuración y AGENTS con referencias a Specs y criterios de trabajo/documentación.

### Límites de la línea base

- Inicio de sesión definitivo e integración/aceptación conjunta con los módulos externos pendientes. Los datos y credenciales ficticios de las demos no acreditan autenticación o persistencia de producción.
- Entrega, fallo, carga de evidencia y cierre reales de F-03 pendientes de integración; la experiencia en memoria no modifica las APIs administrativas ni la base de datos.
- Formularios de recepción, reprogramación y cierre de F-04, así como rutas/reasignación de F-02, fuera del código de esta línea base. Los avances posteriores deben registrarse en su siguiente entrega.
- Las pruebas existentes y sus guías identifican sus propios entornos; registrar esta versión no sustituye su ejecución ni declara completitud de todas las especificaciones.
