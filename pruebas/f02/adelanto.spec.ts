import { expect, test } from '@playwright/test';
import { iniciarSesionGestor } from '../soporte/sesionGestor';
import {
  paginaPrueba,
  zonasPrueba,
} from '../../apps/despacho-administrativo/src/features/programacion/fixtures.prueba';

// Navegador real con API interceptada; no escribe sobre servicios o bases compartidas.
for (const ancho of [1440, 390]) {
  test(`adelanto con motivo, teclado y cola renovada a ${ancho} px`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    const pagina = structuredClone(paginaPrueba);
    let comandos = 0;
    await page.route('**/api/v1/**', async (ruta) => {
      const solicitud = ruta.request();
      const url = new URL(solicitud.url());
      if (url.pathname === '/api/v1/zonas') return ruta.fulfill({ json: zonasPrueba });
      if (url.pathname.endsWith('/pendientes')) return ruta.fulfill({ json: pagina });
      if (url.pathname.endsWith('/adelanto') && solicitud.method() === 'POST') {
        comandos++;
        expect(solicitud.headers()['if-match']).toBe('"1"');
        expect(solicitud.headers()['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);
        expect(solicitud.postDataJSON()).toEqual({ motivo: 'Repartidor disponible' });
        const d = pagina.contenido[2];
        const anterior = d.fechaProgramada;
        Object.assign(d, {
          fechaProgramada: pagina.fechaActualServidor,
          versionDespacho: 2,
          asignable: true,
          disponibleDesde: null,
        });
        pagina.indicadores.pendientesHoy++;
        pagina.indicadores.programadosFuturo--;
        return ruta.fulfill({
          json: {
            idDespacho: d.idDespacho,
            estado: 'PENDIENTE_ASIGNACION',
            fechaProgramadaAnterior: anterior,
            fechaProgramada: d.fechaProgramada,
            versionDespacho: 2,
            motivo: 'Repartidor disponible',
            actualizadoEn: '2026-10-17T17:30:00Z',
          },
        });
      }
      return ruta.fulfill({ status: 404, json: { status: 404 } });
    });
    await iniciarSesionGestor(page, '/programacion');
    const fila = page.getByRole('row').filter({ hasText: 'TRK-78902' });
    await fila.getByRole('button', { name: 'Adelantar a hoy', exact: true }).click();
    const modal = page.getByRole('dialog');
    const motivo = modal.getByRole('textbox', { name: 'Motivo del adelanto' });
    await expect(motivo).toBeFocused();
    await expect(modal.getByRole('button', { name: 'Confirmar adelanto' })).toBeDisabled();
    expect(await modal.evaluate((n) => n.scrollWidth <= n.clientWidth + 1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/adelanto/modal-${ancho}.png` });
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
    await expect(fila.getByRole('button', { name: 'Adelantar a hoy', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await motivo.fill('Repartidor disponible');
    await modal.getByRole('button', { name: 'Confirmar adelanto' }).click();
    await expect(modal).not.toBeVisible();
    await expect(fila.getByRole('button', { name: 'Asignar', exact: true })).toBeEnabled();
    await expect(fila.getByRole('button', { name: 'Adelantar a hoy' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Pendientes para hoy: 33' })).toBeVisible();
    expect(comandos).toBe(1);
  });
}
