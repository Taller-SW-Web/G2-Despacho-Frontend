import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { FranjaEstado, tema } from '../index';

it('CCR-14: comunica causas coexistentes con texto y recuperación explícita', () => {
  const recuperar = vi.fn();
  render(<MantineProvider theme={tema} env="test"><FranjaEstado tipo="sinConexion" /><FranjaEstado tipo="fueraDeTurno" />
    <FranjaEstado tipo="datosDesactualizados" accion={{ id: 'recuperar', etiqueta: 'Actualizar datos' }} alAccionar={recuperar} />
  </MantineProvider>);
  expect(screen.getByText('Sin conexión')).toBeVisible();
  expect(screen.getByText('Fuera de turno')).toBeVisible();
  expect(screen.getAllByRole('status')).toHaveLength(3);
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar datos' }));
  expect(recuperar).toHaveBeenCalledExactlyOnceWith('recuperar');
});

it('CCR-14: una acción deshabilitada no solicita recuperación', () => {
  const recuperar = vi.fn();
  render(<MantineProvider theme={tema} env="test"><FranjaEstado tipo="datosDesactualizados"
    accion={{ id: 'recuperar', etiqueta: 'Actualizar', disabled: true }} alAccionar={recuperar} /></MantineProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
  expect(recuperar).not.toHaveBeenCalled();
});
