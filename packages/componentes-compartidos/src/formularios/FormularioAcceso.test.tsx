import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { expect, it, vi } from 'vitest';
import { FormularioAcceso } from './FormularioAcceso';

it('un desafío nuevo usa la hora actual aunque la pantalla de ingreso lleve abierta varios minutos', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-05T17:00:00Z'));
  const acciones = {
    titulo: 'Despacho',
    subtitulo: 'Acceso',
    alIngresar: vi.fn(async () => {}),
    alVerificar: vi.fn(async () => {}),
    alReenviar: vi.fn(async () => {}),
    alCancelar: vi.fn(),
  };
  const { rerender, unmount } = render(
    <MantineProvider env="test">
      <FormularioAcceso {...acciones} desafio={null} />
    </MantineProvider>,
  );
  try {
    vi.setSystemTime(new Date('2026-11-05T17:10:00Z'));
    const desafio = {
      venceEn: Date.now() + 300000,
      codigoVenceEn: Date.now() + 300000,
      destino: 'g****r@example.test',
      intentos: 3,
      reenviarEn: 0,
    };
    rerender(
      <MantineProvider env="test">
        <FormularioAcceso {...acciones} desafio={desafio} />
      </MantineProvider>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Vence en 5:00.');
    expect(screen.getByRole('status')).not.toHaveTextContent('15:00');
  } finally {
    unmount();
    vi.useRealTimers();
  }
});

const accionesBase = {
  titulo: 'Despacho',
  subtitulo: 'Acceso',
  desafio: null,
  alIngresar: vi.fn(async () => {}),
  alVerificar: vi.fn(async () => {}),
  alReenviar: vi.fn(async () => {}),
  alCancelar: vi.fn(),
};

it('sin recuperación configurada no muestra el enlace de contraseña olvidada', () => {
  render(
    <MantineProvider env="test">
      <FormularioAcceso {...accionesBase} />
    </MantineProvider>,
  );
  expect(screen.queryByRole('button', { name: '¿Olvidaste tu contraseña?' })).toBeNull();
});

it('con la recuperación pendiente el botón se ve deshabilitado y no ejecuta nada', () => {
  const alAbrir = vi.fn();
  render(
    <MantineProvider env="test">
      <FormularioAcceso {...accionesBase} recuperacion={{ habilitada: false, alAbrir }} />
    </MantineProvider>,
  );
  const boton = screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' });
  expect(boton).toBeDisabled();
  expect(boton).toHaveAccessibleDescription(
    'La recuperación de contraseña estará disponible próximamente.',
  );
  boton.click();
  expect(alAbrir).not.toHaveBeenCalled();
});

it('con la recuperación habilitada el botón abre la recuperación', () => {
  const alAbrir = vi.fn();
  render(
    <MantineProvider env="test">
      <FormularioAcceso {...accionesBase} recuperacion={{ habilitada: true, alAbrir }} />
    </MantineProvider>,
  );
  screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }).click();
  expect(alAbrir).toHaveBeenCalledOnce();
  expect(screen.queryByText(/disponible próximamente/)).toBeNull();
});
