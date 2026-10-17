import { useState } from 'react';
import type { PropsWithChildren } from 'react';
import { MantineProvider, TextInput } from '@mantine/core';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BarraFiltros, tema } from '../index';

function Proveedor({ children }: PropsWithChildren) {
  return <MantineProvider theme={tema} env="test">{children}</MantineProvider>;
}

describe('CR-06 BarraFiltros', () => {
  afterEach(() => vi.useRealTimers());

  function preparar() {
    const consultar = vi.fn();
    const cambiar = vi.fn();
    const quitar = vi.fn();
    const limpiar = vi.fn();
    function Ejemplo() {
      const [busqueda, setBusqueda] = useState('');
      return <BarraFiltros busqueda={busqueda} etiquetaBusqueda="Buscar despacho" alConsultarBusqueda={consultar}
        alCambiarBusqueda={(valor) => { cambiar(valor); setBusqueda(valor); }}
        activos={[{ id: 'zona', etiqueta: 'Lima Centro' }]} alQuitarFiltro={quitar}
        alLimpiar={() => { limpiar(); setBusqueda(''); }} />;
    }
    const resultado = render(<Ejemplo />, { wrapper: Proveedor });
    return { ...resultado, consultar, cambiar, quitar, limpiar, campo: screen.getByRole('textbox', { name: 'Buscar despacho' }) };
  }

  it('CCR-06-01: edita inmediatamente y consulta una sola vez con el último texto tras 300 ms', () => {
    vi.useFakeTimers();
    const { campo, consultar, cambiar } = preparar();
    fireEvent.change(campo, { target: { value: 'D' } });
    act(() => vi.advanceTimersByTime(200));
    fireEvent.change(campo, { target: { value: 'DSP-123' } });
    expect(cambiar).toHaveBeenLastCalledWith('DSP-123');
    expect(campo).toHaveValue('DSP-123');
    act(() => vi.advanceTimersByTime(299));
    expect(consultar).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(consultar).toHaveBeenCalledExactlyOnceWith('DSP-123');
  });

  it.each(['Limpiar búsqueda', 'Limpiar filtros', 'Quitar Lima Centro'])('CCR-06-02: %s cancela la consulta pendiente', (etiqueta) => {
    vi.useFakeTimers();
    const { campo, consultar, limpiar, quitar } = preparar();
    fireEvent.change(campo, { target: { value: 'anterior' } });
    fireEvent.click(screen.getByRole('button', { name: etiqueta }));
    act(() => vi.advanceTimersByTime(500));
    if (etiqueta === 'Limpiar búsqueda') {
      expect(consultar).toHaveBeenCalledExactlyOnceWith('');
      expect(campo).toHaveValue('');
    } else {
      expect(consultar).not.toHaveBeenCalled();
      if (etiqueta === 'Limpiar filtros') expect(limpiar).toHaveBeenCalledOnce();
      else expect(quitar).toHaveBeenCalledExactlyOnceWith('zona');
    }
  });

  it('cancela al desmontar sin consultar el texto anterior', () => {
    vi.useFakeTimers();
    const { campo, consultar, unmount } = preparar();
    fireEvent.change(campo, { target: { value: 'pendiente' } });
    unmount();
    act(() => vi.advanceTimersByTime(500));
    expect(consultar).not.toHaveBeenCalled();
  });

  it('restaurar filtros externos no dispara una búsqueda ni conserva una edición pendiente', () => {
    vi.useFakeTimers();
    const consultar = vi.fn();
    const propiedades = { etiquetaBusqueda: 'Buscar despacho', alCambiarBusqueda: vi.fn(), alConsultarBusqueda: consultar, alQuitarFiltro: vi.fn(), alLimpiar: vi.fn() };
    const { rerender } = render(<BarraFiltros {...propiedades} busqueda="desde URL" />, { wrapper: Proveedor });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'edición' } });
    rerender(<BarraFiltros {...propiedades} busqueda="restaurada" />);
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByRole('textbox')).toHaveValue('restaurada');
    expect(consultar).not.toHaveBeenCalled();
  });

  it('admite el uso existente sin búsqueda y conserva los controles al consultar', () => {
    render(<BarraFiltros controles={<TextInput label="Zona" />} consultando alQuitarFiltro={vi.fn()} alLimpiar={vi.fn()} />, { wrapper: Proveedor });
    expect(screen.getByRole('textbox', { name: 'Zona' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Consultando…');
  });
});
