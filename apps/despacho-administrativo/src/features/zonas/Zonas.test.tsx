import '@testing-library/jest-dom/vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { tema } from '@despacho/componentes-compartidos';
import { FormularioZona } from './FormularioZona';
import { PaginaZonas } from './PaginaZonas';
import { PanelTarifa } from './PanelTarifa';
import { obtenerTarifaVigente } from './api/zonasApi';
import { probarCotizacion } from './desarrollo/apiPruebas';
import type { Zona } from './tipos';
import type { ClienteApi } from '../../cliente/useClienteApi';

const { cliente, notificar } = vi.hoisted(() => ({ cliente: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() }, notificar: vi.fn() }));
vi.mock('../../cliente/useClienteApi', () => ({ useClienteApi: () => cliente }));
vi.mock('@mantine/notifications', () => ({ notifications: { show: notificar } }));
Element.prototype.scrollIntoView = vi.fn();

const zona: Zona = {
  id: 'zona-1', nombre: 'Zona Norte', estado: 'ACTIVO', origenDelimitacion: 'DISTRITOS',
  distritos: [{ id: 'd1', nombre: 'Comas', codigosPostales: ['15311'] }, { id: 'd2', nombre: 'Ancón', codigosPostales: [] }],
  tarifaVigente: null, creadoEn: '2026-10-16T15:00:00Z', actualizadoEn: '2026-10-16T15:00:00Z',
};
const catalogo = zona.distritos.map(({ id, nombre }) => ({ id, nombre, provincia: 'Lima', departamento: 'Lima', ubigeo: id }));
const pagina = { contenido: [zona], pagina: 1, tamanoPagina: 20, totalElementos: 1, totalPaginas: 1 };
const fallo = (status: number, code = '', detail = '') => ({ isAxiosError: true, response: { status, data: { status, code, detail } } });

function montar(ruta: string) {
  return render(<MantineProvider theme={tema}><MemoryRouter initialEntries={[ruta]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes><Route path="/zonas" element={<PaginaZonas />} /><Route path="/zonas/nueva" element={<FormularioZona />} />
      <Route path="/zonas/:id/editar" element={<FormularioZona />} /><Route path="/zonas/:id/tarifas" element={<PanelTarifa />} /></Routes>
  </MemoryRouter></MantineProvider>);
}
beforeEach(() => {
  vi.resetAllMocks();
  cliente.get.mockImplementation(async (ruta: string) => {
    if (ruta === '/api/v1/distritos') return { data: structuredClone(catalogo) };
    if (ruta.endsWith('/tarifa')) throw fallo(404, 'DESP_ERROR_TARIFA_NO_ENCONTRADA');
    return { data: structuredClone(ruta === '/api/v1/zonas' ? pagina : zona) };
  });
  cliente.post.mockResolvedValue({ data: zona });
  cliente.put.mockResolvedValue({ data: zona });
  cliente.patch.mockResolvedValue({ data: zona });
});

it('muestra el listado con CP agrupados y exige confirmar la desactivación', async () => {
  const usuario = userEvent.setup();
  montar('/zonas');
  expect(await screen.findByText('Comas: 15311')).toBeVisible();
  expect(screen.getByText('Sin tarifa configurada')).toBeVisible();
  await usuario.click(screen.getByRole('button', { name: 'Desactivar Zona Norte' }));
  expect(cliente.patch).not.toHaveBeenCalled();
  await usuario.click(screen.getByRole('button', { name: 'Desactivar zona' }));
  await waitFor(() => expect(cliente.patch).toHaveBeenCalledWith('/api/v1/zonas/zona-1/estado', { estado: 'INACTIVO' }));
});

it('crea con distritos del catálogo y códigos anidados sin lista global', async () => {
  const usuario = userEvent.setup();
  montar('/zonas/nueva');
  await usuario.type(screen.getByRole('textbox', { name: 'Nombre de la zona' }), 'Zona de prueba');
  const selector = await screen.findByRole('combobox', { name: 'Distritos' });
  await waitFor(() => expect(selector).toBeEnabled());
  await usuario.type(selector, 'Comas');
  await usuario.keyboard('{ArrowDown}{Enter}');
  const codigos = screen.getByRole('combobox', { name: 'Códigos postales de Comas' });
  await usuario.type(codigos, '15312{Enter}');
  await usuario.click(screen.getByRole('button', { name: 'Guardar zona' }));
  await waitFor(() => expect(cliente.post).toHaveBeenCalledWith('/api/v1/zonas', {
    nombre: 'Zona de prueba', estado: 'ACTIVO', distritos: [{ distrito: 'Comas', codigosPostales: ['15312'] }],
  }));
});

it('precarga y conserva los códigos de cada distrito al editar; un conflicto no borra los cambios', async () => {
  const usuario = userEvent.setup();
  cliente.put.mockRejectedValue(fallo(409, 'DESP_ERROR_ZONA_CONFLICTO', 'La cobertura se solapa con otra zona activa'));
  montar('/zonas/zona-1/editar');
  const nombre = await screen.findByRole('textbox', { name: 'Nombre de la zona' });
  expect(nombre).toHaveValue('Zona Norte');
  await usuario.clear(nombre);
  await usuario.type(nombre, 'Zona editada');
  await usuario.type(screen.getByRole('combobox', { name: 'Códigos postales de Ancón' }), '15123{Enter}');
  await usuario.click(screen.getByRole('button', { name: 'Guardar zona' }));
  expect(await screen.findByText('La cobertura se solapa con otra zona activa')).toBeVisible();
  expect(nombre).toHaveValue('Zona editada');
  expect(cliente.put).toHaveBeenCalledWith('/api/v1/zonas/zona-1', { nombre: 'Zona editada', estado: 'ACTIVO', distritos: [
    { distrito: 'Comas', codigosPostales: ['15311'] }, { distrito: 'Ancón', codigosPostales: ['15123'] },
  ] });
});

it('un 404 de zona no permite editar un formulario vacío', async () => {
  cliente.get.mockImplementation(async (ruta: string) => {
    if (ruta === '/api/v1/distritos') return { data: catalogo };
    throw fallo(404, 'DESP_ERROR_ZONA_NO_ENCONTRADA');
  });
  montar('/zonas/no-existe/editar');
  expect(await screen.findByText('La zona solicitada no existe.')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Guardar zona' })).not.toBeInTheDocument();
});

it('retira configuración y filtros si el catálogo revoca el permiso', async () => {
  const usuario = userEvent.setup();
  montar('/zonas');
  await screen.findByText('Comas: 15311');
  cliente.get.mockImplementation(async (ruta: string) => {
    if (ruta === '/api/v1/distritos') throw fallo(403);
    return new Promise(() => {});
  });
  await usuario.click(screen.getByRole('button', { name: 'Actualizar zonas' }));
  await screen.findByText('No tienes permisos para ver la configuración de zonas');
  expect(screen.queryByText('Comas: 15311')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Buscar por nombre')).not.toBeInTheDocument();
});

it('ignora una respuesta antigua cuando cambia el filtro, incluso sin cancelación del transporte', async () => {
  const usuario = userEvent.setup();
  let resolverAnterior!: (valor: unknown) => void;
  let primera = true;
  cliente.get.mockImplementation(async (ruta: string) => {
    if (ruta === '/api/v1/distritos') return { data: catalogo };
    if (primera) { primera = false; return new Promise((resolver) => { resolverAnterior = resolver; }); }
    return { data: { ...pagina, contenido: [{ ...zona, nombre: 'Resultado vigente' }] } };
  });
  montar('/zonas');
  await usuario.type(screen.getByLabelText('Buscar por nombre'), 'vigente');
  await screen.findByText('Resultado vigente');
  await act(async () => resolverAnterior({ data: pagina }));
  expect(screen.queryByText('Zona Norte', { exact: true })).not.toBeInTheDocument();
});

it('distingue tarifa ausente de zona inexistente', async () => {
  expect(await obtenerTarifaVigente(cliente as unknown as ClienteApi, 'zona-1')).toBeNull();
  cliente.get.mockRejectedValue(fallo(404, 'DESP_ERROR_ZONA_NO_ENCONTRADA'));
  await expect(obtenerTarifaVigente(cliente as unknown as ClienteApi, 'no-existe')).rejects.toBeTruthy();
});

it('precarga factor nulo y bloquea una tarifa con peso cero', async () => {
  const usuario = userEvent.setup();
  cliente.get.mockImplementation(async (ruta: string) => ({ data: ruta.endsWith('/tarifa') ? {
    tarifaBase: 10, pesoIncluidoKg: 3, recargoKgAdicional: 2, factorVolumetrico: null, moneda: 'PEN', plazoEstimadoDiasHabiles: 2,
  } : zona }));
  montar('/zonas/zona-1/tarifas');
  const peso = await screen.findByRole('textbox', { name: 'Peso incluido hasta (kg)' });
  expect(screen.getByLabelText('Factor volumétrico')).toHaveValue('');
  await usuario.clear(peso);
  await usuario.type(peso, '0');
  await usuario.click(screen.getByRole('button', { name: 'Guardar tarifa' }));
  expect(await screen.findByText('El peso incluido debe ser mayor que cero')).toBeVisible();
  expect(cliente.put).not.toHaveBeenCalled();
});

it('la cotización usa su token técnico sin heredar el token humano guardado', async () => {
  const original = localStorage.getItem('despacho.token');
  localStorage.setItem('despacho.token', 'token-humano-de-prueba');
  // Adaptador Axios: observa la solicitud ya interceptada, sin red ni servidor simulado.
  const axios = await import('axios');
  const adaptadorAnterior = axios.default.defaults.adapter;
  const solicitudes: string[] = [];
  axios.default.defaults.adapter = async (configuracion) => {
    solicitudes.push(String(configuracion.headers.Authorization));
    return { status: 403, statusText: 'Forbidden', data: { status: 403 }, headers: {}, config: configuracion };
  };
  try {
    expect((await probarCotizacion('token-tecnico-de-prueba', { destino: { distrito: 'Comas' } })).status).toBe(403);
    await probarCotizacion('', {});
    expect(solicitudes).toEqual(['Bearer token-tecnico-de-prueba', 'undefined']);
  } finally {
    axios.default.defaults.adapter = adaptadorAnterior;
    if (original) localStorage.setItem('despacho.token', original); else localStorage.removeItem('despacho.token');
  }
});
