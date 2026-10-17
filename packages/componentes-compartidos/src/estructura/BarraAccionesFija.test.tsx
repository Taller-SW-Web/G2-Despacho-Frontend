import { useState, type PropsWithChildren } from 'react';
import { MantineProvider } from '@mantine/core';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BarraAccionesFija, tema, type PropiedadesBarraAccionesFija } from '../index';

function Proveedor({ children }: PropsWithChildren) {
  return <MantineProvider theme={tema} env="test">{children}</MantineProvider>;
}

function preparar(cambios: Partial<PropiedadesBarraAccionesFija> = {}) {
  const propiedades: PropiedadesBarraAccionesFija = {
    principal: { id: 'guardar', etiqueta: 'Guardar zona' },
    secundaria: { id: 'cancelar', etiqueta: 'Cancelar' },
    alAccionar: vi.fn(),
    ...cambios,
  };
  return { ...render(<BarraAccionesFija {...propiedades} />, { wrapper: Proveedor }), propiedades };
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('CR-13 BarraAccionesFija', () => {
  it('identifica la región y solicita acciones con teclado en orden secundaria/principal', async () => {
    const { propiedades } = preparar();
    const region = screen.getByRole('region', { name: 'Acciones de la página' });
    expect(within(region).getAllByRole('button').map((boton) => boton.textContent)).toEqual(['Cancelar', 'Guardar zona']);
    const usuario = userEvent.setup();
    await usuario.tab();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await usuario.keyboard('{Enter}');
    await usuario.tab();
    await usuario.keyboard(' ');
    expect(propiedades.alAccionar).toHaveBeenNthCalledWith(1, 'cancelar');
    expect(propiedades.alAccionar).toHaveBeenNthCalledWith(2, 'guardar');
  });

  it('no envía el formulario nativo y permite omitir la secundaria', async () => {
    const enviar = vi.fn();
    const accionar = vi.fn();
    render(<form onSubmit={(evento) => { evento.preventDefault(); enviar(); }}><BarraAccionesFija principal={{ id: 'entrega', etiqueta: 'Confirmar entrega' }} alAccionar={accionar} /></form>, { wrapper: Proveedor });
    const usuario = userEvent.setup();
    await usuario.click(screen.getByRole('button', { name: 'Confirmar entrega' }));
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(accionar).toHaveBeenCalledExactlyOnceWith('entrega');
    expect(enviar).not.toHaveBeenCalled();
  });

  it('asocia motivos visibles independientes y no activa acciones bloqueadas', async () => {
    const { propiedades } = preparar({
      principal: { id: 'guardar', etiqueta: 'Guardar zona', disabled: true, motivoDeshabilitado: 'Selecciona al menos un distrito antes de guardar.' },
      secundaria: { id: 'cancelar', etiqueta: 'Cancelar', disabled: true, motivoDeshabilitado: 'Espera a que termine la consulta.' },
    });
    const usuario = userEvent.setup();
    const guardar = screen.getByRole('button', { name: 'Guardar zona' });
    const cancelar = screen.getByRole('button', { name: 'Cancelar' });
    expect(guardar).toHaveAccessibleDescription('Selecciona al menos un distrito antes de guardar.');
    expect(cancelar).toHaveAccessibleDescription('Espera a que termine la consulta.');
    expect(screen.getByText('Selecciona al menos un distrito antes de guardar.')).toBeVisible();
    await usuario.click(guardar);
    await usuario.click(cancelar);
    expect(propiedades.alAccionar).not.toHaveBeenCalled();
  });

  it('conserva etiqueta y contexto en carga y recupera las acciones al finalizar', async () => {
    const { propiedades, rerender } = preparar({ principal: { id: 'guardar', etiqueta: 'Guardar zona', loading: true } });
    const guardar = screen.getByRole('button', { name: 'Guardar zona' });
    expect(guardar).toBeDisabled();
    expect(guardar).toHaveAttribute('aria-busy', 'true');
    const usuario = userEvent.setup();
    await usuario.click(guardar);
    expect(propiedades.alAccionar).not.toHaveBeenCalled();
    rerender(<BarraAccionesFija {...propiedades} principal={{ ...propiedades.principal, loading: false }} />);
    await usuario.click(guardar);
    expect(propiedades.alAccionar).toHaveBeenCalledExactlyOnceWith('guardar');
  });

  it('permite que el contenedor bloquee el doble clic sin cambiar el evento de la barra', async () => {
    const enviar = vi.fn();
    function Contenedor() {
      const [cargando, cargar] = useState(false);
      return <BarraAccionesFija principal={{ id: 'guardar', etiqueta: 'Guardar zona', loading: cargando }} alAccionar={() => { cargar(true); enviar(); }} />;
    }
    render(<Contenedor />, { wrapper: Proveedor });
    await userEvent.setup().dblClick(screen.getByRole('button', { name: 'Guardar zona' }));
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it('aplica intención destructiva solo a la principal', () => {
    preparar({ intencionPrincipal: 'destructiva' });
    expect(screen.getByRole('button', { name: 'Guardar zona' }).style.getPropertyValue('--button-bg')).toBe('var(--mantine-color-red-8)');
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveAttribute('data-variant', 'outline');
  });

  it('CCR-13-01: actualiza la reserva al crecer mensajes y al cambiar el ancho; desconecta el observador', () => {
    let avisarCambio: () => void = () => {};
    const desconectar = vi.fn();
    const observar = vi.fn();
    vi.stubGlobal('ResizeObserver', class {
      constructor(avisar: () => void) { avisarCambio = avisar; }
      observe = observar;
      disconnect = desconectar;
    });
    let altura = 96;
    let ancho = 358;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return { x: 16, y: 0, left: 16, right: 16 + ancho, top: 0, bottom: altura, width: ancho, height: this.tagName === 'SECTION' ? altura : 0, toJSON() {} };
    });
    const { unmount } = preparar();
    const barra = screen.getByRole('region', { name: 'Acciones de la página' });
    const reserva = barra.parentElement!;
    expect(reserva.style.getPropertyValue('--barra-altura')).toBe('96px');
    expect(reserva.style.getPropertyValue('--barra-ancho')).toBe('358px');
    altura = 224;
    act(() => avisarCambio());
    expect(reserva.style.getPropertyValue('--barra-altura')).toBe('224px');
    ancho = 720;
    fireEvent(window, new Event('resize'));
    expect(reserva.style.getPropertyValue('--barra-ancho')).toBe('720px');
    expect(observar).toHaveBeenCalledWith(barra);
    expect(observar).toHaveBeenCalledWith(reserva);
    unmount();
    expect(desconectar).toHaveBeenCalledTimes(1);
  });

  it('mantiene identificadores de ayuda únicos entre dos barras', () => {
    const principal = { id: 'guardar', etiqueta: 'Guardar', disabled: true, motivoDeshabilitado: 'Faltan datos.' };
    render(<><BarraAccionesFija principal={principal} alAccionar={vi.fn()} /><BarraAccionesFija principal={principal} alAccionar={vi.fn()} /></>, { wrapper: Proveedor });
    const ids = screen.getAllByRole('button', { name: 'Guardar' }).map((boton) => boton.getAttribute('aria-describedby'));
    expect(new Set(ids).size).toBe(2);
  });
});
