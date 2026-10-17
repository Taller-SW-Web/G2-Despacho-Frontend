import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { tema } from '@despacho/componentes-compartidos';
import { PaginaJornadas } from './PaginaJornadas';
import { idsPrueba, jornadaPrueba, monitoreoPrueba } from './fixtures.prueba';
import { falloPrueba, repartidorPrueba, furgonetaPrueba } from '../flota/fixtures.prueba';

const { obtener, crear } = vi.hoisted(() => ({ obtener: vi.fn(), crear: vi.fn() }));
vi.mock('../../cliente/useClienteApi', () => { const cliente = { get: obtener, post: crear }; return { useClienteApi: () => cliente }; });
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
Element.prototype.scrollIntoView = vi.fn();
function montar(consulta = '') {
  return render(<MantineProvider theme={tema} env="test"><MemoryRouter initialEntries={['/jornadas' + consulta]}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><PaginaJornadas /></MemoryRouter></MantineProvider>);
}
const pagina = (contenido: unknown[]) => ({ contenido, pagina: 1, tamanoPagina: 100, totalElementos: contenido.length, totalPaginas: contenido.length ? 1 : 0 });
beforeEach(() => {
  obtener.mockReset(); crear.mockReset();
  obtener.mockImplementation(async (ruta: string) => ({ data: ruta === '/api/v1/flota/monitoreo' ? structuredClone(monitoreoPrueba)
    : ruta === '/api/v1/repartidores' ? pagina([{ ...repartidorPrueba, idRepartidor: idsPrueba.repartidor, estadoVinculacion: 'VINCULADO' }])
    : ruta === '/api/v1/furgonetas' ? pagina([{ ...furgonetaPrueba, idFurgoneta: idsPrueba.furgoneta }])
    : ruta === '/api/v1/zonas' ? pagina([{ id: idsPrueba.zona, nombre: 'Zona Prueba', estado: 'ACTIVO' }])
    : { ...jornadaPrueba, despachos: [] } }));
});

it('presenta KPI del servidor y las tres métricas, y envía filtros de URL', async () => {
  montar('?fecha=2026-10-17&estadoOperativo=DISPONIBLE');
  await screen.findByText('Ana Jornada Prueba');
  expect(screen.getByRole('button', { name: 'Disponibles: 1' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getAllByRole('progressbar')).toHaveLength(3);
  expect(obtener.mock.calls[0][1].params.get('fecha')).toBe('2026-10-17');
});
it('no consulta con URL inválida ni habilita mutaciones', async () => {
  montar('?pagina=0');
  expect(await screen.findByText('Revisa los filtros')).toBeVisible();
  expect(obtener).not.toHaveBeenCalled(); expect(screen.getByRole('button', { name: 'Abrir jornada' })).toBeDisabled();
});
it('conserva datos ante caída, bloquea acciones y recupera con consulta confirmada', async () => {
  const usuario = userEvent.setup(); montar(); await screen.findByText('Ana Jornada Prueba');
  obtener.mockRejectedValueOnce(falloPrueba(503));
  await usuario.click(screen.getByRole('button', { name: 'Actualizar' }));
  expect(await screen.findByText('Datos desactualizados')).toBeVisible();
  expect(screen.getByText('Ana Jornada Prueba')).toBeVisible(); expect(screen.getByRole('button', { name: 'Abrir jornada' })).toBeDisabled();
  await usuario.click(screen.getByRole('button', { name: 'Actualizar datos' }));
  await waitFor(() => expect(screen.queryByText('Datos desactualizados')).not.toBeInTheDocument());
  expect(screen.getByRole('button', { name: 'Abrir jornada' })).toBeEnabled();
});
it('retira los datos y formularios cuando el servidor deniega acceso', async () => {
  const usuario = userEvent.setup(); montar(); await screen.findByText('Ana Jornada Prueba');
  obtener.mockRejectedValueOnce(falloPrueba(403)); await usuario.click(screen.getByRole('button', { name: 'Actualizar' }));
  await waitFor(() => expect(screen.queryByText('Ana Jornada Prueba')).not.toBeInTheDocument());
  expect(screen.queryByRole('button', { name: 'Abrir jornada' })).not.toBeInTheDocument();
});
it('abre jornada usando catálogos reales del contrato y conserva el resultado incierto sin reenviar', async () => {
  const usuario = userEvent.setup(); montar(); await screen.findByText('Ana Jornada Prueba');
  await usuario.click(screen.getByRole('button', { name: 'Abrir jornada' }));
  const dialogo = await screen.findByRole('dialog', { name: 'Abrir jornada' });
  await waitFor(() => expect(within(dialogo).getByRole('combobox', { name: /^Repartidor/ })).toBeEnabled(), { timeout: 5000 });
  for (const [nombre, etiqueta] of [['Repartidor', `${repartidorPrueba.nombres} ${repartidorPrueba.apellidos}`], ['Furgoneta', furgonetaPrueba.placa], ['Zona', 'Zona Prueba']]) {
    await usuario.click(within(dialogo).getByRole('combobox', { name: new RegExp(`^${nombre}`) }));
    await usuario.click(screen.getByRole('option', { name: etiqueta }));
  }
  crear.mockRejectedValueOnce(falloPrueba(503));
  await usuario.click(within(dialogo).getByRole('button', { name: 'Abrir jornada' }));
  expect(await within(dialogo).findByText(/No pudimos confirmar el resultado/)).toBeVisible();
  expect(crear).toHaveBeenCalledExactlyOnceWith('/api/v1/jornadas', { idRepartidor: idsPrueba.repartidor, idFurgoneta: idsPrueba.furgoneta, idZona: idsPrueba.zona, fecha: '2026-10-17' });
  expect(within(dialogo).getByRole('button', { name: 'Abrir jornada' })).toBeDisabled();
});
it('un cierre rechazado conserva jornada y muestra el conflicto sin inventar éxito', async () => {
  const usuario = userEvent.setup(); montar(); await screen.findByText('Ana Jornada Prueba');
  await usuario.click(screen.getByRole('button', { name: 'Cerrar jornada de Ana Jornada Prueba' }));
  const dialogo = await screen.findByRole('dialog', { name: 'Cerrar jornada' });
  crear.mockRejectedValueOnce(falloPrueba(409));
  await usuario.click(within(dialogo).getByRole('button', { name: 'Cerrar jornada' }));
  expect(await within(dialogo).findByText(/El recurso cambió/)).toBeVisible();
  expect(screen.getByText('Ana Jornada Prueba')).toBeVisible();
  expect(crear).toHaveBeenCalledExactlyOnceWith(`/api/v1/jornadas/${idsPrueba.jornada}/cierre`);
});
it('consulta el detalle de la jornada seleccionada y muestra su zona y remanentes', async () => {
  const usuario = userEvent.setup(); montar(); await screen.findByText('Ana Jornada Prueba');
  await usuario.click(screen.getByRole('button', { name: 'Ver jornada de Ana Jornada Prueba' }));
  const dialogo = await screen.findByRole('dialog', { name: 'Detalle de jornada' });
  expect(await within(dialogo).findByText(/Remanente: 400 kg/)).toBeVisible();
  expect(obtener.mock.calls.some(([ruta]) => ruta === `/api/v1/jornadas/${idsPrueba.jornada}`)).toBe(true);
});
it('sin conexión comunica la causa y bloquea nuevas aperturas sin encolar comandos', async () => {
  montar(); await screen.findByText('Ana Jornada Prueba');
  act(() => window.dispatchEvent(new Event('offline')));
  expect(screen.getByText('Sin conexión')).toBeVisible(); expect(screen.getByRole('button', { name: 'Abrir jornada' })).toBeDisabled();
  expect(crear).not.toHaveBeenCalled();
});
