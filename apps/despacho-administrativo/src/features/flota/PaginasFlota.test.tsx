import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { tema } from '@despacho/componentes-compartidos';
import { PaginaRepartidores } from './PaginaRepartidores';
import { PaginaFurgonetas } from './PaginaFurgonetas';
import { falloPrueba, furgonetaPrueba, paginaPrueba, repartidorPrueba } from './fixtures.prueba';
import type { Furgoneta, Repartidor } from './modelo';

const { obtener, crear, editar, cambiarEstado } = vi.hoisted(() => ({ obtener: vi.fn(), crear: vi.fn(), editar: vi.fn(), cambiarEstado: vi.fn() }));
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
Element.prototype.scrollIntoView = vi.fn();
vi.mock('../../cliente/useClienteApi', () => {
  const cliente = { get: obtener, post: crear, put: editar, patch: cambiarEstado };
  return { useClienteApi: () => cliente };
});
function Ubicacion() { const navegar = useNavigate(); return <><output data-testid="url">{useLocation().search}</output><button onClick={() => navegar(-1)}>Volver en historial</button></>; }
function montar(tipo: 'repartidores' | 'furgonetas' = 'repartidores', consulta = '') {
  return render(<MantineProvider theme={tema} env="test"><MemoryRouter initialEntries={[`/${tipo}${consulta}`]}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{tipo === 'repartidores' ? <PaginaRepartidores /> : <PaginaFurgonetas />}<Ubicacion /></MemoryRouter></MantineProvider>);
}
beforeEach(() => {
  crear.mockReset(); editar.mockReset(); cambiarEstado.mockReset(); obtener.mockReset();
  obtener.mockImplementation(async (ruta: string, { params }: { params: URLSearchParams }) => ({ data: paginaPrueba<Repartidor | Furgoneta>(
    ruta.includes('/repartidores') ? [structuredClone(repartidorPrueba)] : [structuredClone(furgonetaPrueba)], Number(params.get('pagina')), Number(params.get('tamanoPagina'))) }));
});

it('ES-F05-02: combina filtros, restaura URL e historial y solo consulta el catálogo local', async () => {
  const usuario = userEvent.setup(); montar('repartidores', '?estadoRegistro=ACTIVO&turnoHabitual=MANANA');
  await screen.findByText('Ana Prueba');
  expect(obtener.mock.calls[0][0]).toBe('/api/v1/repartidores');
  expect(obtener.mock.calls[0][1].params.get('turnoHabitual')).toBe('MANANA');
  await usuario.click(screen.getByRole('button', { name: 'Quitar Registro: Activo' }));
  await waitFor(() => expect(screen.getByTestId('url')).not.toHaveTextContent('estadoRegistro'));
  await usuario.click(screen.getByRole('button', { name: 'Volver en historial' }));
  await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('estadoRegistro=ACTIVO'));
  expect(obtener.mock.calls.every(([ruta]) => ruta === '/api/v1/repartidores')).toBe(true);
});

it('ES-F05-02/07: distingue lista vacía, búsqueda sin coincidencias y respuesta inválida', async () => {
  obtener.mockResolvedValue({ data: paginaPrueba([]) });
  const vista = montar();
  expect(await screen.findByText('Aún no hay repartidores registrados')).toBeVisible();
  vista.unmount(); montar('furgonetas', '?placa=ZZZ');
  expect(await screen.findByText('No encontramos resultados con estos filtros')).toBeVisible();
});

it('rechaza URL inválida sin enviar consultas ni habilitar mutaciones', async () => {
  montar('repartidores', '?pagina=-1&estadoRegistro=INVENTADO');
  expect(await screen.findByText('Revisa los filtros de la URL')).toBeVisible();
  expect(obtener).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Nuevo repartidor' })).toBeDisabled();
});

it('corrige una página que desapareció sin fabricar totales ni ofrecer una página vacía', async () => {
  obtener.mockImplementation(async (_ruta, { params }) => ({ data: Number(params.get('pagina')) > 1
    ? paginaPrueba([], Number(params.get('pagina')), 50, 1) : paginaPrueba([repartidorPrueba]) }));
  montar('repartidores', '?pagina=3');
  await screen.findByText('Ana Prueba');
  expect(screen.getByTestId('url')).toHaveTextContent('pagina=1');
  expect(screen.getByText('Mostrando 1–1 de 1')).toBeVisible();
});

it('descarta una respuesta anterior aunque el transporte ignore AbortSignal', async () => {
  const usuario = userEvent.setup(); let resolver!: (valor: unknown) => void;
  obtener.mockResolvedValueOnce({ data: paginaPrueba([repartidorPrueba]) }).mockImplementationOnce(() => new Promise((resuelve) => { resolver = resuelve; }))
    .mockResolvedValue({ data: paginaPrueba([{ ...repartidorPrueba, nombres: 'Respuesta actual' }]) });
  montar('repartidores', '?estadoRegistro=ACTIVO'); await screen.findByText('Ana Prueba');
  await usuario.click(screen.getByRole('button', { name: 'Actualizar' }));
  await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
  await screen.findByText('Respuesta actual Prueba');
  await act(async () => { resolver({ data: paginaPrueba([{ ...repartidorPrueba, nombres: 'Obsoleta' }]) }); });
  expect(screen.queryByText('Obsoleta Prueba')).not.toBeInTheDocument();
});

it('conserva datos ante fallo de refresco y retira filtros, filas y formulario al recibir 403', async () => {
  const usuario = userEvent.setup(); montar(); await screen.findByText('Ana Prueba');
  obtener.mockRejectedValueOnce(new Error('Sin red'));
  await usuario.click(screen.getByRole('button', { name: 'Actualizar' }));
  await screen.findByText('No se pudo actualizar el listado');
  expect(screen.getByText('Ana Prueba')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Editar repartidor Ana Prueba' })).toBeDisabled();
  obtener.mockRejectedValue(falloPrueba(403));
  await usuario.click(screen.getByRole('button', { name: 'Reintentar consulta' }));
  await screen.findByText('No tienes permisos para ver esta información');
  expect(screen.queryByText('Ana Prueba')).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Filtros de consulta' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Nuevo repartidor' })).not.toBeInTheDocument();
});

it('ES-F05-03: precarga y protege identidad; un doble envío solo edita los campos permitidos una vez', async () => {
  const usuario = userEvent.setup(); let resolver!: (valor: unknown) => void;
  editar.mockImplementation(() => new Promise((resuelve) => { resolver = resuelve; }));
  montar(); await screen.findByText('Ana Prueba');
  await usuario.click(screen.getByRole('button', { name: 'Editar repartidor Ana Prueba' }));
  expect(screen.getByLabelText('DNI', { exact: false })).toHaveAttribute('readonly');
  expect(screen.getByLabelText('Nombres', { exact: false })).toHaveAttribute('readonly');
  const telefono = screen.getByLabelText('Teléfono', { exact: false });
  await usuario.clear(telefono); await usuario.type(telefono, '999333444');
  await usuario.dblClick(screen.getByRole('button', { name: 'Guardar' }));
  expect(editar).toHaveBeenCalledTimes(1);
  expect(editar.mock.calls[0]).toEqual(['/api/v1/repartidores/rep%2F1', { telefono: '999333444', correo: 'ana@example.test', numeroBrevete: 'Q12345678', turnoHabitual: 'MANANA' }]);
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  await act(async () => { resolver({ data: { ...repartidorPrueba, telefono: '999333444' } }); });
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

it('ES-F05-04: cancelar no muta; un conflicto conserva contexto y permite consultar antes de otra baja', async () => {
  const usuario = userEvent.setup(); cambiarEstado.mockRejectedValue(falloPrueba(409));
  montar(); await screen.findByText('Ana Prueba');
  await usuario.click(screen.getByRole('button', { name: 'Más acciones para Ana Prueba' }));
  await usuario.click(await screen.findByRole('menuitem', { name: 'Dar de baja' }));
  await usuario.click(screen.getByRole('button', { name: 'Cancelar' })); expect(cambiarEstado).not.toHaveBeenCalled();
  await usuario.click(screen.getByRole('button', { name: 'Más acciones para Ana Prueba' }));
  await usuario.click(await screen.findByRole('menuitem', { name: 'Dar de baja' }));
  await usuario.click(screen.getByRole('button', { name: 'Confirmar baja' }));
  expect(await screen.findByText(/Puede haber despachos en curso/)).toBeVisible();
  expect(cambiarEstado).toHaveBeenCalledWith('/api/v1/repartidores/rep%2F1/estado', { estado: 'INACTIVO' });
  expect(screen.getByRole('dialog')).toBeVisible();
  expect(screen.queryByText(/Traza interna/)).not.toBeInTheDocument();
});

it('ES-F05-05: vincula con usuarioId sin crear cuenta global ni solicitar contraseña', async () => {
  const usuario = userEvent.setup(); editar.mockResolvedValue({ status: 200 });
  montar(); await screen.findByText('Ana Prueba');
  await usuario.click(screen.getByRole('button', { name: 'Más acciones para Ana Prueba' }));
  await usuario.click(await screen.findByRole('menuitem', { name: 'Vincular cuenta' }));
  expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  await usuario.type(screen.getByLabelText('Identificador de usuario', { exact: false }), '2f31c1b1-7568-41b8-bf91-342db68431df');
  await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
  expect(editar).toHaveBeenCalledWith('/api/v1/repartidores/rep%2F1/vinculacion', { usuarioId: '2f31c1b1-7568-41b8-bf91-342db68431df' });
  expect(crear).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

it('ES-F05-08: conserva la placa y envía solo límites, sin alterar la capacidad de jornadas activas', async () => {
  const usuario = userEvent.setup(); editar.mockResolvedValue({ data: { ...furgonetaPrueba, capacidadPesoKg: 600 } });
  montar('furgonetas'); await screen.findByText('ABC-123');
  await usuario.click(screen.getByRole('button', { name: 'Editar furgoneta ABC-123' }));
  expect(screen.getByLabelText('Placa', { exact: false, selector: 'input[readonly]' })).toHaveAttribute('readonly');
  const peso = screen.getByLabelText('Límite de peso (kg)', { exact: false });
  await usuario.clear(peso); await usuario.type(peso, '600');
  await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
  expect(editar).toHaveBeenCalledWith('/api/v1/furgonetas/fur%2F1', { capacidadPesoKg: 600, capacidadVolumenM3: 4, maximoPaquetes: 80 });
  expect(cambiarEstado).not.toHaveBeenCalled();
});

it('ES-F05-09: cambia a mantenimiento tras confirmar; un 401 retira también el modal', async () => {
  const usuario = userEvent.setup(); cambiarEstado.mockRejectedValue(falloPrueba(401));
  montar('furgonetas'); await screen.findByText('ABC-123');
  await usuario.click(screen.getByRole('button', { name: 'Cambiar estado de ABC-123' }));
  expect(screen.getByRole('button', { name: 'Confirmar cambio' })).toBeDisabled();
  await usuario.click(screen.getByRole('combobox', { name: /Nuevo estado/ }));
  await usuario.click(await screen.findByRole('option', { name: 'En mantenimiento' }));
  await usuario.click(screen.getByRole('button', { name: 'Confirmar cambio' }));
  expect(cambiarEstado).toHaveBeenCalledWith('/api/v1/furgonetas/fur%2F1/estado', { estado: 'EN_MANTENIMIENTO' });
  await screen.findByText('No tienes permisos para ver esta información');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.queryByText('ABC-123')).not.toBeInTheDocument();
});

it('un resultado desconocido conserva el formulario y bloquea repetir la mutación hasta consultar', async () => {
  const usuario = userEvent.setup(); editar.mockRejectedValue(new Error('Respuesta perdida'));
  montar(); await screen.findByText('Ana Prueba');
  await usuario.click(screen.getByRole('button', { name: 'Editar repartidor Ana Prueba' }));
  await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
  await screen.findByText(/No pudimos confirmar el resultado/);
  expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  expect(screen.getByLabelText('Correo electrónico', { exact: false })).toHaveValue('ana@example.test');
  await usuario.click(screen.getByRole('button', { name: 'Consultar listado' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(editar).toHaveBeenCalledTimes(1);
});

it('representa estados nuevos sin exponer enums ni habilitar transiciones que desconoce', async () => {
  obtener.mockResolvedValue({ data: paginaPrueba([{ ...furgonetaPrueba, estado: 'ESTADO_NUEVO' }]) });
  montar('furgonetas');
  expect(await screen.findByText('Estado no disponible')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Cambiar estado de ABC-123' })).toBeDisabled();
  expect(screen.queryByText('ESTADO_NUEVO')).not.toBeInTheDocument();
});

it('ES-F05-07: debounce de placa y limpiar elimina una búsqueda pendiente', async () => {
  const usuario = userEvent.setup(); montar('furgonetas', '?placa=ABC'); await screen.findByText('ABC-123');
  await usuario.type(screen.getByLabelText('Placa', { exact: true }), 'X');
  await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
  await waitFor(() => expect(screen.getByTestId('url')).not.toHaveTextContent('placa'));
  await act(async () => { await new Promise((resolver) => setTimeout(resolver, 350)); });
  expect(screen.getByTestId('url')).not.toHaveTextContent('placa');
});

it('ES-F05-01: valida, conserva el DNI duplicado y registra un perfil local con vinculación pendiente', async () => {
  const usuario = userEvent.setup();
  crear.mockRejectedValueOnce(falloPrueba(409, [{ campo: 'dni' }])).mockResolvedValue({ data: { ...repartidorPrueba, dni: '87654321' } });
  montar(); await screen.findByText('Ana Prueba');
  await usuario.click(screen.getByRole('button', { name: 'Nuevo repartidor' }));
  const formulario = within(screen.getByRole('dialog'));
  expect(formulario.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  for (const [etiqueta, valor] of [['Nombres', 'Ana'], ['Apellidos', 'Prueba'], ['DNI', '12345678'], ['Teléfono', '999111222'], ['Correo electrónico', 'ana@example.test'], ['Número de brevete', 'Q12345678']]) {
    await usuario.type(formulario.getByLabelText(etiqueta, { exact: false }), valor);
  }
  await usuario.click(formulario.getByRole('combobox', { name: /Turno habitual/ }));
  await usuario.click(await screen.findByRole('option', { name: 'Mañana' }));
  await usuario.click(formulario.getByRole('button', { name: 'Guardar' }));
  expect(await screen.findByText('Este valor ya está registrado o no está disponible.')).toBeVisible();
  expect(formulario.getByLabelText('DNI', { exact: false })).toHaveValue('12345678');
  await usuario.clear(formulario.getByLabelText('DNI', { exact: false }));
  await usuario.type(formulario.getByLabelText('DNI', { exact: false }), '87654321');
  expect(screen.queryByText('Este valor ya está registrado o no está disponible.')).not.toBeInTheDocument();
  await usuario.click(formulario.getByRole('button', { name: 'Guardar' }));
  expect(crear.mock.calls.at(-1)).toEqual(['/api/v1/repartidores', {
    nombres: 'Ana', apellidos: 'Prueba', dni: '87654321', telefono: '999111222', correo: 'ana@example.test', numeroBrevete: 'Q12345678', turnoHabitual: 'MANANA',
  }]);
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}, 15000);

it('ES-F05-06: diferencia vacío de cero, rechaza paquetes fraccionarios y envía capacidades numéricas', async () => {
  const usuario = userEvent.setup(); crear.mockResolvedValue({ data: furgonetaPrueba });
  montar('furgonetas'); await screen.findByText('ABC-123');
  await usuario.click(screen.getByRole('button', { name: 'Nueva furgoneta' }));
  const formulario = within(screen.getByRole('dialog'));
  const peso = formulario.getByLabelText('Límite de peso (kg)', { exact: false });
  expect(peso).toHaveValue('');
  await usuario.type(formulario.getByLabelText('Placa', { exact: false }), 'abc-123');
  await usuario.type(peso, '0');
  await usuario.type(formulario.getByLabelText('Límite de volumen (m³)', { exact: false }), '4');
  const paquetes = formulario.getByLabelText('Máximo de paquetes', { exact: false });
  await usuario.type(paquetes, '1.5');
  expect(formulario.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  await usuario.clear(peso); await usuario.type(peso, '500');
  await usuario.clear(paquetes); await usuario.type(paquetes, '80');
  await usuario.click(formulario.getByRole('button', { name: 'Guardar' }));
  expect(crear).toHaveBeenCalledWith('/api/v1/furgonetas', { placa: 'ABC-123', capacidadPesoKg: 500, capacidadVolumenM3: 4, maximoPaquetes: 80 });
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

it('una respuesta incompleta nunca se convierte en un catálogo vacío', async () => {
  obtener.mockResolvedValue({ data: { contenido: [], totalElementos: 0 } });
  montar('furgonetas');
  expect(await screen.findByText('La información recibida no se pudo verificar. Reintenta la consulta.')).toBeVisible();
  expect(screen.queryByText('Aún no hay furgonetas registradas')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Nueva furgoneta' })).toBeDisabled();
});

it('una edición inexistente conserva el formulario y ofrece actualizar, sin inventar éxito', async () => {
  const usuario = userEvent.setup(); editar.mockRejectedValue(falloPrueba(404));
  montar(); await screen.findByText('Ana Prueba');
  await usuario.click(screen.getByRole('button', { name: 'Editar repartidor Ana Prueba' }));
  await usuario.click(screen.getByRole('button', { name: 'Guardar' }));
  expect(await screen.findByText('El registro ya no está disponible. Actualiza el listado.')).toBeVisible();
  expect(screen.getByRole('dialog')).toBeVisible();
  expect(screen.getByLabelText('Correo electrónico', { exact: false })).toHaveValue('ana@example.test');
});

it('ES-F05-04: la baja confirmada conserva el registro y retira las acciones exclusivas del activo', async () => {
  const usuario = userEvent.setup(); let inactivo = false;
  obtener.mockImplementation(async () => ({ data: paginaPrueba([{ ...repartidorPrueba, estadoRegistro: inactivo ? 'INACTIVO' : 'ACTIVO' }]) }));
  cambiarEstado.mockImplementation(async () => { inactivo = true; return { status: 204 }; });
  montar(); await screen.findByText('Ana Prueba');
  await usuario.click(screen.getByRole('button', { name: 'Más acciones para Ana Prueba' }));
  await usuario.click(await screen.findByRole('menuitem', { name: 'Dar de baja' }));
  await usuario.click(screen.getByRole('button', { name: 'Confirmar baja' }));
  expect(await screen.findByRole('cell', { name: 'Inactivo' })).toBeVisible();
  expect(screen.getByText('Ana Prueba')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Más acciones para Ana Prueba' })).not.toBeInTheDocument();
});

it('ES-F05-09: solo actualiza la fila con el estado devuelto por la nueva consulta', async () => {
  const usuario = userEvent.setup(); let estado = 'DISPONIBLE';
  obtener.mockImplementation(async () => ({ data: paginaPrueba([{ ...furgonetaPrueba, estado }]) }));
  cambiarEstado.mockImplementation(async () => { estado = 'EN_MANTENIMIENTO'; return { status: 204 }; });
  montar('furgonetas'); await screen.findByText('ABC-123');
  await usuario.click(screen.getByRole('button', { name: 'Cambiar estado de ABC-123' }));
  await usuario.click(screen.getByRole('combobox', { name: /Nuevo estado/ }));
  await usuario.click(await screen.findByRole('option', { name: 'En mantenimiento' }));
  await usuario.click(screen.getByRole('button', { name: 'Confirmar cambio' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(await screen.findByRole('cell', { name: 'En mantenimiento' })).toBeVisible();
});
