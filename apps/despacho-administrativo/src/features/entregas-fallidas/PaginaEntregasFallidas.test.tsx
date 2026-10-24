import '@testing-library/jest-dom/vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { tema } from '@despacho/componentes-compartidos';
import { PaginaEntregasFallidas } from './PaginaEntregasFallidas';
import { filtrosIniciales, leerFiltros, parametrosFiltros, type PaginaFallidos } from './modelo';

const { obtener } = vi.hoisted(() => ({ obtener: vi.fn() }));
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
Element.prototype.scrollIntoView = vi.fn();
vi.mock('../../cliente/useClienteApi', () => {
  const cliente = { get: obtener };
  return { useClienteApi: () => cliente };
});

// Fixtures exclusivos de presentación. No representan una API ni prueban reglas backend.
const paginaBase: PaginaFallidos = {
  pagina: 1, tamanoPagina: 20, totalElementos: 3, totalPaginas: 1, consultadoEn: '2026-10-16T18:00:00Z',
  indicadores: { pendientesRetorno: 7, recibidosCentro: 5, retornosAtrasados: 2, retornosSinJornadaConfirmada: 0 },
  contenido: [0, 1, 2].map((numero) => ({
    idDespacho: `DSP-${numero}`, idIncidencia: `INC-${numero}`, versionDespacho: 2, codigoRastreoInterno: `COD-${numero}`,
    fechaIncidencia: '2026-10-15T03:00:00Z', motivo: { codigo: 'NO_INTENTADO', etiqueta: 'No intentado por fin de jornada' },
    numeroIntentos: numero === 0 ? 0 : 1, maximoIntentos: 2, consumeIntento: false,
    repartidor: { idRepartidor: `REP-${numero}`, nombre: numero === 2 ? null : `Repartidor sintético ${numero}` },
    recepcion: numero === 0 ? 'RECIBIDO_EN_CENTRO' : 'PENDIENTE_RETORNO',
    jornada: { idJornada: `JOR-${numero}`, estado: 'CERRADA', cerradaEn: '2026-10-15T04:00:00Z', consultadaEn: '2026-10-16T18:00:00Z' },
    retornoAtrasado: numero !== 0, tieneEvidencia: numero === 1, pedidoAnulado: numero === 2,
  })),
};
const catalogo = { motivos: [
  { codigo: 'NO_INTENTADO', etiqueta: 'No intentado por fin de jornada', activo: true, consumeIntento: false, seleccionableEnCampo: false },
  { codigo: 'HISTORICO', etiqueta: 'Motivo anterior', activo: false, consumeIntento: true, seleccionableEnCampo: false },
] };
let responder: (parametros: URLSearchParams) => Promise<{ data: PaginaFallidos }>;
function Ubicacion() { return <output data-testid="url">{useLocation().search}</output>; }
function montar(ruta = '/entregas-fallidas') {
  return render(<MantineProvider theme={tema}><MemoryRouter initialEntries={[ruta]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><PaginaEntregasFallidas /><Ubicacion /></MemoryRouter></MantineProvider>);
}
function fallo(status: number, code = '') { return { isAxiosError: true, response: { status, data: { status, code } } }; }
beforeEach(() => {
  responder = async () => ({ data: structuredClone(paginaBase) });
  obtener.mockImplementation((ruta: string, opciones: { params: URLSearchParams }) => ruta.includes('/catalogos/')
    ? Promise.resolve({ data: catalogo }) : responder(opciones.params));
});

it('muestra los indicadores del servidor y alterna grupos sin inventar totales ni reiniciar intentos', async () => {
  const usuario = userEvent.setup();
  montar();
  await screen.findByText('COD-0');
  expect(screen.getByText('Repartidor sintético 0')).toBeVisible();
  expect(screen.queryByText('REP-0', { exact: false })).not.toBeInTheDocument();
  expect(screen.getByText('ID: REP-2')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Pendientes de retorno: 7' })).toBeEnabled();
  expect(screen.getByText('0 de 2')).toBeVisible();
  expect(screen.getAllByText('1 de 2')).toHaveLength(2);
  expect(screen.getAllByText('No intentado en esta salida')).toHaveLength(3);
  expect(screen.getByRole('img', { name: 'Tiene evidencia' })).toBeVisible();
  expect(screen.queryByRole('img', { name: /fotografía/i })).not.toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: 'Confirmar recepción' })).toHaveLength(2);
  expect(obtener.mock.calls.find(([ruta]) => ruta.includes('/fallidos'))?.[1].params.toString()).toBe('');
  await usuario.click(screen.getByRole('button', { name: 'Retornos atrasados: 2' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Retornos atrasados: 2' })).toHaveAttribute('aria-pressed', 'true'));
  expect(screen.getByTestId('url')).toHaveTextContent('soloRetornosAtrasados=true');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Retornos atrasados: 2' })).toBeEnabled());
  await usuario.click(screen.getByRole('button', { name: 'Retornos atrasados: 2' }));
  await waitFor(() => expect(screen.getByTestId('url')).toBeEmptyDOMElement());
});

it('restaura la URL, corrige una página desaparecida y conserva el tamaño al limpiar', async () => {
  const usuario = userEvent.setup();
  responder = async (parametros) => ({ data: { ...structuredClone(paginaBase), pagina: Number(parametros.get('pagina') ?? 1), tamanoPagina: 50 } });
  montar('/entregas-fallidas?pagina=3&tamanoPagina=50&motivo=NO_INTENTADO');
  // Restaurar una página que desapareció requiere una segunda consulta.
  await screen.findByText('COD-0', undefined, { timeout: 5000 });
  await waitFor(() => expect(screen.getByTestId('url')).not.toHaveTextContent('pagina=3'));
  expect(screen.getByTestId('url')).toHaveTextContent('motivo=NO_INTENTADO');
  await usuario.click(screen.getByRole('button', { name: 'Quitar No intentado por fin de jornada' }));
  await waitFor(() => expect(screen.getByTestId('url').textContent).toBe('?tamanoPagina=50'));
});

it('descarta respuestas anteriores aunque el transporte ignore la cancelación', async () => {
  const usuario = userEvent.setup();
  let resolverAnterior!: (respuesta: { data: PaginaFallidos }) => void;
  let anterior = false;
  responder = () => anterior ? new Promise((resolver) => { resolverAnterior = resolver; }) : Promise.resolve({ data: structuredClone(paginaBase) });
  montar('/entregas-fallidas?motivo=NO_INTENTADO');
  await screen.findByText('COD-0');
  anterior = true;
  await usuario.click(screen.getByRole('button', { name: 'Actualizar' }));
  await waitFor(() => expect(resolverAnterior).toBeDefined());
  anterior = false;
  await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Actualizar' })).toBeEnabled());
  const obsoleta = structuredClone(paginaBase);
  obsoleta.contenido[0].codigoRastreoInterno = 'RESPUESTA-OBSOLETA';
  await act(async () => resolverAnterior({ data: obsoleta }));
  expect(screen.queryByText('RESPUESTA-OBSOLETA')).not.toBeInTheDocument();
  expect(screen.getByTestId('url')).toBeEmptyDOMElement();
});

it('retira filas, indicadores y filtros inmediatamente si el catálogo revoca el permiso', async () => {
  const usuario = userEvent.setup();
  montar();
  await screen.findByText('COD-0');
  obtener.mockImplementation((ruta: string) => ruta.includes('/catalogos/') ? Promise.reject(fallo(403)) : new Promise(() => {}));
  await usuario.click(screen.getByRole('button', { name: 'Actualizar' }));
  await screen.findByText('No tienes permisos para ver esta información');
  expect(screen.queryByText('COD-0')).not.toBeInTheDocument();
  expect(screen.queryByRole('combobox', { name: 'Recepción' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Pendientes de retorno: 7' })).not.toBeInTheDocument();
});

it('conserva desconocidos, rechaza un falso vacío de atrasados y recupera todos los grupos', async () => {
  const usuario = userEvent.setup();
  responder = async (parametros) => {
    if (parametros.get('soloRetornosAtrasados') === 'true') throw fallo(503, 'DESP_ERROR_JORNADAS_NO_DISPONIBLES');
    const pagina = structuredClone(paginaBase);
    pagina.indicadores.retornosAtrasados = null;
    pagina.indicadores.retornosSinJornadaConfirmada = 2;
    pagina.contenido[2].retornoAtrasado = null;
    pagina.contenido[2].jornada.estado = 'DESCONOCIDA';
    return { data: pagina };
  };
  montar('/entregas-fallidas?motivo=NO_INTENTADO&soloRetornosAtrasados=true');
  await screen.findByText(/La consulta de solo atrasados no está disponible/);
  expect(screen.queryByText(/No encontramos resultados/)).not.toBeInTheDocument();
  expect(screen.getByTestId('url')).toHaveTextContent('soloRetornosAtrasados=true');
  await usuario.click(screen.getByRole('button', { name: 'Ver todos los grupos' }));
  await screen.findByText('COD-0');
  expect(screen.getByRole('button', { name: 'Retornos atrasados: No disponible' })).toBeDisabled();
  expect(screen.getByText('No se pudo confirmar el cierre de jornada')).toBeVisible();
  expect(screen.getByText('Nombre del repartidor no disponible')).toBeVisible();
  expect(screen.getByTestId('url')).toHaveTextContent('motivo=NO_INTENTADO');
});

it('distingue vacío, falta de coincidencias y error recuperable', async () => {
  const usuario = userEvent.setup();
  let fallar = false;
  responder = async () => {
    if (fallar) throw new Error('Red simulada');
    return { data: { ...structuredClone(paginaBase), contenido: [], totalElementos: 0, totalPaginas: 0,
      indicadores: { pendientesRetorno: 0, recibidosCentro: 0, retornosAtrasados: 0, retornosSinJornadaConfirmada: 0 } } };
  };
  montar();
  await screen.findByText('No hay entregas fallidas por resolver');
  await usuario.click(screen.getByRole('button', { name: 'Pendientes de retorno: 0' }));
  await screen.findByText('No encontramos resultados con estos filtros');
  fallar = true;
  await usuario.click(screen.getByRole('button', { name: 'Actualizar' }));
  await screen.findByText('No se pudo completar la consulta');
  expect(screen.getByText('Se conservan los resultados anteriores. No se pudieron actualizar.')).toBeVisible();
  fallar = false;
  await usuario.click(screen.getByRole('button', { name: 'Reintentar consulta' }));
  await waitFor(() => expect(screen.queryByText('No se pudo completar la consulta')).not.toBeInTheDocument());
});

it('rechaza URLs inválidas y serializa fechas civiles sin cambiarlas de zona', () => {
  for (const consulta of ['pagina=0', 'fechaDesde=2026-02-31', 'fechaDesde=2026-10-16&fechaHasta=2026-10-15', 'motivo=A&motivo=B', 'soloRetornosAtrasados=true&recepcion=RECIBIDO_EN_CENTRO', 'tamanoPagina=101', 'orden=fecha']) {
    expect(Object.keys(leerFiltros(new URLSearchParams(consulta)).errores).length).toBeGreaterThan(0);
  }
  expect(parametrosFiltros({ ...filtrosIniciales, fechaDesde: '2026-10-16' }).get('fechaDesde')).toBe('2026-10-16');
  expect(leerFiltros(new URLSearchParams()).filtros).toEqual(filtrosIniciales);
});
