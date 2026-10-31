import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { tema } from '@despacho/componentes-compartidos';
import { PaginaRepartidores } from './PaginaRepartidores';
import { PaginaFurgonetas } from './PaginaFurgonetas';
import { repartidorPrueba, furgonetaPrueba, paginaPrueba } from './fixtures.prueba';

const { obtener, editar, notificar } = vi.hoisted(() => ({ obtener: vi.fn(), editar: vi.fn(), notificar: vi.fn() }));
vi.mock('../../cliente/useClienteApi', () => {
  const cliente = { get: obtener, put: editar };
  return { useClienteApi: () => cliente };
});
vi.mock('@mantine/notifications', () => ({ notifications: { show: notificar } }));
beforeEach(() => { obtener.mockReset(); editar.mockReset(); notificar.mockReset(); });

const escenarios = [
  { tipo: 'repartidores', fila: repartidorPrueba, etiqueta: 'Ana Prueba', editar: 'Editar repartidor Ana Prueba',
    siguiente: { ...repartidorPrueba, nombres: 'Sesión nueva' }, nombreSiguiente: 'Sesión nueva Prueba' },
  { tipo: 'furgonetas', fila: furgonetaPrueba, etiqueta: 'ABC-123', editar: 'Editar furgoneta ABC-123',
    siguiente: { ...furgonetaPrueba, placa: 'NUEVA-01' }, nombreSiguiente: 'NUEVA-01' },
] as const;

for (const escenario of escenarios) {
  const montar = () => render(<MantineProvider theme={tema} env="test"><MemoryRouter
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    {escenario.tipo === 'repartidores' ? <PaginaRepartidores /> : <PaginaFurgonetas />}
  </MemoryRouter></MantineProvider>);

  it(`${escenario.tipo}: cambiar sesión retira el formulario y descarta el éxito tardío de otra identidad`, async () => {
    const usuario = userEvent.setup();
    let resolverEdicion!: (valor: unknown) => void;
    let resolverConsulta!: (valor: unknown) => void;
    obtener.mockResolvedValueOnce({ data: paginaPrueba([escenario.fila]) })
      .mockImplementation(() => new Promise((resolver) => { resolverConsulta = resolver; }));
    editar.mockImplementation(() => new Promise((resolver) => { resolverEdicion = resolver; }));
    montar(); await screen.findByText(escenario.etiqueta);
    await usuario.click(screen.getByRole('button', { name: escenario.editar }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(editar).toHaveBeenCalledTimes(1));
    act(() => window.dispatchEvent(new Event('despacho:sesion')));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText(escenario.etiqueta)).not.toBeInTheDocument();
    await act(async () => resolverEdicion({ data: escenario.fila }));
    expect(notificar).not.toHaveBeenCalled();
    expect(obtener).toHaveBeenCalledTimes(2);
    await act(async () => resolverConsulta({ data: paginaPrueba([escenario.siguiente]) }));
    expect(await screen.findByText(escenario.nombreSiguiente)).toBeVisible();
  });

  it(`${escenario.tipo}: un cambio en otra pestaña cancela el refresco y no recupera datos anteriores`, async () => {
    const usuario = userEvent.setup();
    let resolverAnterior!: (valor: unknown) => void;
    obtener.mockResolvedValueOnce({ data: paginaPrueba([escenario.fila]) })
      .mockImplementationOnce(() => new Promise((resolver) => { resolverAnterior = resolver; }))
      .mockResolvedValue({ data: paginaPrueba([escenario.siguiente]) });
    montar(); await screen.findByText(escenario.etiqueta);
    await usuario.click(screen.getByRole('button', { name: 'Actualizar' }));
    const signal = obtener.mock.calls[1][1].signal as AbortSignal;
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'despacho.token' })));
    expect(signal.aborted).toBe(true);
    expect(await screen.findByText(escenario.nombreSiguiente)).toBeVisible();
    await act(async () => resolverAnterior({ data: paginaPrueba([escenario.fila]) }));
    expect(screen.queryByText(escenario.etiqueta)).not.toBeInTheDocument();
  });
}
