import { expect, it } from 'vitest';
import { detallePrueba } from './fixtures.detalle.prueba';
import { adaptarHistorial, esquemaDetalle } from './modeloDetalle';

it('acepta y presenta el adelanto auditado sin confundirlo con una transición', () => {
  const detalle = detallePrueba();
  detalle.historial.push({
    ...detalle.historial[0],
    id: 'historial-adelanto',
    tipoOperacion: 'ADELANTO_PROGRAMACION',
    estadoAnterior: 'PENDIENTE_ASIGNACION',
    estadoNuevo: 'PENDIENTE_ASIGNACION',
    funcionalidadOrigen: 'F-02',
    observacion: 'Repartidor disponible',
    datos: { fechaProgramadaAnterior: '2026-10-25', fechaProgramada: '2026-10-24' },
  });
  const validado = esquemaDetalle.parse(detalle);
  expect(adaptarHistorial(validado).at(-1)?.descripcionEvento).toBe('Programación adelantada');
  expect(validado.historial.at(-1)?.datos.fechaProgramadaAnterior).toBe('2026-10-25');
});
