import { useState } from 'react';
import type { PropsWithChildren } from 'react';
import { MantineProvider, Skeleton } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EstadoVista, tema } from '../index';

function ProveedorPruebas({ children }: PropsWithChildren) {
  return <MantineProvider theme={tema} env="test">{children}</MantineProvider>;
}

function ContenidoProtegido() {
  return <>
    <input aria-label="Filtrar incidencias" defaultValue="dato reservado" />
    <table><tbody><tr><td>Despacho reservado</td></tr></tbody></table>
  </>;
}

describe('CR-08 EstadoVista / CCR-08-01', () => {
  it.each([
    ['vacio', 'Todavía no hay registros', 'Crear registro'],
    ['sinResultados', 'No encontramos resultados con estos filtros', 'Limpiar filtros'],
    ['error', 'No pudimos cargar la información', 'Reintentar'],
    ['sinPermiso', 'No tienes permisos para ver esta información', 'Volver'],
    ['noEncontrado', 'No encontramos este registro', 'Volver al listado'],
  ] as const)('distingue %s y permite su recuperación con teclado', async (estado, titulo, etiqueta) => {
    const usuario = userEvent.setup();
    const alAccionar = vi.fn();
    render(<EstadoVista estado={estado} accion={{ id: estado, etiqueta }} alAccionar={alAccionar} />, { wrapper: ProveedorPruebas });

    expect(screen.getByRole('heading', { name: titulo, level: 4 })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: titulo })).toHaveAccessibleDescription();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    const boton = screen.getByRole('button', { name: etiqueta });
    await usuario.tab();
    expect(boton).toHaveFocus();
    await usuario.keyboard('{Enter}');
    expect(alAccionar).toHaveBeenCalledExactlyOnceWith(estado);
    await usuario.keyboard(' ');
    expect(alAccionar).toHaveBeenCalledTimes(2);
  });

  it('diferencia carga y datos; monta únicamente el esqueleto recibido durante la carga', () => {
    const contenido = <ContenidoProtegido />;
    const { rerender } = render(
      <EstadoVista estado="datos">{contenido}</EstadoVista>, { wrapper: ProveedorPruebas },
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
    rerender(<EstadoVista estado="carga" esqueleto={<Skeleton height={48} data-testid="esqueleto-tabla" />}>{contenido}</EstadoVista>);
    expect(screen.getByRole('region', { name: 'Cargando información' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('esqueleto-tabla')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    rerender(<EstadoVista estado="datos">{contenido}</EstadoVista>);
    expect(screen.queryByTestId('esqueleto-tabla')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Cargando información' })).not.toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it.each(['vacio', 'sinResultados', 'error', 'sinPermiso', 'noEncontrado'] as const)(
    'retira filas y filtros anteriores al pasar de datos a %s, incluso en modo compacto', (estado) => {
      const contenido = <ContenidoProtegido />;
      const { rerender, container } = render(<EstadoVista estado="datos">{contenido}</EstadoVista>, { wrapper: ProveedorPruebas });
      expect(screen.getByRole('textbox')).toHaveValue('dato reservado');
      rerender(<EstadoVista estado={estado} compacto>{contenido}</EstadoVista>);
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(container).not.toHaveTextContent('Despacho reservado');
      expect(container.innerHTML).not.toContain('dato reservado');
    },
  );

  it('usa el estado explícito del consumidor sin inferir vacío desde children', () => {
    render(<EstadoVista estado="datos">{null}</EstadoVista>, { wrapper: ProveedorPruebas });
    expect(screen.queryByText('Todavía no hay registros')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Información cargada.');
  });

  it('admite mensajes del consumidor y no fabrica acciones', () => {
    render(<EstadoVista estado="sinPermiso" titulo="No tienes permisos para consultar incidencias" descripcion="Solicita acceso al gestor." />, { wrapper: ProveedorPruebas });
    expect(screen.getByRole('region')).toHaveAccessibleName('No tienes permisos para consultar incidencias');
    expect(screen.getByRole('region')).toHaveAccessibleDescription('Solicita acceso al gestor.');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it.each([{ disabled: true }, { loading: true }])('bloquea la recuperación con %j y conserva etiqueta y motivo', async (bloqueo) => {
    const usuario = userEvent.setup();
    const alAccionar = vi.fn();
    render(<EstadoVista estado="error" accion={{ id: 'reintentar', etiqueta: 'Reintentar', motivoDeshabilitado: 'Espera a que termine la consulta.', ...bloqueo }} alAccionar={alAccionar} />, { wrapper: ProveedorPruebas });
    const boton = screen.getByRole('button', { name: 'Reintentar' });
    expect(boton).toBeDisabled();
    expect(boton).toHaveAccessibleDescription('Espera a que termine la consulta.');
    expect(boton).toHaveTextContent('Reintentar');
    await usuario.click(boton);
    await usuario.tab();
    await usuario.keyboard('{Enter} ');
    expect(alAccionar).not.toHaveBeenCalled();
  });

  it('no envía el formulario contenedor al accionar la recuperación', async () => {
    const usuario = userEvent.setup();
    const alEnviar = vi.fn((evento) => evento.preventDefault());
    const alAccionar = vi.fn();
    render(<form onSubmit={alEnviar}><EstadoVista estado="sinResultados" accion={{ id: 'limpiar', etiqueta: 'Limpiar filtros' }} alAccionar={alAccionar} /></form>, { wrapper: ProveedorPruebas });
    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(alAccionar).toHaveBeenCalledExactlyOnceWith('limpiar');
    expect(alEnviar).not.toHaveBeenCalled();
  });

  it('permite al consumidor bloquear sincrónicamente una recuperación en curso', async () => {
    const usuario = userEvent.setup();
    const recuperar = vi.fn();
    function Contenedor() {
      const [procesando, cambiarProcesando] = useState(false);
      return <EstadoVista estado="error" accion={{ id: 'reintentar', etiqueta: 'Reintentar', loading: procesando }} alAccionar={(id) => { cambiarProcesando(true); recuperar(id); }} />;
    }
    render(<Contenedor />, { wrapper: ProveedorPruebas });
    await usuario.dblClick(screen.getByRole('button', { name: 'Reintentar' }));
    expect(recuperar).toHaveBeenCalledExactlyOnceWith('reintentar');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toHaveAttribute('aria-busy', 'true');
  });

  it('mantiene un único anuncio estable en renders del mismo resultado', async () => {
    const { rerender } = render(<EstadoVista estado="error" />, { wrapper: ProveedorPruebas });
    const region = screen.getByRole('status');
    const cambios = vi.fn();
    const observador = new MutationObserver(cambios);
    observador.observe(region, { childList: true, characterData: true, subtree: true });
    rerender(<EstadoVista estado="error" compacto />);
    await Promise.resolve();
    expect(cambios).not.toHaveBeenCalled();
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toBe(region);
    observador.disconnect();
    rerender(<EstadoVista estado="sinResultados" />);
    expect(region).toHaveTextContent('No encontramos resultados con estos filtros');
  });
});
