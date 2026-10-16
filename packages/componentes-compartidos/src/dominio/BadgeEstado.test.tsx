import type { PropsWithChildren } from 'react';
import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BadgeEstado, tema } from '../index';

function ProveedorPruebas({ children }: PropsWithChildren) {
  return <MantineProvider theme={tema} env="test">{children}</MantineProvider>;
}

describe('CR-09: contexto despacho requerido por CR-19', () => {
  it.each([
    ['PENDIENTE_ASIGNACION', 'Pendiente de asignación'],
    ['ASIGNADO', 'Asignado'],
    ['EN_CAMINO', 'En camino'],
    ['ENTREGADO', 'Entregado'],
    ['FALLIDO', 'Fallido'],
    ['DEVUELTO_A_ORIGEN', 'Devuelto a origen'],
    ['CANCELADO', 'Cancelado'],
  ])('traduce %s sin mostrar el enum ni convertirlo en una acción', (valor, etiqueta) => {
    render(<BadgeEstado contexto="despacho" valor={valor} />, { wrapper: ProveedorPruebas });
    expect(screen.getByText(etiqueta)).toBeInTheDocument();
    expect(screen.queryByText(valor)).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it.each(['RECIBIDO', '__proto__', 'constructor', null, { estado: 'FALLIDO' }])('presenta un valor desconocido de forma neutral: %j', (valor) => {
    render(<BadgeEstado contexto="despacho" valor={valor} />, { wrapper: ProveedorPruebas });
    expect(screen.getByText('Estado no disponible')).toBeInTheDocument();
    if (typeof valor === 'string') expect(screen.queryByText(valor)).not.toBeInTheDocument();
  });

  it('mantiene la etiqueta al añadir un complemento en tamaño compacto', () => {
    render(<BadgeEstado contexto="despacho" valor="FALLIDO" size="sm" complemento="Recepción confirmada" />, { wrapper: ProveedorPruebas });
    expect(screen.getByText('Fallido')).toBeInTheDocument();
    expect(screen.getByText('Recepción confirmada')).toBeInTheDocument();
    expect(screen.queryByText('Recibido')).not.toBeInTheDocument();
  });
});
