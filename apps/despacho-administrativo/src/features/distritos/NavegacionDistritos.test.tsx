import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { tema } from '@despacho/componentes-compartidos';
import { Aplicacion } from '../../Aplicacion';
import { SesionProveedor } from '../../sesion/SesionProveedor';
import type { DistritoAdministrable } from './tipos';

const { cliente, notificar } = vi.hoisted(() => ({
  cliente: { get: vi.fn(), post: vi.fn() },
  notificar: vi.fn(),
}));
vi.mock('../../cliente/useClienteApi', () => ({ useClienteApi: () => cliente }));
vi.mock('@mantine/notifications', async (importar) => {
  const original = await importar<typeof import('@mantine/notifications')>();
  return { ...original, notifications: { ...original.notifications, show: notificar } };
});
Element.prototype.scrollIntoView = vi.fn();

const distrito: DistritoAdministrable = {
  id: 'd1',
  nombre: 'San Borja',
  provincia: 'Lima',
  departamento: 'Lima',
  ubigeo: '150130',
  estado: 'ACTIVO',
  versionDistrito: 0,
  catalogoBase: true,
  identidadEditable: false,
  creadoEn: '2026-11-13T15:00:00Z',
  actualizadoEn: '2026-11-13T15:00:00Z',
};
const zona = {
  id: 'z1',
  nombre: 'Centro',
  estado: 'ACTIVO',
  origenDelimitacion: 'DISTRITOS',
  distritos: [{ id: distrito.id, nombre: distrito.nombre, codigosPostales: [] }],
  tarifaVigente: null,
  creadoEn: distrito.creadoEn,
  actualizadoEn: distrito.actualizadoEn,
};
const consulta = '/zonas?nombre=Centro&distrito=San+Borja&estado=ACTIVO&pagina=2';
let catalogo: DistritoAdministrable[];

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  vi.stubEnv('DEV', true);
  vi.stubEnv('VITE_DEV_TOKEN', 'gestor-navegacion-prueba');
  catalogo = structuredClone([distrito]);
  cliente.get.mockImplementation(async (ruta: string) => ({
    data: structuredClone(
      ruta === '/api/v1/distritos'
        ? catalogo
        : ruta === '/api/v1/distritos/d1'
          ? distrito
          : {
              contenido: [zona],
              pagina: 2,
              tamanoPagina: 20,
              totalElementos: 41,
              totalPaginas: 3,
            },
    ),
  }));
  cliente.post.mockImplementation(async (_ruta: string, datos: object) => {
    const nuevo = { ...distrito, ...datos, id: 'd2', catalogoBase: false, identidadEditable: true };
    catalogo.push(nuevo);
    return { data: nuevo };
  });
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
});

function montar(ruta = consulta) {
  return render(
    <MantineProvider theme={tema} env="test">
      <SesionProveedor>
        <MemoryRouter
          initialEntries={[ruta]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Aplicacion />
        </MemoryRouter>
      </SesionProveedor>
    </MantineProvider>,
  );
}

async function comprobarRegreso() {
  expect(
    await screen.findByRole('heading', { level: 1, name: 'Zonas de cobertura' }),
  ).toBeVisible();
  expect(screen.getByRole('textbox', { name: 'Buscar por nombre' })).toHaveValue('Centro');
  expect(screen.getByRole('combobox', { name: 'Estado' })).toHaveValue('Activo');
  await waitFor(() =>
    expect(cliente.get.mock.calls.filter(([ruta]) => ruta === '/api/v1/zonas').at(-1)).toEqual([
      '/api/v1/zonas',
      expect.objectContaining({
        params: expect.objectContaining({
          nombre: 'Centro',
          distrito: 'San Borja',
          estado: 'ACTIVO',
          pagina: 2,
        }),
      }),
    ]),
  );
}

it('crea desde el encabezado de zonas, mantiene sus filtros y renueva el catálogo distrital', async () => {
  const usuario = userEvent.setup();
  montar();
  await screen.findByText('Centro', { exact: true });
  expect(screen.queryByRole('link', { name: 'Distritos' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Actualizar zonas' })).toBeVisible();
  expect(screen.getAllByRole('button', { name: 'Nueva zona' })[0]).toBeVisible();
  await usuario.click(screen.getByRole('button', { name: 'Distritos' }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Distritos' })).toBeVisible();
  expect(screen.getByRole('heading', { level: 2, name: 'Nuevo distrito' })).toBeVisible();
  expect(screen.getByRole('heading', { level: 2, name: 'Distritos registrados' })).toBeVisible();
  expect(screen.getByLabelText('Buscar distrito por nombre')).toHaveValue('');
  expect(screen.getByRole('combobox', { name: 'Estado de los distritos' })).toHaveValue('Activos');
  expect(screen.getByRole('link', { name: 'Zonas y tarifas' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await usuario.type(
    screen.getByRole('textbox', { name: 'Nombre del distrito' }),
    'Distrito desde zonas',
  );
  await usuario.type(screen.getByRole('textbox', { name: 'Ubigeo' }), '150199');
  await usuario.click(screen.getByRole('button', { name: 'Guardar distrito' }));
  await waitFor(() =>
    expect(cliente.post).toHaveBeenCalledWith('/api/v1/distritos', {
      nombre: 'Distrito desde zonas',
      provincia: 'Lima',
      departamento: 'Lima',
      ubigeo: '150199',
    }),
  );
  expect(await screen.findByRole('button', { name: 'Editar Distrito desde zonas' })).toBeVisible();
  await usuario.type(screen.getByLabelText('Buscar distrito por nombre'), 'otro filtro');
  await usuario.click(screen.getByRole('button', { name: 'Volver a zonas' }));
  await comprobarRegreso();
  const selector = screen.getByRole('combobox', { name: 'Distrito' });
  await waitFor(() => expect(selector).toBeEnabled());
  await usuario.clear(selector);
  await usuario.type(selector, 'Distrito desde zonas');
  expect(await screen.findByRole('option', { name: 'Distrito desde zonas' })).toBeVisible();
});

it('cancela el alta vacía y conserva la consulta de zonas sin crear un distrito', async () => {
  const usuario = userEvent.setup();
  montar();
  await usuario.click(await screen.findByRole('button', { name: 'Distritos' }));
  await usuario.click(await screen.findByRole('button', { name: 'Volver a zonas' }));
  await comprobarRegreso();
  expect(cliente.post).not.toHaveBeenCalled();
});

it('confirma el descarte antes de regresar a zonas y permite conservar el formulario', async () => {
  const usuario = userEvent.setup();
  montar();
  await usuario.click(await screen.findByRole('button', { name: 'Distritos' }));
  const nombre = await screen.findByRole('textbox', { name: 'Nombre del distrito' });
  await usuario.type(nombre, 'Cambios por revisar');
  await usuario.click(screen.getByRole('button', { name: 'Volver a zonas' }));
  await usuario.click(
    within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }),
  );
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(nombre).toHaveValue('Cambios por revisar');
  await usuario.click(screen.getByRole('button', { name: 'Volver a zonas' }));
  await usuario.click(await screen.findByRole('button', { name: 'Descartar' }));
  await comprobarRegreso();
  expect(cliente.post).not.toHaveBeenCalled();
});

it.each([
  ['/distritos/nuevo', 'Distritos'],
  ['/distritos', 'Distritos'],
  ['/distritos/d1/editar', 'Distritos'],
])('mantiene Zonas y tarifas como sección activa en %s', async (ruta, titulo) => {
  montar(ruta);
  expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeVisible();
  expect(screen.queryByRole('link', { name: 'Distritos' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Zonas y tarifas' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
});

it('un acceso directo a distritos vuelve al listado general de zonas', async () => {
  const usuario = userEvent.setup();
  montar('/distritos?nombre=San&estado=TODOS');
  await usuario.click(await screen.findByRole('button', { name: 'Volver a zonas' }));
  await screen.findByRole('heading', { name: 'Zonas de cobertura' });
  expect(screen.getByRole('textbox', { name: 'Buscar por nombre' })).toHaveValue('');
  expect(screen.getByRole('combobox', { name: 'Estado' })).toHaveValue('Todos');
});
