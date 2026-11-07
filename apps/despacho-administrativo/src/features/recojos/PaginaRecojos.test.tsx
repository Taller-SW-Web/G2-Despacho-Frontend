import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { tema } from '@despacho/componentes-compartidos';
import { PaginaRecojos } from './PaginaRecojos';

const { obtener, publicar } = vi.hoisted(() => ({ obtener: vi.fn(), publicar: vi.fn() }));
vi.mock('../../cliente/useClienteApi', () => {
  const cliente = { get: obtener, post: publicar };
  return { useClienteApi: () => cliente };
});

const base = {
  idRecojo: 'rec-1', idDespacho: 'des-1', codigoRastreoInterno: 'TRK-100', estado: 'PENDIENTE_ASIGNACION', esSimulado: true, destinatario: 'Ana Mendoza',
  telefono: '+51999', direccion: 'Av. Ejemplo 123', referencia: null, distrito: 'Lince', idZona: 'zona-1', lineas: [{ sku: 'ZAP-42', cantidad: 1 }], pesoKg: 2.5, volumenM3: 0.02,
  cantidadPaquetes: 1, fechaProgramada: '2020-01-01', idRepartidor: null, idJornada: null, secuenciaRuta: null, numeroIntentos: 0, motivoFallo: null, etiquetaMotivo: null,
  idEvidencia: null, motivoCierre: null, recibidoEnCentroEn: null, version: 1, actualizadoEn: '2026-10-17T15:41:00Z',
};
const carga = { pesoKg: 100, volumenM3: 2, paquetes: 40 };
const repartidor = { idRepartidor: 'rep-1', idJornada: 'jor-1', nombre: 'Martín Rojas', idZona: 'zona-1', idFurgoneta: 'fur-1', placa: 'ABC-123', limites: carga,
  ocupacion: { pesoKg: 0, volumenM3: 0, paquetes: 0 }, estadoOperativo: 'DISPONIBLE', capacidadRemanente: carga, porcentajeOcupacion: { peso: 0, volumen: 0, paquetes: 0 } };
const pagina = (contenido: unknown[]) => ({ contenido, pagina: 1, tamanoPagina: 50, totalElementos: contenido.length, totalPaginas: 1 });
let filas: Record<string, unknown[]>;

function montar() {
  return render(<MantineProvider theme={tema} env="test"><MemoryRouter><PaginaRecojos /></MemoryRouter></MantineProvider>);
}
beforeEach(() => {
  vi.clearAllMocks();
  filas = { PENDIENTE_ASIGNACION: [base], 'RECOGIDO,FALLIDO': [] };
  obtener.mockImplementation(async (ruta: string, opciones?: { params?: URLSearchParams }) => {
    if (ruta === '/api/v1/recojos') return { data: pagina(filas[opciones!.params!.get('estado')!]) };
    if (ruta === '/api/v1/recojos/elegibles') return { data: { despachos: [{ idDespacho: 'des-2', codigoRastreoInterno: 'TRK-200', destinatario: 'Luis', direccion: 'Jr. Uno 1', distrito: 'Lima' }] } };
    if (ruta === '/api/v1/repartidores/disponibles') return { data: { repartidores: [repartidor] } };
    if (ruta === '/api/v1/zonas') return { data: pagina([{ id: 'zona-1', nombre: 'Lima Centro', estado: 'ACTIVO' }]) };
    throw new Error(`Ruta no prevista: ${ruta}`);
  });
});

it('lista los recojos por asignar y genera uno de prueba desde un despacho entregado', async () => {
  const usuario = userEvent.setup();
  publicar.mockResolvedValue({ data: { ...base, idRecojo: 'rec-2', idDespacho: 'des-2', codigoRastreoInterno: 'TRK-200' } });
  montar();
  expect(await screen.findByText('TRK-100')).toBeVisible();
  expect(screen.getByText('1 × ZAP-42')).toBeVisible();
  await usuario.click(screen.getByRole('button', { name: 'Generar recojo de prueba' }));
  const dialogo = await screen.findByRole('dialog', { name: 'Generar recojo de prueba' });
  expect(within(dialogo).getByRole('button', { name: 'Generar recojo' })).toBeDisabled();
  await usuario.click(await within(dialogo).findByRole('combobox', { name: /Despacho entregado/ }));
  await usuario.click(await screen.findByRole('option', { name: /TRK-200/ }));
  await usuario.click(within(dialogo).getByRole('button', { name: 'Generar recojo' }));
  await waitFor(() => expect(publicar).toHaveBeenCalledWith('/api/v1/despachos/des-2/recojos/simulacion'));
});

it('asigna solo a jornadas de recojos con clave y versión', async () => {
  const usuario = userEvent.setup();
  publicar.mockResolvedValue({ data: { ...base, estado: 'ASIGNADO', idJornada: 'jor-1', secuenciaRuta: 1, version: 2 } });
  montar();
  await usuario.click(await screen.findByRole('button', { name: 'Asignar recojo TRK-100' }));
  const dialogo = await screen.findByRole('dialog', { name: 'Asignar recojo TRK-100' });
  await within(dialogo).findByText('Martín Rojas');
  const consulta = obtener.mock.calls.find(([ruta]) => ruta === '/api/v1/repartidores/disponibles')!;
  expect(consulta[1].params.get('tipoOperacion')).toBe('RECOJOS');
  expect(within(dialogo).getByText('En la zona del recojo')).toBeVisible();
  await usuario.click(within(dialogo).getByText('Martín Rojas'));
  await usuario.click(within(dialogo).getByRole('button', { name: 'Confirmar asignación' }));
  await waitFor(() => expect(publicar).toHaveBeenCalledTimes(1));
  const [ruta, cuerpo, opciones] = publicar.mock.calls[0];
  expect(ruta).toBe('/api/v1/recojos/rec-1/asignacion');
  expect(cuerpo).toEqual({ idRepartidor: 'rep-1', idJornada: 'jor-1' });
  expect(opciones.headers['If-Match']).toBe('1');
  expect(opciones.headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
});

it('informa una jornada de otro tipo sin cerrar el modal', async () => {
  const usuario = userEvent.setup();
  publicar.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { status: 409, code: 'DESP_ERROR_TIPO_JORNADA_INCOMPATIBLE' } } });
  montar();
  await usuario.click(await screen.findByRole('button', { name: 'Asignar recojo TRK-100' }));
  const dialogo = await screen.findByRole('dialog', { name: 'Asignar recojo TRK-100' });
  await usuario.click(await within(dialogo).findByText('Martín Rojas'));
  await usuario.click(within(dialogo).getByRole('button', { name: 'Confirmar asignación' }));
  expect(await within(dialogo).findByText('La jornada elegida no es de recojos. Actualiza la lista de repartidores.')).toBeVisible();
});

it('resuelve cada estado con sus acciones y exige los datos obligatorios', async () => {
  const usuario = userEvent.setup();
  filas['RECOGIDO,FALLIDO'] = [{ ...base, idRecojo: 'rec-3', codigoRastreoInterno: 'TRK-300', estado: 'RECOGIDO', version: 4, idEvidencia: 'evi-1' },
    { ...base, idRecojo: 'rec-4', codigoRastreoInterno: 'TRK-400', estado: 'FALLIDO', version: 5, etiquetaMotivo: 'Cliente ausente', numeroIntentos: 1 }];
  publicar.mockImplementation(async (ruta: string) => ({ data: { ...base, idRecojo: ruta.includes('rec-3') ? 'rec-3' : 'rec-4' } }));
  montar();
  await screen.findByText('TRK-100');
  await usuario.click(screen.getByRole('tab', { name: 'Por resolver' }));
  expect(await screen.findByText('Cliente ausente')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Reprogramar TRK-300' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Ver foto de TRK-300' })).toBeVisible();
  await usuario.click(screen.getByRole('button', { name: 'Confirmar recepción de TRK-300' }));
  let dialogo = await screen.findByRole('dialog', { name: /Confirmar recepción/ });
  await usuario.click(within(dialogo).getByRole('button', { name: 'Confirmar recepción' }));
  await waitFor(() => expect(publicar).toHaveBeenCalledWith('/api/v1/recojos/rec-3/recepcion', {}, expect.objectContaining({ headers: expect.objectContaining({ 'If-Match': '4' }) })));

  await usuario.click(await screen.findByRole('button', { name: 'Cerrar TRK-400' }));
  dialogo = await screen.findByRole('dialog', { name: /Cerrar sin recojo/ });
  expect(within(dialogo).getByRole('button', { name: 'Cerrar recojo' })).toBeDisabled();
  await usuario.type(within(dialogo).getByRole('textbox', { name: /Motivo del cierre/ }), 'Cliente desiste');
  await usuario.click(within(dialogo).getByRole('button', { name: 'Cerrar recojo' }));
  await waitFor(() => expect(publicar).toHaveBeenCalledWith('/api/v1/recojos/rec-4/cierre', { motivoCierre: 'Cliente desiste' }, expect.anything()));
});

it('sin permiso no muestra datos', async () => {
  obtener.mockRejectedValue({ isAxiosError: true, response: { status: 403, data: { status: 403 } } });
  montar();
  await waitFor(() => expect(screen.queryByText('TRK-100')).not.toBeInTheDocument());
  expect(await screen.findByText('Tu sesión no permite consultar los recojos.')).toBeVisible();
});
