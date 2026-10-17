import { expect, it } from 'vitest';
import { fechaBogota, monitoreoRecibido, validarParametros } from './modelo';
import { monitoreoPrueba } from './fixtures.prueba';

it('verifica paginación, capacidades y pertenencia de la jornada sin fabricar resultados', () => {
  expect(monitoreoRecibido.safeParse(monitoreoPrueba).success).toBe(true);
  expect(monitoreoRecibido.safeParse({ ...monitoreoPrueba, totalElementos: 51 }).success).toBe(false);
  expect(monitoreoRecibido.safeParse({ ...monitoreoPrueba, contenido: [{ ...monitoreoPrueba.contenido[0], idRepartidor: '00000000-0000-4000-8000-000000000099' }] }).success).toBe(false);
  expect(monitoreoRecibido.safeParse({ ...monitoreoPrueba, resumen: null }).success).toBe(false);
});
it.each(['pagina=0', 'pagina=2147483648', 'tamanoPagina=500', 'fecha=2026-02-30', 'idZona=no-uuid', 'estadoOperativo=OTRO'])(
  'valida parámetros antes de solicitar %s', (consulta) => expect(validarParametros(new URLSearchParams(consulta))).not.toHaveLength(0));
it('calcula el día de Bogotá independientemente de la zona del navegador', () => {
  expect(fechaBogota(new Date('2026-10-18T03:30:00Z'))).toBe('2026-10-17');
  expect(validarParametros(new URLSearchParams('pagina=1&tamanoPagina=50&fecha=2026-10-17'))).toEqual([]);
});
