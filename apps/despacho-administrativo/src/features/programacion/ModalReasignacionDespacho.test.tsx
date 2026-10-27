import '@testing-library/jest-dom/vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { beforeEach, expect, it, vi } from 'vitest';
import { tema } from '@despacho/componentes-compartidos';
import { ModalReasignacionDespacho } from './ModalReasignacionDespacho';
import type { ParadaRuta } from './rutasApi';
import { jornadaPrueba, idsPrueba } from '../jornadas/fixtures.prueba';

const { obtener, publicar, cerrar, actualizar, denegar, notificar } = vi.hoisted(() => ({
  obtener: vi.fn(), publicar: vi.fn(), cerrar: vi.fn(), actualizar: vi.fn(), denegar: vi.fn(), notificar: vi.fn(),
}));
vi.mock('../../cliente/useClienteApi', () => { const cliente = { get: obtener, post: publicar }; return { useClienteApi: () => cliente }; });
vi.mock('@despacho/componentes-compartidos', async (original) => ({ ...await original<typeof import('@despacho/componentes-compartidos')>(), notificarOperacion: notificar }));
const destino = '10000000-0000-4000-8000-000000000001';
const jornadaDestino = '10000000-0000-4000-8000-000000000002';
const despacho: ParadaRuta = { idDespacho: '10000000-0000-4000-8000-000000000003', codigoOperativo: 'DSP-PRUEBA', codigoRastreoInterno: 'TRK-PRUEBA',
  estado: 'ASIGNADO', posicion: 1, version: 3, destinatario: 'Prueba', direccion: 'Dirección de prueba', pesoKg: 2, volumenM3: 0.01,
  cantidadPaquetes: 2, actualizadoEn: '2026-10-26T15:00:00Z', idPedido: 'PED-PRUEBA', idRepartidor: idsPrueba.repartidor, reasignacionEnProceso: false, cancelacionEnProceso: false };
const candidato = { ...jornadaPrueba, idRepartidor: destino, idJornada: jornadaDestino, nombre: 'Destino Prueba', estadoOperativo: 'DISPONIBLE' };
const respuesta = { idDespacho: despacho.idDespacho, estado: 'ASIGNADO', version: 4, idRepartidorAnterior: despacho.idRepartidor,
  idJornadaAnterior: idsPrueba.jornada, idRepartidor: destino, idJornada: jornadaDestino, idReserva: 'reserva-prueba',
  posicionSecuencia: 5, motivo: 'Redistribución', actualizadoEn: '2026-10-26T15:01:00Z' };
beforeEach(() => {
  vi.clearAllMocks();
  obtener.mockResolvedValue({ data: { repartidores: [{ ...jornadaPrueba, nombre: 'Origen Prueba', estadoOperativo: 'DISPONIBLE' }, candidato] } });
  publicar.mockResolvedValue({ data: respuesta });
});
function montar() {
  return render(<MantineProvider theme={tema}><ModalReasignacionDespacho despacho={despacho} jornada={idsPrueba.jornada} conductorActual="Origen Prueba · TEST-01"
    alCerrar={cerrar} alActualizar={actualizar} alDenegar={denegar} /></MantineProvider>);
}
async function seleccionar() {
  const usuario = userEvent.setup();
  await usuario.click(await screen.findByRole('radio', { name: 'Destino Prueba' }));
  await usuario.type(screen.getByRole('textbox', { name: 'Motivo de la reasignación' }), 'Redistribución');
  return usuario;
}
it('excluye origen, muestra tres métricas reales y exige motivo no vacío', async () => {
  montar(); const usuario = userEvent.setup();
  await usuario.click(await screen.findByRole('radio', { name: 'Destino Prueba' }));
  expect(screen.queryByRole('radio', { name: 'Origen Prueba' })).not.toBeInTheDocument();
  expect(screen.getAllByRole('progressbar')).toHaveLength(3);
  await usuario.type(screen.getByRole('textbox', { name: 'Motivo de la reasignación' }), '   ');
  expect(screen.getByRole('button', { name: 'Confirmar reasignación' })).toBeDisabled();
});
it('bloquea cada una de las tres variables aunque las otras alcancen', async () => {
  obtener.mockResolvedValue({ data: { repartidores: [
    { ...candidato, nombre: 'Peso insuficiente', capacidadRemanente: { pesoKg: 1, volumenM3: 3, paquetes: 60 } },
    { ...candidato, idRepartidor: '20000000-0000-4000-8000-000000000001', nombre: 'Volumen insuficiente', capacidadRemanente: { pesoKg: 400, volumenM3: 0.001, paquetes: 60 } },
    { ...candidato, idRepartidor: '20000000-0000-4000-8000-000000000002', nombre: 'Paquetes insuficientes', capacidadRemanente: { pesoKg: 400, volumenM3: 3, paquetes: 1 } },
  ] } });
  montar();
  expect(await screen.findByRole('radio', { name: 'Peso insuficiente' })).toBeDisabled();
  expect(screen.getByRole('radio', { name: 'Volumen insuficiente' })).toBeDisabled();
  expect(screen.getByRole('radio', { name: 'Paquetes insuficientes' })).toBeDisabled();
  expect(screen.getByText('Capacidad excedida: peso.')).toBeVisible();
});
it('envía versión y clave una sola vez ante doble clic y confirma la identidad de respuesta', async () => {
  montar(); const usuario = await seleccionar();
  let resolver!: (valor: unknown) => void;
  publicar.mockImplementation(() => new Promise((r) => { resolver = r; }));
  await usuario.dblClick(screen.getByRole('button', { name: 'Confirmar reasignación' }));
  expect(publicar).toHaveBeenCalledTimes(1);
  expect(publicar.mock.calls[0]).toEqual([`/api/v1/despachos/${despacho.idDespacho}/reasignacion`,
    { idNuevoRepartidor: destino, idNuevaJornada: jornadaDestino, motivo: 'Redistribución' },
    { headers: { 'If-Match': '"3"', 'Idempotency-Key': expect.any(String) } }]);
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  await act(async () => resolver({ data: respuesta }));
  await waitFor(() => expect(actualizar).toHaveBeenCalledTimes(1));
});
it.each([undefined, 'DESP_ERROR_REASIGNACION_EN_PROCESO'])('recupera el comando original ante resultado incierto %s', async (codigo) => {
  montar(); const usuario = await seleccionar();
  publicar.mockRejectedValueOnce(codigo ? { isAxiosError: true, response: { status: 409, data: { code: codigo } } } : { isAxiosError: true });
  await usuario.click(screen.getByRole('button', { name: 'Confirmar reasignación' }));
  await screen.findByText('Reasignación sin confirmar');
  expect(screen.getByRole('textbox', { name: 'Motivo de la reasignación' })).toBeDisabled();
  await usuario.keyboard('{Escape}');
  expect(cerrar).not.toHaveBeenCalled();
  await usuario.click(screen.getByRole('button', { name: 'Recuperar reasignación' }));
  await waitFor(() => expect(actualizar).toHaveBeenCalledTimes(1));
  expect(publicar.mock.calls[1]).toEqual(publicar.mock.calls[0]);
});
it('un rechazo de capacidad refresca candidatos y retira la selección', async () => {
  montar(); const usuario = await seleccionar();
  publicar.mockRejectedValueOnce({ isAxiosError: true, response: { status: 422, data: {} } });
  await usuario.click(screen.getByRole('button', { name: 'Confirmar reasignación' }));
  await waitFor(() => expect(obtener).toHaveBeenCalledTimes(2));
  expect(screen.getByRole('button', { name: 'Confirmar reasignación' })).toBeDisabled();
});
it('un resultado de otra operación no produce éxito', async () => {
  montar(); const usuario = await seleccionar();
  publicar.mockResolvedValueOnce({ data: { ...respuesta, idDespacho: 'otro' } });
  await usuario.click(screen.getByRole('button', { name: 'Confirmar reasignación' }));
  await screen.findByText('Reasignación sin confirmar');
  expect(actualizar).not.toHaveBeenCalled(); expect(notificar).not.toHaveBeenCalled();
});
it('un conflicto definitivo recarga y una pérdida de permisos retira los datos', async () => {
  montar(); const usuario = await seleccionar();
  publicar.mockRejectedValueOnce({ isAxiosError: true, response: { status: 409, data: {} } });
  await usuario.click(screen.getByRole('button', { name: 'Confirmar reasignación' }));
  await waitFor(() => expect(actualizar).toHaveBeenCalledTimes(1));
  expect(notificar).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'informacion' }));
  await usuario.click(screen.getByRole('radio', { name: 'Destino Prueba' }));
  publicar.mockRejectedValueOnce({ isAxiosError: true, response: { status: 403, data: {} } });
  await usuario.click(screen.getByRole('button', { name: 'Confirmar reasignación' }));
  await waitFor(() => expect(denegar).toHaveBeenCalledTimes(1));
});
it('una respuesta tardía tras desmontar no notifica ni actualiza otra sesión', async () => {
  const vista = montar(); const usuario = await seleccionar();
  let resolver!: (valor: unknown) => void;
  publicar.mockImplementation(() => new Promise((r) => { resolver = r; }));
  await usuario.click(screen.getByRole('button', { name: 'Confirmar reasignación' }));
  vista.unmount();
  await act(async () => resolver({ data: respuesta }));
  expect(actualizar).not.toHaveBeenCalled(); expect(notificar).not.toHaveBeenCalled();
});
