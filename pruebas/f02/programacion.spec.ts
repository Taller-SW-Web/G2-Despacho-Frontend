import { expect, test } from '@playwright/test';
import { creacionPrueba, disponiblesPrueba, paginaPrueba, zonasPrueba } from '../../apps/despacho-administrativo/src/features/programacion/fixtures.prueba';

// Navegador real y API simulada explícita: no acredita las reglas de los servicios.
test.beforeEach(async ({ page }) => {
  const pagina = structuredClone(paginaPrueba);
  await page.route('**/api/v1/**', async (ruta) => {
    const solicitud = ruta.request();
    const url = new URL(solicitud.url());
    let datos: unknown;
    if (url.pathname === '/api/v1/zonas') datos = zonasPrueba;
    else if (url.pathname.endsWith('/pendientes')) datos = pagina;
    else if (url.pathname.endsWith('/disponibles')) datos = disponiblesPrueba;
    else if (url.pathname.endsWith('/simulaciones') && solicitud.method() === 'POST') {
      datos = creacionPrueba;
      pagina.contenido.unshift({ ...pagina.contenido[0], ...creacionPrueba, esSimulacion: true });
      pagina.totalElementos++;
    } else if (url.pathname.endsWith('/asignacion') && solicitud.method() === 'POST') {
      const id = decodeURIComponent(url.pathname.split('/').at(-2)!);
      datos = { idDespacho: id, estado: 'ASIGNADO', ...solicitud.postDataJSON(), posicionSecuencia: 4 };
      pagina.contenido = pagina.contenido.filter((d) => d.idDespacho !== id);
      pagina.totalElementos--;
    } else return ruta.fulfill({ status: 404, json: { status: 404 } });
    await ruta.fulfill({ status: url.pathname.endsWith('/simulaciones') ? 201 : 200, json: datos });
  });
});

for (const [ancho, alto] of [[1440, 1024], [1024, 768], [390, 844]]) {
  test(`cola y modal sin desbordamiento de página a ${ancho} px`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto('/programacion');
    await expect(page.getByText('TRK-78900', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Programación y asignación', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const tabla = page.getByRole('region', { name: 'Tabla desplazable: Cola de despachos pendientes de asignación', exact: true });
    if (ancho === 1024) {
      expect(await tabla.evaluate((n) => n.scrollWidth <= n.clientWidth + 1)).toBe(true);
      await expect(page.getByRole('columnheader', { name: 'Volumen (m³)' })).toBeHidden();
    }
    await page.screenshot({ path: `docs/evidencia/f02/cola-${ancho}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Asignar', exact: true }).first().click();
    const modal = page.getByRole('dialog');
    await expect(modal.getByRole('radio', { name: 'Juan de la zona', exact: true })).toBeVisible();
    expect(await modal.evaluate((n) => n.scrollWidth <= n.clientWidth + 1)).toBe(true);
    await modal.getByRole('radio', { name: 'Juan de la zona', exact: true }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(modal.getByRole('radio', { name: 'Ana de otra zona', exact: true })).toBeChecked();
    expect(await modal.getByRole('radio', { name: 'Ana de otra zona', exact: true }).evaluate((n) => getComputedStyle(n).outlineColor)).toBe('rgb(67, 97, 238)');
    await page.screenshot({ path: `docs/evidencia/f02/asignacion-${ancho}.png` });
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Asignar', exact: true }).first()).toBeFocused();
  });
}

test('genera, muestra la nueva fila y asigna usando exclusivamente las rutas públicas', async ({ page }) => {
  await page.goto('/programacion');
  await expect(page.getByText('TRK-78900', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Generar pedido de prueba', exact: true }).click();
  await expect(page.getByText('TRK-SIM-0001', { exact: true })).toBeVisible();
  const fila = page.getByRole('row').filter({ hasText: 'TRK-SIM-0001' });
  await expect(fila.getByText('Nuevo', { exact: true })).toBeVisible();
  await expect(fila.getByText('Simulado', { exact: true })).toBeVisible();
  await fila.getByRole('button', { name: 'Asignar', exact: true }).click();
  await page.getByRole('radio', { name: 'Juan de la zona', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar asignación', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByText('TRK-SIM-0001', { exact: true })).not.toBeVisible();
  await expect(page.getByText(/DSP-SIM-0001 asignado a Juan de la zona/)).toBeVisible();
});
