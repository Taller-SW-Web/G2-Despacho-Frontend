import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { beforeEach, expect, it, vi } from 'vitest';
import { tema } from '@despacho/componentes-compartidos';
import { ModalCierreDespacho } from './ModalCierreDespacho';
import { detalleCerrable, respuestaCierre } from './fixtures.cierre.prueba';
import { longitudTextoCierre, normalizarTextoCierre } from './apiCierre';

const { obtener, publicar } = vi.hoisted(() => ({ obtener: vi.fn(), publicar: vi.fn() }));
vi.mock('../../cliente/useClienteApi', () => { const cliente = { get: obtener, post: publicar }; return { useClienteApi: () => cliente }; });
const contexto = { idDespacho: 'despacho-1', idIncidencia: 'incidencia-2', versionDespacho: 4 };
const cuerpo = { idIncidencia: 'incidencia-2', versionDespacho: 4, motivo: 'Decisión operativa', observacion: null };
const fallo = (status: number, code = '') => ({ isAxiosError: true, response: { status, data: { code } } });
function montar() {
  const acciones = { alCerrar: vi.fn(), alActualizar: vi.fn(), alCompletar: vi.fn(), alRevocar: vi.fn(), alRecuperarFoco: vi.fn(), alResultadoDesconocido: vi.fn() };
  const componente = (abierto: boolean) => <MantineProvider theme={tema} env="test"><ModalCierreDespacho contexto={contexto} abierto={abierto} {...acciones} /></MantineProvider>;
  const vista = render(componente(true));
  return { ...acciones, ...vista, reabrir: async () => {
    vista.rerender(componente(false)); await act(async () => {}); vista.rerender(componente(true));
  } };
}
async function llenar() {
  const motivo = await screen.findByRole('textbox', { name: /Motivo del cierre/ });
  await waitFor(() => expect(motivo).toBeEnabled());
  fireEvent.change(motivo, { target: { value: 'Decisión operativa' } });
}
const confirmar = () => userEvent.click(screen.getByRole('button', { name: 'Cerrar despacho' }));
beforeEach(() => {
  Object.defineProperty(document, 'fonts', { configurable: true, value: new EventTarget() }); Element.prototype.scrollIntoView = vi.fn();
  obtener.mockReset(); publicar.mockReset(); obtener.mockResolvedValue({ data: detalleCerrable() }); publicar.mockResolvedValue(respuestaCierre());
});
it('normaliza ambos textos por puntos Unicode y preserva saltos internos', () => {
  expect(normalizarTextoCierre('\u001c\u00a0\ufeff\n ')).toBeNull();
  expect(normalizarTextoCierre('  uno\ndos  ')).toBe('uno\ndos');
  expect(longitudTextoCierre('  ' + '😀'.repeat(500) + '  ')).toBe(500);
});
it('exige motivo libre, muestra efecto definitivo y envía el contexto vigente', async () => {
  const acciones = montar(); expect(screen.getByRole('button', { name: 'Cerrar despacho' })).toBeDisabled();
  await llenar(); expect(screen.getByText(/No habrá más entregas/)).toBeVisible();
  await confirmar(); await waitFor(() => expect(acciones.alCompletar).toHaveBeenCalledWith(respuestaCierre().data));
  expect(publicar).toHaveBeenCalledWith('/api/v1/despachos/despacho-1/devolucion-origen', cuerpo, expect.objectContaining({ timeout: 15000 }));
  expect(obtener).toHaveBeenCalledTimes(2);
});
it.each(['Motivo del cierre', 'Observación (opcional)'])('valida 500/501 emojis en %s sin truncar', async (etiqueta) => {
  montar(); await llenar(); const campo = screen.getByRole('textbox', { name: new RegExp(etiqueta.replace(/[()]/g, '\\$&')) });
  fireEvent.change(campo, { target: { value: '😀'.repeat(501) } });
  expect(screen.getByRole('button', { name: 'Cerrar despacho' })).toBeDisabled();
  fireEvent.change(campo, { target: { value: '  ' + '😀'.repeat(500) + '  ' } });
  expect(campo).toHaveValue('  ' + '😀'.repeat(500) + '  ');
  expect(screen.getByRole('button', { name: 'Cerrar despacho' })).toBeEnabled();
});
it('rechaza solo espacios y permite observación ausente', async () => {
  montar(); await llenar(); fireEvent.change(screen.getByRole('textbox', { name: /Motivo del cierre/ }), { target: { value: '\u00a0 ' } });
  expect(screen.getByRole('button', { name: 'Cerrar despacho' })).toBeDisabled();
});
it('impide doble envío, Escape, edición y cierre accidental', async () => {
  let resolver!: (valor: unknown) => void; publicar.mockReturnValue(new Promise((terminar) => { resolver = terminar; }));
  const acciones = montar(); await llenar();
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar despacho' })); fireEvent.click(screen.getByRole('button', { name: 'Cerrar despacho' }));
  await userEvent.keyboard('{Escape}'); expect(publicar).toHaveBeenCalledOnce();
  expect(screen.getByRole('textbox', { name: /Motivo del cierre/ })).toBeDisabled(); expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  expect(acciones.alCerrar).not.toHaveBeenCalled(); await act(async () => resolver(respuestaCierre()));
});
it.each([400, 500])('conserva entradas ante rechazo definitivo %s', async (estado) => {
  publicar.mockRejectedValueOnce(fallo(estado, 'DESP_ERROR_DATOS_INCONSISTENTES')); montar(); await llenar(); await confirmar();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Cerrar despacho' })).toBeEnabled());
  expect(screen.getByRole('textbox', { name: /Motivo del cierre/ })).toHaveValue('Decisión operativa');
  expect(screen.queryByRole('button', { name: 'Repetir solicitud original' })).not.toBeInTheDocument();
});
it('un 409 exige revisar y nunca reemplaza la identidad para reenviar', async () => {
  publicar.mockRejectedValueOnce(fallo(409)); const acciones = montar(); await llenar(); await confirmar();
  await screen.findByRole('button', { name: 'Cerrar y revisar detalle' }); expect(acciones.alActualizar).toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Cerrar despacho' })).toBeDisabled(); expect(publicar).toHaveBeenCalledOnce();
});
it.each([503, 500, undefined])('consulta antes de repetir el comando original tras resultado desconocido %s', async (estado) => {
  publicar.mockRejectedValueOnce(estado ? fallo(estado) : new Error('Respuesta perdida'));
  const acciones = montar(); await llenar(); await confirmar(); await screen.findByRole('button', { name: 'Consultar resultado' });
  expect(acciones.alResultadoDesconocido).toHaveBeenCalledWith(true); await acciones.reabrir();
  const actual = detalleCerrable(); actual.estado = 'DEVUELTO_A_ORIGEN'; actual.versionDespacho++;
  actual.acciones.cerrarComoDevueltoAOrigen = { habilitada: false, motivosBloqueo: ['ESTADO_NO_FALLIDO'] };
  obtener.mockResolvedValue({ data: actual }); await userEvent.click(screen.getByRole('button', { name: 'Consultar resultado' }));
  await screen.findByRole('button', { name: 'Repetir solicitud original' }); expect(acciones.alCompletar).not.toHaveBeenCalled(); expect(publicar).toHaveBeenCalledOnce();
  await userEvent.click(screen.getByRole('button', { name: 'Repetir solicitud original' }));
  await waitFor(() => expect(acciones.alCompletar).toHaveBeenCalledOnce()); expect(publicar.mock.calls[1][1]).toEqual(cuerpo);
});
it('rechaza una respuesta ajena y mantiene el 200 aceptado aunque falle la consulta posterior', async () => {
  const acciones = montar(); await llenar(); publicar.mockResolvedValueOnce({ ...respuestaCierre(), data: { ...respuestaCierre().data, motivo: 'Otro' } });
  await confirmar(); await screen.findByRole('button', { name: 'Consultar resultado' }); expect(acciones.alCompletar).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Consultar resultado' })); await screen.findByRole('button', { name: 'Repetir solicitud original' });
  obtener.mockRejectedValueOnce(fallo(503)); await userEvent.click(screen.getByRole('button', { name: 'Repetir solicitud original' }));
  await waitFor(() => expect(acciones.alCompletar).toHaveBeenCalledOnce());
});
it.each([401, 403])('retira resumen y campos ante %s', async (estado) => {
  publicar.mockRejectedValueOnce(fallo(estado)); const acciones = montar(); await llenar(); await confirmar();
  await waitFor(() => expect(acciones.alRevocar).toHaveBeenCalledOnce()); expect(screen.queryByText('DSP-SINTETICO')).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});
it('retira datos al cambiar sesión e ignora una respuesta tardía', async () => {
  let resolver!: (valor: unknown) => void; publicar.mockReturnValue(new Promise((terminar) => { resolver = terminar; }));
  const acciones = montar(); await llenar(); await confirmar(); act(() => window.dispatchEvent(new Event('despacho:sesion')));
  await act(async () => resolver(respuestaCierre())); expect(acciones.alCompletar).not.toHaveBeenCalled(); expect(screen.queryByText('DSP-SINTETICO')).not.toBeInTheDocument();
});
it.each(['version', 'incidencia', 'recepcion'])('bloquea si cambia %s', async (cambio) => {
  const actual = detalleCerrable(); if (cambio === 'version') actual.versionDespacho++;
  else if (cambio === 'incidencia') actual.incidencia.idIncidencia = 'otra';
  else actual.acciones.cerrarComoDevueltoAOrigen = { habilitada: false, motivosBloqueo: ['RECEPCION_PENDIENTE'] };
  obtener.mockResolvedValue({ data: actual }); montar(); await screen.findByRole('button', { name: 'Cerrar y revisar detalle' }); expect(publicar).not.toHaveBeenCalled();
});
it.each(['anulado', 'maximo', 'no-intentado'])('permite decisión explícita con %s y liberación pendiente de revisión', async (caso) => {
  const actual = detalleCerrable(); if (caso === 'anulado') actual.pedidoAnulado = true;
  if (caso === 'maximo') actual.numeroIntentos = actual.maximoIntentos;
  if (caso === 'no-intentado') { actual.numeroIntentos = 0; actual.incidencia.motivo.codigo = 'NO_INTENTADO'; }
  actual.acciones.reprogramar = { habilitada: false, motivosBloqueo: ['PEDIDO_ANULADO'] };
  obtener.mockResolvedValue({ data: actual }); montar(); await llenar(); expect(screen.getByRole('button', { name: 'Cerrar despacho' })).toBeEnabled();
});
