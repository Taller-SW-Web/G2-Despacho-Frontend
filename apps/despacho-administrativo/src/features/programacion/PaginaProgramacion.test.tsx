import '@testing-library/jest-dom/vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { tema } from '@despacho/componentes-compartidos';
import { PaginaProgramacion } from './PaginaProgramacion';
import { creacionPrueba, disponiblesPrueba, paginaPrueba, zonasPrueba } from './fixtures.prueba';
import { leerFiltros } from './modelo';

const { obtener, publicar, notificar } = vi.hoisted(() => ({ obtener: vi.fn(), publicar: vi.fn(), notificar: vi.fn() }));
vi.mock('../../cliente/useClienteApi', () => {
  const cliente = { get: obtener, post: publicar };
  return { useClienteApi: () => cliente };
});
vi.mock('@despacho/componentes-compartidos', async (original) => ({ ...await original<typeof import('@despacho/componentes-compartidos')>(), notificarOperacion: notificar }));
function Ubicacion() { return <output data-testid="url">{useLocation().search}</output>; }
function montar(ruta = '/programacion') {
  return render(<MantineProvider theme={tema}><MemoryRouter initialEntries={[ruta]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <PaginaProgramacion /><Ubicacion /></MemoryRouter></MantineProvider>);
}
function fallo(status: number, code = '') { return { isAxiosError: true, response: { status, data: { status, code } } }; }
let pagina: typeof paginaPrueba;
beforeEach(() => {
  pagina = structuredClone(paginaPrueba);
  obtener.mockImplementation(async (ruta: string) => ({ data: ruta === '/api/v1/zonas' ? zonasPrueba : ruta.endsWith('/disponibles') ? disponiblesPrueba : structuredClone(pagina) }));
  publicar.mockResolvedValue({ data: creacionPrueba });
});

it('presenta cifras del servidor, reintentos con contador cero y el bloqueo de fecha futura', async () => {
  const usuario = userEvent.setup();
  pagina.contenido[2].volumenTotalM3 = 0.000000000000016;
  montar();
  await screen.findByText('TRK-78900');
  expect(screen.getByRole('button', { name: 'Pendientes para hoy: 32' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Reintentos: 11' })).toBeEnabled();
  const futura = screen.getByText('TRK-78902').closest('tr')!;
  expect(within(futura).getByRole('button', { name: 'Asignar' })).toBeDisabled();
  expect(within(futura).getByText('0 consumidos')).toBeVisible();
  expect(within(futura).getByText('Reintento')).toBeVisible();
  await usuario.click(within(futura).getByRole('button', { name: 'Ver detalle' }));
  expect(within(screen.getByRole('dialog')).getByText(/0[.,]000000000000016 m³/)).toBeVisible();
  expect(screen.getByRole('tab', { name: 'Rutas por repartidor' })).toBeDisabled();
});

it('sincroniza filtros y KPI con la URL usando hoy del servidor y conserva el tamaño de página', async () => {
  const usuario = userEvent.setup();
  montar('/programacion?tamanoPagina=50&idZona=zona-centro');
  await screen.findByText('TRK-78900');
  await usuario.click(screen.getByRole('button', { name: 'Pendientes para hoy: 32' }));
  await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('fechaHasta=2026-10-17'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Reintentos: 11' })).toBeEnabled());
  await usuario.click(screen.getByRole('button', { name: 'Reintentos: 11' }));
  await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('tipoIntento=REINTENTOS'));
  await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
  await waitFor(() => expect(screen.getByTestId('url').textContent).toBe('?tamanoPagina=50'));
  expect(obtener.mock.calls.some(([ruta, opciones]) => ruta.endsWith('/pendientes') && opciones.params.get('idZona') === 'zona-centro')).toBe(true);
});

it('genera una sola prueba ante doble clic, conserva filtros y refresca la cola tras el resultado', async () => {
  const usuario = userEvent.setup();
  let resolver!: (respuesta: unknown) => void;
  publicar.mockImplementation(() => new Promise((r) => { resolver = r; }));
  montar('/programacion?tipoIntento=REINTENTOS');
  await screen.findByText('TRK-78900');
  await usuario.dblClick(screen.getByRole('button', { name: 'Generar pedido de prueba' }));
  expect(publicar).toHaveBeenCalledTimes(1);
  expect(publicar).toHaveBeenCalledWith('/api/v1/despachos/simulaciones', {});
  await act(async () => resolver({ data: creacionPrueba }));
  await waitFor(() => expect(notificar).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'exito', mensaje: expect.stringContaining('DSP-SIM-0001') })));
  expect(screen.getByTestId('url')).toHaveTextContent('tipoIntento=REINTENTOS');
  expect(await screen.findByText(/Puede quedar fuera de los filtros/)).toBeVisible();
});

it('valida la simulación personalizada y no confunde generar con asignar', async () => {
  const usuario = userEvent.setup();
  montar();
  await screen.findByText('TRK-78900');
  await usuario.click(screen.getByRole('button', { name: 'Personalizar pedido de prueba' }));
  const modal = within(screen.getByRole('dialog'));
  const peso = modal.getByRole('textbox', { name: 'Peso (kg)' });
  await usuario.clear(peso);
  await usuario.type(peso, '0');
  await usuario.click(modal.getByRole('button', { name: 'Generar' }));
  expect(publicar).not.toHaveBeenCalled();
  await usuario.clear(peso);
  await usuario.type(peso, '12.5');
  await usuario.click(modal.getByRole('button', { name: 'Generar' }));
  await waitFor(() => expect(publicar).toHaveBeenCalledWith('/api/v1/despachos/simulaciones', { pesoKg: 12.5, volumenM3: 0.025, observaciones: '' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

it('prioriza la zona, bloquea las tres dimensiones y confirma con las identidades públicas correctas una sola vez', async () => {
  const usuario = userEvent.setup();
  montar();
  await screen.findByText('TRK-78900');
  await usuario.click(screen.getAllByRole('button', { name: 'Asignar' })[0]);
  await screen.findByRole('radio', { name: 'Juan de la zona' });
  for (const nombre of ['Pedro sin peso', 'María sin volumen', 'Luis sin paquetes']) expect(screen.getByRole('radio', { name: nombre })).toBeDisabled();
  expect(within(screen.getByRole('radiogroup', { name: 'Repartidor' })).getAllByRole('radio').at(-1)).toHaveAccessibleName('Ana de otra zona');
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  await usuario.click(screen.getByRole('radio', { name: 'Juan de la zona' }));
  await usuario.type(screen.getByRole('textbox', { name: 'Observaciones o instrucciones de entrega' }), 'Prioridad');
  let resolver!: (respuesta: unknown) => void;
  publicar.mockImplementation(() => new Promise((r) => { resolver = r; }));
  await usuario.dblClick(screen.getByRole('button', { name: 'Confirmar asignación' }));
  expect(publicar).toHaveBeenCalledTimes(1);
  expect(publicar).toHaveBeenCalledWith('/api/v1/despachos/despacho-0/asignacion', { idRepartidor: 'rep-centro', idJornada: 'jor-1', observacion: 'Prioridad' });
  pagina.contenido = pagina.contenido.slice(1);
  await act(async () => resolver({ data: { idDespacho: 'despacho-0', estado: 'ASIGNADO', idRepartidor: 'rep-centro', idJornada: 'jor-1', posicionSecuencia: 4 } }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await waitFor(() => expect(screen.queryByText('TRK-78900')).not.toBeInTheDocument());
  expect(notificar).toHaveBeenCalledWith(expect.objectContaining({ mensaje: expect.stringContaining('Parada #4') }));
});

it('un conflicto requiere actualizar la cola y no reenvía automáticamente la asignación', async () => {
  const usuario = userEvent.setup();
  publicar.mockRejectedValue(fallo(409));
  montar();
  await screen.findByText('TRK-78900');
  await usuario.click(screen.getAllByRole('button', { name: 'Asignar' })[0]);
  await usuario.click(await screen.findByRole('radio', { name: 'Juan de la zona' }));
  await usuario.click(screen.getByRole('button', { name: 'Confirmar asignación' }));
  expect(await screen.findByText('Actualiza antes de continuar')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Confirmar asignación' })).toBeDisabled();
  await usuario.click(screen.getByRole('button', { name: 'Cerrar y recargar cola' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(publicar).toHaveBeenCalledTimes(1);
});

it('retira filas, filtros, indicadores y modal si disponibilidad revoca el permiso', async () => {
  const usuario = userEvent.setup();
  montar();
  await screen.findByText('TRK-78900');
  obtener.mockImplementation((ruta: string) => ruta.endsWith('/disponibles') ? Promise.reject(fallo(403)) : Promise.resolve({ data: pagina }));
  await usuario.click(screen.getAllByRole('button', { name: 'Asignar' })[0]);
  await screen.findByText('No tienes permisos para ver esta información');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.queryByText('TRK-78900')).not.toBeInTheDocument();
  expect(screen.queryByRole('combobox', { name: 'Zona' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Pendientes para hoy: 32' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Generar pedido de prueba' })).not.toBeInTheDocument();
});

it('reconsulta capacidad tras un rechazo y exige una selección nueva sin repetir el POST', async () => {
  const usuario = userEvent.setup();
  publicar.mockRejectedValue(fallo(422));
  montar();
  await screen.findByText('TRK-78900');
  await usuario.click(screen.getAllByRole('button', { name: 'Asignar' })[0]);
  await usuario.click(await screen.findByRole('radio', { name: 'Juan de la zona' }));
  const nuevaCapacidad = structuredClone(disponiblesPrueba);
  nuevaCapacidad.repartidores.find((r) => r.idRepartidor === 'rep-centro')!.capacidadRemanente.paquetes = 0;
  obtener.mockImplementation(async (ruta: string) => ({ data: ruta.endsWith('/disponibles') ? nuevaCapacidad : ruta === '/api/v1/zonas' ? zonasPrueba : pagina }));
  await usuario.click(screen.getByRole('button', { name: 'Confirmar asignación' }));
  await waitFor(() => expect(screen.getByRole('radio', { name: 'Juan de la zona' })).toBeDisabled());
  expect(screen.getByRole('button', { name: 'Confirmar asignación' })).toBeDisabled();
  expect(publicar).toHaveBeenCalledTimes(1);
});

it('ignora respuestas viejas cuando cambian filtros aunque HTTP ignore la cancelación', async () => {
  const usuario = userEvent.setup();
  let resolver!: (respuesta: unknown) => void;
  montar();
  await screen.findByText('TRK-78900');
  obtener.mockImplementation((ruta: string) => ruta === '/api/v1/zonas' ? Promise.resolve({ data: zonasPrueba }) : new Promise((r) => { resolver = r; }));
  await usuario.click(screen.getByRole('button', { name: 'Actualizar' }));
  await waitFor(() => expect(resolver).toBeDefined());
  obtener.mockResolvedValue({ data: pagina });
  await usuario.click(screen.getByRole('radio', { name: 'Reintentos' }));
  await screen.findByText('TRK-78900');
  const obsoleta = structuredClone(pagina);
  obsoleta.contenido[0].codigoRastreoInterno = 'RESPUESTA-ANTERIOR';
  await act(async () => resolver({ data: obsoleta }));
  expect(screen.queryByText('RESPUESTA-ANTERIOR')).not.toBeInTheDocument();
});

it('distingue falta de coincidencias, vacío y error y rechaza URL inválida antes de consultar', async () => {
  const usuario = userEvent.setup();
  pagina.contenido = []; pagina.totalElementos = 0; pagina.totalPaginas = 0;
  montar('/programacion?pagina=0');
  expect(await screen.findByText('Revisa los filtros de la URL')).toBeVisible();
  expect(obtener.mock.calls.some(([ruta]) => ruta.endsWith('/pendientes'))).toBe(false);
  await usuario.click(screen.getByRole('button', { name: 'Restablecer consulta' }));
  await screen.findByText('No hay despachos pendientes de asignación');
  await usuario.click(screen.getByRole('button', { name: 'Reintentos: 11' }));
  await screen.findByText('No encontramos resultados con estos filtros');
  obtener.mockRejectedValue(new Error('Red de prueba'));
  await usuario.click(screen.getByRole('button', { name: 'Actualizar' }));
  await screen.findByText('No se pudo consultar la cola');
  expect(screen.queryByText('No hay despachos pendientes de asignación')).not.toBeInTheDocument();
});

it('no duplica una simulación con respuesta perdida y exige consultar antes de habilitar otro envío', async () => {
  const usuario = userEvent.setup();
  publicar.mockRejectedValue(new Error('Respuesta perdida'));
  montar();
  await screen.findByText('TRK-78900');
  await usuario.click(screen.getByRole('button', { name: 'Generar pedido de prueba' }));
  await screen.findByText('No se pudo confirmar la generación');
  expect(screen.getByRole('button', { name: 'Generar pedido de prueba' })).toBeDisabled();
  await usuario.click(screen.getByRole('button', { name: 'Consultar cola' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Generar pedido de prueba' })).toBeEnabled());
  expect(publicar).toHaveBeenCalledTimes(1);
});

it('descarta una mutación de la sesión anterior y sus notificaciones', async () => {
  const usuario = userEvent.setup();
  let resolver!: (respuesta: unknown) => void;
  publicar.mockImplementation(() => new Promise((r) => { resolver = r; }));
  montar();
  await screen.findByText('TRK-78900');
  await usuario.click(screen.getByRole('button', { name: 'Generar pedido de prueba' }));
  await act(async () => window.dispatchEvent(new Event('despacho:sesion')));
  await screen.findByText('TRK-78900');
  await act(async () => resolver({ data: creacionPrueba }));
  expect(notificar).not.toHaveBeenCalled();
});

it('rechaza fechas imposibles, repetidos y parámetros fuera del contrato', () => {
  for (const consulta of ['fechaDesde=2026-02-31', 'fechaDesde=2026-10-19&fechaHasta=2026-10-17', 'idZona=A&idZona=B', 'tamanoPagina=101', 'pagina=2147483648', 'orden=fecha', 'tipoIntento=OTRO'])
    expect(Object.keys(leerFiltros(new URLSearchParams(consulta)).errores).length).toBeGreaterThan(0);
});
