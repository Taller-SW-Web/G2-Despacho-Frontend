import { test, expect } from '@playwright/test';

// Requiere ReprogramacionNavegadorPruebas de Gestión: HTTP/Flyway/PostgreSQL reales,
// JWT controlado, Operación no disponible y sin receptor real de Ventas.
test('recupera una respuesta perdida, conserva el comando y actualiza el listado', async ({ page, request, browser }, informacion) => {
  const id = '00000000-0000-0000-0000-000000000065';
  const incidencia = '00000000-0000-0000-0000-000000000066';
  const api = 'http://127.0.0.1:18085/api/v1/despachos/' + id;
  const cabeceras = { Authorization: 'Bearer gestor' };
  const inicial = await request.get(api + '/incidencia', { headers: cabeceras });
  expect(inicial.status()).toBe(200);
  expect((await inicial.json()).estado, 'Reinicia la instancia desechable antes de repetir el recorrido').toBe('FALLIDO');
  await page.goto('/entregas-fallidas/' + id + '?incidencia=' + incidencia + '&origen=motivo%3DCLIENTE_AUSENTE%26recepcion%3DRECIBIDO_EN_CENTRO');
  await page.getByRole('button', { name: 'Reprogramar', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Reprogramar despacho', exact: true });
  const fecha = modal.getByRole('button', { name: /Nueva fecha programada/ });
  await expect(fecha).toBeEnabled();
  await expect(fecha).toHaveText('Selecciona una fecha');
  await expect(modal.getByRole('button', { name: 'Confirmar reprogramación' })).toBeDisabled();
  for (let paso = 0; paso < 6; paso++) {
    await page.keyboard.press('Tab');
    expect(await modal.evaluate((elemento) => elemento.contains(document.activeElement))).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(modal).toBeVisible();
  expect(await modal.evaluate((elemento) => elemento.scrollWidth <= elemento.clientWidth)).toBe(true);
  const limitesMovil = await modal.boundingBox();
  expect(limitesMovil!.x).toBeGreaterThanOrEqual(0);
  expect(limitesMovil!.x + limitesMovil!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: informacion.outputPath('modal-movil.png') });
  // Equivalente de reflujo a 200 %: 1440×1024 físicos, 720×512 CSS y DPR 2.
  const ampliacion = await browser.newContext({ viewport: { width: 720, height: 512 }, deviceScaleFactor: 2, timezoneId: 'Asia/Tokyo' });
  try {
    const paginaAmpliada = await ampliacion.newPage();
    await paginaAmpliada.goto(page.url());
    await paginaAmpliada.getByRole('button', { name: 'Reprogramar', exact: true }).click();
    const modalAmpliado = paginaAmpliada.getByRole('dialog', { name: 'Reprogramar despacho', exact: true });
    await expect(modalAmpliado.getByRole('button', { name: /Nueva fecha programada/ })).toBeEnabled();
    expect(await paginaAmpliada.evaluate(() => ({ ancho: innerWidth, alto: innerHeight, escala: devicePixelRatio })))
      .toEqual({ ancho: 720, alto: 512, escala: 2 });
    await modalAmpliado.getByRole('button', { name: 'Cancelar' }).scrollIntoViewIfNeeded();
    await expect(modalAmpliado.getByRole('button', { name: 'Cancelar' })).toBeInViewport();
    await paginaAmpliada.screenshot({ path: informacion.outputPath('modal-escala-200.png') });
  } finally { await ampliacion.close(); }
  await page.setViewportSize({ width: 1440, height: 1024 });
  await fecha.click();
  await page.getByRole('button', { name: '25 octubre 2026', exact: true }).click();
  await modal.getByRole('textbox', { name: 'Observación (opcional)' }).fill('  Cliente disponible\npor la tarde  ');
  await page.screenshot({ path: informacion.outputPath('modal-escritorio.png') });
  const solicitudes: unknown[] = [], respuestas: unknown[] = [];
  await page.route('**/api/v1/despachos/' + id + '/reprogramacion', async (ruta) => {
    solicitudes.push(ruta.request().postDataJSON());
    const respuesta = await ruta.fetch();
    expect(respuesta.status()).toBe(200);
    respuestas.push(await respuesta.json());
    if (solicitudes.length === 1) await ruta.abort('failed'); // El servidor aceptó; la respuesta se pierde.
    else await ruta.fulfill({ response: respuesta });
  });
  await modal.getByRole('button', { name: 'Confirmar reprogramación' }).click();
  await expect(modal.getByRole('button', { name: 'Consultar resultado' })).toBeVisible();
  await modal.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByRole('button', { name: 'Reprogramar', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Actualizar detalle' }).click();
  await expect(page.getByText('Consulta histórica. El despacho ya no está fallido.')).toBeVisible();
  await page.getByRole('button', { name: 'Revisar reprogramación pendiente' }).click();
  await modal.getByRole('button', { name: 'Consultar resultado' }).click();
  await expect(modal.getByRole('button', { name: 'Repetir solicitud original' })).toBeVisible();
  expect(solicitudes).toHaveLength(1); // El GET nunca acredita por sí solo la aceptación propia.
  await modal.getByRole('button', { name: 'Repetir solicitud original' }).click();
  await expect(page.getByText('Despacho reprogramado para 25/10/2026.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No encontramos resultados con estos filtros', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Entregas fallidas' })).toBeFocused();
  expect(new URL(page.url()).searchParams.get('motivo')).toBe('CLIENTE_AUSENTE');
  expect(new URL(page.url()).searchParams.get('recepcion')).toBe('RECIBIDO_EN_CENTRO');
  expect(solicitudes).toHaveLength(2); expect(solicitudes[1]).toEqual(solicitudes[0]); expect(respuestas[1]).toEqual(respuestas[0]);
  const actual = await (await request.get(api + '/incidencia', { headers: cabeceras })).json();
  expect(actual.estado).toBe('PENDIENTE_ASIGNACION'); expect(actual.numeroIntentos).toBe(1);
  expect(actual.historial.filter((entrada: { funcionalidadOrigen: string; tipoOperacion: string }) =>
    entrada.funcionalidadOrigen === 'F-04' && entrada.tipoOperacion === 'TRANSICION')).toHaveLength(1);
  expect(actual.comunicaciones.filter((evento: { tipoEvento: string }) => evento.tipoEvento === 'DESPACHO_REPROGRAMADO')).toHaveLength(1);
});
