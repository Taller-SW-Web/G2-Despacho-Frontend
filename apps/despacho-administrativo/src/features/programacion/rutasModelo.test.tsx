import { expect, it } from 'vitest';
import { esquemaRuta, bloqueoSecuencia, intercambiar, prepararSecuencia } from './rutasModelo';
import { rutaPrueba } from './rutas.fixtures.prueba';

it('permite intercambiar asignados sin tocar la posición histórica de una parada en camino', () => {
  const orden = rutaPrueba.despachos.map((p) => p.idDespacho);
  const nuevo = intercambiar(rutaPrueba, orden, orden[0], orden[2]);
  expect(nuevo).toEqual([orden[2], orden[1], orden[0]]);
  const comando = prepararSecuencia(rutaPrueba, nuevo);
  expect(comando.version).toBe(rutaPrueba.versionRuta);
  expect(comando.cuerpo.despachos.map((p) => p.posicion)).toEqual([1, 2, 3]);
  expect(comando.clave).toMatch(/^[a-f0-9-]{36}$/);
  expect(rutaPrueba.despachos.map((p) => p.idDespacho)).toEqual(orden);
  expect(intercambiar(rutaPrueba, orden, orden[0], orden[1])).toBe(orden);
  expect(() => prepararSecuencia(rutaPrueba, [orden[1], orden[0], orden[2]])).toThrow();
});

it.each(['huecos', 'cerrada', 'reasignacion', 'cancelacion', 'duplicados'] as const)(
  'no guarda rutas con %s',
  (caso) => {
    const ruta = structuredClone(rutaPrueba);
    if (caso === 'huecos') ruta.despachos[2].posicion = 5;
    if (caso === 'cerrada') ruta.estadoJornada = 'CERRADA';
    if (caso === 'reasignacion') ruta.despachos[0].reasignacionEnProceso = true;
    if (caso === 'cancelacion') ruta.despachos[0].cancelacionEnProceso = true;
    const orden = ruta.despachos.map((p) => p.idDespacho);
    if (caso === 'duplicados') orden[0] = orden[2];
    expect(() => prepararSecuencia(ruta, orden)).toThrow();
    if (caso !== 'duplicados') expect(bloqueoSecuencia(ruta)).not.toBeNull();
  },
);

it('rechaza identificadores o posiciones duplicados, versión inválida y paradas desordenadas del proveedor', () => {
  for (const alterar of [
    (ruta: typeof rutaPrueba) => {
      ruta.despachos[1].idDespacho = ruta.despachos[0].idDespacho;
    },
    (ruta: typeof rutaPrueba) => {
      ruta.despachos[1].posicion = 1;
    },
    (ruta: typeof rutaPrueba) => {
      ruta.versionRuta = 'sin-comillas';
    },
    (ruta: typeof rutaPrueba) => {
      ruta.despachos.reverse();
    },
  ]) {
    const ruta = structuredClone(rutaPrueba);
    alterar(ruta);
    expect(esquemaRuta.safeParse(ruta).success).toBe(false);
  }
});
