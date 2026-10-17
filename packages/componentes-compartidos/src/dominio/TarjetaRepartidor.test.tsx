import { useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Button, MantineProvider, Radio, Stack } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TarjetaRepartidor, tema } from '../index';
import type { PropiedadesTarjetaRepartidor } from '../index';

function Proveedor({ children }: PropsWithChildren) {
  return <MantineProvider theme={tema} env="test">{children}</MantineProvider>;
}
const metricas: NonNullable<PropiedadesTarjetaRepartidor['metricas']> = [
  { metrica: 'peso', usado: 320, limite: 500, proyeccion: 332 },
  { metrica: 'volumen', usado: 2, limite: 4, proyeccion: 2.2 },
  { metrica: 'paquetes', usado: 10, limite: 30, proyeccion: 11 },
];
const base = { placa: 'ABC-123', zona: 'Lima Centro', estadoOperativo: 'DISPONIBLE', metricas };

describe('CR-20 TarjetaRepartidor', () => {
  it('CCR-20-01: selección única controlada con flechas, saltando candidatos bloqueados y sin confirmar', async () => {
    const usuario = userEvent.setup();
    const seleccionar = vi.fn();
    const confirmar = vi.fn();
    function Ejemplo() {
      const [id, setId] = useState('uno');
      const cambiar = (valor: string) => { seleccionar(valor); setId(valor); };
      return <Radio.Group label="Repartidor" value={id}>
        <Stack>
          <TarjetaRepartidor {...base} idRepartidor="uno" nombre="Juan Pérez" seleccionada={id === 'uno'} alSeleccionar={cambiar} />
          <TarjetaRepartidor {...base} idRepartidor="bloqueado" nombre="Ana Torres" disabled motivoDeshabilitado="Excede 12 kg" alSeleccionar={cambiar} />
          <TarjetaRepartidor {...base} idRepartidor="dos" nombre="Luis Díaz" seleccionada={id === 'dos'} alSeleccionar={cambiar} />
        </Stack>
        <Button onClick={confirmar}>Confirmar asignación</Button>
      </Radio.Group>;
    }
    render(<Ejemplo />, { wrapper: Proveedor });
    expect(screen.getByRole('radiogroup', { name: 'Repartidor' })).toBeInTheDocument();
    const uno = screen.getByRole('radio', { name: 'Juan Pérez' });
    const bloqueado = screen.getByRole('radio', { name: 'Ana Torres' });
    const dos = screen.getByRole('radio', { name: 'Luis Díaz' });
    expect(bloqueado).toBeDisabled();
    expect(bloqueado).toHaveAccessibleDescription('ABC-123 · Lima Centro Excede 12 kg');
    await usuario.click(bloqueado);
    expect(seleccionar).not.toHaveBeenCalled();
    uno.focus();
    await usuario.keyboard('{ArrowDown}');
    expect(dos).toHaveFocus();
    expect(dos).toHaveAttribute('aria-checked', 'true');
    expect(uno).toHaveAttribute('aria-checked', 'false');
    expect(seleccionar).toHaveBeenCalledExactlyOnceWith('dos');
    expect(confirmar).not.toHaveBeenCalled();
    await usuario.keyboard('{ArrowRight}');
    expect(uno).toHaveFocus();
    expect(uno).toHaveAttribute('aria-checked', 'true');
  });

  it('emite el identificador sin adoptar una selección que no devuelve el consumidor', async () => {
    const seleccionar = vi.fn();
    const usuario = userEvent.setup();
    render(<Radio.Group label="Repartidor" value=""><TarjetaRepartidor {...base} idRepartidor="r-1" nombre="Juan Pérez" alSeleccionar={seleccionar} /></Radio.Group>, { wrapper: Proveedor });
    await usuario.click(screen.getByRole('radio'));
    expect(seleccionar).toHaveBeenCalledExactlyOnceWith('r-1');
    expect(screen.getByRole('radio')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getAllByRole('progressbar')).toHaveLength(3);
  });

  it('CCR-20-02: refleja la invalidación decidida por el contenedor al actualizar disponibilidad', () => {
    const seleccionar = vi.fn();
    const { rerender } = render(<Radio.Group label="Repartidor" value="r-1"><TarjetaRepartidor {...base} idRepartidor="r-1" nombre="Juan Pérez" seleccionada alSeleccionar={seleccionar} /></Radio.Group>, { wrapper: Proveedor });
    rerender(<Radio.Group label="Repartidor" value=""><TarjetaRepartidor {...base} idRepartidor="r-1" nombre="Juan Pérez" disabled motivoDeshabilitado="El repartidor ya no está habilitado" alSeleccionar={seleccionar} /></Radio.Group>);
    expect(screen.getByRole('radio')).toBeDisabled();
    expect(screen.getByRole('radio')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('El repartidor ya no está habilitado')).toBeInTheDocument();
    expect(seleccionar).not.toHaveBeenCalled();
  });

  it('no reconstruye disponibilidad a partir de porcentajes ni expone enums desconocidos', async () => {
    const usuario = userEvent.setup();
    const seleccionar = vi.fn();
    render(<Radio.Group label="Repartidor" value=""><TarjetaRepartidor {...base} idRepartidor="r-1" nombre="Juan Pérez"
      estadoOperativo="ESTADO_NUEVO" metricas={[{ ...metricas[0], proyeccion: 540 }, metricas[1], metricas[2]]} alSeleccionar={seleccionar} /></Radio.Group>, { wrapper: Proveedor });
    expect(screen.getByText('Estado no disponible')).toBeInTheDocument();
    expect(screen.queryByText('ESTADO_NUEVO')).not.toBeInTheDocument();
    expect(screen.getByText('Excede en 40 kg')).toBeInTheDocument();
    expect(screen.getByRole('radio')).toBeEnabled();
    await usuario.click(screen.getByRole('radio'));
    expect(seleccionar).toHaveBeenCalledExactlyOnceWith('r-1');
  });
});
