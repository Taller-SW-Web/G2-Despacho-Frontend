# Historial de cambios

Este archivo resume los cambios significativos del frontend. Los avances en integración se registran en `Sin publicar`; al preparar una entrega se agrupan en una versión con fecha y se promueven de `develop` a `main` mediante PR, siguiendo el flujo de [G2-Despacho-Specs](https://github.com/Taller-SW-Web/G2-Despacho-Specs/blob/main/CONTRIBUTING.md).

Revisar el corte aproximadamente cada dos semanas. La versión cambia cuando se entrega un conjunto de cambios, no por el paso del tiempo. Durante el desarrollo inicial se utiliza `0.x.y`: por ejemplo, nuevas capacidades en `0.2.0` y correcciones de una entrega en `0.1.1`. Los tags se crean manualmente; no se genera una GitHub Release automáticamente.

## Sin publicar

Sin cambios funcionales de una entrega posterior registrados todavía en esta rama. Al integrar nuevos avances, documentarlos aquí antes de cerrar la siguiente versión. Las ramas `develop` y de trabajo pueden contener código posterior que aún no forma parte de esta línea base.

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
