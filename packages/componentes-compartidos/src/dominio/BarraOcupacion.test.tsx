import type { PropsWithChildren } from 'react';
import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BarraOcupacion, tema } from '../index';

function Proveedor({ children }: PropsWithChildren) {
  return <MantineProvider theme={tema} env="test">{children}</MantineProvider>;
}

describe('CR-11: dependencia de TarjetaRepartidor', () => {
  it.each([[69.9, 'Normal'], [70, 'Alta'], [99.9, 'Alta'], [100, 'Llena']] as const)(
    'CCR-11-01: clasifica %s %% como %s antes de redondear', (usado, nivel) => {
      render(<BarraOcupacion metrica="peso" usado={usado} limite={100} />, { wrapper: Proveedor });
      expect(screen.getByRole('progressbar', { name: 'Peso' })).toHaveAttribute('aria-valuetext', expect.stringContaining(`nivel ${nivel}`));
      expect(screen.getByText(nivel)).toBeInTheDocument();
    });

  it('no redondea 99,99 % a una falsa ocupación llena', () => {
    render(<BarraOcupacion metrica="peso" usado={99.99} limite={100} />, { wrapper: Proveedor });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', expect.stringContaining('99.99 %'));
    expect(screen.getByText('Alta')).toBeInTheDocument();
  });

  it('CCR-11-02: distingue total proyectado, porcentaje real y exceso sin rebasar 100 en ARIA', () => {
    render(<BarraOcupacion metrica="peso" usado={320} limite={500} proyeccion={540} />, { wrapper: Proveedor });
    const barra = screen.getByRole('progressbar');
    expect(barra).toHaveAttribute('aria-valuenow', '64');
    expect(barra).toHaveAttribute('aria-valuetext', expect.stringContaining('108 %'));
    expect(screen.getByText('Excede en 40 kg')).toBeInTheDocument();
    expect(screen.getByText(/320 \/ 500 kg \(64 %\)/)).toBeInTheDocument();
  });

  it('recorta solo el dibujo y el rango ARIA, conservando el exceso actual incluso en compacta', () => {
    render(<BarraOcupacion metrica="paquetes" usado={12} limite={10} variante="compacta" />, { wrapper: Proveedor });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', expect.stringContaining('120 %'));
    expect(screen.getByText('Excede en 2 paquetes')).toBeInTheDocument();
  });

  it.each([[0, 0], [2, -1], [-1, 10], [NaN, 10], [Infinity, 10], [1, Infinity]])(
    'CCR-11-03: no ofrece porcentaje con usado=%s y límite=%s', (usado, limite) => {
      render(<BarraOcupacion metrica="volumen" usado={usado} limite={limite} />, { wrapper: Proveedor });
      expect(screen.getByText('Volumen: Capacidad no disponible')).toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

  it('no presenta como segura una proyección inválida', () => {
    render(<BarraOcupacion metrica="peso" usado={20} limite={100} proyeccion={NaN} />, { wrapper: Proveedor });
    expect(screen.getByText('Proyección no disponible')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', expect.stringContaining('Proyección no disponible'));
  });
});
