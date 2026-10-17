import { describe, expect, it } from 'vitest';
import { datosContacto, datosFurgoneta, datosRepartidor, datosVinculacion, esquemaPagina, repartidorRecibido, transicionesFurgoneta } from './modelo';
import { camposRechazados, mensajeError } from './api';
import { falloPrueba, paginaPrueba, repartidorPrueba } from './fixtures.prueba';

describe('F-05: entradas y límites', () => {
  it.each(['123', '1234567x', '123456789'])('rechaza DNI inválido %s', (dni) => {
    expect(datosRepartidor.safeParse({ ...repartidorPrueba, dni }).success).toBe(false);
  });
  it('la edición solo envía contacto, brevete y turno; conserva nombres, DNI y estados fuera del comando', () => {
    expect(Object.keys(datosContacto.parse(repartidorPrueba)).sort()).toEqual(['correo', 'numeroBrevete', 'telefono', 'turnoHabitual']);
  });
  it.each(['', 0, -1, Infinity, NaN])('rechaza capacidad inválida %s sin convertir vacío en cero', (peso) => {
    expect(datosFurgoneta.safeParse({ placa: 'ABC-123', capacidadPesoKg: peso, capacidadVolumenM3: 4, maximoPaquetes: 80 }).success).toBe(false);
  });
  it('rechaza paquetes fraccionarios y correo inválido', () => {
    expect(datosFurgoneta.safeParse({ placa: 'ABC-123', capacidadPesoKg: 500, capacidadVolumenM3: 4, maximoPaquetes: 1.5 }).success).toBe(false);
    expect(datosRepartidor.safeParse({ ...repartidorPrueba, correo: 'sin-correo' }).success).toBe(false);
  });
  it('vincula con el identificador de Seguridad y no acepta credenciales', () => {
    expect(datosVinculacion.parse({ usuarioId: '2f31c1b1-7568-41b8-bf91-342db68431df', password: 'no-transmitir' })).toEqual({ usuarioId: '2f31c1b1-7568-41b8-bf91-342db68431df' });
    expect(datosVinculacion.safeParse({ usuarioId: 'usuario-no-valido' }).success).toBe(false);
  });
  it('limita los cambios de estado a las transiciones especificadas', () => {
    expect(transicionesFurgoneta('FUERA_DE_SERVICIO')).toEqual(['DISPONIBLE']);
    expect(transicionesFurgoneta('EN_MANTENIMIENTO')).toEqual(['DISPONIBLE', 'FUERA_DE_SERVICIO']);
    expect(transicionesFurgoneta('FUTURO')).toEqual([]);
  });
  it('distingue vacío real de metadatos o datos incompletos', () => {
    const esquema = esquemaPagina(repartidorRecibido);
    expect(esquema.safeParse(paginaPrueba([])).success).toBe(true);
    expect(esquema.safeParse({ contenido: [] }).success).toBe(false);
    expect(esquema.safeParse(paginaPrueba([], 1, 50, 1)).success).toBe(false);
    expect(esquema.safeParse({ ...paginaPrueba([repartidorPrueba]), totalPaginas: 9 }).success).toBe(false);
  });
  it('no muestra detail técnico y asocia solo campos conocidos', () => {
    const error = falloPrueba(400, [{ campo: 'correo', motivo: '<script>secreto</script>' }, { campo: '__proto__', motivo: 'secreto' }]);
    expect(mensajeError(error, 'registro')).not.toContain('Traza');
    expect(camposRechazados(error)).toEqual({ correo: 'Revisa este campo; el servidor no aceptó el valor.' });
  });
});
