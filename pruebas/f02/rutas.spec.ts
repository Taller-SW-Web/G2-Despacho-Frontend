import { expect, test } from '@playwright/test';
import { iniciarSesionGestor } from '../soporte/sesionGestor';
import {
  paginaPrueba,
  zonasPrueba,
} from '../../apps/despacho-administrativo/src/features/programacion/fixtures.prueba';
import {
  rutaPrueba,
  monitoreoRutasPrueba,
  candidatosRutaPrueba,
  reasignacionPrueba,
} from '../../apps/despacho-administrativo/src/features/programacion/rutas.fixtures.prueba';

// Navegador real con proveedores interceptados: no acredita nube, PostgreSQL ni G7.
for (const [ancho, alto] of [
  [1440, 1024],
  [1024, 768],
  [390, 844],
]) {
  test(`consulta, orden y reasignación recuperable a ${ancho}px sin resolver huecos históricos`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: ancho, height: alto });
    const origen = structuredClone(rutaPrueba),
      destino = structuredClone(rutaPrueba);
    const idDestino = '20000000-0000-4000-8000-000000000001',
      repDestino = '20000000-0000-4000-8000-000000000002';
    destino.idJornada = idDestino;
    destino.despachos = [];
    const monitoreo = structuredClone(monitoreoRutasPrueba);
    monitoreo.contenido.push({
      ...monitoreo.contenido[0],
      idRepartidor: repDestino,
      nombre: 'Destino prueba',
      jornada: {
        ...monitoreo.contenido[0].jornada!,
        idRepartidor: repDestino,
        idJornada: idDestino,
        placa: 'TEST-02',
      },
    });
    monitoreo.totalElementos = 2;
    const candidatos = structuredClone(candidatosRutaPrueba);
    const candidato = candidatos.repartidores.find((r) => r.nombre === 'Ana de otra zona')!;
    candidato.idRepartidor = repDestino;
    candidato.idJornada = idDestino;
    const guardados: { clave: string; version: string }[] = [];
    const transferencias: { clave: string; version: string; cuerpo: unknown }[] = [];
    let original: typeof reasignacionPrueba | null = null;
    await page.route('**/api/v1/**', async (interceptada) => {
      const peticion = interceptada.request(),
        url = new URL(peticion.url());
      let data: unknown;
      if (url.pathname.endsWith('/monitoreo')) data = monitoreo;
      else if (url.pathname.endsWith('/zonas')) data = zonasPrueba;
      else if (url.pathname.endsWith('/pendientes')) data = paginaPrueba;
      else if (url.pathname.endsWith('/disponibles')) data = candidatos;
      else if (url.pathname.endsWith('/ruta'))
        data = url.pathname.includes(idDestino) ? destino : origen;
      else if (url.pathname.endsWith('/secuencia') && peticion.method() === 'PUT') {
        const headers = peticion.headers();
        guardados.push({ clave: headers['idempotency-key'], version: headers['if-match'] });
        origen.despachos = peticion
          .postDataJSON()
          .despachos.map((p: { idDespacho: string; posicion: number }) => {
            const previa = origen.despachos.find((d) => d.idDespacho === p.idDespacho)!;
            return {
              ...previa,
              posicion: p.posicion,
              version: previa.version + (previa.posicion === p.posicion ? 0 : 1),
            };
          });
        origen.versionRuta = `"${'b'.repeat(64)}"`;
        data = origen;
      } else if (url.pathname.endsWith('/reasignacion') && peticion.method() === 'POST') {
        const headers = peticion.headers(),
          cuerpo = peticion.postDataJSON();
        transferencias.push({
          clave: headers['idempotency-key'],
          version: headers['if-match'],
          cuerpo,
        });
        if (!original) {
          const trasladada = origen.despachos.find((p) => url.pathname.includes(p.idDespacho))!;
          original = {
            ...reasignacionPrueba,
            idDespacho: trasladada.idDespacho,
            idJornada: idDestino,
            idRepartidor: repDestino,
            posicionSecuencia: 1,
            motivo: cuerpo.motivo,
            version: trasladada.version + 1,
          };
          origen.despachos = origen.despachos.filter((p) => p.idDespacho !== trasladada.idDespacho);
          destino.despachos = [
            { ...trasladada, idRepartidor: repDestino, posicion: 1, version: original.version },
          ];
          return interceptada.fulfill({
            status: 503,
            json: { status: 503, code: 'DESP_ERROR_REASIGNACION_NO_DISPONIBLE' },
          });
        }
        data = original;
      } else return interceptada.fulfill({ status: 404, json: { status: 404 } });
      await interceptada.fulfill({ status: 200, json: data });
    });
    await iniciarSesionGestor(page, '/programacion');
    await page.getByRole('tab', { name: 'Rutas por repartidor' }).click();
    const selector = page.getByRole('combobox', { name: 'Jornada / repartidor' });
    await selector.click();
    await page.getByRole('option', { name: /Ana Jornada Prueba/ }).click();
    await expect(page.getByText('TRK-RUTA-1 · Pedido PED-RUTA-1')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: `docs/evidencia/f02/hito4/ruta-${ancho}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Bajar DSP-RUTA-1', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Hay 2 paradas modificadas sin guardar.')).toBeVisible();
    await page.getByRole('button', { name: 'Descartar cambios', exact: true }).click();
    expect(guardados).toHaveLength(0);
    await page.getByRole('button', { name: 'Bajar DSP-RUTA-1', exact: true }).click();
    await page.getByRole('button', { name: 'Guardar orden', exact: true }).click();
    await expect(page.getByText('Secuencia de ruta actualizada.', { exact: true })).toBeVisible();
    expect(guardados).toHaveLength(1);
    expect(guardados[0].version).toBe(rutaPrueba.versionRuta);
    expect(origen.despachos[1].estado).toBe('EN_CAMINO');
    expect(origen.despachos[1].posicion).toBe(2);
    await page.getByRole('button', { name: 'Reasignar DSP-RUTA-3', exact: true }).click();
    const modal = page.getByRole('dialog');
    await expect(modal.getByRole('radio', { name: 'Conductor actual' })).toHaveCount(0);
    await modal.getByRole('radio', { name: 'Ana de otra zona' }).click();
    await expect(modal.getByRole('button', { name: 'Confirmar reasignación' })).toBeDisabled();
    await modal.getByRole('textbox', { name: 'Motivo de la reasignación' }).fill('Redistribución');
    expect(await modal.evaluate((n) => n.scrollWidth <= n.clientWidth + 1)).toBe(true);
    expect(
      await modal
        .getByRole('radio')
        .evaluateAll((tarjetas) => tarjetas.every((n) => n.scrollHeight <= n.clientHeight + 1)),
    ).toBe(true);
    await page.screenshot({ path: `docs/evidencia/f02/hito4/reasignacion-${ancho}.png` });
    await modal.getByRole('button', { name: 'Confirmar reasignación', exact: true }).click();
    await expect(modal.getByRole('button', { name: 'Recuperar misma reasignación' })).toBeVisible();
    expect(transferencias).toHaveLength(1);
    await modal.getByRole('button', { name: 'Recuperar misma reasignación' }).click();
    await expect(modal).not.toBeVisible();
    expect(transferencias).toHaveLength(2);
    expect(transferencias[1]).toEqual(transferencias[0]);
    expect(transferencias[0].version).toBe('"5"');
    await expect(page.getByText(/La ruta conserva huecos históricos/)).toBeVisible();
    await expect(page.getByText('TRK-RUTA-3 · Pedido PED-RUTA-3')).toHaveCount(0);
    await selector.click();
    await page.getByRole('option', { name: /Destino prueba/ }).click();
    await expect(page.getByText('TRK-RUTA-3 · Pedido PED-RUTA-3')).toBeVisible();
    expect(destino.despachos).toHaveLength(1);
  });
}
