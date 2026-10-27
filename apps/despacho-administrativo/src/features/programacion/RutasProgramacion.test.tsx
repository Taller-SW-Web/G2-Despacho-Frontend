import '@testing-library/jest-dom/vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { beforeEach, expect, it, vi } from 'vitest';
import { tema } from '@despacho/componentes-compartidos';
import { RutasProgramacion } from './RutasProgramacion';
import { moverParada, type Ruta } from './rutasApi';

const { listar, consultar, guardar, denegar, pendientes } = vi.hoisted(() => ({
  listar: vi.fn(), consultar: vi.fn(), guardar: vi.fn(), denegar: vi.fn(), pendientes: vi.fn(),
}));
vi.mock('../../cliente/useClienteApi', () => { const cliente = {}; return { useClienteApi: () => cliente }; });
vi.mock('./rutasApi', async (original) => ({ ...await original<typeof import('./rutasApi')>(),
  consultarJornadasRuta: listar, consultarRuta: consultar, guardarSecuencia: guardar }));
const id = (numero: number) => `00000000-0000-4000-8000-${String(numero).padStart(12, '0')}`;
const ruta: Ruta = { idJornada: id(100), estadoJornada: 'ACTIVA', versionRuta: `"${'a'.repeat(64)}"`, consultadoEn: '2026-10-26T15:00:00Z',
  despachos: [1, 2, 3].map((numero) => ({ idDespacho: id(numero), codigoOperativo: `DSP-${numero}`, codigoRastreoInterno: `TRK-${numero}`,
    estado: numero === 2 ? 'EN_CAMINO' : 'ASIGNADO', posicion: numero, version: 1, destinatario: 'Prueba', direccion: `Dirección ${numero}`,
    pesoKg: 2, volumenM3: 0.01, cantidadPaquetes: 1, actualizadoEn: '2026-10-26T15:00:00Z',
    idPedido: `PED-${numero}`, idRepartidor: id(200), reasignacionEnProceso: false, cancelacionEnProceso: false })) };
beforeEach(() => {
  vi.clearAllMocks();
  // JSDOM no implementa el desplazamiento que usa Mantine al seleccionar con flechas.
  Element.prototype.scrollIntoView = vi.fn();
  listar.mockResolvedValue([{ value: id(100), label: 'Conductor · TEST-01' }]);
  consultar.mockResolvedValue(structuredClone(ruta));
  guardar.mockResolvedValue(structuredClone(ruta));
});
async function montar() {
  const usuario = userEvent.setup();
  render(<MantineProvider theme={tema}><RutasProgramacion alCambiarPendientes={pendientes} alDenegar={denegar} /></MantineProvider>);
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Repartidor en jornada' })).toBeEnabled());
  await usuario.click(screen.getByRole('combobox', { name: 'Repartidor en jornada' }));
  await usuario.keyboard('{ArrowDown}{Enter}');
  await screen.findByText('#1 · DSP-1');
  return usuario;
}
it('permuta asignados sin mover posiciones fijas y anuncia el movimiento por teclado', async () => {
  const usuario = await montar();
  expect(screen.queryByRole('button', { name: 'Subir DSP-2' })).not.toBeInTheDocument();
  screen.getByRole('button', { name: 'Bajar DSP-1' }).focus();
  await usuario.keyboard('{Enter}');
  expect(screen.getByText('#3 · DSP-1')).toBeVisible();
  expect(screen.getByText('#2 · DSP-2')).toBeVisible();
  expect(screen.getByText('DSP-1 movido a la posición 3.')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Guardar orden' })).toBeEnabled();
});
it('descartar restaura el orden sin invocar el backend', async () => {
  const usuario = await montar();
  await usuario.click(screen.getByRole('button', { name: 'Bajar DSP-1' }));
  await usuario.click(screen.getByRole('button', { name: 'Descartar cambios' }));
  expect(screen.getByText('#1 · DSP-1')).toBeVisible();
  expect(guardar).not.toHaveBeenCalled();
});
it('guarda la fotografía original una sola vez aunque haya doble clic', async () => {
  const usuario = await montar();
  await usuario.click(screen.getByRole('button', { name: 'Bajar DSP-1' }));
  let resolver!: (valor: Ruta) => void;
  guardar.mockImplementation(() => new Promise((r) => { resolver = r; }));
  await usuario.dblClick(screen.getByRole('button', { name: 'Guardar orden' }));
  expect(guardar).toHaveBeenCalledTimes(1);
  const comando = guardar.mock.calls[0][1];
  expect(comando).toMatchObject({ jornada: id(100), version: ruta.versionRuta,
    despachos: [{ idDespacho: id(3), posicion: 1 }, { idDespacho: id(2), posicion: 2 }, { idDespacho: id(1), posicion: 3 }] });
  await act(async () => resolver(ruta));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Guardar orden' })).not.toBeInTheDocument());
});
it('tras perder respuesta bloquea edición y recupera exactamente la misma clave, versión y cuerpo', async () => {
  const usuario = await montar();
  guardar.mockRejectedValueOnce({ isAxiosError: true });
  await usuario.click(screen.getByRole('button', { name: 'Bajar DSP-1' }));
  await usuario.click(screen.getByRole('button', { name: 'Guardar orden' }));
  await screen.findByText('Resultado sin confirmar');
  expect(screen.getByRole('button', { name: 'Descartar cambios' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Subir DSP-1' })).toBeDisabled();
  await usuario.click(screen.getByRole('button', { name: 'Recuperar guardado' }));
  await waitFor(() => expect(guardar).toHaveBeenCalledTimes(2));
  expect(guardar.mock.calls[1][1]).toBe(guardar.mock.calls[0][1]);
});
it('un conflicto descarta la edición y exige una lectura nueva', async () => {
  const usuario = await montar();
  guardar.mockRejectedValueOnce({ isAxiosError: true, response: { status: 409 } });
  await usuario.click(screen.getByRole('button', { name: 'Bajar DSP-1' }));
  await usuario.click(screen.getByRole('button', { name: 'Guardar orden' }));
  await screen.findByText(/La ruta cambió/);
  await waitFor(() => expect(consultar).toHaveBeenCalledTimes(2));
  expect(screen.queryByRole('button', { name: 'Guardar orden' })).not.toBeInTheDocument();
});
it('un rechazo de permisos retira el contenido a través del panel protegido', async () => {
  const usuario = await montar();
  guardar.mockRejectedValueOnce({ isAxiosError: true, response: { status: 403 } });
  await usuario.click(screen.getByRole('button', { name: 'Bajar DSP-1' }));
  await usuario.click(screen.getByRole('button', { name: 'Guardar orden' }));
  await waitFor(() => expect(denegar).toHaveBeenCalled());
});
it('la permutación conserva huecos históricos y no permite arrastrar a un espacio fijo', () => {
  const filas = ruta.despachos.filter((p) => p.posicion !== 2);
  expect(moverParada(filas, 0, 1).map((p) => [p.idDespacho, p.posicion])).toEqual([[id(3), 1], [id(1), 3]]);
  expect(moverParada(ruta.despachos, 0, 1)).toBe(ruta.despachos);
  const larga = [...ruta.despachos, { ...ruta.despachos[0], idDespacho: id(4), posicion: 5 }];
  expect(moverParada(larga, 0, 3).map((p) => [p.idDespacho, p.posicion]))
    .toEqual([[id(3), 1], [id(2), 2], [id(4), 3], [id(1), 5]]);
});
it('una cancelación pendiente conserva la parada fija y no ofrece otra reasignación', async () => {
  const actual = structuredClone(ruta); actual.despachos[0].cancelacionEnProceso = true;
  consultar.mockResolvedValue(actual);
  await montar();
  expect(screen.getByText('Cancelación en proceso. Se actualizará la ruta al confirmarse.')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Reasignar DSP-1' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Bajar DSP-1' })).not.toBeInTheDocument();
  expect(moverParada(actual.despachos, 0, 2)).toBe(actual.despachos);
});
