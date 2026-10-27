import { test, expect } from '@playwright/test';

test('reasigna por UI, recupera la respuesta perdida y actualiza las dos rutas y capacidades reales', async ({ page, request }) => {
  const { F02_GESTOR_TOKEN: gestor, F02_REPARTIDOR_TOKEN: origenToken, F02_DESTINO_TOKEN: destinoToken,
    F02_JORNADA: origen, F02_JORNADA_DESTINO: destino, F02_REPARTIDOR_ORIGEN: repartidor, F02_ZONA: zona } = process.env;
  if (!gestor || !origenToken || !destinoToken || !origen || !destino || !repartidor || !zona) throw new Error('Utiliza el arranque aislado F-02 del backend.');
  const api = 'http://127.0.0.1:18080/api/v1';
  const headers = { Authorization: `Bearer ${gestor}` };
  const simulacion = await request.post(`${api}/despachos/simulaciones`, { headers, data: { idZona: zona, pesoKg: 2, volumenM3: 0.01 } });
  expect(simulacion.ok()).toBeTruthy();
  const despacho = await simulacion.json();
  expect((await request.post(`${api}/despachos/${despacho.idDespacho}/asignacion`, { headers, data: { idRepartidor: repartidor, idJornada: origen } })).ok()).toBeTruthy();
  const flotaAnterior = await (await request.get(`${api}/flota/monitoreo`, { headers })).json();
  await page.addInitScript((token) => localStorage.setItem('despacho.token', token), gestor);
  await page.goto('/programacion');
  await page.getByRole('tab', { name: 'Rutas por repartidor' }).click();
  await page.getByRole('combobox', { name: 'Repartidor en jornada' }).click();
  await page.getByRole('option', { name: /Ruta Prueba/ }).click();
  await page.getByRole('button', { name: `Reasignar ${despacho.codigoOperativo}`, exact: true }).click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByRole('radio', { name: 'Ruta Prueba' })).toHaveCount(0);
  await modal.getByRole('radio', { name: 'Destino Prueba' }).click();
  await expect(modal.getByRole('button', { name: 'Confirmar reasignación' })).toBeDisabled();
  await modal.getByRole('textbox', { name: 'Motivo de la reasignación' }).fill('Redistribución de carga de prueba');
  await expect(modal.getByRole('progressbar')).toHaveCount(3);
  for (const ancho of [1440, 1024, 390]) {
    await page.setViewportSize({ width: ancho, height: ancho === 390 ? 844 : 1024 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: `docs/evidencia/f02-reasignacion/modal-${ancho}.png`, fullPage: true });
  }
  const comandos: { cuerpo: string | null; clave: string | undefined; version: string | undefined }[] = [];
  page.on('request', (r) => {
    if (r.url().endsWith(`/despachos/${despacho.idDespacho}/reasignacion`))
      comandos.push({ cuerpo: r.postData(), clave: r.headers()['idempotency-key'], version: r.headers()['if-match'] });
  });
  await page.route('**/api/v1/despachos/*/reasignacion', async (ruta) => { await ruta.fetch(); await ruta.abort('failed'); }, { times: 1 });
  await modal.getByRole('button', { name: 'Confirmar reasignación' }).click();
  await expect(modal.getByText('Reasignación sin confirmar', { exact: true })).toBeVisible();
  await expect(modal.getByRole('button', { name: 'Cancelar', exact: true })).toBeDisabled();
  await modal.getByRole('button', { name: 'Recuperar reasignación' }).click();
  await expect(modal).toHaveCount(0);
  expect(comandos).toHaveLength(2);
  expect(comandos[1]).toEqual(comandos[0]);
  await expect(page.getByTestId(`parada-${despacho.idDespacho}`)).toHaveCount(0);
  for (const [token, presente] of [[origenToken, false], [destinoToken, true]] as const) {
    await expect.poll(async () => {
      const respuesta = await request.get(`${api}/repartidor/mi-ruta`, { headers: { Authorization: `Bearer ${token}` } });
      expect(respuesta.ok()).toBeTruthy();
      return (await respuesta.json()).despachos.some((d: { idDespacho: string }) => d.idDespacho === despacho.idDespacho);
    }).toBe(presente);
  }
  const rutaDestino = await (await request.get(`${api}/jornadas/${destino}/ruta`, { headers })).json();
  expect(rutaDestino.despachos.at(-1)).toMatchObject({ idDespacho: despacho.idDespacho, posicion: 2, reasignacionEnProceso: false });
  const flotaActual = await (await request.get(`${api}/flota/monitoreo`, { headers })).json();
  for (const [jornada, incremento] of [[origen, -2], [destino, 2]] as const) {
    const anterior = flotaAnterior.contenido.find((f: { jornada: { idJornada: string } | null }) => f.jornada?.idJornada === jornada).jornada;
    const actual = flotaActual.contenido.find((f: { jornada: { idJornada: string } | null }) => f.jornada?.idJornada === jornada).jornada;
    expect(actual.ocupacion.pesoKg).toBe(anterior.ocupacion.pesoKg + incremento);
    expect(actual.ocupacion.paquetes).toBe(anterior.ocupacion.paquetes + incremento / 2);
    expect(actual.ocupacion.volumenM3).toBeCloseTo(anterior.ocupacion.volumenM3 + incremento / 200);
  }
});
