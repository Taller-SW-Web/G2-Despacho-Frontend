import { expect, it } from 'vitest';
import { esquemaDisponibles } from './modelo';
import { disponiblesPrueba } from './fixtures.prueba';

it('conserva placa, límites y ocupación del proveedor sin inventar totales desde el remanente', () => {
  const candidato = esquemaDisponibles.parse(disponiblesPrueba).repartidores[0];
  expect(candidato.placa).toBe('F02-000');
  expect(candidato.limites.pesoKg).toBe(200);
  expect(candidato.ocupacion.pesoKg).toBe(150);
  expect(candidato.capacidadRemanente.pesoKg).toBe(50);
});

it.each(['limites', 'ocupacion', 'placa', 'idFurgoneta', 'porcentajeOcupacion'])('rechaza un catálogo sin %s', (campo) => {
  const respuesta = structuredClone(disponiblesPrueba);
  Reflect.deleteProperty(respuesta.repartidores[0], campo);
  expect(esquemaDisponibles.safeParse(respuesta).success).toBe(false);
});

it.each(['pesoKg', 'volumenM3', 'paquetes'] as const)('rechaza capacidad incoherente en %s', (dimension) => {
  const respuesta = structuredClone(disponiblesPrueba);
  respuesta.repartidores[0].capacidadRemanente[dimension] += 1;
  expect(esquemaDisponibles.safeParse(respuesta).success).toBe(false);
});

it('no duplica perfiles y tolera únicamente el error de representación decimal', () => {
  const respuesta = structuredClone(disponiblesPrueba);
  respuesta.repartidores[0].ocupacion.volumenM3 = 1.7;
  respuesta.repartidores[0].capacidadRemanente.volumenM3 = 0.3;
  expect(esquemaDisponibles.safeParse(respuesta).success).toBe(true);
  respuesta.repartidores.push(respuesta.repartidores[0]);
  expect(esquemaDisponibles.safeParse(respuesta).success).toBe(false);
});
