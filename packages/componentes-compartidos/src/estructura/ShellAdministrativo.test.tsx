import { MantineProvider } from '@mantine/core';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ShellAdministrativo, tema, type PropiedadesShellAdministrativo } from '../index';

const propiedades: PropiedadesShellAdministrativo = {
  destinos: [{ id: 'zonas', etiqueta: 'Zonas y Tarifas', ruta: '/zonas' }, { id: 'flota', etiqueta: 'Repartidores', ruta: '/flota' }],
  destinoActivo: 'zonas', usuario: { nombre: 'Rhamses', etiquetaPerfil: 'Gestor' },
  logoUrl: '/logo-autorizado.svg', rutaInicio: '/', alNavegar: vi.fn(), alCerrarSesion: vi.fn(), children: <h1>Zonas</h1>,
};
function Vista(props: PropiedadesShellAdministrativo) {
  return <MantineProvider theme={tema} env="test"><ShellAdministrativo {...props} /></MantineProvider>;
}

describe('CR-03 ShellAdministrativo', () => {
  it('CCR-03-01: actualiza el destino controlado y conserva un solo main', async () => {
    const usuario = userEvent.setup();
    const { rerender } = render(<Vista {...propiedades} />);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Zonas y Tarifas' })).toHaveAttribute('aria-current', 'page');
    await usuario.click(screen.getByRole('link', { name: 'Repartidores' }));
    expect(propiedades.alNavegar).toHaveBeenCalledWith('flota', '/flota');
    rerender(<Vista {...propiedades} destinoActivo="flota" children={<h1>Repartidores</h1>} />);
    expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(within(screen.getByRole('main')).getByRole('heading', { level: 1 })).toHaveTextContent('Repartidores');
    expect(screen.getByRole('img', { name: 'Inka Athletics' })).toHaveAttribute('src', '/logo-autorizado.svg');
  });

  it('CCR-03-02: abre con teclado, recorre destinos y cierra con Escape', async () => {
    const usuario = userEvent.setup();
    render(<Vista {...propiedades} />);
    const disparador = screen.getByRole('button', { name: 'Abrir menú' });
    disparador.focus();
    await usuario.keyboard('{Enter}');
    const menu = await screen.findByRole('dialog');
    expect(within(menu).getAllByRole('link')).toHaveLength(2);
    const destino = within(menu).getByRole('link', { name: 'Repartidores' });
    within(menu).getByRole('link', { name: 'Zonas y Tarifas' }).focus();
    await usuario.tab();
    expect(destino).toHaveFocus();
    await usuario.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(disparador).toHaveFocus());
  });

  it('cierra el Drawer tras navegar y emite el cierre de sesión desde el menú', async () => {
    const usuario = userEvent.setup();
    render(<Vista {...propiedades} />);
    await usuario.click(screen.getByRole('button', { name: 'Abrir menú' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('link', { name: 'Repartidores' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Menú de usuario: Rhamses' }));
    await usuario.click(await screen.findByRole('menuitem', { name: 'Cerrar sesión' }));
    expect(propiedades.alCerrarSesion).toHaveBeenCalledOnce();
  });
});
