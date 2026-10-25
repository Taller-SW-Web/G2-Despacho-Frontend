import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { beforeEach, expect, it, vi } from 'vitest';
import { tema } from '@despacho/componentes-compartidos';
import { ModalReprogramacionDespacho } from './ModalReprogramacionDespacho';
import { detalleReprogramable, respuestaReprogramacion } from './fixtures.reprogramacion.prueba';
import { diaLima, diaSiguiente, fechaCivilValida, longitudObservacionReprogramacion, normalizarObservacionReprogramacion } from './apiReprogramacion';

const { obtener, publicar } = vi.hoisted(() => ({ obtener: vi.fn(), publicar: vi.fn() }));
vi.mock('../../cliente/useClienteApi', () => {
  const cliente = { get: obtener, post: publicar };
  return { useClienteApi: () => cliente };
});
const contexto = { idDespacho: 'despacho-1', idIncidencia: 'incidencia-2', versionDespacho: 4 };
const cuerpo = { idIncidencia: 'incidencia-2', versionDespacho: 4, nuevaFechaProgramada: '2026-10-25', observacion: null };
const fallo = (status: number, code = '') => ({ isAxiosError: true, response: { status, data: { code } } });
function montar() {
  const acciones = { alCerrar: vi.fn(), alActualizar: vi.fn(), alCompletar: vi.fn(), alRevocar: vi.fn(), alRecuperarFoco: vi.fn() };
  const componente = (abierto: boolean) => <MantineProvider theme={tema} env="test"><ModalReprogramacionDespacho contexto={contexto} abierto={abierto} {...acciones} /></MantineProvider>;
  const vista = render(componente(true));
  return { ...acciones, ...vista, reabrir: async () => {
    vista.rerender(componente(false)); await act(async () => {}); vista.rerender(componente(true));
  } };
}
async function elegirFecha() {
  const fecha = await screen.findByRole('button', { name: /Nueva fecha programada/ });
  await waitFor(() => expect(fecha).toBeEnabled());
  await userEvent.click(fecha);
  await userEvent.click(await screen.findByRole('button', { name: '25 octubre 2026' }));
}
const confirmar = () => userEvent.click(screen.getByRole('button', { name: 'Confirmar reprogramación' }));
beforeEach(() => {
  Object.defineProperty(document, 'fonts', { configurable: true, value: new EventTarget() });
  Element.prototype.scrollIntoView = vi.fn();
  obtener.mockReset(); publicar.mockReset();
  obtener.mockResolvedValue({ data: detalleReprogramable() }); publicar.mockResolvedValue(respuestaReprogramacion());
});
it('calcula el día civil de Lima, preserva fechas y normaliza Unicode por puntos de código', () => {
  expect(diaLima('2026-10-25T03:30:00Z')).toBe('2026-10-24');
  expect(diaLima('2026-10-25T05:00:00Z')).toBe('2026-10-25');
  expect(diaSiguiente('2028-02-28')).toBe('2028-02-29');
  for (const fecha of ['2026-02-29', '0000-01-01', '2026-1-01', '2026-10-25T00:00:00Z']) expect(fechaCivilValida(fecha)).toBe(false);
  for (const fecha of ['0001-01-01', '9999-12-31', '2028-02-29']) expect(fechaCivilValida(fecha)).toBe(true);
  expect(normalizarObservacionReprogramacion('\u001c\u00a0\ufeff\n ')).toBeNull();
  expect(normalizarObservacionReprogramacion('  uno\ndos  ')).toBe('uno\ndos');
  expect(longitudObservacionReprogramacion('  ' + '😀'.repeat(500) + '  ')).toBe(500);
});
it('parte sin fecha, usa calendario español y acepta mañana de Lima aunque UTC ya sea ese día', async () => {
  const acciones = montar();
  expect(screen.getByRole('button', { name: 'Confirmar reprogramación' })).toBeDisabled();
  await elegirFecha();
  expect(screen.getByRole('button', { name: /Nueva fecha programada/ })).toHaveTextContent('25/10/2026');
  await confirmar();
  await waitFor(() => expect(acciones.alCompletar).toHaveBeenCalledWith(respuestaReprogramacion().data));
  expect(publicar).toHaveBeenCalledWith('/api/v1/despachos/despacho-1/reprogramacion', cuerpo, expect.objectContaining({ timeout: 15000 }));
  expect(obtener).toHaveBeenCalledTimes(2);
});
it('observación opcional permite 500 emojis normalizados sin truncar y bloquea 501', async () => {
  montar(); await elegirFecha();
  const campo = screen.getByRole('textbox', { name: 'Observación (opcional)' });
  fireEvent.change(campo, { target: { value: '😀'.repeat(501) } });
  expect(screen.getByRole('button', { name: 'Confirmar reprogramación' })).toBeDisabled();
  fireEvent.change(campo, { target: { value: '  ' + '😀'.repeat(500) + '  ' } });
  expect(campo).toHaveValue('  ' + '😀'.repeat(500) + '  ');
  publicar.mockResolvedValueOnce({ ...respuestaReprogramacion(), data: { ...respuestaReprogramacion().data, observacion: '😀'.repeat(500) } });
  await confirmar();
  expect(publicar.mock.calls[0][1].observacion).toBe('😀'.repeat(500));
});
it('impide doble envío, edición, Escape y cierre accidental durante el POST', async () => {
  let resolver!: (valor: unknown) => void;
  publicar.mockReturnValue(new Promise((terminar) => { resolver = terminar; }));
  const acciones = montar(); await elegirFecha();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar reprogramación' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar reprogramación' }));
  await userEvent.keyboard('{Escape}');
  expect(publicar).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', { name: /Nueva fecha programada/ })).toBeDisabled();
  expect(screen.getByRole('textbox')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Cerrar reprogramación' })).not.toBeInTheDocument();
  expect(acciones.alCerrar).not.toHaveBeenCalled();
  await act(async () => resolver(respuestaReprogramacion()));
});
it.each([400, 500])('conserva entradas ante rechazo definitivo %s', async (estado) => {
  publicar.mockRejectedValueOnce(fallo(estado, 'DESP_ERROR_DATOS_INCONSISTENTES'));
  montar(); await elegirFecha();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Revisar puerta  ' } });
  await confirmar();
  await screen.findByRole('alert');
  expect(screen.getByRole('textbox')).toHaveValue('  Revisar puerta  ');
  expect(screen.getByRole('button', { name: /Nueva fecha programada/ })).toHaveTextContent('25/10/2026');
  expect(screen.getByRole('button', { name: 'Confirmar reprogramación' })).toBeEnabled();
});
it.each([409, 422])('exige revisión ante %s sin reenvío automático ni sustituir el contexto', async (estado) => {
  publicar.mockRejectedValueOnce(fallo(estado));
  const acciones = montar(); await elegirFecha(); await confirmar();
  await screen.findByRole('button', { name: 'Cerrar y revisar detalle' });
  expect(acciones.alActualizar).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', { name: 'Confirmar reprogramación' })).toBeDisabled();
  expect(publicar).toHaveBeenCalledOnce();
});
it('recupera con GET y replay exacto tras cerrar, medianoche y una incidencia posterior', async () => {
  publicar.mockRejectedValueOnce(fallo(503));
  const acciones = montar(); await elegirFecha(); await confirmar();
  await screen.findByRole('button', { name: 'Consultar resultado' });
  await acciones.reabrir();
  const nueva = detalleReprogramable(); nueva.incidencia.idIncidencia = 'otra-incidencia';
  nueva.versionDespacho = 12; nueva.consultadoEn = '2026-10-26T05:00:00Z';
  obtener.mockResolvedValue({ data: nueva });
  await userEvent.click(await screen.findByRole('button', { name: 'Consultar resultado' }));
  expect(acciones.alCompletar).not.toHaveBeenCalled();
  await userEvent.click(await screen.findByRole('button', { name: 'Repetir solicitud original' }));
  await waitFor(() => expect(acciones.alCompletar).toHaveBeenCalledOnce());
  expect(publicar.mock.calls[1][1]).toEqual(cuerpo);
});
it('un GET posterior con el estado reprogramado no acredita la aceptación propia', async () => {
  publicar.mockRejectedValueOnce(new Error('Respuesta perdida'));
  const acciones = montar(); await elegirFecha(); await confirmar();
  await screen.findByRole('button', { name: 'Consultar resultado' });
  const actual = detalleReprogramable(); actual.estado = 'PENDIENTE_ASIGNACION'; actual.versionDespacho = 5;
  actual.acciones.reprogramar = { habilitada: false, motivosBloqueo: ['ESTADO_NO_FALLIDO'] };
  obtener.mockResolvedValue({ data: actual });
  await userEvent.click(screen.getByRole('button', { name: 'Consultar resultado' }));
  await screen.findByRole('button', { name: 'Repetir solicitud original' });
  expect(acciones.alCompletar).not.toHaveBeenCalled();
  expect(publicar).toHaveBeenCalledOnce();
});
it('mantiene el 200 aceptado aunque falle el GET posterior y rechaza una respuesta ajena', async () => {
  const acciones = montar(); await elegirFecha();
  publicar.mockResolvedValueOnce({ ...respuestaReprogramacion(), data: { ...respuestaReprogramacion().data, idIncidencia: 'ajena' } });
  await confirmar();
  await screen.findByRole('button', { name: 'Consultar resultado' });
  expect(acciones.alCompletar).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Consultar resultado' }));
  await screen.findByRole('button', { name: 'Repetir solicitud original' });
  obtener.mockRejectedValueOnce(fallo(503));
  await userEvent.click(screen.getByRole('button', { name: 'Repetir solicitud original' }));
  await waitFor(() => expect(acciones.alCompletar).toHaveBeenCalledOnce());
});
it.each([401, 403])('retira resumen y campos ante %s durante el envío', async (estado) => {
  publicar.mockRejectedValueOnce(fallo(estado));
  const acciones = montar(); await elegirFecha(); await confirmar();
  await waitFor(() => expect(acciones.alRevocar).toHaveBeenCalledOnce());
  expect(screen.queryByText('DSP-SINTETICO')).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});
it('retira datos al cambiar sesión e ignora una respuesta tardía del POST', async () => {
  let resolver!: (valor: unknown) => void;
  publicar.mockReturnValue(new Promise((terminar) => { resolver = terminar; }));
  const acciones = montar(); await elegirFecha(); await confirmar();
  act(() => window.dispatchEvent(new Event('despacho:sesion')));
  await act(async () => resolver(respuestaReprogramacion()));
  expect(acciones.alCompletar).not.toHaveBeenCalled();
  expect(screen.queryByText('DSP-SINTETICO')).not.toBeInTheDocument();
});
it.each(['version', 'incidencia', 'recepcion', 'anulado', 'limite'])('bloquea al abrir si cambia %s', async (cambio) => {
  const actual = detalleReprogramable();
  if (cambio === 'version') actual.versionDespacho++;
  else if (cambio === 'incidencia') actual.incidencia.idIncidencia = 'nueva';
  else actual.acciones.reprogramar = { habilitada: false, motivosBloqueo: [cambio === 'recepcion' ? 'RECEPCION_PENDIENTE'
    : cambio === 'anulado' ? 'PEDIDO_ANULADO' : 'MAXIMO_INTENTOS_ALCANZADO'] };
  obtener.mockResolvedValue({ data: actual });
  montar();
  await screen.findByRole('button', { name: 'Cerrar y revisar detalle' });
  expect(screen.getByRole('button', { name: 'Confirmar reprogramación' })).toBeDisabled();
  expect(publicar).not.toHaveBeenCalled();
  expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' })).toBeEnabled();
});
