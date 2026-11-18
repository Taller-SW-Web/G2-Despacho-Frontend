import '@testing-library/jest-dom/vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { tema } from '@despacho/componentes-compartidos';
import { ImportadorGeometrias, leerGeoJson } from './ImportadorGeometrias';
import { ExploradorGeografico } from './ExploradorGeografico';
import { VisorZonaGeografica } from './VisorZonaGeografica';
import { FormularioZona } from '../zonas/FormularioZona';
import type { CapaDistritos, EntidadDistrito, InformeGeografico } from './tipos';
import type { PropiedadesMapa } from './MapaDiferido';

const { cliente } = vi.hoisted(() => ({
  cliente: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}));
vi.mock('../../cliente/useClienteApi', () => ({ useClienteApi: () => cliente }));
// JSDOM comprueba interacción; el renderer Leaflet real se comprueba en Chromium.
vi.mock('./MapaDiferido', () => ({
  MapaDiferido: ({ capa, alSeleccionar, seleccionados = [], postales = [] }: PropiedadesMapa) => (
    <div aria-label="Renderer cartográfico simulado">
      {capa.features.map((entidad) => (
        <button
          key={entidad.properties.id}
          data-seleccionado={seleccionados.includes(entidad.properties.id)}
          data-postal={postales.includes(entidad.properties.id)}
          onClick={() => alSeleccionar?.(entidad)}
        >{`Polígono ${entidad.properties.nombre}`}</button>
      ))}
    </div>
  ),
}));
Element.prototype.scrollIntoView = vi.fn();

const entidad = (
  id: string,
  nombre: string,
  estado: 'ACTIVO' | 'INACTIVO' = 'ACTIVO',
): EntidadDistrito => ({
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-77.1, -12.1],
        [-77, -12.1],
        [-77, -12],
        [-77.1, -12.1],
      ],
    ],
  },
  properties: {
    id,
    nombre,
    ubigeo: id === 'd1' ? '150130' : id === 'd2' ? '070107' : '150122',
    provincia: 'Lima',
    departamento: 'Lima',
    estado,
    versionGeometria: 1,
    fuente: 'Fuente revisada',
    versionFuente: 'r1',
    importadoEn: null,
    importadoPor: null,
    huella: null,
    importacionId: null,
    zonas: [],
  },
});
const capa: CapaDistritos = {
  type: 'FeatureCollection',
  features: [
    entidad('d1', 'San Borja'),
    entidad('d2', 'Mi Perú', 'INACTIVO'),
    { ...entidad('d3', 'Miraflores'), geometry: null },
  ],
};
const informe: InformeGeografico = {
  valida: true,
  validacionId: 'val-1',
  expiraEn: '2099-11-14T15:30:00Z',
  fuente: 'Fuente',
  versionFuente: 'r2',
  entidades: 1,
  posiciones: 4,
  errores: [],
  sugerencias: [],
  distritos: [{ ...capa.features[0].properties, accion: 'REEMPLAZO' }],
  actuales: { ...capa, features: [capa.features[0]] },
  propuesta: { ...capa, features: [capa.features[0]] },
};
const resultado = {
  importacionId: 'imp-1',
  validacionId: 'val-1',
  importadoEn: '2026-11-14T15:00:00Z',
  importadoPor: 'gestor',
  fuente: 'Fuente',
  versionFuente: 'r2',
  distritos: [{ id: 'd1', ubigeo: '150130', versionGeometria: 2 }],
};
const fallo = (status: number, code: string) => ({
  isAxiosError: true,
  response: { status, data: { status, code, detail: 'Revisa la propuesta actualizada' } },
});
const catalogo = capa.features.map((e) => ({
  ...e.properties,
  versionDistrito: 0,
  identidadEditable: false,
  catalogoBase: true,
}));
function montar(elemento: React.ReactNode) {
  return render(<MantineProvider theme={tema}>{elemento}</MantineProvider>);
}
function archivo(geojson: unknown = { type: 'FeatureCollection', features: [capa.features[0]] }) {
  return new File([JSON.stringify(geojson)], '150130_san_borja.geojson', {
    type: 'application/geo+json',
  });
}
async function prepararCarga(contenedor: HTMLElement) {
  const usuario = userEvent.setup();
  await usuario.upload(
    contenedor.querySelector('input[type="file"]') as HTMLInputElement,
    archivo(),
  );
  await usuario.type(screen.getByLabelText('Fuente del conjunto', { exact: false }), 'Fuente');
  await usuario.type(
    screen.getByLabelText('Versión o revisión de la fuente', { exact: false }),
    'r2',
  );
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Validar y previsualizar' })).toBeEnabled(),
  );
  return usuario;
}
beforeEach(() => {
  vi.resetAllMocks();
  cliente.get.mockImplementation(async (ruta: string) => ({
    data: structuredClone(
      ruta === '/api/v1/distritos' ? catalogo.filter((d) => d.estado === 'ACTIVO') : capa,
    ),
  }));
  cliente.post.mockImplementation(async (ruta: string) => ({
    data: structuredClone(ruta.endsWith('/validaciones') ? informe : resultado),
  }));
});

it('previsualiza antes de confirmar y envía solo validacionId con una clave estable', async () => {
  const importar = vi.fn();
  const vista = montar(
    <ImportadorGeometrias alCerrar={vi.fn()} alImportar={importar} alDenegar={vi.fn()} />,
  );
  const usuario = await prepararCarga(vista.container.ownerDocument.body);
  expect(screen.queryByRole('button', { name: 'Confirmar importación' })).not.toBeInTheDocument();
  await usuario.click(screen.getByRole('button', { name: 'Validar y previsualizar' }));
  expect(await screen.findByText('Propuesta válida')).toBeInTheDocument();
  expect(cliente.post).toHaveBeenCalledTimes(1);
  expect(cliente.post.mock.calls[0][1]).toMatchObject({
    fuente: 'Fuente',
    versionFuente: 'r2',
    correspondencias: [],
    nombreArchivo: '150130_san_borja.geojson',
  });
  await usuario.click(screen.getByRole('button', { name: 'Confirmar importación' }));
  expect(await screen.findByText('Importación confirmada')).toBeInTheDocument();
  expect(cliente.post.mock.calls[1][1]).toEqual({ validacionId: 'val-1' });
  expect(cliente.post.mock.calls[1][2].headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
  expect(importar).toHaveBeenCalledOnce();
});

it('recupera una respuesta perdida con la misma propuesta y clave sin permitir editarla', async () => {
  let intentos = 0;
  cliente.post.mockImplementation(async (ruta: string) => {
    if (ruta.endsWith('/validaciones')) return { data: structuredClone(informe) };
    if (++intentos === 1) throw new Error('Respuesta perdida');
    return { data: resultado };
  });
  const vista = montar(
    <ImportadorGeometrias alCerrar={vi.fn()} alImportar={vi.fn()} alDenegar={vi.fn()} />,
  );
  const usuario = await prepararCarga(vista.container.ownerDocument.body);
  await usuario.click(screen.getByRole('button', { name: 'Validar y previsualizar' }));
  await usuario.click(await screen.findByRole('button', { name: 'Confirmar importación' }));
  expect(await screen.findByText('Confirmación pendiente')).toBeInTheDocument();
  expect(screen.getByLabelText('Fuente del conjunto', { exact: false })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancelar importación' })).toBeDisabled();
  await usuario.click(screen.getByRole('button', { name: 'Reintentar confirmación' }));
  expect(await screen.findByText('Importación confirmada')).toBeInTheDocument();
  expect(cliente.post.mock.calls[1][1]).toEqual(cliente.post.mock.calls[2][1]);
  expect(cliente.post.mock.calls[1][2].headers).toEqual(cliente.post.mock.calls[2][2].headers);
});

it('invalida la revisión al cambiar metadatos y exige validar otra vez tras un conflicto', async () => {
  cliente.post.mockImplementation(async (ruta: string) => {
    if (ruta.endsWith('/validaciones')) return { data: structuredClone(informe) };
    throw fallo(409, 'DESP_ERROR_GEOMETRIA_DESACTUALIZADA');
  });
  const vista = montar(
    <ImportadorGeometrias alCerrar={vi.fn()} alImportar={vi.fn()} alDenegar={vi.fn()} />,
  );
  const usuario = await prepararCarga(vista.container.ownerDocument.body);
  await usuario.click(screen.getByRole('button', { name: 'Validar y previsualizar' }));
  await screen.findByText('Propuesta válida');
  await usuario.type(
    screen.getByLabelText('Versión o revisión de la fuente', { exact: false }),
    '-nueva',
  );
  expect(screen.queryByText('Propuesta válida')).not.toBeInTheDocument();
  await usuario.click(screen.getByRole('button', { name: 'Validar y previsualizar' }));
  await usuario.click(await screen.findByRole('button', { name: 'Confirmar importación' }));
  expect(await screen.findByText('Revisa la propuesta actualizada')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Confirmar importación' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Fuente del conjunto', { exact: false })).toHaveValue('Fuente');
});

it('no confirma sugerencias automáticamente y mantiene incidencias por entidad', async () => {
  cliente.post.mockResolvedValue({
    data: {
      ...informe,
      valida: false,
      validacionId: null,
      expiraEn: null,
      distritos: [],
      sugerencias: [{ indice: 0, nombre: 'San Borja', ubigeo: '150130' }],
      errores: [{ campo: 'features[0]', motivo: 'Confirma la correspondencia' }],
    },
  });
  const sinCodigo = {
    type: 'FeatureCollection',
    features: [
      {
        ...capa.features[0],
        properties: { nombre: 'San Borja', provincia: 'Lima', departamento: 'Lima' },
      },
    ],
  };
  const vista = montar(
    <ImportadorGeometrias alCerrar={vi.fn()} alImportar={vi.fn()} alDenegar={vi.fn()} />,
  );
  const usuario = await prepararCarga(vista.container.ownerDocument.body);
  await usuario.upload(
    vista.container.ownerDocument.body.querySelector('input[type="file"]') as HTMLInputElement,
    archivo(sinCodigo),
  );
  await usuario.click(screen.getByRole('button', { name: 'Validar y previsualizar' }));
  expect(await screen.findByText(/Sugerencia: San Borja/)).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Distrito de la entidad 1' })).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Confirmar importación' })).toBeDisabled();
  await usuario.click(screen.getByRole('combobox', { name: 'Distrito de la entidad 1' }));
  await usuario.keyboard('{ArrowDown}{Enter}');
  expect(screen.getByRole('combobox', { name: 'Distrito de la entidad 1' })).toHaveValue(
    'San Borja · 150130',
  );
  await usuario.click(screen.getByRole('button', { name: 'Validar y previsualizar' }));
  expect(cliente.post.mock.calls[1][1].correspondencias).toEqual([{ indice: 0, ubigeo: '150130' }]);
});

it('rechaza JSON ilegible y archivos excesivos antes de enviar', async () => {
  await expect(leerGeoJson(new File(['{'], 'malo.geojson'))).rejects.toThrow('JSON válido');
  const grande = new File([' '.repeat(5_242_881)], 'grande.geojson');
  await expect(leerGeoJson(grande)).rejects.toThrow('5 MiB');
  expect(cliente.post).not.toHaveBeenCalled();
});

it('retira propuestas ante denegación sin ejecutar confirmación', async () => {
  const denegar = vi.fn();
  cliente.post.mockRejectedValue(fallo(403, 'DESP_ERROR_ACCESO_DENEGADO'));
  const vista = montar(
    <ImportadorGeometrias alCerrar={vi.fn()} alImportar={vi.fn()} alDenegar={denegar} />,
  );
  const usuario = await prepararCarga(vista.container.ownerDocument.body);
  await usuario.click(screen.getByRole('button', { name: 'Validar y previsualizar' }));
  await waitFor(() => expect(denegar).toHaveBeenCalledOnce());
  expect(screen.queryByText('Propuesta válida')).not.toBeInTheDocument();
});

it('permite consultar faltantes y ficha, filtrar y recuperar una consulta fallida', async () => {
  cliente.get
    .mockRejectedValueOnce(new Error('Sin conexión'))
    .mockResolvedValue({ data: structuredClone(capa) });
  const filtrar = vi.fn();
  const usuario = userEvent.setup();
  montar(
    <ExploradorGeografico
      nombre=""
      estado="TODOS"
      revision={0}
      alFiltrar={filtrar}
      alDenegar={vi.fn()}
    />,
  );
  await usuario.click(await screen.findByRole('button', { name: 'Reintentar mapa' }));
  expect(await screen.findByText('Sin geometría')).toBeInTheDocument();
  await usuario.click(screen.getByRole('button', { name: 'Ver ficha de San Borja' }));
  expect(
    within(screen.getByRole('region', { name: 'Ficha geográfica' })).getByText(
      'Fuente: Fuente revisada',
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Centrar Miraflores' })).toBeDisabled();
  await usuario.type(screen.getByLabelText('Buscar distrito en mapa'), 'S');
  expect(filtrar).toHaveBeenCalledWith('nombre', 'S');
});

it('sincroniza mapa y formulario conservando códigos postales e inactivos y no escribe al seleccionar', async () => {
  const zona = {
    id: 'zona-1',
    nombre: 'Zona postal',
    estado: 'ACTIVO',
    distritos: [
      {
        id: 'd1',
        nombre: 'San Borja',
        estado: 'ACTIVO',
        codigosPostales: ['15036'],
        soloCodigosPostales: true,
      },
      {
        id: 'd2',
        nombre: 'Mi Perú',
        estado: 'INACTIVO',
        codigosPostales: [],
        soloCodigosPostales: false,
      },
    ],
  };
  cliente.get.mockImplementation(async (ruta: string) => ({
    data: structuredClone(
      ruta === '/api/v1/distritos'
        ? catalogo.filter((d) => d.estado === 'ACTIVO')
        : ruta === '/api/v1/zonas/zona-1'
          ? zona
          : capa,
    ),
  }));
  montar(
    <MemoryRouter initialEntries={['/zonas/zona-1/editar']}>
      <Routes>
        <Route path="/zonas/:id/editar" element={<FormularioZona />} />
      </Routes>
    </MemoryRouter>,
  );
  const usuario = userEvent.setup();
  await screen.findByDisplayValue('Zona postal');
  await usuario.click(screen.getByRole('button', { name: 'Mostrar mapa de selección' }));
  const sanBorja = await screen.findByRole('button', { name: 'Polígono San Borja' });
  expect(sanBorja).toHaveAttribute('data-seleccionado', 'true');
  expect(sanBorja).toHaveAttribute('data-postal', 'true');
  await usuario.click(screen.getByRole('button', { name: 'Polígono Miraflores' }));
  expect(screen.getByRole('button', { name: 'Polígono Miraflores' })).toHaveAttribute(
    'data-seleccionado',
    'true',
  );
  expect(screen.getByText('15036', { exact: true })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Polígono Mi Perú' })).toHaveAttribute(
    'data-seleccionado',
    'true',
  );
  expect(cliente.put).not.toHaveBeenCalled();
  expect(cliente.post).not.toHaveBeenCalled();
  await usuario.click(screen.getByRole('button', { name: 'Retirar Mi Perú en mapa' }));
  expect(screen.getByRole('button', { name: 'Seleccionar Mi Perú en mapa' })).toBeDisabled();
  expect(sanBorja).toHaveAttribute('data-postal', 'true');
});

it('retira el formulario de zona si la consulta geográfica revoca el permiso', async () => {
  cliente.get.mockImplementation(async (ruta: string) => {
    if (ruta === '/api/v1/distritos')
      return { data: catalogo.filter((d) => d.estado === 'ACTIVO') };
    throw fallo(403, 'DESP_ERROR_ACCESO_DENEGADO');
  });
  montar(
    <MemoryRouter initialEntries={['/zonas/nueva']}>
      <Routes>
        <Route path="/zonas/nueva" element={<FormularioZona />} />
      </Routes>
    </MemoryRouter>,
  );
  const usuario = userEvent.setup();
  await usuario.type(
    await screen.findByRole('textbox', { name: 'Nombre de la zona' }),
    'Borrador protegido',
  );
  await usuario.click(screen.getByRole('button', { name: 'Mostrar mapa de selección' }));
  await waitFor(() =>
    expect(screen.queryByRole('textbox', { name: 'Nombre de la zona' })).not.toBeInTheDocument(),
  );
  expect(screen.queryByDisplayValue('Borrador protegido')).not.toBeInTheDocument();
  expect(cliente.post).not.toHaveBeenCalled();
});

it('ignora una consulta geográfica atrasada tras cambiar la zona y muestra referencia postal', async () => {
  let resolver!: (valor: { data: CapaDistritos }) => void;
  cliente.get
    .mockImplementationOnce(
      () =>
        new Promise((fin) => {
          resolver = fin;
        }),
    )
    .mockResolvedValue({
      data: {
        ...capa,
        zona: { id: 'z2', nombre: 'Zona nueva', estado: 'INACTIVO' },
        features: [
          {
            ...capa.features[0],
            properties: { ...capa.features[0].properties, soloCodigosPostales: true },
          },
        ],
      },
    });
  const cerrar = vi.fn();
  const vista = montar(<VisorZonaGeografica zonaId="z1" alCerrar={cerrar} />);
  vista.rerender(
    <MantineProvider theme={tema}>
      <VisorZonaGeografica zonaId="z2" alCerrar={cerrar} />
    </MantineProvider>,
  );
  expect(await screen.findByText('Referencia postal')).toBeInTheDocument();
  await act(async () =>
    resolver({ data: { ...capa, zona: { id: 'z1', nombre: 'Zona vieja', estado: 'ACTIVO' } } }),
  );
  expect(screen.queryByText('Zona vieja')).not.toBeInTheDocument();
  expect(screen.getByText('Zona nueva')).toBeInTheDocument();
});
