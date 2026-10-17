import { expect, test, type Page } from '@playwright/test';

const gateway = 'http://localhost:8080';
type Zona = { id: string; nombre: string; estado: string; distritos: { nombre: string; codigosPostales: string[] }[] };

async function prepararSesion(page: Page) {
  await page.goto('/desarrollo/f01');
  await page.getByRole('button', { name: 'Generar sesión de prueba', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Sesión gestor preparada');
}
async function seleccionarDistrito(page: Page, nombre: string) {
  await page.getByRole('combobox', { name: 'Distritos', exact: true }).fill(nombre);
  await page.getByRole('option', { name: new RegExp(`^${nombre} ·`) }).click();
  await page.getByRole('combobox', { name: 'Distritos', exact: true }).press('Escape');
}
async function consultar(page: Page, status: number) {
  const recibida = page.waitForResponse((r) => r.url() === `${gateway}/api/v1/cotizaciones` && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Enviar consulta F-01', exact: true }).click();
  const respuesta = await recibida;
  expect(respuesta.status()).toBe(status);
  await expect(page.getByText(`HTTP ${status}`, { exact: true })).toBeVisible();
  return respuesta.json();
}

test('recorre las nueve operaciones F-01 desde Chromium con persistencia en Supabase', async ({ page }, info) => {
  const errores: string[] = [];
  const operaciones: { metodo: string; ruta: string; status: number }[] = [];
  page.on('pageerror', (error) => errores.push(error.message));
  page.on('response', (respuesta) => {
    if (respuesta.url().startsWith(`${gateway}/api/v1/`)) operaciones.push({ metodo: respuesta.request().method(), ruta: new URL(respuesta.url()).pathname, status: respuesta.status() });
  });
  await prepararSesion(page);
  const token = await page.evaluate(() => localStorage.getItem('despacho.token'));
  const headers = { Authorization: `Bearer ${token}` };
  const respuestaCatalogo = await page.request.get(`${gateway}/api/v1/distritos`, { headers });
  expect(respuestaCatalogo.status(), await respuestaCatalogo.text()).toBe(200);
  const catalogo = await respuestaCatalogo.json() as { nombre: string }[];
  const zonas = await page.request.get(`${gateway}/api/v1/zonas?tamanoPagina=100`, { headers }).then((r) => r.json()) as { contenido: Zona[] };
  const ocupados = new Set(zonas.contenido.filter((zona) => zona.estado === 'ACTIVO').flatMap((zona) => zona.distritos.map(({ nombre }) => nombre)));
  const libres = catalogo.filter(({ nombre }) => !ocupados.has(nombre)).slice(0, 2).map(({ nombre }) => nombre);
  expect(libres).toHaveLength(2);
  const nombre = `Prueba UI F01 ${Date.now()}`;
  const editado = `${nombre} editada`;
  const codigo = String(80000 + Math.floor(Math.random() * 10000));
  let idCreado: string | undefined;
  try {
    await page.getByRole('link', { name: 'Abrir zonas y tarifas', exact: true }).click();
    await page.getByRole('button', { name: 'Nueva zona', exact: true }).first().click();
    await expect(page.getByRole('button', { name: 'Guardar zona', exact: true })).toBeDisabled();
    await page.getByRole('textbox', { name: 'Nombre de la zona', exact: true }).fill(nombre);
    for (const distrito of libres) await seleccionarDistrito(page, distrito);
    await page.getByRole('combobox', { name: `Códigos postales de ${libres[0]}`, exact: true }).fill(codigo);
    await page.getByRole('combobox', { name: `Códigos postales de ${libres[0]}`, exact: true }).press('Enter');
    const creada = page.waitForResponse((r) => r.url() === `${gateway}/api/v1/zonas` && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Guardar zona', exact: true }).click();
    const respuestaCreacion = await creada;
    expect(respuestaCreacion.status()).toBe(201);
    const zona = await respuestaCreacion.json() as Zona;
    idCreado = zona.id;
    expect(zona.distritos.find(({ nombre: n }) => n === libres[0])?.codigosPostales).toEqual([codigo]);
    await page.reload();
    await expect(page.getByText(nombre, { exact: true })).toBeVisible();

    await page.getByRole('button', { name: `Editar ${nombre}`, exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Nombre de la zona', exact: true })).toHaveValue(nombre);
    await page.getByRole('textbox', { name: 'Nombre de la zona', exact: true }).fill(editado);
    await page.getByRole('combobox', { name: `Códigos postales de ${libres[1]}`, exact: true }).fill(String(Number(codigo) + 1));
    await page.getByRole('combobox', { name: `Códigos postales de ${libres[1]}`, exact: true }).press('Enter');
    const edicion = page.waitForResponse((r) => r.url() === `${gateway}/api/v1/zonas/${idCreado}` && r.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Guardar zona', exact: true }).click();
    expect((await edicion).status()).toBe(200);
    await expect(page.getByText(editado, { exact: true })).toBeVisible();

    // Duplicidad real: conserva el formulario y muestra el detalle de la API.
    await page.getByRole('button', { name: 'Nueva zona', exact: true }).first().click();
    await page.getByRole('textbox', { name: 'Nombre de la zona', exact: true }).fill(editado);
    await seleccionarDistrito(page, libres[0]);
    await page.getByRole('button', { name: 'Guardar zona', exact: true }).click();
    await expect(page.getByText(/Ya existe una zona con ese nombre/)).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Nombre de la zona', exact: true })).toHaveValue(editado);
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.getByRole('button', { name: 'Descartar', exact: true }).click();

    // Antes de la tarifa: cobertura disponible, costo ausente.
    await page.goto('/desarrollo/f01');
    await page.getByRole('button', { name: 'Generar token de servicio', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Token de servicio preparado');
    await page.getByRole('textbox', { name: 'Distrito de destino', exact: true }).fill(libres[0]);
    await page.getByRole('switch', { name: 'Incluir productos para calcular el costo' }).check();
    const sinTarifa = await consultar(page, 200);
    expect(sinTarifa.coberturaDisponible).toBe(true);
    expect(sinTarifa.costoEnvio).toBeUndefined();

    await page.getByRole('link', { name: 'Abrir zonas y tarifas', exact: true }).click();
    await page.getByRole('button', { name: `Tarifas de ${editado}`, exact: true }).click();
    await expect(page.getByText('Esta zona aún no tiene tarifa.')).toBeVisible();
    for (const [campo, valor] of [['Tarifa base', '10'], ['Peso incluido hasta (kg)', '3'], ['Recargo por kg adicional', '2'], ['Factor volumétrico', '1.25'], ['Plazo estimado de entrega (días hábiles)', '2']]) {
      await page.getByRole('textbox', { name: campo, exact: true }).fill(valor);
    }
    await page.getByRole('button', { name: 'Guardar tarifa', exact: true }).click();
    await expect(page.getByRole('heading', { name: `Tarifas de ${editado}`, exact: true })).not.toBeVisible();
    await page.getByRole('button', { name: `Tarifas de ${editado}`, exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Tarifa base', exact: true })).toHaveValue('PEN 10');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();

    await page.goto('/desarrollo/f01');
    await page.getByRole('button', { name: 'Generar token de servicio', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Token de servicio preparado');
    await page.getByRole('textbox', { name: 'Distrito de destino', exact: true }).fill(libres[0]);
    const cobertura = await consultar(page, 200);
    expect(cobertura.nombreZona).toBe(editado);
    expect(cobertura.costoEnvio).toBeUndefined();
    await page.getByRole('switch', { name: 'Incluir productos para calcular el costo' }).check();
    const cotizacion = await consultar(page, 200);
    expect(cotizacion).toMatchObject({ coberturaDisponible: true, costoEnvio: 10, moneda: 'PEN', pesoTotalKg: 2.65 });
    await page.screenshot({ path: info.outputPath('cotizacion.png'), fullPage: true });

    await page.getByRole('textbox', { name: 'SKU 1', exact: true }).fill('SKU-INEXISTENTE-F01');
    expect((await consultar(page, 422)).code).toBe('DESP_ERROR_PRODUCTO_NO_ENCONTRADO');
    await page.getByRole('textbox', { name: 'SKU 1', exact: true }).fill('POL-NEG-M');
    await page.getByRole('textbox', { name: 'Cantidad 1', exact: true }).fill('0');
    expect((await consultar(page, 400)).code).toBe('DESP_ERROR_CANTIDAD_INVALIDA');
    await page.getByRole('textbox', { name: 'Cantidad 1', exact: true }).fill('5');
    await page.getByRole('textbox', { name: 'Distrito de destino', exact: true }).fill('DESTINO SIN COBERTURA F01');
    expect((await consultar(page, 200)).coberturaDisponible).toBe(false);
    await page.getByRole('textbox', { name: 'Distrito de destino', exact: true }).fill('');
    expect((await consultar(page, 400)).code).toBe('DESP_ERROR_DESTINO_REQUERIDO');

    // Sustituye la tarifa y verifica que la cotización usa la nueva regla.
    await page.goto(`/zonas/${idCreado}/tarifas`);
    await page.getByRole('textbox', { name: 'Tarifa base', exact: true }).fill('12');
    await page.getByRole('button', { name: 'Guardar tarifa', exact: true }).click();
    await expect(page.getByRole('heading', { name: `Tarifas de ${editado}`, exact: true })).not.toBeVisible();
    await page.goto('/desarrollo/f01');
    await page.getByRole('button', { name: 'Generar token de servicio', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Token de servicio preparado');
    await page.getByRole('textbox', { name: 'Distrito de destino', exact: true }).fill(libres[0]);
    await page.getByRole('switch', { name: 'Incluir productos para calcular el costo' }).check();
    expect((await consultar(page, 200)).costoEnvio).toBe(12);

    await page.goto('/zonas');
    await page.getByRole('textbox', { name: 'Buscar por nombre', exact: true }).fill(editado);
    await expect(page).toHaveURL(/nombre=/);
    await page.getByRole('button', { name: `Desactivar ${editado}`, exact: true }).click();
    await page.getByRole('button', { name: 'Desactivar zona', exact: true }).click();
    await expect(page.getByRole('button', { name: `Activar ${editado}`, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: `Tarifas de ${editado}`, exact: true })).toBeDisabled();
    await page.goto('/desarrollo/f01');
    await page.getByRole('button', { name: 'Generar token de servicio', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Token de servicio preparado');
    await page.getByRole('textbox', { name: 'Distrito de destino', exact: true }).fill(libres[0]);
    expect((await consultar(page, 200)).coberturaDisponible).toBe(false);
    await page.goto('/zonas');
    await page.getByRole('button', { name: `Activar ${editado}`, exact: true }).click();
    await page.getByRole('button', { name: 'Activar zona', exact: true }).click();
    await expect(page.getByRole('button', { name: `Desactivar ${editado}`, exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath('zonas.png'), fullPage: true });
    expect(errores).toEqual([]);
    for (const [metodo, ruta] of [['GET', '/api/v1/distritos'], ['GET', '/api/v1/zonas'], ['POST', '/api/v1/zonas'], ['GET', `/api/v1/zonas/${idCreado}`], ['PUT', `/api/v1/zonas/${idCreado}`], ['PATCH', `/api/v1/zonas/${idCreado}/estado`], ['GET', `/api/v1/zonas/${idCreado}/tarifa`], ['PUT', `/api/v1/zonas/${idCreado}/tarifa`], ['POST', '/api/v1/cotizaciones']]) {
      expect(operaciones.some((operacion) => operacion.metodo === metodo && operacion.ruta === ruta && operacion.status < 400), `${metodo} ${ruta}`).toBe(true);
    }
  } finally {
    await info.attach('operaciones-http-sin-tokens', { body: JSON.stringify(operaciones, null, 2), contentType: 'application/json' });
    if (idCreado) {
      const limpieza = await page.request.patch(`${gateway}/api/v1/zonas/${idCreado}/estado`, { headers, data: { estado: 'INACTIVO' } });
      expect.soft(limpieza.status(), 'Dejar inactiva la zona creada por esta prueba').toBe(200);
    }
  }
});

test('permite probar 401/403, JSON inválido y la interfaz móvil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepararSesion(page);
  await page.getByRole('textbox', { name: 'Distrito de destino', exact: true }).fill('Ancón');
  await consultar(page, 401);
  await page.getByRole('combobox', { name: 'Scope del token de servicio', exact: true }).click();
  await page.getByRole('option', { name: 'seguimientos:leer (probar 403)', exact: true }).click();
  await page.getByRole('button', { name: 'Generar token de servicio', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Token de servicio preparado');
  await consultar(page, 403);
  await page.getByRole('switch', { name: 'Editar JSON para probar errores de la API' }).check();
  await page.getByRole('textbox', { name: 'Cuerpo JSON editable', exact: true }).fill('{');
  await page.getByRole('button', { name: 'Enviar consulta F-01', exact: true }).click();
  await expect(page.getByText('El cuerpo no es un JSON válido. Corrígelo antes de enviar.')).toBeVisible();
  await page.getByRole('combobox', { name: 'Perfil humano de prueba', exact: true }).click();
  await page.getByRole('option', { name: 'Usuario sin rol (probar 403)', exact: true }).click();
  await page.getByRole('button', { name: 'Generar sesión de prueba', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Sesión sin-rol preparada');
  await page.getByRole('link', { name: 'Abrir zonas y tarifas', exact: true }).click();
  await expect(page.getByText('No tienes permisos para ver la configuración de zonas')).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
});
