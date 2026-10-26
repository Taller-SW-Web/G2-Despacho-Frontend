import { test, expect } from '@playwright/test';

/** APIs de Gestión/Operación/Gateway reales; identidad del emisor temporal de G2. Sin interceptar APIs. */
test('reordena en navegador, recupera respuesta perdida y F-03 recibe el orden versionado', async ({ page, request }) => {
  page.on('pageerror', (error) => console.error('Error del navegador:', error.message));
  page.on('response', (respuesta) => {
    if (respuesta.status() >= 400 && new URL(respuesta.url()).pathname.endsWith('.js'))
      console.error('Módulo no disponible:', respuesta.status(), new URL(respuesta.url()).pathname);
  });
  const token = process.env.F02_GESTOR_TOKEN;
  const repartidor = process.env.F02_REPARTIDOR_TOKEN;
  const jornada = process.env.F02_JORNADA;
  if (!token || !repartidor || !jornada) throw new Error('Ejecuta primero el entorno aislado de pruebas F-02 del backend.');
  const api = 'http://127.0.0.1:18080';
  const cabeceras = { Authorization: `Bearer ${token}` };
  await page.addInitScript((valor) => localStorage.setItem('despacho.token', valor), token);
  await page.goto('/programacion');
  await page.getByRole('tab', { name: 'Rutas por repartidor' }).click();
  await page.getByRole('combobox', { name: 'Repartidor en jornada' }).click();
  await page.getByRole('option', { name: /Ruta Prueba/ }).click();
  const original = await (await request.get(`${api}/api/v1/jornadas/${jornada}/ruta`, { headers: cabeceras })).json();
  const [primero, segundo] = original.despachos;
  await expect(page.getByText(`#1 · ${primero.codigoOperativo}`, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Bajar ${primero.codigoOperativo}` }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(`#1 · ${segundo.codigoOperativo}`, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Descartar cambios', exact: true }).click();
  await expect(page.getByText(`#1 · ${primero.codigoOperativo}`, { exact: true })).toBeVisible();
  // Responsive y foco con datos reales, antes de aceptar el cambio persistente.
  for (const ancho of [1440, 1024, 390]) {
    await page.setViewportSize({ width: ancho, height: ancho === 390 ? 844 : 1024 });
    // AppShell anima el cambio de margen al pasar del lateral al menú móvil.
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await page.screenshot({ path: `docs/evidencia/f02-rutas/ruta-${ancho}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.getByLabel(`Arrastrar ${primero.codigoOperativo}`).dragTo(page.getByTestId(`parada-${segundo.idDespacho}`));
  await expect(page.getByText(`#1 · ${segundo.codigoOperativo}`, { exact: true })).toBeVisible();
  // Interceptar solo la respuesta después de que el servidor aceptó: no simula el backend.
  await page.route('**/api/v1/jornadas/*/secuencia', async (ruta) => {
    await ruta.fetch();
    await ruta.abort('failed');
    await page.unroute('**/api/v1/jornadas/*/secuencia');
  }, { times: 1 });
  await page.getByRole('button', { name: 'Guardar orden', exact: true }).click();
  await expect(page.getByText('Resultado sin confirmar')).toBeVisible();
  await page.getByRole('button', { name: 'Recuperar guardado' }).click();
  await expect(page.getByRole('button', { name: 'Guardar orden', exact: true })).toHaveCount(0);
  await expect(page.getByText(`#1 · ${segundo.codigoOperativo}`, { exact: true })).toBeVisible();
  await expect.poll(async () => {
    const respuesta = await request.get(`${api}/api/v1/repartidor/mi-ruta`, { headers: { Authorization: `Bearer ${repartidor}` } });
    expect(respuesta.ok()).toBeTruthy();
    return (await respuesta.json()).despachos.map((p: { idDespacho: string }) => p.idDespacho);
  }).toEqual([segundo.idDespacho, primero.idDespacho]);
  // F-03 inicia traslado mientras el Gestor conserva una edición sin guardar.
  await page.getByRole('button', { name: `Subir ${primero.codigoOperativo}` }).click();
  const traslado = await request.post(`${api}/api/v1/repartidor/despachos/${primero.idDespacho}/inicio-traslado`, {
    headers: { Authorization: `Bearer ${repartidor}`, 'Idempotency-Key': crypto.randomUUID() },
  });
  expect(traslado.ok()).toBeTruthy();
  await page.getByRole('button', { name: 'Guardar orden', exact: true }).click();
  await expect(page.getByText(/La ruta cambió/)).toBeVisible();
  await expect(page.getByRole('button', { name: `Subir ${primero.codigoOperativo}` })).toHaveCount(0);
  await expect(page.getByText(`#2 · ${primero.codigoOperativo}`, { exact: true })).toBeVisible();
});
