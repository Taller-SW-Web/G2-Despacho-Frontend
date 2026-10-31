import { useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Button, MantineProvider } from '@mantine/core';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TablaDatos, tema } from '../index';
import type { ColumnaDatos, EstadoConsulta, OrdenUi } from '../index';

function Proveedor({ children }: PropsWithChildren) {
  return <MantineProvider theme={tema} env="test">{children}</MantineProvider>;
}
const filas = [{ id: 'dsp-2', codigo: 'DSP-000002', peso: 12 }, { id: 'dsp-1', codigo: 'DSP-000001', peso: 3 }];
const columnas: ColumnaDatos<typeof filas[number]>[] = [
  { id: 'codigo', encabezado: 'Código de rastreo', celda: (fila) => fila.codigo, ordenable: true },
  { id: 'peso', encabezado: 'Peso', celda: (fila) => `${fila.peso} kg`, alineacion: 'right', prioridadResponsive: 'secundaria' },
];
const base = { filas, columnas, obtenerId: (fila: typeof filas[number]) => fila.id, tituloAccesible: 'Cola de pendientes', estado: 'datos' as const };

describe('CR-07 TablaDatos', () => {
  it('solicita orden con teclado, refleja aria-sort y no ordena los datos recibidos', async () => {
    const usuario = userEvent.setup();
    const cambiar = vi.fn();
    function Ejemplo() {
      const [orden, setOrden] = useState<OrdenUi>(null);
      return <TablaDatos {...base} orden={orden} alCambiarOrden={(valor) => { cambiar(valor); setOrden(valor); }} />;
    }
    render(<Ejemplo />, { wrapper: Proveedor });
    const boton = screen.getByRole('button', { name: 'Ordenar por Código de rastreo' });
    boton.focus();
    await usuario.keyboard('{Enter}');
    expect(cambiar).toHaveBeenLastCalledWith({ columna: 'codigo', direccion: 'asc' });
    expect(screen.getByRole('columnheader', { name: /Código de rastreo/ })).toHaveAttribute('aria-sort', 'ascending');
    await usuario.keyboard(' ');
    expect(cambiar).toHaveBeenLastCalledWith({ columna: 'codigo', direccion: 'desc' });
    await usuario.keyboard('{Enter}');
    expect(cambiar).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole('columnheader', { name: /Código de rastreo/ })).toHaveAttribute('aria-sort', 'none');
    const registros = screen.getAllByRole('row').slice(1);
    expect(registros[0]).toHaveTextContent('DSP-000002');
    expect(registros[1]).toHaveTextContent('DSP-000001');
  });

  it('CCR-07-01: muestra el intervalo real de la página remota sin paginar las filas por segunda vez', async () => {
    const cambiarPagina = vi.fn();
    const usuario = userEvent.setup();
    render(<TablaDatos {...base} paginacion={{ pagina: 2, tamanioPagina: 20, total: 42 }} alCambiarPagina={cambiarPagina} />, { wrapper: Proveedor });
    expect(screen.getByText('Mostrando 21–22 de 42')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3);
    const paginacion = screen.getByRole('navigation', { name: 'Paginación' });
    await usuario.click(within(paginacion).getByRole('button', { name: 'Siguiente' }));
    expect(cambiarPagina).toHaveBeenCalledExactlyOnceWith(3);
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument();
  });

  it('CCR-07-01: para cero registros no inventa un intervalo ni ofrece páginas inexistentes', () => {
    render(<TablaDatos {...base} filas={[]} paginacion={{ pagina: 1, tamanioPagina: 20, total: 0 }} alCambiarPagina={vi.fn()} />, { wrapper: Proveedor });
    expect(screen.getByText('Mostrando 0 de 0')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Paginación' })).not.toBeInTheDocument();
    expect(screen.queryByText(/1–0/)).not.toBeInTheDocument();
  });

  it('la paginación numerada solicita la página remota y bloquea cambios durante la actualización', async () => {
    const cambiar = vi.fn();
    const propiedades = { ...base, paginacionNumerada: true, paginacion: { pagina: 2, tamanioPagina: 20, total: 42 }, alCambiarPagina: cambiar };
    const { rerender } = render(<TablaDatos {...propiedades} />, { wrapper: Proveedor });
    await userEvent.click(screen.getByRole('button', { name: 'Ir a la página 3' }));
    expect(cambiar).toHaveBeenCalledExactlyOnceWith(3);
    expect(screen.getByText('Mostrando 21–22 de 42')).toBeVisible();
    expect(screen.getAllByRole('row')).toHaveLength(3);
    rerender(<TablaDatos {...propiedades} actualizando />);
    expect(screen.getByRole('button', { name: 'Ir a la página 3' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
  });

  it('distingue la carga inicial con cinco filas skeleton de la actualización con datos', () => {
    const { rerender } = render(<TablaDatos {...base} estado="carga" />, { wrapper: Proveedor });
    expect(screen.queryByText('DSP-000001')).not.toBeInTheDocument();
    const tabla = screen.getByRole('table', { name: 'Cola de pendientes' });
    expect(tabla.querySelectorAll('tbody tr')).toHaveLength(5);
    expect(screen.getByText('Cargando información…')).toBeInTheDocument();
    rerender(<TablaDatos {...base} actualizando />);
    expect(screen.getByText('DSP-000001')).toBeInTheDocument();
    expect(screen.getByText('Actualizando información…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ordenar por/ })).toBeDisabled();
  });

  it('CCR-07-02: conserva datos autorizados en error de refresco y los retira ante sinPermiso', () => {
    const { rerender } = render(<TablaDatos {...base} />, { wrapper: Proveedor });
    rerender(<TablaDatos {...base} estado="error" />);
    expect(screen.getByText('DSP-000001')).toBeInTheDocument();
    expect(screen.getByText('Se muestran los últimos datos disponibles. Inténtalo nuevamente.')).toBeInTheDocument();
    rerender(<TablaDatos {...base} estado="sinPermiso" />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText('DSP-000001')).not.toBeInTheDocument();
    expect(screen.getByText('No tienes permisos para ver esta información')).toBeInTheDocument();
  });

  it.each([
    ['vacio', 'Todavía no hay registros'],
    ['sinResultados', 'No encontramos resultados con estos filtros'],
    ['error', 'No pudimos cargar la información'],
    ['noEncontrado', 'No encontramos este registro'],
  ] as const)('presenta %s sin confundirlo con una tabla vacía', (estado: EstadoConsulta, titulo) => {
    render(<TablaDatos {...base} filas={[]} estado={estado} />, { wrapper: Proveedor });
    expect(screen.getByText(titulo)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('permite acciones por fila y recuperación propia sin interpretar permisos', async () => {
    const abrir = vi.fn();
    const usuario = userEvent.setup();
    const { rerender } = render(<TablaDatos {...base} renderizarAcciones={(fila) => <Button onClick={() => abrir(fila.id)}>Ver {fila.codigo}</Button>} />, { wrapper: Proveedor });
    await usuario.click(screen.getByRole('button', { name: 'Ver DSP-000001' }));
    expect(abrir).toHaveBeenCalledExactlyOnceWith('dsp-1');
    rerender(<TablaDatos {...base} filas={[]} estado="error" renderizarEstado={() => <Button>Reintentar cola</Button>} />);
    expect(screen.getByRole('button', { name: 'Reintentar cola' })).toBeInTheDocument();
  });
});
