import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { beforeEach, expect, it, vi } from 'vitest';
import { tema } from '@despacho/componentes-compartidos';
import { ModalRecepcionPaquete } from './ModalRecepcionPaquete';
import { detallePrueba } from './fixtures.detalle.prueba';
import { longitudObservacion, normalizarObservacion } from './apiRecepcion';

const { obtener, publicar } = vi.hoisted(() => ({ obtener: vi.fn(), publicar: vi.fn() }));
vi.mock('../../cliente/useClienteApi', () => {
  const cliente = { get: obtener, post: publicar };
  return { useClienteApi: () => cliente };
});
const contexto = { idDespacho: 'despacho-1', idIncidencia: 'incidencia-2' };
const cuerpo = { idIncidencia: 'incidencia-2', versionDespacho: 4, selloIntacto: false, observacion: null };
function respuesta() {
  return { status: 202, data: { ...contexto, estado: 'FALLIDO', versionDespacho: 5,
    recepcion: { estado: 'RECIBIDO_EN_CENTRO', confirmadaEn: '2026-10-24T12:00:00Z', idUsuario: 'gestor',
      selloIntacto: false, observacion: null, liberacionCapacidad: { idSolicitud: 'liberacion-1', estado: 'PENDIENTE',
        requiereRevision: false, actualizadaEn: '2026-10-24T12:00:00Z', confirmadaEn: null } } } } as const;
}
function fallo(status: number, code = '') { return { isAxiosError: true, response: { status, data: { code } } }; }
function montar() {
  const acciones = { alCerrar: vi.fn(), alActualizar: vi.fn(), alAvisar: vi.fn(), alRevocar: vi.fn() };
  const propiedades = { contexto, abierto: true, ...acciones };
  const componente = (abierto: boolean) => <MantineProvider theme={tema}><ModalRecepcionPaquete {...propiedades} abierto={abierto} /></MantineProvider>;
  const vista = render(componente(true));
  return { ...acciones, ...vista, reabrir: async () => {
    vista.rerender(componente(false));
    await act(async () => {});
    vista.rerender(componente(true));
  } };
}
async function elegirNo() { await userEvent.click(await screen.findByRole('radio', { name: 'No' })); }
beforeEach(() => {
  Object.defineProperty(document, 'fonts', { configurable: true, value: new EventTarget() });
  obtener.mockReset(); publicar.mockReset();
  obtener.mockResolvedValue({ data: detallePrueba() });
  publicar.mockResolvedValue(respuesta());
  Element.prototype.scrollIntoView = vi.fn();
});

it('consulta contexto antes de habilitar y acepta No sin observación con identidad y versión vigentes', async () => {
  const acciones = montar();
  expect(screen.getByRole('button', { name: 'Confirmar recepción' })).toBeDisabled();
  await elegirNo();
  expect(screen.getByRole('radio', { name: 'Sí' })).not.toBeChecked();
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar recepción' }));
  await waitFor(() => expect(acciones.alAvisar).toHaveBeenCalledWith('Paquete recibido. Liberación de capacidad pendiente.'));
  expect(publicar).toHaveBeenCalledWith('/api/v1/despachos/despacho-1/recepcion-centro', cuerpo, expect.objectContaining({ timeout: 15000 }));
  expect(acciones.alCerrar).toHaveBeenCalledTimes(1);
  expect(acciones.alActualizar).toHaveBeenCalledTimes(1);
});
it('valida puntos de código, espacios y observación opcional sin truncar emojis', async () => {
  montar(); await elegirNo();
  expect(normalizarObservacion(' \n ')).toBeNull();
  expect(longitudObservacion('  😀  ')).toBe(1);
  const campo = screen.getByRole('textbox', { name: 'Observación (opcional)' });
  fireEvent.change(campo, { target: { value: ' 😀'.repeat(501) } });
  expect(screen.getByRole('button', { name: 'Confirmar recepción' })).toBeDisabled();
  fireEvent.change(campo, { target: { value: '  ' + '😀'.repeat(500) + '  ' } });
  expect(screen.getByRole('button', { name: 'Confirmar recepción' })).toBeEnabled();
  expect(campo).toHaveValue('  ' + '😀'.repeat(500) + '  ');
});
it('bloquea doble activación, edición y cierre mientras el envío está pendiente', async () => {
  let completar!: (valor: ReturnType<typeof respuesta>) => void;
  publicar.mockReturnValue(new Promise((resolver) => { completar = resolver; }));
  const acciones = montar(); await elegirNo();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar recepción' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar recepción' }));
  expect(publicar).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('radio', { name: 'No' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  await act(async () => completar(respuesta()));
  expect(acciones.alAvisar).toHaveBeenCalledOnce();
});
it('conserva valores ante validación y rechazo por datos inconsistentes', async () => {
  publicar.mockRejectedValueOnce({ isAxiosError: true, response: { status: 400, data: { errores: [{ campo: 'observacion' }] } } });
  const acciones = montar(); await elegirNo();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Paquete abierto' } });
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar recepción' }));
  await screen.findByText('Revisa los datos de recepción.');
  expect(screen.getByRole('textbox')).toHaveValue('Paquete abierto');
  expect(screen.getByRole('radio', { name: 'No' })).toBeChecked();
  publicar.mockRejectedValueOnce(fallo(500, 'DESP_ERROR_DATOS_INCONSISTENTES'));
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar recepción' }));
  await screen.findByText('No se puede registrar la recepción con estos datos. Solicita revisión.');
  expect(acciones.alCerrar).not.toHaveBeenCalled();
});
it('ante 503 exige consulta antes de repetir exactamente incluso tras cerrar y reabrir', async () => {
  publicar.mockRejectedValueOnce(fallo(503));
  const acciones = montar(); await elegirNo();
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar recepción' }));
  await screen.findByText('No pudimos comprobar el resultado. Consulta antes de volver a confirmar.');
  expect(screen.queryByRole('button', { name: 'Repetir solicitud original' })).not.toBeInTheDocument();
  await acciones.reabrir();
  await userEvent.click(await screen.findByRole('button', { name: 'Consultar resultado' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Repetir solicitud original' }));
  await waitFor(() => expect(publicar).toHaveBeenCalledTimes(2));
  expect(publicar.mock.calls[0][1]).toEqual(publicar.mock.calls[1][1]);
});
it('una incidencia nueva recibida no acredita la recepción original ni sustituye su identidad', async () => {
  publicar.mockRejectedValueOnce(fallo(503));
  montar(); await elegirNo();
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar recepción' }));
  await screen.findByRole('button', { name: 'Consultar resultado' });
  const actual = detallePrueba(); actual.incidencia.idIncidencia = 'incidencia-nueva';
  actual.incidencia.recepcion = respuesta().data.recepcion;
  obtener.mockResolvedValueOnce({ data: actual });
  await userEvent.click(screen.getByRole('button', { name: 'Consultar resultado' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Repetir solicitud original' }));
  await waitFor(() => expect(publicar).toHaveBeenCalledTimes(2));
  expect(publicar.mock.calls[1][1]).toEqual(cuerpo);
});
it('si la consulta confirma la recepción no repite el comando y conserva el éxito', async () => {
  publicar.mockRejectedValueOnce(fallo(503));
  const acciones = montar(); await elegirNo();
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar recepción' }));
  await screen.findByRole('button', { name: 'Consultar resultado' });
  const actual = detallePrueba(); actual.incidencia.recepcion = respuesta().data.recepcion;
  obtener.mockResolvedValueOnce({ data: actual });
  await userEvent.click(screen.getByRole('button', { name: 'Consultar resultado' }));
  await waitFor(() => expect(acciones.alAvisar).toHaveBeenCalledWith(expect.stringContaining('ya figura recibido')));
  expect(publicar).toHaveBeenCalledTimes(1);
});
it('el conflicto conserva la selección y exige revisión sin otra confirmación automática', async () => {
  publicar.mockRejectedValueOnce(fallo(409));
  const acciones = montar(); await elegirNo();
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar recepción' }));
  await screen.findByText('La información cambió. Actualiza y revisa antes de confirmar.');
  expect(screen.getByRole('button', { name: 'Confirmar recepción' })).toBeDisabled();
  expect(acciones.alActualizar).toHaveBeenCalledOnce();
  expect(publicar).toHaveBeenCalledOnce();
});
it('retira los datos protegidos al perder permiso durante la confirmación', async () => {
  publicar.mockRejectedValueOnce(fallo(403));
  const acciones = montar(); await elegirNo();
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar recepción' }));
  await waitFor(() => expect(acciones.alRevocar).toHaveBeenCalledOnce());
  expect(screen.queryByText('DSP-SINTETICO')).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});
it('no permite recibir si la incidencia de la fila ya fue sustituida', async () => {
  const detalle = detallePrueba(); detalle.incidencia.idIncidencia = 'otra-incidencia';
  obtener.mockResolvedValue({ data: detalle });
  montar();
  await screen.findByText('La información cambió o la recepción ya fue confirmada. Cierra y revisa la pantalla actualizada.');
  expect(screen.getByRole('button', { name: 'Confirmar recepción' })).toBeDisabled();
  expect(publicar).not.toHaveBeenCalled();
});
