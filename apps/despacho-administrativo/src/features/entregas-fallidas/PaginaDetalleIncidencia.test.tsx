import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { tema } from '@despacho/componentes-compartidos';
import { PaginaDetalleIncidencia } from './PaginaDetalleIncidencia';
import { PanelDecisionIncidencia } from './PanelDecisionIncidencia';
import { detallePrueba } from './fixtures.detalle.prueba';
import { useEvidenciaIncidencia } from './useEvidenciaIncidencia';
import type { DestinosDetalleIncidencia } from './modeloDetalle';

const { obtener, publicar } = vi.hoisted(() => ({ obtener: vi.fn(), publicar: vi.fn() }));
vi.mock('../../cliente/useClienteApi', () => {
  const cliente = { get: obtener, post: publicar };
  return { useClienteApi: () => cliente };
});
Element.prototype.scrollIntoView = vi.fn();
function Ubicacion() { const ubicacion = useLocation(); return <output data-testid="ubicacion">{ubicacion.pathname}{ubicacion.search}</output>; }
function montar(ruta = '/entregas-fallidas/despacho-1', destinos: DestinosDetalleIncidencia = {}) {
  return render(<MantineProvider theme={tema}><MemoryRouter initialEntries={[ruta]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Link to="/entregas-fallidas/despacho-2">Otro despacho</Link><Routes>
      <Route path="/entregas-fallidas/:idDespacho" element={<PaginaDetalleIncidencia destinos={destinos} />} />
      <Route path="/entregas-fallidas" element={<p>Listado restaurado</p>} />
    </Routes><Ubicacion />
  </MemoryRouter></MantineProvider>);
}
function fallo(status: number, code = '') { return { isAxiosError: true, response: { status, data: { code } } }; }
function acceso(idEvidencia = 'foto-1', idDespacho = 'despacho-1') {
  return { data: { idEvidencia, idDespacho, urlLectura: 'https://storage.example/foto-sintetica', venceEn: new Date(Date.now() + 2000).toISOString() } };
}
beforeEach(() => { obtener.mockReset(); publicar.mockReset(); obtener.mockResolvedValue({ data: detallePrueba() }); publicar.mockResolvedValue(acceso()); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

it('presenta la incidencia vigente sin heredar recepción ni foto y conserva el historial completo y las fechas de Lima', async () => {
  montar();
  await screen.findByRole('heading', { name: 'Incidencia · DSP-SINTETICO' });
  expect(screen.getByText('No intentado en esta salida')).toBeVisible();
  expect(screen.getByText('1 de 3')).toBeVisible();
  expect(screen.getByText('No intentado — sin foto')).toBeVisible();
  expect(screen.getByText('Sin comentario')).toBeVisible();
  expect(screen.getByText(/Recepción de la primera salida/)).toBeVisible();
  expect(screen.getByText(/Origen automático/)).toBeVisible();
  expect(screen.getByText('Envío fallido')).toBeVisible();
  expect(screen.getAllByText(/16\/10\/2026 12:00/).length).toBeGreaterThan(0);
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(publicar).not.toHaveBeenCalled();
});

it('muestra todos los bloqueos y entrega identidad y versión solo a un destino disponible', async () => {
  const detalle = detallePrueba({ pedidoAnulado: true, numeroIntentos: 4 });
  detalle.acciones.reprogramar.motivosBloqueo = ['RECEPCION_PENDIENTE', 'PEDIDO_ANULADO', 'MAXIMO_INTENTOS_ALCANZADO'];
  const recibir = vi.fn();
  const terminar = vi.fn();
  const vista = render(<MantineProvider theme={tema}><PanelDecisionIncidencia detalle={detalle} bloqueada={false} destinos={{ confirmarRecepcion: recibir }} alCompletar={terminar} /></MantineProvider>);
  expect(screen.getByText('El pedido fue anulado por Ventas y Postventa.')).toBeVisible();
  expect(screen.getByText(/4 de 3 intentos consumidos/)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Reprogramar' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar recepción' }));
  expect(recibir).toHaveBeenCalledWith(expect.objectContaining({ idDespacho: 'despacho-1', idIncidencia: 'incidencia-2', versionDespacho: 4, alCompletar: terminar }));
  vista.rerender(<MantineProvider theme={tema}><PanelDecisionIncidencia detalle={detalle} bloqueada destinos={{ confirmarRecepcion: recibir }} alCompletar={terminar} /></MantineProvider>);
  expect(screen.getByRole('button', { name: 'Confirmar recepción' })).toBeDisabled();
});

it('distingue sello alterado y liberación pendiente y permite la consulta histórica sin decisiones', async () => {
  const detalle = detallePrueba({ estado: 'PENDIENTE_ASIGNACION' });
  detalle.incidencia.recepcion = { estado: 'RECIBIDO_EN_CENTRO', confirmadaEn: '2026-10-16T18:00:00Z', idUsuario: 'gestor-1', selloIntacto: false, observacion: null,
    liberacionCapacidad: { idSolicitud: 'solicitud-1', estado: 'PENDIENTE', requiereRevision: true, actualizadaEn: '2026-10-16T18:00:00Z', confirmadaEn: null } };
  obtener.mockResolvedValue({ data: detalle });
  montar();
  await screen.findByText('Consulta histórica. El despacho ya no está fallido.');
  expect(screen.getByText('No', { exact: true })).toBeVisible();
  expect(screen.getByText('Sin observaciones')).toBeVisible();
  expect(screen.getByText('Liberación de capacidad pendiente de revisión')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Confirmar recepción' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Reprogramar' })).not.toBeInTheDocument();
});

it('retira los datos protegidos al perder permisos y distingue despacho sin incidencia', async () => {
  montar();
  await screen.findByRole('heading', { name: 'Incidencia · DSP-SINTETICO' });
  obtener.mockRejectedValue(fallo(403));
  await userEvent.click(screen.getByRole('button', { name: 'Actualizar detalle' }));
  await screen.findByText('No tienes permiso para consultar este detalle.');
  expect(screen.queryByRole('heading', { name: 'Incidencia · DSP-SINTETICO' })).not.toBeInTheDocument();
  expect(screen.queryByText('Recepción de la primera salida')).not.toBeInTheDocument();
  obtener.mockRejectedValue(fallo(404, 'DESP_ERROR_INCIDENCIA_NO_ENCONTRADA'));
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar detalle' }));
  await screen.findByText('Este despacho no tiene una incidencia registrada.');
  obtener.mockResolvedValueOnce({ data: detallePrueba() });
  await userEvent.click(screen.getByRole('button', { name: 'Actualizar detalle' }));
  await screen.findByRole('heading', { name: 'Incidencia · DSP-SINTETICO' });
  let resolver!: (respuesta: unknown) => void;
  obtener.mockImplementationOnce(() => new Promise((resolucion) => { resolver = resolucion; }));
  await userEvent.click(screen.getByRole('button', { name: 'Actualizar detalle' }));
  act(() => window.dispatchEvent(new Event('despacho:sesion')));
  await screen.findByText('Tu sesión ya no permite consultar este detalle. Accede de nuevo.');
  obtener.mockResolvedValueOnce({ data: detallePrueba({ codigoRastreoInterno: 'SESION-ACTUAL' }) });
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar detalle' }));
  await screen.findByRole('heading', { name: 'Incidencia · SESION-ACTUAL' });
  await act(async () => resolver({ data: detallePrueba() }));
  expect(screen.queryByRole('heading', { name: 'Incidencia · DSP-SINTETICO' })).not.toBeInTheDocument();
});

it('actualiza cada treinta segundos sin superponer lecturas y bloquea decisiones hasta recuperarse de un error', async () => {
  const temporizador = vi.spyOn(window, 'setInterval');
  montar('/entregas-fallidas/despacho-1', { confirmarRecepcion: vi.fn() });
  await screen.findByRole('heading', { name: 'Incidencia · DSP-SINTETICO' });
  const llamada = temporizador.mock.calls.find(([, demora]) => demora === 30_000)!;
  expect(llamada).toBeDefined();
  obtener.mockRejectedValueOnce(fallo(503));
  await act(async () => { (llamada[0] as () => void)(); });
  await screen.findByText('Datos desactualizados');
  expect(screen.getByRole('button', { name: 'Confirmar recepción' })).toBeDisabled();
  expect(screen.getByRole('heading', { name: 'Incidencia · DSP-SINTETICO' })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar detalle' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar recepción' })).toBeEnabled());
  let resolver!: (respuesta: unknown) => void;
  obtener.mockImplementationOnce(() => new Promise((resolucion) => { resolver = resolucion; }));
  act(() => { (llamada[0] as () => void)(); (llamada[0] as () => void)(); });
  expect(obtener).toHaveBeenCalledTimes(4);
  await act(async () => { resolver({ data: detallePrueba() }); });
});

it('descarta una respuesta antigua al cambiar de despacho y vuelve al listado inicial cuando no hay origen', async () => {
  let resolver!: (respuesta: unknown) => void;
  obtener.mockImplementationOnce(() => new Promise((resolucion) => { resolver = resolucion; }));
  obtener.mockResolvedValue({ data: detallePrueba({ idDespacho: 'despacho-2', codigoRastreoInterno: 'OTRO-DESPACHO' }) });
  montar('/entregas-fallidas/despacho-1?origen=pagina%3D3%26tamanoPagina%3D10%26motivo%3DNO_INTENTADO');
  await userEvent.click(screen.getByRole('link', { name: 'Otro despacho' }));
  await screen.findByRole('heading', { name: 'Incidencia · OTRO-DESPACHO' });
  await act(async () => { resolver({ data: detallePrueba() }); });
  expect(screen.queryByRole('heading', { name: 'Incidencia · DSP-SINTETICO' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Volver al listado' }));
  expect(screen.getByTestId('ubicacion')).toHaveTextContent('/entregas-fallidas');
});

it('renueva explícitamente una firma vencida y borra la URL al cerrar incluso si llega una autorización anterior', async () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useEvidenciaIncidencia('despacho-1', 'incidencia-2', 'foto-1', vi.fn()));
  await act(async () => { await result.current.abrir(); });
  expect(result.current.estado).toBe('lista');
  act(() => { vi.advanceTimersByTime(2001); });
  expect(result.current.estado).toBe('expirada');
  expect(result.current.url).toBeNull();
  publicar.mockResolvedValueOnce(acceso());
  await act(async () => { await result.current.abrir(); });
  expect(publicar).toHaveBeenCalledTimes(2);
  let resolver!: (respuesta: unknown) => void;
  publicar.mockImplementationOnce(() => new Promise((resolucion) => { resolver = resolucion; }));
  act(() => { void result.current.abrir(); });
  act(() => { result.current.cerrar(); });
  await act(async () => { resolver(acceso()); });
  expect(result.current.abierto).toBe(false);
  expect(result.current.url).toBeNull();
});

it('retira evidencia al cambiar de incidencia y trata el rechazo de la foto dentro del visor', async () => {
  let resolver!: (respuesta: unknown) => void;
  publicar.mockImplementationOnce(() => new Promise((resolucion) => { resolver = resolucion; }));
  const revocar = vi.fn();
  const { result, rerender } = renderHook(({ incidencia, foto }) => useEvidenciaIncidencia('despacho-1', incidencia, foto, revocar),
    { initialProps: { incidencia: 'incidencia-2', foto: 'foto-1' } });
  act(() => { void result.current.abrir(); });
  rerender({ incidencia: 'incidencia-3', foto: 'foto-2' });
  await act(async () => { resolver(acceso()); });
  expect(result.current.url).toBeNull();
  expect(result.current.abierto).toBe(false);
  publicar.mockRejectedValueOnce(fallo(403));
  await act(async () => { await result.current.abrir(); });
  expect(result.current.estado).toBe('sinPermiso');
  expect(revocar).not.toHaveBeenCalled();
  publicar.mockRejectedValueOnce(fallo(401));
  await act(async () => { await result.current.abrir(); });
  expect(revocar).toHaveBeenCalledOnce();
});

it('avisa si la incidencia seleccionada cambió y vuelve a la consulta de origen por teclado', async () => {
  montar('/entregas-fallidas/despacho-1?incidencia=incidencia-1&origen=pagina%3D3%26tamanoPagina%3D10%26motivo%3DNO_INTENTADO');
  await screen.findByText(/La incidencia cambió/);
  const volver = screen.getByRole('button', { name: 'Volver al listado' });
  volver.focus();
  await userEvent.keyboard('{Enter}');
  expect(screen.getByTestId('ubicacion')).toHaveTextContent('/entregas-fallidas?pagina=3&tamanoPagina=10&motivo=NO_INTENTADO');
});
