import type { PropsWithChildren } from 'react';
import { MantineProvider } from '@mantine/core';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HistorialEstados, tema } from '../index';
import type { EntradaHistorialEstados, PropiedadesHistorialEstados } from '../index';

function ProveedorPruebas({ children }: PropsWithChildren) {
  return <MantineProvider theme={tema} env="test">{children}</MantineProvider>;
}

const fallo: EntradaHistorialEstados = {
  id: 'evento-fallo', fechaServidor: '2026-10-15T19:00:00Z', descripcionEvento: 'Entrega fallida registrada',
  estadoAnterior: 'EN_CAMINO', estadoNuevo: 'FALLIDO', ejecutor: 'Repartidor de prueba', observacion: 'No se encontró al destinatario.',
};
const recepcion: EntradaHistorialEstados = {
  id: 'evento-recepcion', fechaServidor: '2026-10-16T15:30:00Z', descripcionEvento: 'Paquete recibido en el centro',
  estadoAnterior: 'FALLIDO', estadoNuevo: 'FALLIDO', ejecutor: 'Gestor de prueba', observacion: 'Sello intacto. Recepción confirmada.',
};

function preparar(cambios: Partial<PropiedadesHistorialEstados> = {}) {
  const propiedades: PropiedadesHistorialEstados = { entradas: [recepcion, fallo], estado: 'datos', ...cambios };
  return { ...render(<HistorialEstados {...propiedades} />, { wrapper: ProveedorPruebas }), propiedades };
}

function descripciones() {
  return screen.getAllByRole('listitem').map((evento) => within(evento).getByRole('heading', { level: 4 }).textContent);
}

describe('CR-19 HistorialEstados / CCR-19-01', () => {
  it.each([undefined, 'FALLIDO'])('la recepción conserva Fallido sin inventar una transición, con estadoNuevo=%s', (estadoNuevo) => {
    preparar({ entradas: [{ ...recepcion, estadoNuevo }] });
    const evento = screen.getByRole('listitem');
    expect(within(evento).getByRole('heading', { name: recepcion.descripcionEvento })).toBeInTheDocument();
    expect(within(evento).getAllByText('Fallido')).toHaveLength(1);
    expect(within(evento).queryByText('Recibido')).not.toBeInTheDocument();
    expect(within(evento).queryByText('Estado nuevo')).not.toBeInTheDocument();
    expect(evento.querySelector('time')).toHaveAttribute('datetime', recepcion.fechaServidor);
    expect(evento).toHaveTextContent('Registrado por: Gestor de prueba');
  });

  it.each([
    ['ascendente', [fallo.descripcionEvento, recepcion.descripcionEvento]],
    ['descendente', [recepcion.descripcionEvento, fallo.descripcionEvento]],
  ] as const)('ordena de forma %s usando las fechas del servidor', (orden, esperado) => {
    preparar({ orden });
    expect(descripciones()).toEqual(esperado);
  });

  it.each(['ascendente', 'descendente'] as const)('mantiene el orden recibido en empates, incluso en %s', (orden) => {
    preparar({ orden, entradas: [
      { id: 'uno', fechaServidor: '2026-10-16T10:00:00-05:00', descripcionEvento: 'Primero recibido' },
      { id: 'dos', fechaServidor: '2026-10-16T15:00:00Z', descripcionEvento: 'Segundo recibido' },
      { id: 'tres', fechaServidor: '2026-10-16T17:00:00+02:00', descripcionEvento: 'Tercero recibido' },
    ] });
    expect(descripciones()).toEqual(['Primero recibido', 'Segundo recibido', 'Tercero recibido']);
  });

  it('compara instantes equivalentes en zonas distintas y no el orden del texto ISO', () => {
    preparar({ entradas: [
      { id: 'tarde', fechaServidor: '2026-10-16T10:15:00-05:00', descripcionEvento: 'Evento posterior' },
      { id: 'antes', fechaServidor: '2026-10-16T14:30:00Z', descripcionEvento: 'Evento anterior' },
    ] });
    expect(descripciones()).toEqual(['Evento anterior', 'Evento posterior']);
  });

  it('no modifica la colección recibida al ordenar', () => {
    const entradas = Object.freeze([Object.freeze({ ...recepcion }), Object.freeze({ ...fallo })]);
    preparar({ entradas });
    expect(entradas.map((entrada) => entrada.id)).toEqual(['evento-recepcion', 'evento-fallo']);
    expect(descripciones()).toEqual([fallo.descripcionEvento, recepcion.descripcionEvento]);
  });

  it('muestra ambos estados únicamente cuando hay una transición explícita distinta', () => {
    preparar({ entradas: [fallo] });
    const evento = screen.getByRole('listitem');
    expect(evento).toHaveTextContent('Estado anterior');
    expect(evento).toHaveTextContent('En camino');
    expect(evento).toHaveTextContent('Estado nuevo');
    expect(evento).toHaveTextContent('Fallido');
  });

  it('no inventa autor, observación ni estados cuando los campos opcionales están ausentes', () => {
    preparar({ entradas: [{ id: 'sin-datos', fechaServidor: '2026-10-16T15:30:00Z', descripcionEvento: 'Evento confirmado por el servidor' }] });
    const evento = screen.getByRole('listitem');
    expect(evento).not.toHaveTextContent('Registrado por');
    expect(evento).not.toHaveTextContent('Estado anterior');
    expect(evento).not.toHaveTextContent('Estado registrado');
    expect(evento).not.toHaveTextContent('Sin observaciones');
  });

  it('no expone enums desconocidos del servidor ni fabrica un estado Recibido', () => {
    preparar({ entradas: [{ ...recepcion, estadoAnterior: 'ESTADO_INTERNO_NUEVO', estadoNuevo: 'RECIBIDO' }] });
    expect(screen.getAllByText('Estado no disponible')).toHaveLength(2);
    expect(screen.queryByText('ESTADO_INTERNO_NUEVO')).not.toBeInTheDocument();
    expect(screen.queryByText('RECIBIDO')).not.toBeInTheDocument();
    expect(screen.queryByText('Recibido')).not.toBeInTheDocument();
  });

  it('mantiene el instante original en time y no usa el reloj actual como fecha de auditoría', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2040-01-01T00:00:00Z'));
    try {
      preparar({ entradas: [recepcion] });
      const tiempo = screen.getByRole('listitem').querySelector('time');
      expect(tiempo).toHaveAttribute('datetime', recepcion.fechaServidor);
      expect(tiempo).toHaveTextContent('2026');
      expect(tiempo).not.toHaveTextContent('2040');
    } finally {
      vi.useRealTimers();
    }
  });

  it('presenta los instantes en Lima y conserva el día operativo al cruzar la medianoche UTC', () => {
    preparar({ entradas: [
      { id: 'antes-medianoche', fechaServidor: '2026-10-17T04:59:00Z', descripcionEvento: 'Último evento del día en Lima' },
      { id: 'medianoche', fechaServidor: '2026-10-17T05:00:00Z', descripcionEvento: 'Primer evento del día en Lima' },
    ] });
    expect(screen.getByText('Hora de Lima')).toBeInTheDocument();
    expect(screen.getByText('16/10/2026 23:59')).toHaveAttribute('datetime', '2026-10-17T04:59:00Z');
    expect(screen.getByText('17/10/2026 00:00')).toHaveAttribute('datetime', '2026-10-17T05:00:00Z');
  });

  it.each(['fecha inválida', '2026-10-16', '2026-10-16T10:00:00', ''])('ante una fecha no utilizable (%s) no fabrica un instante', (fechaServidor) => {
    preparar({ entradas: [{ ...recepcion, fechaServidor }] });
    expect(screen.getByText('Fecha no disponible')).toBeInTheDocument();
    expect(screen.getByRole('listitem').querySelector('time')).not.toBeInTheDocument();
  });

  it('coloca al final las fechas no utilizables manteniendo su orden recibido', () => {
    preparar({ orden: 'descendente', entradas: [
      { ...recepcion, id: 'invalida-1', fechaServidor: '', descripcionEvento: 'Sin fecha uno' },
      fallo,
      { ...recepcion, id: 'invalida-2', fechaServidor: 'fecha desconocida', descripcionEvento: 'Sin fecha dos' },
    ] });
    expect(descripciones()).toEqual([fallo.descripcionEvento, 'Sin fecha uno', 'Sin fecha dos']);
  });

  it.each(['carga', 'vacio', 'sinResultados', 'error', 'sinPermiso', 'noEncontrado'] as const)('retira eventos anteriores al pasar a %s', (estado) => {
    const { propiedades, rerender } = preparar();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    rerender(<HistorialEstados {...propiedades} estado={estado} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByText('Paquete recibido en el centro')).not.toBeInTheDocument();
    expect(screen.queryByText(/Registrado por/)).not.toBeInTheDocument();
    expect(document.querySelector('time')).not.toBeInTheDocument();
  });

  it('una consulta de datos sin entradas muestra ausencia de eventos y no una fila ficticia', () => {
    preparar({ entradas: [] });
    expect(screen.getByText('Todavía no hay eventos registrados')).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('ofrece una recuperación accesible y emite alReintentar sin argumentos', async () => {
    const usuario = userEvent.setup();
    const alReintentar = vi.fn();
    preparar({ estado: 'error', alReintentar });
    const boton = screen.getByRole('button', { name: 'Reintentar' });
    await usuario.tab();
    expect(boton).toHaveFocus();
    await usuario.keyboard('{Enter}');
    expect(alReintentar).toHaveBeenCalledExactlyOnceWith();
    expect(screen.getByText('No pudimos cargar el historial')).toBeInTheDocument();
  });

  it('no ofrece una acción sin callback de recuperación', () => {
    preparar({ estado: 'error' });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('admite un título propio sin añadir otro H1 y conserva observaciones extensas completas', () => {
    const observacion = 'Sello intacto.\nSe verificó el paquete y se registró su recepción física sin cambiar el estado Fallido.';
    preparar({ titulo: 'Eventos del despacho de prueba', entradas: [{ ...recepcion, observacion }] });
    expect(screen.getByRole('region', { name: 'Eventos del despacho de prueba' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Eventos del despacho de prueba' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByText(/Se verificó el paquete/).textContent).toBe(observacion);
  });
});
