import '@testing-library/jest-dom/vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { tema } from '@despacho/componentes-compartidos';
import { PaginaDistritos } from './PaginaDistritos';
import type { DistritoAdministrable } from './tipos';

const { cliente, notificar } = vi.hoisted(() => ({
  cliente: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
  notificar: vi.fn(),
}));
vi.mock('../../cliente/useClienteApi', () => ({ useClienteApi: () => cliente }));
vi.mock('@mantine/notifications', async (importar) => {
  const original = await importar<typeof import('@mantine/notifications')>();
  return { ...original, notifications: { ...original.notifications, show: notificar } };
});
Element.prototype.scrollIntoView = vi.fn();

const base: DistritoAdministrable = {
  id: 'd1',
  nombre: 'San Borja',
  provincia: 'Lima',
  departamento: 'Lima',
  ubigeo: '150130',
  estado: 'ACTIVO',
  versionDistrito: 4,
  catalogoBase: true,
  identidadEditable: false,
  creadoEn: '2026-11-13T15:00:00Z',
  actualizadoEn: '2026-11-13T15:00:00Z',
};
const nuevo: DistritoAdministrable = {
  ...base,
  id: 'd2',
  nombre: 'Distrito nuevo',
  ubigeo: '150199',
  catalogoBase: false,
  identidadEditable: true,
};
let registros: DistritoAdministrable[];
const fallo = (
  status: number,
  code = '',
  detail = '',
  errores?: { campo: string; motivo: string }[],
) => ({ isAxiosError: true, response: { status, data: { status, code, detail, errores } } });

function montar(ruta = '/distritos') {
  return render(
    <MantineProvider theme={tema}>
      <MemoryRouter
        initialEntries={[ruta]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/zonas" element={<h1>Zonas de cobertura</h1>} />
          <Route path="/distritos" element={<PaginaDistritos />} />
          <Route path="/distritos/nuevo" element={<PaginaDistritos />} />
          <Route path="/distritos/:id/editar" element={<PaginaDistritos />} />
        </Routes>
      </MemoryRouter>
    </MantineProvider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  registros = structuredClone([base, nuevo]);
  cliente.get.mockImplementation(
    async (ruta: string, opciones?: { params?: { nombre?: string; estado?: string } }) => {
      if (ruta === '/api/v1/distritos')
        return {
          data: structuredClone(
            registros.filter(
              (d) =>
                (!opciones?.params?.nombre ||
                  d.nombre.toLowerCase().includes(opciones.params.nombre.toLowerCase())) &&
                (!opciones?.params?.estado ||
                  opciones.params.estado === 'TODOS' ||
                  d.estado === opciones.params.estado),
            ),
          ),
        };
      return { data: structuredClone(registros.find((d) => ruta.endsWith(d.id)) ?? base) };
    },
  );
  cliente.post.mockImplementation(async (_ruta: string, datos: object) => {
    const alta = { ...nuevo, ...datos, id: 'alta' };
    registros.push(alta);
    return { data: alta };
  });
  cliente.put.mockImplementation(async (ruta: string, datos: object) => {
    const indice = registros.findIndex((d) => ruta.endsWith(d.id));
    registros[indice] = { ...registros[indice], ...datos, versionDistrito: 5 };
    return { data: registros[indice] };
  });
  cliente.patch.mockImplementation(
    async (ruta: string, datos: { estado: 'ACTIVO' | 'INACTIVO' }) => {
      const indice = registros.findIndex((d) => ruta === `/api/v1/distritos/${d.id}/estado`);
      registros[indice] = { ...registros[indice], estado: datos.estado, versionDistrito: 5 };
      return { data: registros[indice] };
    },
  );
});

it('consulta activos por defecto, filtra por nombre y conserva el arreglo del contrato', async () => {
  const usuario = userEvent.setup();
  montar();
  expect(await screen.findByText('San Borja', { exact: true })).toBeVisible();
  expect(cliente.get).toHaveBeenCalledWith(
    '/api/v1/distritos',
    expect.objectContaining({ params: { nombre: undefined, estado: 'ACTIVO' } }),
  );
  await usuario.type(screen.getByLabelText('Buscar distrito por nombre'), 'nuevo');
  await waitFor(() =>
    expect(screen.queryByText('San Borja', { exact: true })).not.toBeInTheDocument(),
  );
  expect(await screen.findByText('Distrito nuevo', { exact: true })).toBeVisible();
});

it('explica el efecto de la baja y envía la versión solo después de confirmar', async () => {
  const usuario = userEvent.setup();
  montar();
  await usuario.click(await screen.findByRole('button', { name: 'Desactivar San Borja' }));
  await waitFor(() =>
    expect(screen.getByText(/Los despachos existentes continuarán su proceso/)).toBeVisible(),
  );
  expect(cliente.patch).not.toHaveBeenCalled();
  await usuario.click(await screen.findByRole('button', { name: 'Desactivar distrito' }));
  await waitFor(() =>
    expect(cliente.patch).toHaveBeenCalledWith('/api/v1/distritos/d1/estado', {
      estado: 'INACTIVO',
      versionDistrito: 4,
    }),
  );
  await waitFor(() =>
    expect(screen.queryByText('San Borja', { exact: true })).not.toBeInTheDocument(),
  );
});

it('requiere reactivación explícita sin prometer una zona activa', async () => {
  registros[0].estado = 'INACTIVO';
  const usuario = userEvent.setup();
  montar('/distritos?estado=INACTIVO');
  await usuario.click(await screen.findByRole('button', { name: 'Reactivar San Borja' }));
  await waitFor(() =>
    expect(screen.getByText(/No se activarán zonas ni se crearán tarifas/)).toBeVisible(),
  );
  await usuario.click(await screen.findByRole('button', { name: 'Reactivar distrito' }));
  await waitFor(() =>
    expect(cliente.patch).toHaveBeenCalledWith('/api/v1/distritos/d1/estado', {
      estado: 'ACTIVO',
      versionDistrito: 4,
    }),
  );
});

it('restaura el foco al cancelar una confirmación preparada con detalle asíncrono', async () => {
  const usuario = userEvent.setup();
  montar();
  const origen = await screen.findByRole('button', { name: 'Desactivar San Borja' });
  await usuario.click(origen);
  await screen.findByRole('dialog');
  await usuario.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(origen).toHaveFocus();
  expect(cliente.patch).not.toHaveBeenCalled();
});

it('crea con datos normalizados sin salir, limpia el formulario y renueva el listado', async () => {
  const usuario = userEvent.setup();
  montar('/distritos/nuevo');
  await usuario.type(screen.getByLabelText(/^Nombre del distrito/), ' Distrito de prueba ');
  await usuario.type(screen.getByLabelText(/^Ubigeo/), '150198');
  await usuario.click(screen.getByRole('button', { name: 'Guardar distrito' }));
  await waitFor(() =>
    expect(cliente.post).toHaveBeenCalledWith('/api/v1/distritos', {
      nombre: 'Distrito de prueba',
      provincia: 'Lima',
      departamento: 'Lima',
      ubigeo: '150198',
    }),
  );
  expect(await screen.findByRole('button', { name: 'Editar Distrito de prueba' })).toBeVisible();
  expect(screen.getByLabelText(/^Nombre del distrito/)).toHaveValue('');
  expect(screen.getByRole('heading', { level: 1, name: 'Distritos' })).toBeVisible();
  expect(screen.getByRole('heading', { level: 2, name: 'Nuevo distrito' })).toBeVisible();
});

it('valida el prefijo geográfico sin enviar una solicitud inválida', async () => {
  const usuario = userEvent.setup();
  montar('/distritos/nuevo');
  await usuario.type(screen.getByLabelText(/^Nombre del distrito/), 'Nuevo');
  await usuario.type(screen.getByLabelText(/^Ubigeo/), '070199');
  await usuario.click(screen.getByRole('button', { name: 'Guardar distrito' }));
  expect(await screen.findByText(/El ubigeo debe pertenecer al ámbito elegido/)).toBeVisible();
  expect(cliente.post).not.toHaveBeenCalled();
});

it('protege nombre y ubigeo del catálogo base al editar', async () => {
  montar('/distritos/d1/editar');
  const nombre = await screen.findByLabelText(/^Nombre del distrito/);
  expect(nombre).toHaveValue('San Borja');
  expect(nombre).toHaveAttribute('readonly');
  expect(screen.getByLabelText(/^Ubigeo/)).toHaveAttribute('readonly');
  expect(screen.getByText(/pertenecen al catálogo base/)).toBeVisible();
});

it('protege también los nuevos asociados y explica su restricción', async () => {
  registros[1].identidadEditable = false;
  montar('/distritos/d2/editar');
  expect(await screen.findByText(/tiene asociaciones de cobertura/)).toBeVisible();
  expect(screen.getByLabelText(/^Nombre del distrito/)).toHaveAttribute('readonly');
});

it('edita un distrito nuevo con la versión de su detalle', async () => {
  const usuario = userEvent.setup();
  montar('/distritos/d2/editar');
  const nombre = await screen.findByLabelText(/^Nombre del distrito/);
  await usuario.clear(nombre);
  await usuario.type(nombre, 'Editado');
  await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() =>
    expect(cliente.put).toHaveBeenCalledWith('/api/v1/distritos/d2', {
      nombre: 'Editado',
      provincia: 'Lima',
      departamento: 'Lima',
      ubigeo: '150199',
      versionDistrito: 4,
    }),
  );
});

it('un conflicto conserva valores y no reenvía sobre una versión nueva automáticamente', async () => {
  cliente.put.mockRejectedValue(
    fallo(409, 'DESP_ERROR_DISTRITO_DESACTUALIZADO', 'El distrito fue modificado'),
  );
  const usuario = userEvent.setup();
  montar('/distritos/d2/editar');
  const nombre = await screen.findByLabelText(/^Nombre del distrito/);
  await usuario.clear(nombre);
  await usuario.type(nombre, 'Mi edición');
  await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(await screen.findByText('El distrito fue modificado')).toBeVisible();
  expect(nombre).toHaveValue('Mi edición');
  expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  expect(cliente.put).toHaveBeenCalledTimes(1);
  await usuario.click(screen.getByRole('button', { name: 'Revisar datos actuales' }));
  expect(nombre).toHaveValue('Mi edición');
  await usuario.click(await screen.findByRole('button', { name: 'Descartar y consultar' }));
  await waitFor(() =>
    expect(screen.getByLabelText(/^Nombre del distrito/)).toHaveValue('Distrito nuevo'),
  );
  expect(cliente.put).toHaveBeenCalledTimes(1);
});

it('muestra duplicados por campo sin borrar los datos', async () => {
  cliente.post.mockRejectedValue(
    fallo(409, 'DESP_ERROR_DISTRITO_DUPLICADO', 'Datos duplicados', [
      { campo: 'nombre', motivo: 'El nombre ya está en uso' },
    ]),
  );
  const usuario = userEvent.setup();
  montar('/distritos/nuevo');
  await usuario.type(screen.getByLabelText(/^Nombre del distrito/), 'Duplicado');
  await usuario.type(screen.getByLabelText(/^Ubigeo/), '150199');
  await usuario.click(screen.getByRole('button', { name: 'Guardar distrito' }));
  expect(await screen.findByText('El nombre ya está en uso', { exact: true })).toBeVisible();
  expect(screen.getByLabelText(/^Nombre del distrito/)).toHaveValue('Duplicado');
});

it('retira filas y filtros si falta autorización', async () => {
  cliente.get.mockRejectedValue(fallo(403));
  montar();
  expect(await screen.findByText('No tienes permisos para ver esta información')).toBeVisible();
  expect(screen.queryByLabelText('Buscar distrito por nombre')).not.toBeInTheDocument();
  expect(screen.queryByText('San Borja')).not.toBeInTheDocument();
});

it('distingue error de lista vacía y permite reintentar', async () => {
  cliente.get.mockRejectedValueOnce(fallo(503));
  const usuario = userEvent.setup();
  montar();
  expect(await screen.findByText('No se pudieron cargar los distritos')).toBeVisible();
  await usuario.click(screen.getByRole('button', { name: 'Reintentar listado' }));
  expect(await screen.findByText('San Borja', { exact: true })).toBeVisible();
});

it('ignora respuestas antiguas incluso si el transporte simulado no cancela', async () => {
  let resolver!: (valor: unknown) => void;
  cliente.get.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolver = r;
      }),
  );
  const usuario = userEvent.setup();
  montar();
  await usuario.type(screen.getByLabelText('Buscar distrito por nombre'), 'nuevo');
  await screen.findByText('Distrito nuevo', { exact: true });
  await act(async () => resolver({ data: [base] }));
  expect(screen.queryByText('San Borja', { exact: true })).not.toBeInTheDocument();
});

it('un conflicto de estado exige nueva confirmación con datos actualizados', async () => {
  cliente.patch.mockRejectedValueOnce(fallo(409, 'DESP_ERROR_DISTRITO_DESACTUALIZADO'));
  const usuario = userEvent.setup();
  montar();
  await usuario.click(await screen.findByRole('button', { name: 'Desactivar San Borja' }));
  await usuario.click(await screen.findByRole('button', { name: 'Desactivar distrito' }));
  expect(
    await screen.findByText(/Revisa los datos actualizados y confirma de nuevo/),
  ).toBeVisible();
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(cliente.patch).toHaveBeenCalledTimes(1);
});

it('selecciona una fila, consulta el detalle vigente, identifica la edición y vuelve al alta al cancelar', async () => {
  const usuario = userEvent.setup();
  montar();
  await usuario.click(await screen.findByRole('button', { name: 'Editar Distrito nuevo' }));
  expect(await screen.findByLabelText(/^Nombre del distrito/)).toHaveValue('Distrito nuevo');
  expect(cliente.get).toHaveBeenCalledWith('/api/v1/distritos/d2', expect.anything());
  expect(screen.getByText('En edición')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Editar distrito' })).toHaveFocus();
  await usuario.click(screen.getByRole('button', { name: 'Cancelar edición' }));
  expect(screen.getByLabelText(/^Nombre del distrito/)).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Guardar distrito' })).toBeVisible();
  expect(screen.queryByText('En edición')).not.toBeInTheDocument();
});

it.each(['Limpiar formulario', 'Editar San Borja'])(
  'protege el borrador antes de %s y permite cancelar el descarte',
  async (accion) => {
    const usuario = userEvent.setup();
    montar();
    const nombre = screen.getByLabelText(/^Nombre del distrito/);
    await usuario.type(nombre, 'Mi borrador');
    await usuario.click(await screen.findByRole('button', { name: accion }));
    await usuario.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(nombre).toHaveValue('Mi borrador');
    await usuario.click(screen.getByRole('button', { name: accion }));
    await usuario.click(await screen.findByRole('button', { name: 'Descartar' }));
    await waitFor(() =>
      expect(screen.getByLabelText(/^Nombre del distrito/)).toHaveValue(
        accion === 'Limpiar formulario' ? '' : 'San Borja',
      ),
    );
  },
);

it('cancelar una edición modificada exige descarte y vuelve al alta', async () => {
  const usuario = userEvent.setup();
  montar('/distritos/d2/editar');
  await usuario.type(await screen.findByLabelText(/^Nombre del distrito/), ' modificado');
  await usuario.click(screen.getByRole('button', { name: 'Cancelar edición' }));
  await usuario.click(await screen.findByRole('button', { name: 'Descartar' }));
  expect(await screen.findByRole('heading', { name: 'Nuevo distrito' })).toBeVisible();
  expect(cliente.put).not.toHaveBeenCalled();
});

it('avisa al cerrar con un borrador y retira el aviso tras limpiarlo', async () => {
  const usuario = userEvent.setup();
  montar();
  const limpio = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(limpio);
  expect(limpio.defaultPrevented).toBe(false);
  await usuario.type(screen.getByLabelText(/^Nombre del distrito/), 'Pendiente');
  const pendiente = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(pendiente);
  expect(pendiente.defaultPrevented).toBe(true);
  await usuario.click(screen.getByRole('button', { name: 'Limpiar formulario' }));
  await usuario.click(await screen.findByRole('button', { name: 'Descartar' }));
  const descartado = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(descartado);
  expect(descartado.defaultPrevented).toBe(false);
});

it('conserva filtros e informa del alta oculta por Inactivos', async () => {
  const usuario = userEvent.setup();
  montar('/distritos?estado=INACTIVO&nombre=busqueda');
  await usuario.type(screen.getByLabelText(/^Nombre del distrito/), 'Registro nuevo');
  await usuario.type(screen.getByLabelText(/^Ubigeo/), '150198');
  await usuario.click(screen.getByRole('button', { name: 'Guardar distrito' }));
  expect(await screen.findByText(/El distrito guardado no coincide/)).toBeVisible();
  expect(screen.getByLabelText('Buscar distrito por nombre')).toHaveValue('busqueda');
  expect(screen.getByRole('combobox', { name: 'Estado de los distritos' })).toHaveValue(
    'Inactivos',
  );
  expect(cliente.get).toHaveBeenLastCalledWith(
    '/api/v1/distritos',
    expect.objectContaining({ params: { nombre: 'busqueda', estado: 'INACTIVO' } }),
  );
});

it('editar conserva búsqueda y filtro aunque el nombre actualizado deje de coincidir', async () => {
  const usuario = userEvent.setup();
  montar('/distritos?estado=TODOS&nombre=nuevo');
  await usuario.click(await screen.findByRole('button', { name: 'Editar Distrito nuevo' }));
  const nombre = await screen.findByLabelText(/^Nombre del distrito/);
  await usuario.clear(nombre);
  await usuario.type(nombre, 'Otro nombre');
  await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(await screen.findByText(/El distrito guardado no coincide/)).toBeVisible();
  expect(screen.getByLabelText('Buscar distrito por nombre')).toHaveValue('nuevo');
  expect(screen.getByRole('combobox', { name: 'Estado de los distritos' })).toHaveValue('Todos');
  expect(await screen.findByRole('heading', { name: 'Nuevo distrito' })).toBeVisible();
  expect(await screen.findByText('No hay distritos que coincidan con los filtros')).toBeVisible();
});

it('un guardado confirmado sigue siendo exitoso si falla el refresco y reintenta solo el listado', async () => {
  const usuario = userEvent.setup();
  montar();
  await screen.findByText('San Borja', { exact: true });
  await usuario.type(screen.getByLabelText(/^Nombre del distrito/), 'Registro confirmado');
  await usuario.type(screen.getByLabelText(/^Ubigeo/), '150198');
  cliente.get.mockRejectedValueOnce(fallo(503));
  await usuario.click(screen.getByRole('button', { name: 'Guardar distrito' }));
  expect(await screen.findByText('No se pudieron cargar los distritos')).toBeVisible();
  expect(
    screen.getByText('Distrito «Registro confirmado» registrado correctamente.'),
  ).toBeVisible();
  expect(screen.getByLabelText(/^Nombre del distrito/)).toHaveValue('');
  await usuario.click(screen.getByRole('button', { name: 'Reintentar listado' }));
  expect(await screen.findByRole('button', { name: 'Editar Registro confirmado' })).toBeVisible();
  expect(cliente.post).toHaveBeenCalledTimes(1);
});

it('actualizar y recuperar el listado no reemplaza la versión ni los valores de la edición', async () => {
  const usuario = userEvent.setup();
  montar('/distritos/d2/editar');
  const nombre = await screen.findByLabelText(/^Nombre del distrito/);
  await usuario.type(nombre, ' borrador');
  registros[1].versionDistrito = 9;
  cliente.get.mockRejectedValueOnce(fallo(503));
  await usuario.click(screen.getByRole('button', { name: 'Actualizar distritos' }));
  expect(await screen.findByText('No se pudieron cargar los distritos')).toBeVisible();
  expect(nombre).toHaveValue('Distrito nuevo borrador');
  await usuario.click(screen.getByRole('button', { name: 'Reintentar listado' }));
  await screen.findByRole('button', { name: 'Editar Distrito nuevo' });
  await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(cliente.put).toHaveBeenCalledWith(
    '/api/v1/distritos/d2',
    expect.objectContaining({ versionDistrito: 4 }),
  );
});

it('el cambio de estado de otro distrito conserva los valores de la edición abierta', async () => {
  const usuario = userEvent.setup();
  montar('/distritos/d2/editar');
  const nombre = await screen.findByLabelText(/^Nombre del distrito/);
  await usuario.type(nombre, ' pendiente');
  await usuario.click(await screen.findByRole('button', { name: 'Desactivar San Borja' }));
  await usuario.click(await screen.findByRole('button', { name: 'Desactivar distrito' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(nombre).toHaveValue('Distrito nuevo pendiente');
  expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled();
});

it('la baja del distrito editado pide descartar y sale de edición tras confirmar el servidor', async () => {
  const usuario = userEvent.setup();
  montar('/distritos/d2/editar');
  await usuario.type(await screen.findByLabelText(/^Nombre del distrito/), ' borrador');
  await usuario.click(await screen.findByRole('button', { name: 'Desactivar Distrito nuevo' }));
  expect(cliente.patch).not.toHaveBeenCalled();
  await usuario.click(await screen.findByRole('button', { name: 'Descartar' }));
  await usuario.click(await screen.findByRole('button', { name: 'Desactivar distrito' }));
  expect(await screen.findByRole('heading', { name: 'Nuevo distrito' })).toBeVisible();
  expect(screen.getByLabelText(/^Nombre del distrito/)).toHaveValue('');
  expect(
    await screen.findByText('Distrito «Distrito nuevo» desactivado correctamente.'),
  ).toBeVisible();
});

it('la confirmación de estado utiliza la versión de un detalle nuevo y no la de la fila', async () => {
  const usuario = userEvent.setup();
  montar();
  await screen.findByText('San Borja', { exact: true });
  registros[0].versionDistrito = 8;
  await usuario.click(screen.getByRole('button', { name: 'Desactivar San Borja' }));
  await usuario.click(await screen.findByRole('button', { name: 'Desactivar distrito' }));
  expect(cliente.patch).toHaveBeenCalledWith('/api/v1/distritos/d1/estado', {
    estado: 'INACTIVO',
    versionDistrito: 8,
  });
});

it('un detalle inexistente mantiene el listado disponible sin mostrar un formulario de edición vacío', async () => {
  const consultar = cliente.get.getMockImplementation()!;
  cliente.get.mockImplementation((ruta, opciones) =>
    ruta === '/api/v1/distritos/ausente' ? Promise.reject(fallo(404)) : consultar(ruta, opciones),
  );
  montar('/distritos/ausente/editar');
  expect(await screen.findByText('El distrito solicitado no existe.')).toBeVisible();
  expect(screen.queryByLabelText(/^Nombre del distrito/)).not.toBeInTheDocument();
  expect(await screen.findByRole('button', { name: 'Editar San Borja' })).toBeVisible();
});

it('ignora el detalle atrasado de una selección anterior', async () => {
  let resolver!: (valor: unknown) => void;
  const consultar = cliente.get.getMockImplementation()!;
  cliente.get.mockImplementation((ruta, opciones) =>
    ruta === '/api/v1/distritos/d1'
      ? new Promise((r) => {
          resolver = r;
        })
      : consultar(ruta, opciones),
  );
  const usuario = userEvent.setup();
  montar();
  await usuario.click(await screen.findByRole('button', { name: 'Editar San Borja' }));
  await usuario.click(screen.getByRole('button', { name: 'Editar Distrito nuevo' }));
  expect(await screen.findByLabelText(/^Nombre del distrito/)).toHaveValue('Distrito nuevo');
  await act(async () => resolver({ data: base }));
  expect(screen.getByLabelText(/^Nombre del distrito/)).toHaveValue('Distrito nuevo');
});

it.each([401, 403])('un %s en guardado retira ambos paneles y los borradores', async (status) => {
  cliente.put.mockRejectedValue(fallo(status));
  const usuario = userEvent.setup();
  montar('/distritos/d2/editar');
  await usuario.type(await screen.findByLabelText(/^Nombre del distrito/), ' borrador');
  await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(await screen.findByText('No tienes permisos para ver esta información')).toBeVisible();
  expect(screen.queryByLabelText(/^Nombre del distrito/)).not.toBeInTheDocument();
  expect(screen.queryByText('Catálogo de distritos')).not.toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('un permiso denegado en detalle invalida también una respuesta tardía del listado', async () => {
  let resolver!: (valor: unknown) => void;
  cliente.get.mockImplementation((ruta) =>
    ruta === '/api/v1/distritos'
      ? new Promise((r) => {
          resolver = r;
        })
      : Promise.reject(fallo(403)),
  );
  montar('/distritos/d2/editar');
  await screen.findByText('No tienes permisos para ver esta información');
  await act(async () => resolver({ data: [base] }));
  expect(screen.queryByText('San Borja')).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/^Nombre del distrito/)).not.toBeInTheDocument();
});

it('un permiso denegado en estado retira la confirmación y el formulario', async () => {
  cliente.patch.mockRejectedValue(fallo(403));
  const usuario = userEvent.setup();
  montar();
  await usuario.click(await screen.findByRole('button', { name: 'Desactivar San Borja' }));
  await usuario.click(await screen.findByRole('button', { name: 'Desactivar distrito' }));
  await screen.findByText('No tienes permisos para ver esta información');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/^Nombre del distrito/)).not.toBeInTheDocument();
});

it('bloquea envíos y acciones incompatibles durante una escritura', async () => {
  let resolver!: (valor: unknown) => void;
  cliente.post.mockImplementation(
    () =>
      new Promise((r) => {
        resolver = r;
      }),
  );
  const usuario = userEvent.setup();
  montar();
  await screen.findByText('San Borja', { exact: true });
  await usuario.type(screen.getByLabelText(/^Nombre del distrito/), 'Pendiente de escritura');
  await usuario.type(screen.getByLabelText(/^Ubigeo/), '150198');
  await usuario.dblClick(screen.getByRole('button', { name: 'Guardar distrito' }));
  expect(cliente.post).toHaveBeenCalledTimes(1);
  for (const accion of [
    'Guardar distrito',
    'Limpiar formulario',
    'Volver a zonas',
    'Actualizar distritos',
    'Editar San Borja',
    'Desactivar San Borja',
  ])
    expect(screen.getByRole('button', { name: accion })).toBeDisabled();
  await act(async () => resolver({ data: nuevo }));
  expect(screen.getByRole('button', { name: 'Guardar distrito' })).toBeEnabled();
});
