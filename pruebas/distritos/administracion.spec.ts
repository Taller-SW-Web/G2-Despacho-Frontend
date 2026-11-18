import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const gateway = 'http://127.0.0.1:18080';
const seguridad = 'http://127.0.0.1:18090';
let gestor: string;
let chatbot: string;
const cabeceras = () => ({ Authorization: `Bearer ${gestor}` });

async function sesion(page: Page) {
  await page.addInitScript((token) => {
    localStorage.setItem('despacho.token', token);
    localStorage.removeItem('despacho.sesionCerrada');
  }, gestor);
}

async function cotizar(request: APIRequestContext, distrito: string, codigoPostal = '15036') {
  const respuesta = await request.post(`${gateway}/api/v1/cotizaciones`, {
    headers: { Authorization: `Bearer ${chatbot}` },
    data: {
      destino: { distrito, codigoPostal },
      lineas: [
        { sku: 'POL-NEG-M', cantidad: 5 },
        { sku: 'ZAP-RUN-42', cantidad: 1 },
      ],
    },
  });
  expect(respuesta.status()).toBe(200);
  return respuesta.json();
}

test.beforeAll(async ({ request }) => {
  const identidad = await request.post(`${seguridad}/pruebas/token-usuario`, {
    form: { perfil: 'gestor' },
  });
  expect(identidad.status()).toBe(200);
  gestor = (await identidad.json()).accessToken;
  const tecnica = await request.post(`${seguridad}/api/v1/auth/token`, {
    form: {
      grant_type: 'client_credentials',
      client_id: 'modulo-chatbot',
      client_secret: 'despacho-local-no-produccion',
      scope: 'cotizaciones:calcular',
    },
  });
  expect(tecnica.status()).toBe(200);
  chatbot = (await tecnica.json()).accessToken;
  const zonas = await request.get(`${gateway}/api/v1/zonas`, { headers: cabeceras() });
  expect(zonas.status()).toBe(200);
  // El runner exige el estado inicial de su base desechable; no reutiliza un entorno con datos.
  expect((await zonas.json()).totalElementos).toBe(0);
  const distritos = await request.get(`${gateway}/api/v1/distritos`, { headers: cabeceras() });
  expect((await distritos.json()).length).toBe(50);
});

test('administra distritos y suspende/recupera cobertura por Gateway real con Productos simulados', async ({
  page,
  request,
}, info) => {
  const errores: string[] = [];
  page.on('pageerror', (error) => errores.push(error.message));
  await sesion(page);
  const consultaZonas = '/zonas?nombre=Navegacion&estado=ACTIVO';
  await page.goto(consultaZonas);
  await expect(
    page.getByRole('heading', { name: 'Zonas de cobertura', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Distritos', exact: true })).toHaveCount(0);
  const acciones = [
    page.getByRole('button', { name: 'Actualizar zonas', exact: true }),
    page.getByRole('button', { name: 'Nueva zona', exact: true }).first(),
    page.getByRole('button', { name: 'Distritos', exact: true }),
  ];
  for (const accion of acciones) await expect(accion).toBeVisible();
  const posiciones = await Promise.all(acciones.map((accion) => accion.boundingBox()));
  for (const posicion of posiciones) {
    expect(posicion).not.toBeNull();
    expect(Math.abs(posicion!.y - posiciones[0]!.y)).toBeLessThan(1);
  }
  await page.screenshot({ path: info.outputPath('zonas-con-distritos.png'), fullPage: true });

  await page.getByRole('button', { name: 'Distritos', exact: true }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Distritos', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Buscar distrito por nombre')).toHaveValue('');
  const panelFormulario = page.getByRole('region', { name: 'Nuevo distrito', exact: true });
  const panelListado = page.getByRole('region', { name: 'Distritos registrados', exact: true });
  await expect(panelFormulario).toBeVisible();
  await expect(panelListado).toBeVisible();
  const posicionFormulario = (await panelFormulario.boundingBox())!;
  const posicionListado = (await panelListado.boundingBox())!;
  expect(posicionListado.x).toBeGreaterThan(posicionFormulario.x + posicionFormulario.width);
  expect(Math.abs(posicionListado.y - posicionFormulario.y)).toBeLessThan(1);
  await expect(page.getByRole('link', { name: 'Zonas y tarifas', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.getByRole('button', { name: 'Volver a zonas', exact: true }).click();
  await expect(page).toHaveURL(`http://127.0.0.1:4187${consultaZonas}`);
  await page.getByRole('button', { name: 'Distritos', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Nombre del distrito', exact: true })
    .fill('Distrito navegador');
  await page.getByRole('textbox', { name: 'Ubigeo', exact: true }).fill('150199');
  const creada = page.waitForResponse(
    (r) => r.url() === `${gateway}/api/v1/distritos` && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Guardar distrito', exact: true }).click();
  const alta = await creada;
  expect(alta.status()).toBe(201);
  const distritoNuevo = await alta.json();
  await expect(page.getByRole('heading', { name: 'Nuevo distrito', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Nombre del distrito', exact: true })).toHaveValue(
    '',
  );
  await expect(
    page.getByRole('button', { name: 'Editar Distrito navegador', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Volver a zonas', exact: true }).click();
  await expect(page).toHaveURL(`http://127.0.0.1:4187${consultaZonas}`);
  await expect(page.getByRole('textbox', { name: 'Buscar por nombre', exact: true })).toHaveValue(
    'Navegacion',
  );
  const selectorDistrito = page.getByRole('combobox', { name: 'Distrito', exact: true });
  await expect(selectorDistrito).toBeEnabled();
  await selectorDistrito.fill('Distrito navegador');
  await expect(page.getByRole('option', { name: 'Distrito navegador', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Distritos', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Desactivar San Borja', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Buscar distrito por nombre').fill('Distrito navegador');
  await expect(
    page.getByRole('button', { name: 'Editar Distrito navegador', exact: true }),
  ).toBeVisible();
  for (const accion of ['Editar Distrito navegador', 'Desactivar Distrito navegador']) {
    const posicion = (await page.getByRole('button', { name: accion, exact: true }).boundingBox())!;
    const panel = (await panelListado.boundingBox())!;
    expect(posicion.x).toBeGreaterThanOrEqual(panel.x);
    expect(posicion.x + posicion.width).toBeLessThanOrEqual(panel.x + panel.width);
  }
  await page.screenshot({ path: info.outputPath('distritos-escritorio.png'), fullPage: true });
  await page.getByRole('button', { name: 'Editar Distrito navegador', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Editar distrito', exact: true })).toBeFocused();
  await expect(page.getByText('En edición', { exact: true })).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Nombre del distrito', exact: true })
    .fill('Distrito editado');
  await page.getByRole('textbox', { name: 'Ubigeo', exact: true }).fill('150198');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Nuevo distrito', exact: true })).toBeVisible();
  await expect(page.getByLabel('Buscar distrito por nombre')).toHaveValue('Distrito navegador');
  await expect(page.getByText(/El distrito guardado no coincide/)).toBeVisible();
  await page.getByLabel('Buscar distrito por nombre').fill('Distrito');
  await expect(
    page.getByRole('button', { name: 'Editar Distrito editado', exact: true }),
  ).toBeVisible();
  expect((await cotizar(request, 'Distrito editado', '')).coberturaDisponible).toBe(false);

  await page
    .getByRole('textbox', { name: 'Nombre del distrito', exact: true })
    .fill('Distrito editado');
  await page.getByRole('textbox', { name: 'Ubigeo', exact: true }).fill('150197');
  await page.getByRole('button', { name: 'Guardar distrito', exact: true }).click();
  await expect(
    page.getByText('El nombre ya está en uso, incluso entre inactivos', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Nombre del distrito', exact: true })).toHaveValue(
    'Distrito editado',
  );
  await page.getByRole('button', { name: 'Limpiar formulario', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Nombre del distrito', exact: true })).toHaveValue(
    'Distrito editado',
  );
  await page.getByRole('button', { name: 'Limpiar formulario', exact: true }).click();
  await page.getByRole('button', { name: 'Descartar', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Nombre del distrito', exact: true })).toHaveValue(
    '',
  );
  await page.getByRole('button', { name: 'Volver a zonas', exact: true }).click();
  await expect(page).toHaveURL(`http://127.0.0.1:4187${consultaZonas}`);

  const zonaCreada = await request.post(`${gateway}/api/v1/zonas`, {
    headers: cabeceras(),
    data: {
      nombre: 'Zona navegador',
      distritos: [
        { distrito: 'San Borja', codigosPostales: ['15036'] },
        { distrito: 'Miraflores', codigosPostales: ['15074'] },
      ],
    },
  });
  expect(zonaCreada.status()).toBe(201);
  const zona = await zonaCreada.json();
  expect(
    (
      await request.put(`${gateway}/api/v1/zonas/${zona.id}/tarifa`, {
        headers: cabeceras(),
        data: {
          tarifaBase: 10,
          pesoIncluidoKg: 3,
          recargoKgAdicional: 2,
          factorVolumetrico: 1.25,
          moneda: 'PEN',
          plazoEstimadoDiasHabiles: 2,
        },
      })
    ).status(),
  ).toBe(200);
  const antes = await cotizar(request, 'San Borja');
  expect(antes.costoEnvio).toBe(10);

  await page.goto('/distritos?nombre=San%20Borja');
  await page.getByRole('button', { name: 'Editar San Borja', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Nombre del distrito', exact: true }),
  ).toHaveAttribute('readonly', '');
  await expect(page.getByRole('textbox', { name: 'Ubigeo', exact: true })).toHaveAttribute(
    'readonly',
    '',
  );
  await page.getByRole('button', { name: 'Cancelar edición', exact: true }).click();
  await page.getByRole('button', { name: 'Desactivar San Borja', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(
    'Los despachos existentes continuarán su proceso',
  );
  await expect(page.getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Desactivar San Borja', exact: true }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Desactivar San Borja', exact: true }).click();
  await page.getByRole('button', { name: 'Desactivar distrito', exact: true }).click();
  await expect(
    page.getByText('No hay distritos que coincidan con los filtros', { exact: true }),
  ).toBeVisible();
  for (const postal of ['', '15036', '15074']) {
    const baja = await cotizar(request, 'San Borja', postal);
    expect(baja.coberturaDisponible).toBe(false);
    expect(baja.costoEnvio).toBeUndefined();
    expect(baja.plazoEstimadoDiasHabiles).toBeUndefined();
  }
  expect((await cotizar(request, 'Miraflores', '15074')).coberturaDisponible).toBe(true);

  await page.goto(`/zonas/${zona.id}/editar`);
  await expect(
    page.getByText('San Borja: inactivo · sin cobertura', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('combobox', { name: 'Códigos postales de San Borja', exact: true }),
  ).toBeDisabled();
  await page
    .getByRole('textbox', { name: 'Nombre de la zona', exact: true })
    .fill('Zona conservada');
  const editada = page.waitForResponse(
    (r) => r.url() === `${gateway}/api/v1/zonas/${zona.id}` && r.request().method() === 'PUT',
  );
  await page.getByRole('button', { name: 'Guardar zona', exact: true }).click();
  const resultadoZona = await editada;
  expect(resultadoZona.status()).toBe(200);
  expect(
    (await resultadoZona.json()).distritos.find((d: { nombre: string }) => d.nombre === 'San Borja')
      .estado,
  ).toBe('INACTIVO');

  await page.goto('/distritos?nombre=San%20Borja&estado=INACTIVO');
  await page.getByRole('button', { name: 'Reactivar San Borja', exact: true }).click();
  await page.getByRole('button', { name: 'Reactivar distrito', exact: true }).click();
  await expect(
    page.getByText('No hay distritos que coincidan con los filtros', { exact: true }),
  ).toBeVisible();
  const despues = await cotizar(request, 'San Borja');
  for (const campo of [
    'costoEnvio',
    'moneda',
    'pesoTotalKg',
    'volumenTotalM3',
    'plazoEstimadoDiasHabiles',
  ])
    expect(despues[campo]).toEqual(antes[campo]);

  await page.goto(`/distritos/${distritoNuevo.id}/editar`);
  await expect(page.getByRole('textbox', { name: 'Nombre del distrito', exact: true })).toHaveValue(
    'Distrito editado',
  );
  expect(
    (
      await request.patch(`${gateway}/api/v1/distritos/${distritoNuevo.id}/estado`, {
        headers: cabeceras(),
        data: { estado: 'INACTIVO', versionDistrito: 1 },
      })
    ).status(),
  ).toBe(200);
  await page
    .getByRole('textbox', { name: 'Nombre del distrito', exact: true })
    .fill('Edición obsoleta');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(page.getByText(/El distrito fue modificado; consulta y revisa/)).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Nombre del distrito', exact: true })).toHaveValue(
    'Edición obsoleta',
  );
  await expect(page.getByRole('button', { name: 'Guardar cambios', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Revisar datos actuales', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Nombre del distrito', exact: true })).toHaveValue(
    'Edición obsoleta',
  );
  await page.getByRole('button', { name: 'Descartar y consultar', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Nombre del distrito', exact: true })).toHaveValue(
    'Distrito editado',
  );
  expect((await request.get(`${gateway}/api/v1/distritos`)).status()).toBe(401);
  expect(
    (
      await request.get(`${gateway}/api/v1/distritos`, {
        headers: { Authorization: `Bearer ${chatbot}` },
      })
    ).status(),
  ).toBe(403);
  expect(errores).toEqual([]);
});

test('mantiene formulario y teclado utilizables en móvil', async ({ page }, info) => {
  await sesion(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const consultaZonas = '/zonas?nombre=Zona&estado=ACTIVO';
  await page.goto(consultaZonas);
  await expect(page.getByRole('link', { name: 'Distritos', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Distritos', exact: true }).click();
  const panelFormulario = page.getByRole('region', { name: 'Nuevo distrito', exact: true });
  const panelListado = page.getByRole('region', { name: 'Distritos registrados', exact: true });
  const posicionFormulario = (await panelFormulario.boundingBox())!;
  const posicionListado = (await panelListado.boundingBox())!;
  expect(posicionListado.y).toBeGreaterThan(posicionFormulario.y + posicionFormulario.height);
  await page.getByLabel('Buscar distrito por nombre').fill('San Borja');
  await page.getByRole('button', { name: 'Editar San Borja', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Editar distrito', exact: true })).toBeFocused();
  await expect(
    page.getByRole('heading', { name: 'Editar distrito', exact: true }),
  ).toBeInViewport();
  const foco = (await page
    .getByRole('heading', { name: 'Editar distrito', exact: true })
    .boundingBox())!;
  const cabecera = (await page.getByRole('banner').first().boundingBox())!;
  expect(foco.y).toBeGreaterThanOrEqual(cabecera.y + cabecera.height);
  await page.getByRole('button', { name: 'Cancelar edición', exact: true }).click();
  const nombre = page.getByRole('textbox', { name: 'Nombre del distrito', exact: true });
  await nombre.fill('Distrito móvil');
  await nombre.press('Tab');
  await expect(page.getByRole('combobox', { name: 'Provincia', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Guardar distrito', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const tabla = page.getByRole('region', {
    name: 'Tabla desplazable: Catálogo de distritos',
    exact: true,
  });
  await tabla.scrollIntoViewIfNeeded();
  await tabla.focus();
  // Editar pudo desplazar la tabla hasta las acciones; iniciar el recorrido de teclado a la izquierda.
  await tabla.evaluate((elemento) => {
    elemento.scrollLeft = 0;
  });
  const desplazamientoInicial = await tabla.evaluate((elemento) => elemento.scrollLeft);
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() => tabla.evaluate((elemento) => elemento.scrollLeft))
    .toBeGreaterThan(desplazamientoInicial);
  await expect(page.getByRole('button', { name: 'Editar San Borja', exact: true })).toBeVisible();
  await page.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({ path: info.outputPath('distrito-movil.png'), fullPage: true });
  await page.getByRole('button', { name: 'Volver a zonas', exact: true }).click();
  await page.getByRole('button', { name: 'Descartar', exact: true }).click();
  await expect(page).toHaveURL(`http://127.0.0.1:4187${consultaZonas}`);
});
