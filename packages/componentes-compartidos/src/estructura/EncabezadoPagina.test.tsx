import type { PropsWithChildren } from 'react';
import { Button, MantineProvider, Tabs } from '@mantine/core';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EncabezadoPagina, tema } from '../index';

function Proveedor({ children }: PropsWithChildren) {
  return <MantineProvider theme={tema} env="test">{children}</MantineProvider>;
}

describe('CR-05 EncabezadoPagina', () => {
  it('CCR-05-01: permite navegar solo las migas anteriores y mantiene un H1 antes de las acciones', async () => {
    const usuario = userEvent.setup();
    const navegar = vi.fn();
    const migas = [
      { id: 'programacion', etiqueta: 'Programación', ruta: '/programacion' },
      { id: 'detalle', etiqueta: 'Despacho DSP-000123', ruta: '/programacion/dsp-123' },
    ];
    render(<EncabezadoPagina titulo="Detalle del despacho" subtitulo="Revisa su asignación" migas={migas}
      alNavegarMiga={navegar} acciones={<Button>Reasignar</Button>} />, { wrapper: Proveedor });

    const ruta = screen.getByRole('navigation', { name: 'Ruta de navegación' });
    expect(within(ruta).getAllByRole('link')).toHaveLength(1);
    expect(within(ruta).getByText('Despacho DSP-000123')).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading').compareDocumentPosition(screen.getByRole('button', { name: 'Reasignar' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await usuario.tab();
    await usuario.keyboard('{Enter}');
    expect(navegar).toHaveBeenCalledExactlyOnceWith(migas[0]);
  });

  it('conserva href nativo sin callback y presenta las pestañas bajo el título', () => {
    render(<EncabezadoPagina titulo="Programación y asignación"
      migas={[{ id: 'inicio', etiqueta: 'Inicio', ruta: '/' }, { id: 'actual', etiqueta: 'Programación', ruta: '/programacion' }]}
      pestanias={<Tabs defaultValue="cola"><Tabs.List><Tabs.Tab value="cola">Cola de pendientes</Tabs.Tab></Tabs.List></Tabs>} />, { wrapper: Proveedor });
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('heading').compareDocumentPosition(screen.getByRole('tablist')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
