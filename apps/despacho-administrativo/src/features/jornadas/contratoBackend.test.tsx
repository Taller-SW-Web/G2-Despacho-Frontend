import { expect, it } from 'vitest';
import respuestas from './respuestas.backend.prueba.json?raw';
import { detalleRecibido, disponibilidadRecibida, monitoreoRecibido } from './modelo';

/** Captura real de JornadasPostgresTests: PostgreSQL aislado, JWT y zona como dobles. */
it('consume monitoreo, detalle y disponibilidad exportados por el proveedor real F06', () => {
  const captura = JSON.parse(respuestas);
  const monitoreo = monitoreoRecibido.parse(captura.monitoreo);
  const detalle = detalleRecibido.parse(captura.detalle);
  const disponibilidad = disponibilidadRecibida.parse(captura.disponibilidad);
  expect(monitoreo.contenido[0].jornada?.idJornada).toBe(detalle.idJornada);
  expect(disponibilidad.repartidores[0].idJornada).toBe(detalle.idJornada);
  expect(disponibilidad.repartidores[0].capacidadRemanente).toEqual(detalle.capacidadRemanente);
});
