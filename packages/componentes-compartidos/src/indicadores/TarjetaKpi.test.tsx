import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TarjetaKpi, tema } from '../index';

it('CCR-10: la selección es controlada y la activación entrega el identificador', () => {
  const seleccionar = vi.fn();
  render(<MantineProvider theme={tema} env="test"><TarjetaKpi id="saturado" etiqueta="Saturados" valor={8} tono="error"
    accionable seleccionada alSeleccionar={seleccionar} /></MantineProvider>);
  const boton = screen.getByRole('button', { name: 'Saturados: 8' });
  expect(boton).toHaveAttribute('aria-pressed', 'true'); fireEvent.click(boton);
  expect(seleccionar).toHaveBeenCalledExactlyOnceWith('saturado');
});
it('CCR-10: carga y ausencia no inventan cero ni habilitan acciones', () => {
  const vista = render(<MantineProvider theme={tema} env="test"><TarjetaKpi id="total" etiqueta="Total" valor={null} accionable cargando /></MantineProvider>);
  expect(screen.getByRole('button', { name: 'Total: Cargando' })).toBeDisabled();
  expect(screen.queryByText('0')).not.toBeInTheDocument();
  vista.rerender(<MantineProvider theme={tema} env="test"><TarjetaKpi id="total" etiqueta="Total" valor={null} /></MantineProvider>);
  expect(screen.getByText('No disponible')).toBeVisible(); expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
