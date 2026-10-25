import { test, expect } from '@playwright/test';

// CierreNavegadorPruebas: Gestión/Flyway/PostgreSQL reales, JWT controlado,
// proxy de pruebas y sin receptor real de Ventas ni instancia de Operación.
test('cierra con respuesta perdida, recupera el original y conserva consulta y foco', async ({ page, request, browser }, informacion) => {
  const id = '00000000-0000-0000-0000-000000000065';
  const incidencia = '00000000-0000-0000-0000-000000000066';
  const api = 'http://127.0.0.1:18086/api/v1/despachos/' + id;
  const headers = { Authorization: 'Bearer gestor' };
  const inicial = await request.get(api + '/incidencia', { headers });
  expect(inicial.status()).toBe(200); expect((await inicial.json()).estado, 'Reinicia la instancia desechable para repetir').toBe('FALLIDO');
  await page.goto('/entregas-fallidas/' + id + '?incidencia=' + incidencia + '&origen=motivo%3DCLIENTE_AUSENTE%26recepcion%3DRECIBIDO_EN_CENTRO');
  const disparador = page.getByRole('button', { name: 'Cerrar como devuelto a origen', exact: true });
  await disparador.click(); const modal = page.getByRole('dialog', { name: 'Cerrar como devuelto a origen', exact: true });
  const motivo = modal.getByRole('textbox', { name: /Motivo del cierre/ });
  await expect(motivo).toBeEnabled(); await expect(modal.getByRole('button', { name: 'Cerrar despacho', exact: true })).toBeDisabled();
  await expect(modal.getByText(/No habrá más entregas/)).toBeVisible();
  for (let paso = 0; paso < 6; paso++) {
    await page.keyboard.press('Tab'); expect(await modal.evaluate((elemento) => elemento.contains(document.activeElement))).toBe(true);
  }
  await modal.getByRole('button', { name: 'Cancelar' }).click(); await expect(disparador).toBeFocused();
  await disparador.click(); await expect(motivo).toBeEnabled();
  await motivo.fill('😀'.repeat(501)); await expect(modal.getByRole('button', { name: 'Cerrar despacho', exact: true })).toBeDisabled();
  await motivo.fill('  ' + '😀'.repeat(500) + '  '); await expect(modal.getByRole('button', { name: 'Cerrar despacho', exact: true })).toBeEnabled();
  await motivo.fill('  Decisión operativa\nsin otra entrega  ');
  await modal.getByRole('textbox', { name: 'Observación (opcional)' }).fill('  Paquete disponible en centro  ');
  await page.setViewportSize({ width: 390, height: 844 }); await expect(modal).toBeVisible();
  expect(await modal.evaluate((elemento) => elemento.scrollWidth <= elemento.clientWidth)).toBe(true);
  const limites = await modal.boundingBox(); expect(limites!.x).toBeGreaterThanOrEqual(0); expect(limites!.x + limites!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: informacion.outputPath('cierre-movil.png') });
  await modal.getByRole('button', { name: 'Cerrar despacho', exact: true }).scrollIntoViewIfNeeded();
  await expect(modal.getByRole('button', { name: 'Cancelar' })).toBeInViewport();
  await expect(modal.getByRole('button', { name: 'Cerrar despacho', exact: true })).toBeInViewport();
  await page.screenshot({ path: informacion.outputPath('cierre-movil-acciones.png') });
  const ampliacion = await browser.newContext({ viewport: { width: 720, height: 512 }, deviceScaleFactor: 2 });
  try {
    const otra = await ampliacion.newPage(); await otra.goto(page.url());
    await otra.getByRole('button', { name: 'Cerrar como devuelto a origen', exact: true }).click();
    const ampliado = otra.getByRole('dialog', { name: 'Cerrar como devuelto a origen', exact: true });
    await expect(ampliado.getByRole('textbox', { name: /Motivo del cierre/ })).toBeEnabled();
    await ampliado.getByRole('button', { name: 'Cancelar' }).scrollIntoViewIfNeeded();
    await expect(ampliado.getByRole('button', { name: 'Cancelar' })).toBeInViewport();
    await otra.screenshot({ path: informacion.outputPath('cierre-escala-200.png') });
  } finally { await ampliacion.close(); }
  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.screenshot({ path: informacion.outputPath('cierre-escritorio.png') });
  const solicitudes: unknown[] = [], respuestas: unknown[] = [];
  await page.route('**/api/v1/despachos/' + id + '/devolucion-origen', async (ruta) => {
    solicitudes.push(ruta.request().postDataJSON()); const respuesta = await ruta.fetch(); expect(respuesta.status()).toBe(200);
    respuestas.push(await respuesta.json()); if (solicitudes.length === 1) await ruta.abort('failed'); else await ruta.fulfill({ response: respuesta });
  });
  await modal.getByRole('button', { name: 'Cerrar despacho', exact: true }).click();
  await expect(modal.getByRole('button', { name: 'Consultar resultado' })).toBeVisible();
  await modal.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByRole('button', { name: 'Reprogramar', exact: true })).toBeDisabled();
  await expect(disparador).toBeDisabled();
  await page.getByRole('button', { name: 'Actualizar detalle' }).click();
  await expect(page.getByText('Consulta histórica. El despacho ya no está fallido.')).toBeVisible();
  await page.getByRole('button', { name: 'Revisar cierre pendiente' }).click();
  await modal.getByRole('button', { name: 'Consultar resultado' }).click();
  await expect(modal.getByRole('button', { name: 'Repetir solicitud original' })).toBeVisible(); expect(solicitudes).toHaveLength(1);
  await modal.getByRole('button', { name: 'Repetir solicitud original' }).click();
  await expect(page.getByText('Despacho cerrado como devuelto a origen', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No encontramos resultados con estos filtros', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Entregas fallidas' })).toBeFocused();
  expect(new URL(page.url()).searchParams.get('motivo')).toBe('CLIENTE_AUSENTE');
  expect(new URL(page.url()).searchParams.get('recepcion')).toBe('RECIBIDO_EN_CENTRO');
  expect(solicitudes).toHaveLength(2); expect(solicitudes[1]).toEqual(solicitudes[0]); expect(respuestas[1]).toEqual(respuestas[0]);
  const actual = await (await request.get(api + '/incidencia', { headers })).json();
  expect(actual.estado).toBe('DEVUELTO_A_ORIGEN'); expect(actual.numeroIntentos).toBe(1); expect(actual.versionDespacho).toBe(10);
  expect(actual.historial.filter((h: { estadoNuevo: string }) => h.estadoNuevo === 'DEVUELTO_A_ORIGEN')).toHaveLength(1);
  expect(actual.comunicaciones.filter((e: { tipoEvento: string }) => e.tipoEvento === 'DESPACHO_DEVUELTO_A_ORIGEN')).toHaveLength(1);
  expect(actual.incidencia.recepcion.liberacionCapacidad.estado).toBe('PENDIENTE');
  expect(JSON.stringify(actual)).not.toContain('controlCierre');
});
