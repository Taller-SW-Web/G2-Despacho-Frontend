import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const gateway = 'http://127.0.0.1:18080';
const seguridad = 'http://127.0.0.1:18090';
const recurso = `${gateway}/api/v1/distritos/geometrias`;
const directorio = process.env.F01_GEOMETRIAS_DIR;
let gestor: string;
let chatbot: string;
let zonaId: string;
let archivos: string[];
let datos: { type: 'FeatureCollection'; features: any[] };
let procedencia: { fuente: string; versionFuente: string };
const cabeceras = () => ({ Authorization: `Bearer ${gestor}` });

async function sesion(page: Page) {
  await page.addInitScript((token) => {
    localStorage.setItem('despacho.token', token);
    localStorage.removeItem('despacho.sesionCerrada');
  }, gestor);
  // Falla controlada del proveedor de teselas; los límites y formularios deben seguir operativos.
  await page.route('https://tile.openstreetmap.org/**', (ruta) => ruta.abort());
}
async function cotizar(request: APIRequestContext) {
  const respuesta = await request.post(`${gateway}/api/v1/cotizaciones`, {
    headers: { Authorization: `Bearer ${chatbot}` },
    data: {
      destino: { distrito: 'San Borja' },
      lineas: [
        { sku: 'POL-NEG-M', cantidad: 5 },
        { sku: 'ZAP-RUN-42', cantidad: 1 },
      ],
    },
  });
  expect(respuesta.status()).toBe(200);
  const cuerpo = await respuesta.json();
  const campos = [
    'coberturaDisponible',
    'costoEnvio',
    'moneda',
    'pesoTotalKg',
    'volumenTotalM3',
    'plazoEstimadoDiasHabiles',
    'fechaEstimadaEntrega',
  ];
  expect(cuerpo).not.toHaveProperty('geometry');
  return Object.fromEntries(campos.map((campo) => [campo, cuerpo[campo]]));
}
async function cargar(page: Page, archivo = '150130_san_borja.geojson') {
  await page.getByRole('button', { name: 'Importar geometrías', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Importar geometrías distritales' });
  await modal.locator('input[type=file]').setInputFiles(resolve(directorio!, archivo));
  await modal.getByRole('textbox', { name: 'Fuente del conjunto' }).fill(procedencia.fuente);
  await modal
    .getByRole('textbox', { name: 'Versión o revisión de la fuente' })
    .fill(procedencia.versionFuente);
  return modal;
}

test.beforeAll(async ({ request }) => {
  if (!directorio)
    throw new Error(
      'Configura F01_GEOMETRIAS_DIR con la carpeta exportada por preparar_geometrias.py',
    );
  archivos = (await readdir(directorio)).filter((archivo) => archivo.endsWith('.geojson')).sort();
  expect(archivos).toHaveLength(50);
  const colecciones = await Promise.all(
    archivos.map(async (archivo) =>
      JSON.parse(await readFile(resolve(directorio, archivo), 'utf8')),
    ),
  );
  datos = {
    type: 'FeatureCollection',
    features: colecciones.flatMap((coleccion) => coleccion.features),
  };
  procedencia = JSON.parse(
    await readFile(resolve('../G2-Despacho-Backend/datos/geometrias/origen.json'), 'utf8'),
  );
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
  await expect
    .poll(
      async () => {
        try {
          const respuesta = await request.get(recurso, { headers: cabeceras() });
          return respuesta.status() === 200 ? (await respuesta.json()).features.length : 0;
        } catch {
          return 0;
        }
      },
      { timeout: 60000 },
    )
    .toBe(50);
  const inicial = await (await request.get(recurso, { headers: cabeceras() })).json();
  expect(inicial.features.every((e: any) => e.geometry === null)).toBe(true);
  const zonas = await (
    await request.get(`${gateway}/api/v1/zonas`, { headers: cabeceras() })
  ).json();
  expect(zonas.totalElementos).toBe(0);
  const nueva = await request.post(`${gateway}/api/v1/zonas`, {
    headers: cabeceras(),
    data: {
      nombre: 'Zona geográfica E2E',
      estado: 'ACTIVO',
      distritos: [
        { distrito: 'San Borja', codigosPostales: [] },
        { distrito: 'Mi Perú', codigosPostales: [] },
        { distrito: 'Lince', codigosPostales: ['15046'], soloCodigosPostales: true },
      ],
    },
  });
  expect(nueva.status()).toBe(201);
  zonaId = (await nueva.json()).id;
  expect(
    (
      await request.put(`${gateway}/api/v1/zonas/${zonaId}/tarifa`, {
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
  expect((await request.get(recurso)).status()).toBe(401);
  expect(
    (await request.get(recurso, { headers: { Authorization: `Bearer ${chatbot}` } })).status(),
  ).toBe(403);
});

test('importa por pantalla, recupera respuesta perdida, rechaza errores y conserva 50 límites y cotización', async ({
  page,
  request,
}, info) => {
  const errores: string[] = [];
  page.on('pageerror', (error) => errores.push(error.message));
  const antes = await cotizar(request);
  await sesion(page);
  expect(
    (
      await request.post(`${gateway}/api/v1/zonas`, {
        headers: cabeceras(),
        data: {
          nombre: 'Zona en conflicto E2E',
          estado: 'ACTIVO',
          distritos: [{ distrito: 'Miraflores', codigosPostales: [] }],
        },
      })
    ).status(),
  ).toBe(201);
  await page.goto('/distritos?estado=TODOS');
  await page.getByText('Mapa', { exact: true }).click();
  await expect(page.getByText('Sin geometría', { exact: true })).toHaveCount(50);
  let modal = await cargar(page);
  await expect(modal.getByRole('button', { name: 'Confirmar importación' })).toHaveCount(0);
  await modal.getByRole('button', { name: 'Validar y previsualizar' }).click();
  await expect(modal.getByText('Propuesta válida', { exact: true })).toBeVisible();
  await expect(
    modal
      .getByRole('region', { name: 'Comparación: límites propuestos' })
      .locator('path.leaflet-interactive'),
  ).toHaveCount(1);
  expect(
    (await (await request.get(`${recurso}?nombre=San%20Borja`, { headers: cabeceras() })).json())
      .features[0].geometry,
  ).toBeNull();
  await page.screenshot({ path: info.outputPath('01-previsualizacion.png'), fullPage: true });
  const claves: string[] = [];
  let perdida = false;
  await page.route(`${recurso}/importaciones`, async (ruta) => {
    claves.push(ruta.request().headers()['idempotency-key']);
    if (!perdida) {
      perdida = true;
      expect((await ruta.fetch()).status()).toBe(200);
      await ruta.abort('failed');
    } else await ruta.continue();
  });
  await modal.getByRole('button', { name: 'Confirmar importación' }).click();
  await expect(modal.getByText('Confirmación pendiente', { exact: true })).toBeVisible();
  await modal.getByRole('button', { name: 'Reintentar confirmación' }).click();
  await expect(modal.getByText('Importación confirmada', { exact: true })).toBeVisible();
  expect(claves).toHaveLength(2);
  expect(claves[0]).toBe(claves[1]);
  await page.unroute(`${recurso}/importaciones`);
  await modal.getByRole('button', { name: 'Cerrar importación' }).click();
  expect(await cotizar(request)).toEqual(antes);

  // Carga de las otras 49 entidades en un cuerpo superior al límite ordinario de 1 MiB.
  const solicitud = {
    geojson: { ...datos, features: datos.features.filter((e) => e.properties.ubigeo !== '150130') },
    fuente: procedencia.fuente,
    versionFuente: procedencia.versionFuente,
  };
  expect(Buffer.byteLength(JSON.stringify(solicitud))).toBeGreaterThan(1_048_576);
  const respuesta = await request.post(`${recurso}/validaciones`, {
    headers: cabeceras(),
    data: solicitud,
  });
  expect(respuesta.status()).toBe(200);
  const informe = await respuesta.json();
  expect(informe.valida, JSON.stringify(informe.errores)).toBe(true);
  expect(
    (
      await request.post(`${recurso}/importaciones`, {
        headers: { ...cabeceras(), 'Idempotency-Key': randomUUID() },
        data: { validacionId: informe.validacionId },
      })
    ).status(),
  ).toBe(200);
  await page.getByRole('button', { name: 'Actualizar mapa', exact: true }).click();
  await expect(page.locator('path.leaflet-interactive')).toHaveCount(50);
  await expect(page.getByText('Sin geometría', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Mapa base no disponible', { exact: true })).toBeVisible();

  modal = await cargar(page);
  const invalida = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { ubigeo: '150130' },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-77.1, -12.1],
              [-77, -12],
              [-77, -12.1],
              [-77.1, -12],
              [-77.1, -12.1],
            ],
          ],
        },
      },
    ],
  };
  await modal.locator('input[type=file]').setInputFiles({
    name: 'geometria-invalida.geojson',
    mimeType: 'application/geo+json',
    buffer: Buffer.from(JSON.stringify(invalida)),
  });
  await modal.getByRole('button', { name: 'Validar y previsualizar' }).click();
  await expect(modal.getByText('Hay incidencias', { exact: true })).toBeVisible();
  await expect(modal.getByRole('button', { name: 'Confirmar importación' })).toBeDisabled();
  await page.screenshot({ path: info.outputPath('02-incidencias.png'), fullPage: true });
  await modal
    .locator('input[type=file]')
    .setInputFiles(resolve(directorio!, '150130_san_borja.geojson'));
  await modal.getByRole('button', { name: 'Validar y previsualizar' }).click();
  await expect(modal.getByText('Reemplazo', { exact: true })).toBeVisible();
  await modal.getByRole('button', { name: 'Confirmar importación' }).click();
  await expect(modal.getByText('Importación confirmada', { exact: true })).toBeVisible();
  await modal.getByRole('button', { name: 'Cerrar importación' }).click();
  expect(await cotizar(request)).toEqual(antes);
  const capa = await (await request.get(recurso, { headers: cabeceras() })).json();
  expect(capa.features).toHaveLength(50);
  for (const entidad of capa.features)
    expect(entidad.geometry).toEqual(
      datos.features.find((e) => e.properties.ubigeo === entidad.properties.ubigeo).geometry,
    );
  expect(
    capa.features.find((e: any) => e.properties.ubigeo === '150130').properties.versionGeometria,
  ).toBe(2);
  expect(
    capa.features.find((e: any) => e.properties.ubigeo === '150130').properties.nombreArchivo,
  ).toBe('150130_san_borja.geojson');
  await page.getByLabel('Buscar distrito en mapa').fill('San Borja');
  await page.getByRole('button', { name: 'Ver ficha de San Borja' }).click();
  await expect(page.getByRole('region', { name: 'Ficha geográfica' })).toContainText(
    procedencia.fuente,
  );
  await page.getByRole('button', { name: 'Centrar San Borja' }).click();
  await page.screenshot({ path: info.outputPath('03-mapa-distrito.png'), fullPage: true });
  expect(errores).toEqual([]);
});

test('selecciona límites con teclado, conserva cobertura postal/inactivos y se adapta a móvil', async ({
  page,
  request,
}, info) => {
  await sesion(page);
  const catalogo = await (
    await request.get(`${gateway}/api/v1/distritos?estado=TODOS`, { headers: cabeceras() })
  ).json();
  const miPeru = catalogo.find((d: any) => d.ubigeo === '070107');
  expect(
    (
      await request.patch(`${gateway}/api/v1/distritos/${miPeru.id}/estado`, {
        headers: cabeceras(),
        data: { estado: 'INACTIVO', versionDistrito: miPeru.versionDistrito },
      })
    ).status(),
  ).toBe(200);
  await page.goto(`/zonas/${zonaId}/editar`);
  await page.getByRole('button', { name: 'Mostrar mapa de selección' }).click();
  await expect(
    page
      .getByRole('region', { name: 'Mapa para seleccionar distritos de la zona' })
      .locator('path.leaflet-interactive'),
  ).toHaveCount(50);
  const dimensionesMapa = await page
    .getByRole('region', { name: 'Mapa para seleccionar distritos de la zona' })
    .boundingBox();
  expect(dimensionesMapa!.width).toBeGreaterThan(400);
  await expect(page.getByText('Referencia postal', { exact: true })).toBeVisible();
  await expect(page.getByText('Conflicto con otra zona', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retirar Mi Perú en mapa' })).toBeEnabled();
  const barranco = page.getByRole('button', { name: 'Límite de Barranco', exact: true });
  await barranco.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Retirar Barranco en mapa' })).toBeVisible();
  await expect(page.getByText('15046', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Retirar Barranco en mapa' }).click();
  await page.getByRole('button', { name: 'Retirar Mi Perú en mapa' }).click();
  await expect(page.getByRole('button', { name: 'Seleccionar Mi Perú en mapa' })).toBeDisabled();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath('04-seleccion-escritorio.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Guardar zona', exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
  const postal = page
    .getByRole('region', { name: 'Mapa para seleccionar distritos de la zona' })
    .getByRole('button', { name: 'Límite de Lince', exact: true });
  await expect(postal).toHaveAttribute('fill-opacity', '0');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath('05-seleccion-movil.png'), fullPage: true });
  await page.getByRole('button', { name: 'Guardar zona', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Zonas de cobertura', exact: true }),
  ).toBeVisible();
  const zona = await (
    await request.get(`${gateway}/api/v1/zonas/${zonaId}`, { headers: cabeceras() })
  ).json();
  expect(zona.distritos.find((d: any) => d.nombre === 'Lince')).toMatchObject({
    soloCodigosPostales: true,
    codigosPostales: ['15046'],
  });
  expect(zona.distritos.some((d: any) => d.nombre === 'Mi Perú')).toBe(false);
  await page.setViewportSize({ width: 1440, height: 1024 });
  await expect(
    page.getByText('Zona «Zona geográfica E2E» actualizada correctamente.', { exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Mapa de Zona geográfica E2E' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Composición geográfica de la zona' }),
  ).toBeVisible();
  await expect(page.getByText('Referencia postal', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('06-composicion-zona.png'), fullPage: true });
});
