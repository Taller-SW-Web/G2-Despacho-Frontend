import { test, expect } from '@playwright/test';

test('cancelación de Ventas retira pendientes y asignados sin duplicar capacidad al recuperar', async ({ page, request }) => {
  const { F02_GESTOR_TOKEN: gestor, F02_VENTAS_TOKEN: ventas, F02_REPARTIDOR_TOKEN: conductor,
    F02_JORNADA: jornada, F02_REPARTIDOR_ORIGEN: repartidor, F02_ZONA: zona } = process.env;
  if (!gestor || !ventas || !conductor || !jornada || !repartidor || !zona) throw new Error('Utiliza el arranque aislado F-02 del backend.');
  const api = 'http://127.0.0.1:18080/api/v1';
  const headers = { Authorization: `Bearer ${gestor}` };
  const generar = async () => {
    const respuesta = await request.post(`${api}/despachos/simulaciones`, { headers, data: { idZona: zona, pesoKg: 2, volumenM3: 0.01 } });
    expect(respuesta.status()).toBe(201); return respuesta.json();
  };
  const cancelar = async (pedido: string, clave: string) => {
    const respuesta = await request.post(`${api}/despachos/pedidos/${pedido}/cancelacion`, {
      headers: { Authorization: `Bearer ${ventas}`, 'Idempotency-Key': clave }, data: { motivo: 'PEDIDO_ANULADO' },
    });
    expect(respuesta.status()).toBe(200); return respuesta.json();
  };
  await page.addInitScript((token) => localStorage.setItem('despacho.token', token), gestor);
  const pendiente = await generar();
  await page.goto('/programacion');
  await expect(page.getByText(pendiente.codigoRastreoInterno, { exact: true })).toBeVisible();
  await cancelar(pendiente.idPedido, crypto.randomUUID());
  await page.reload();
  await expect(page.getByText(pendiente.codigoRastreoInterno, { exact: true })).toHaveCount(0);

  const asignado = await generar();
  const asignacion = await request.post(`${api}/despachos/${asignado.idDespacho}/asignacion`, {
    headers, data: { idRepartidor: repartidor, idJornada: jornada },
  });
  expect(asignacion.ok()).toBeTruthy();
  const ocupacion = async () => {
    const respuesta = await request.get(`${api}/flota/monitoreo`, { headers });
    expect(respuesta.ok()).toBeTruthy();
    return (await respuesta.json()).contenido.find((f: { jornada: { idJornada: string } | null }) => f.jornada?.idJornada === jornada).jornada.ocupacion;
  };
  const antes = await ocupacion();
  const rutaMovil = async () => {
    const respuesta = await request.get(`${api}/repartidor/mi-ruta`, { headers: { Authorization: `Bearer ${conductor}` } });
    expect(respuesta.ok()).toBeTruthy(); return (await respuesta.json()).despachos;
  };
  await expect.poll(async () => (await rutaMovil()).some((d: { idDespacho: string }) => d.idDespacho === asignado.idDespacho)).toBeTruthy();
  const rutaAntes = await (await request.get(`${api}/jornadas/${jornada}/ruta`, { headers })).json();
  const clave = crypto.randomUUID();
  const original = await cancelar(asignado.idPedido, clave);
  expect(original.estado).toBe('CANCELADO');
  // Simula al consumidor que no recibió el primer resultado: debe recuperar el cuerpo original.
  expect(await cancelar(asignado.idPedido, clave)).toEqual(original);
  await expect.poll(async () => (await rutaMovil()).some((d: { idDespacho: string }) => d.idDespacho === asignado.idDespacho)).toBeFalsy();
  const despues = await ocupacion();
  expect(despues.pesoKg).toBe(antes.pesoKg - 2);
  expect(despues.volumenM3).toBeCloseTo(antes.volumenM3 - 0.01);
  expect(despues.paquetes).toBe(antes.paquetes - 1);
  const rutaDespues = await (await request.get(`${api}/jornadas/${jornada}/ruta`, { headers })).json();
  expect(rutaDespues.despachos).toEqual(rutaAntes.despachos.filter((d: { idDespacho: string }) => d.idDespacho !== asignado.idDespacho));
  await page.reload();
  await page.getByRole('tab', { name: 'Rutas por repartidor' }).click();
  await page.getByRole('combobox', { name: 'Repartidor en jornada' }).click();
  await page.getByRole('option', { name: /Ruta Prueba/ }).click();
  await expect(page.getByTestId(`parada-${asignado.idDespacho}`)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Rutas por repartidor', exact: true })).toBeVisible();
  for (const ancho of [1440, 1024, 390]) {
    await page.setViewportSize({ width: ancho, height: ancho === 390 ? 844 : 1024 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
});
