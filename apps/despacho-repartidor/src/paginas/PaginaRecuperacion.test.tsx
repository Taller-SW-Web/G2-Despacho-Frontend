import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { ErrorSesion } from '@despacho/cliente-api/sesion';
import { MENSAJE_ENVIADO, PaginaRecuperacion } from './PaginaRecuperacion';

const solicitarRecuperacion = vi.fn<(correo: string) => Promise<void>>();
let sesion: { token: string } | null = null;
vi.mock('../sesion/SesionProveedor', () => ({
  useSesion: () => ({ sesion, solicitarRecuperacion }),
}));

function montar(habilitada: boolean) {
  return render(
    <MantineProvider env="test">
      <MemoryRouter initialEntries={['/repartidor/recuperar-contrasena']}>
        <Routes>
          <Route path="/repartidor/acceso" element={<p>Pantalla de acceso</p>} />
          <Route path="/repartidor/ruta" element={<p>Mi Ruta</p>} />
          <Route
            path="/repartidor/recuperar-contrasena"
            element={<PaginaRecuperacion habilitada={habilitada} />}
          />
        </Routes>
      </MemoryRouter>
    </MantineProvider>,
  );
}

beforeEach(() => {
  solicitarRecuperacion.mockReset();
  sesion = null;
});

it('CA-07: con una sesión vigente lleva a Mi Ruta', () => {
  sesion = { token: 'jwt' };
  montar(true);
  expect(screen.getByText('Mi Ruta')).toBeInTheDocument();
  expect(solicitarRecuperacion).not.toHaveBeenCalled();
});

it('CUI-03: mientras Seguridad no publique la operación, la ruta vuelve al acceso sin llamar', () => {
  montar(false);
  expect(screen.getByText('Pantalla de acceso')).toBeInTheDocument();
  expect(solicitarRecuperacion).not.toHaveBeenCalled();
});

it('CA-01: envía el correo y muestra un mensaje neutro', async () => {
  solicitarRecuperacion.mockResolvedValue();
  montar(true);
  await userEvent.type(screen.getByLabelText(/Correo electrónico/), '  gerardo@despacho.pe ');
  await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));
  expect(solicitarRecuperacion).toHaveBeenCalledWith('  gerardo@despacho.pe ');
  expect(await screen.findByRole('status')).toHaveTextContent(MENSAJE_ENVIADO);
  expect(screen.queryByRole('button', { name: 'Enviar enlace' })).toBeNull();
});

it('CA-03: un correo con formato inválido no se envía', async () => {
  montar(true);
  await userEvent.type(screen.getByLabelText(/Correo electrónico/), 'gerardo');
  await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Ingresa un correo electrónico válido.');
  expect(solicitarRecuperacion).not.toHaveBeenCalled();
});

it('CA-04: ante el límite de solicitudes conserva el correo e informa la espera', async () => {
  solicitarRecuperacion.mockImplementation(async () => {
    throw new ErrorSesion('DEMASIADAS_SOLICITUDES', 'otro texto', 429);
  });
  montar(true);
  await userEvent.type(screen.getByLabelText(/Correo electrónico/), 'gerardo@despacho.pe');
  await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Hiciste varias solicitudes seguidas');
  expect(screen.getByLabelText(/Correo electrónico/)).toHaveValue('gerardo@despacho.pe');
});

it('CA-05: si Seguridad no responde, permite reintentar', async () => {
  solicitarRecuperacion.mockImplementation(async () => {
    throw new ErrorSesion('NO_DISPONIBLE', 'x', 503);
  });
  montar(true);
  await userEvent.type(screen.getByLabelText(/Correo electrónico/), 'gerardo@despacho.pe');
  await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos enviar la solicitud');
  expect(screen.getByRole('button', { name: 'Enviar enlace' })).toBeEnabled();
});
