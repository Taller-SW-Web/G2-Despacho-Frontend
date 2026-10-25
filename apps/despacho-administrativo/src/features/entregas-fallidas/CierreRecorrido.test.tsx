import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { tema } from '@despacho/componentes-compartidos';
import { PaginaDetalleIncidencia } from './PaginaDetalleIncidencia';
import { PaginaEntregasFallidas } from './PaginaEntregasFallidas';
import { detalleCerrable, respuestaCierre } from './fixtures.cierre.prueba';

const { obtener, publicar } = vi.hoisted(() => ({ obtener: vi.fn(), publicar: vi.fn() }));
vi.mock('../../cliente/useClienteApi', () => {
  const cliente = { get: obtener, post: publicar }; return { useClienteApi: () => cliente };
});
function Ubicacion() { return <output data-testid="url">{useLocation().search}</output>; }
let aceptada: boolean, fallaListado: boolean;
beforeEach(() => {
  Object.defineProperty(document, 'fonts', { configurable: true, value: new EventTarget() });
  Element.prototype.scrollIntoView = vi.fn();
  aceptada = false; fallaListado = false; obtener.mockReset(); publicar.mockReset();
  obtener.mockImplementation(async (ruta: string, opciones: { params?: URLSearchParams }) => {
    if (ruta.endsWith('/incidencia')) {
      const detalle = detalleCerrable();
      if (aceptada) { detalle.estado = 'DEVUELTO_A_ORIGEN'; detalle.versionDespacho = 5;
        detalle.acciones.reprogramar = { habilitada: false, motivosBloqueo: ['ESTADO_NO_FALLIDO'] }; }
      return { data: detalle };
    }
    if (ruta.includes('/catalogos/')) return { data: { motivos: [{ codigo: 'NO_INTENTADO', etiqueta: 'No intentado', activo: true,
      consumeIntento: false, seleccionableEnCampo: false }] } };
    if (fallaListado) throw { isAxiosError: true, response: { status: 503, data: {} } };
    return { data: { contenido: [], pagina: Number(opciones.params?.get('pagina') ?? 1), tamanoPagina: 10,
      totalElementos: 0, totalPaginas: 0, consultadoEn: '2026-10-25T03:32:00Z',
      indicadores: { pendientesRetorno: 0, recibidosCentro: 0, retornosAtrasados: 0, retornosSinJornadaConfirmada: 0 } } };
  });
  publicar.mockImplementation(async () => { aceptada = true; return respuestaCierre(); });
});
function montar() {
  render(<MantineProvider theme={tema} env="test"><MemoryRouter initialEntries={['/entregas-fallidas/despacho-1?incidencia=incidencia-2&origen=pagina%3D3%26tamanoPagina%3D10%26motivo%3DNO_INTENTADO']}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes>
      <Route path="/entregas-fallidas/:idDespacho" element={<PaginaDetalleIncidencia />} />
      <Route path="/entregas-fallidas" element={<PaginaEntregasFallidas />} />
    </Routes><Ubicacion /></MemoryRouter></MantineProvider>);
}
async function cerrar() {
  await userEvent.click(await screen.findByRole('button', { name: 'Cerrar como devuelto a origen' }));
  const campo = await screen.findByRole('textbox', { name: /Motivo del cierre/ });
  await waitFor(() => expect(campo).toBeEnabled()); await userEvent.type(campo, 'Decisión operativa');
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar despacho' }));
}
it('regresa al listado, conserva filtros/tamaño, corrige página vacía y lleva el foco al título', async () => {
  montar(); await cerrar();
  await screen.findByText('Despacho cerrado como devuelto a origen', {}, { timeout: 5000 });
  await screen.findByText('No encontramos resultados con estos filtros');
  await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveFocus());
  expect(screen.getByTestId('url')).toHaveTextContent('tamanoPagina=10');
  expect(screen.getByTestId('url')).toHaveTextContent('motivo=NO_INTENTADO');
  expect(screen.getByTestId('url')).not.toHaveTextContent('pagina=3');
  expect(publicar).toHaveBeenCalledOnce();
});
it('no pierde la aceptación si falla el listado y solo repite la lectura al actualizar', async () => {
  fallaListado = true; montar(); await cerrar();
  await screen.findByText('Cierre registrado. No se pudo actualizar el listado', {}, { timeout: 5000 });
  expect(screen.getByTestId('url')).toHaveTextContent('pagina=3');
  fallaListado = false;
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar consulta' }));
  await screen.findByText('Despacho cerrado como devuelto a origen');
  expect(publicar).toHaveBeenCalledOnce();
});
