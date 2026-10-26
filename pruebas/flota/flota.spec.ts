import { expect, test, type Page, type Locator } from '@playwright/test';
import { repartidorPrueba, furgonetaPrueba } from '../../apps/despacho-administrativo/src/features/flota/fixtures.prueba';
import { idsPrueba, jornadaPrueba } from '../../apps/despacho-administrativo/src/features/jornadas/fixtures.prueba';

// Navegador real con HTTP simulado. No sustituye PostgreSQL ni Seguridad reales.
test.beforeEach(async ({ page }) => {
  let repartidores = [{ ...repartidorPrueba, idRepartidor: idsPrueba.repartidor, estadoVinculacion: 'VINCULADO', usuarioId: idsPrueba.repartidor }];
  let furgonetas = [{ ...furgonetaPrueba, idFurgoneta: idsPrueba.furgoneta }];
  let jornada: typeof jornadaPrueba | null = null;
  await page.route('**/api/v1/**', async (ruta) => {
    const peticion = ruta.request(), url = new URL(peticion.url()), metodo = peticion.method();
    const recurso = decodeURIComponent(url.pathname);
    const cuerpo = metodo === 'GET' ? {} : peticion.postDataJSON() ?? {};
    const pagina = (filas: unknown[]) => {
      const numero = Number(url.searchParams.get('pagina') ?? 1), tamano = Number(url.searchParams.get('tamanoPagina') ?? 50);
      return { contenido: filas.slice((numero - 1) * tamano, numero * tamano), pagina: numero, tamanoPagina: tamano,
        totalElementos: filas.length, totalPaginas: Math.ceil(filas.length / tamano) };
    };
    let datos: unknown;
    let estado = 200;
    if (recurso === '/api/v1/repartidores' && metodo === 'GET') {
      datos = pagina(repartidores.filter((r) => (!url.searchParams.has('estadoRegistro') || r.estadoRegistro === url.searchParams.get('estadoRegistro'))
        && (!url.searchParams.has('estadoVinculacion') || r.estadoVinculacion === url.searchParams.get('estadoVinculacion'))));
    } else if (recurso === '/api/v1/repartidores' && metodo === 'POST') {
      const nuevo = { ...repartidorPrueba, ...cuerpo, idRepartidor: '00000000-0000-4000-8000-000000000011', usuarioId: null };
      repartidores.push(nuevo); datos = nuevo; estado = 201;
    } else if (recurso.startsWith('/api/v1/repartidores/') && metodo === 'GET') {
      datos = repartidores.find((r) => recurso.endsWith('/' + r.idRepartidor));
    } else if (recurso.startsWith('/api/v1/repartidores/') && metodo === 'PUT') {
      repartidores = repartidores.map((r) => recurso.includes(r.idRepartidor)
        ? { ...r, ...cuerpo, ...(recurso.endsWith('/vinculacion') ? { estadoVinculacion: 'VINCULADO' } : {}) } : r);
      datos = repartidores.find((r) => recurso.includes(r.idRepartidor));
      if (recurso.endsWith('/vinculacion')) estado = 204;
    } else if (recurso.startsWith('/api/v1/repartidores/') && metodo === 'PATCH') {
      repartidores = repartidores.map((r) => recurso.includes(r.idRepartidor) ? { ...r, estadoRegistro: 'INACTIVO' } : r); estado = 204;
    } else if (recurso === '/api/v1/furgonetas' && metodo === 'GET') {
      datos = pagina(furgonetas.filter((f) => !url.searchParams.has('estado') || f.estado === url.searchParams.get('estado')));
    } else if (recurso === '/api/v1/furgonetas' && metodo === 'POST') {
      const nueva = { ...furgonetaPrueba, ...cuerpo, idFurgoneta: '00000000-0000-4000-8000-000000000012' };
      furgonetas.push(nueva); datos = nueva; estado = 201;
    } else if (recurso.startsWith('/api/v1/furgonetas/') && (metodo === 'PUT' || metodo === 'PATCH')) {
      furgonetas = furgonetas.map((f) => recurso.includes(f.idFurgoneta) ? { ...f, ...cuerpo } : f);
      datos = furgonetas.find((f) => recurso.includes(f.idFurgoneta)); estado = metodo === 'PATCH' ? 204 : 200;
    } else if (recurso === '/api/v1/zonas' && metodo === 'GET') {
      datos = pagina([{ id: idsPrueba.zona, nombre: 'Zona de prueba', estado: 'ACTIVO' }]);
    } else if (recurso === '/api/v1/flota/monitoreo' && metodo === 'GET') {
      const activa = jornada?.estado === 'ACTIVA';
      datos = { ...pagina([{ idRepartidor: idsPrueba.repartidor, nombre: 'Ana Prueba',
        estadoOperativo: activa ? 'DISPONIBLE' : 'FUERA_DE_TURNO', jornada }]),
      resumen: { disponible: activa ? 1 : 0, enRuta: 0, saturado: 0, fueraDeTurno: activa ? 0 : 1 }, consultadoEn: '2026-10-26T15:00:00Z' };
    } else if (recurso === '/api/v1/jornadas' && metodo === 'POST') {
      jornada = { ...jornadaPrueba, ...cuerpo, placa: 'ABC-123', ocupacion: { pesoKg: 0, volumenM3: 0, paquetes: 0 },
        capacidadRemanente: jornadaPrueba.limites, porcentajeOcupacion: { peso: 0, volumen: 0, paquetes: 0 } };
      datos = jornada; estado = 201;
    } else if (recurso.startsWith('/api/v1/jornadas/') && metodo === 'GET') {
      datos = { ...jornada, despachos: [] };
    } else if (recurso.endsWith('/cierre') && metodo === 'POST' && jornada) {
      jornada = { ...jornada, estado: 'CERRADA', cerradaEn: '2026-10-26T15:30:00Z' }; datos = jornada;
    } else return ruta.fulfill({ status: 404, json: { status: 404 } });
    if (estado === 204) return ruta.fulfill({ status: 204 });
    await ruta.fulfill({ status: estado, json: datos });
  });
});

async function seleccionar(page: Page, dialogo: Locator, nombre: string, opcion: string) {
  await dialogo.getByRole('combobox', { name: new RegExp(`^${nombre}`) }).click();
  await page.getByRole('option', { name: opcion, exact: true }).click();
}

for (const ancho of [1440, 390]) {
  test(`F-05: alta, edición, vinculación local y baja de repartidor a ${ancho}px`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto('/repartidores');
    await page.getByRole('button', { name: 'Nuevo repartidor', exact: true }).click();
    const dialogo = page.getByRole('dialog');
    for (const [campo, valor] of [['Nombres', 'Nuevo'], ['Apellidos', 'Operador'], ['DNI', '87654321'],
      ['Teléfono', '999222333'], ['Correo electrónico', 'nuevo@example.invalid'], ['Número de brevete', 'PRUEBA-02']]) {
      await dialogo.getByRole('textbox', { name: campo, exact: false }).fill(valor);
    }
    await seleccionar(page, dialogo, 'Turno habitual', 'Mañana');
    await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(dialogo).not.toBeVisible();
    const fila = page.getByRole('row').filter({ hasText: 'Nuevo Operador' });
    await expect(fila).toContainText('Vinculación pendiente');
    await fila.getByRole('button', { name: 'Editar repartidor Nuevo Operador' }).click();
    await dialogo.getByRole('textbox', { name: 'Teléfono', exact: false }).fill('999333444');
    await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(fila).toContainText('999333444');
    await fila.getByRole('button', { name: 'Más acciones para Nuevo Operador' }).click();
    await page.getByRole('menuitem', { name: 'Vincular cuenta' }).click();
    await dialogo.getByRole('textbox', { name: 'Identificador de usuario', exact: false }).fill('00000000-0000-4000-8000-000000000013');
    await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(fila).toContainText('Vinculado');
    await fila.getByRole('button', { name: 'Más acciones para Nuevo Operador' }).click();
    await page.getByRole('menuitem', { name: 'Dar de baja' }).click();
    await dialogo.getByRole('button', { name: 'Confirmar baja' }).click();
    await expect(fila).toContainText('Inactivo');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/flota/repartidores-${ancho}.png`, fullPage: true });
  });

  test(`F-05: registrar, editar y rehabilitar furgoneta a ${ancho}px`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto('/furgonetas');
    await page.getByRole('button', { name: 'Nueva furgoneta', exact: true }).click();
    const dialogo = page.getByRole('dialog');
    for (const [campo, valor] of [['Placa', 'NUEVA-01'], ['Límite de peso (kg)', '100'], ['Límite de volumen (m³)', '2'], ['Máximo de paquetes', '10']]) {
      await dialogo.getByRole('textbox', { name: campo, exact: false }).fill(valor);
    }
    await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click();
    const fila = page.getByRole('row').filter({ hasText: 'NUEVA-01' });
    await fila.getByRole('button', { name: 'Editar furgoneta NUEVA-01' }).click();
    await dialogo.getByRole('textbox', { name: 'Límite de peso (kg)', exact: false }).fill('200');
    await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(fila).toContainText('200');
    for (const estado of ['En mantenimiento', 'Disponible', 'Fuera de servicio', 'Disponible']) {
      await fila.getByRole('button', { name: 'Cambiar estado de NUEVA-01' }).click();
      await seleccionar(page, dialogo, 'Nuevo estado', estado);
      await dialogo.getByRole('button', { name: 'Confirmar cambio' }).click();
      await expect(dialogo).not.toBeVisible();
      await expect(fila).toContainText(estado);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/flota/furgonetas-${ancho}.png`, fullPage: true });
  });

  test(`F-06: apertura, detalle, cierre y sesión entre pestañas a ${ancho}px`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto('/jornadas');
    await page.getByRole('button', { name: 'Abrir jornada', exact: true }).click();
    const dialogo = page.getByRole('dialog');
    await seleccionar(page, dialogo, 'Repartidor', 'Ana Prueba');
    await seleccionar(page, dialogo, 'Furgoneta', 'ABC-123');
    await seleccionar(page, dialogo, 'Zona', 'Zona de prueba');
    await dialogo.getByRole('button', { name: 'Abrir jornada', exact: true }).click();
    await expect(dialogo).not.toBeVisible();
    await page.getByRole('button', { name: 'Ver jornada de Ana Prueba' }).click();
    await expect(dialogo.getByText(/Remanente: 500 kg/)).toBeVisible();
    await dialogo.getByRole('button', { name: 'Volver al monitoreo' }).click();
    await page.getByRole('button', { name: 'Cerrar jornada de Ana Prueba' }).click();
    await dialogo.getByRole('button', { name: 'Cerrar jornada', exact: true }).click();
    await expect(dialogo).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Fuera de turno: 1' })).toBeVisible();
    await page.getByRole('button', { name: 'Ver jornada de Ana Prueba' }).click();
    await page.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'despacho.token' })));
    await expect(dialogo).not.toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/flota/jornadas-${ancho}.png`, fullPage: true });
  });
}
