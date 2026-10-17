import type { PropsWithChildren } from 'react';
import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BadgeEstado, tema } from '../index';
import { estadosPorContexto, obtenerEstado, type ContextoEstado } from './estados';

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

describe('CR-09: catálogo completo de contextos', () => {
  for (const [contexto, estados] of Object.entries(estadosPorContexto)) {
    it.each(Object.entries(estados))(`CCR-09-01: ${contexto}/%s conserva texto, icono y variante`, (valor, configuracion) => {
      const { container } = render(<BadgeEstado contexto={contexto as ContextoEstado} valor={valor} />, { wrapper: ProveedorPruebas });
      expect(obtenerEstado(contexto as ContextoEstado, valor)).toEqual(configuracion);
      if ('presentacion' in configuracion && configuracion.presentacion === 'icono') {
        expect(screen.getByRole('img', { name: configuracion.etiqueta })).toBeInTheDocument();
      } else expect(screen.getByText(configuracion.etiqueta)).toBeInTheDocument();
      if (!('presentacion' in configuracion)) expect(container.querySelector('[data-semantica]')).toHaveAttribute('data-semantica', configuracion.semantica);
      expect(container.querySelector('svg:not([aria-hidden="true"])')).toBeNull();
    });
    it(`CCR-09-02: ${contexto} oculta valores ajenos y claves del prototipo`, () => {
      expect(obtenerEstado(contexto as ContextoEstado, '__proto__').etiqueta).toBe('Estado no disponible');
      expect(obtenerEstado(contexto as ContextoEstado, null).etiqueta).toBe('Estado no disponible');
    });
  }
});
