import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { tema } from '@despacho/componentes-compartidos';
import { Aplicacion } from '../../Aplicacion';
import { SesionProveedor } from '../../sesion/SesionProveedor';
import { furgonetaPrueba, paginaPrueba, repartidorPrueba } from './fixtures.prueba';

vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
vi.mock('../../cliente/useClienteApi', () => {
  const cliente = { get: vi.fn(async (ruta: string) => ({ data: ruta.includes('/repartidores') ? paginaPrueba([repartidorPrueba]) : paginaPrueba([furgonetaPrueba]) })) };
  return { useClienteApi: () => cliente };
});

it.each([
  ['/repartidores', 'Repartidores', 'Ana Prueba', 'Repartidores'],
  ['/furgonetas', 'Furgonetas', 'ABC-123', 'Vehículos'],
  ['/flota', 'Repartidores', 'Ana Prueba', 'Repartidores'],
])('integra %s en el shell con un main y un destino activo', async (ruta, titulo, dato, destino) => {
  render(<MantineProvider theme={tema} env="test"><SesionProveedor><MemoryRouter initialEntries={[ruta]}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Aplicacion /></MemoryRouter></SesionProveedor></MantineProvider>);
  expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeVisible();
  expect(await screen.findByText(dato)).toBeVisible();
  expect(screen.getAllByRole('main')).toHaveLength(1);
  expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  expect(screen.getByRole('link', { name: destino })).toHaveAttribute('aria-current', 'page');
});
