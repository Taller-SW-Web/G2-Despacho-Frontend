import type { Jornada, Monitoreo } from './modelo';

/** Datos sintéticos de pruebas; la aplicación no los importa. */
export const idsPrueba = {
  jornada: '00000000-0000-4000-8000-000000000001', repartidor: '00000000-0000-4000-8000-000000000002',
  furgoneta: '00000000-0000-4000-8000-000000000003', zona: '00000000-0000-4000-8000-000000000004',
};
export const jornadaPrueba: Jornada = {
  idJornada: idsPrueba.jornada, idRepartidor: idsPrueba.repartidor, idFurgoneta: idsPrueba.furgoneta, idZona: idsPrueba.zona,
  placa: 'TEST-01', fecha: '2026-10-17', estado: 'ACTIVA', cerradaEn: null,
  limites: { pesoKg: 500, volumenM3: 4, paquetes: 80 }, ocupacion: { pesoKg: 100, volumenM3: 1, paquetes: 20 },
  capacidadRemanente: { pesoKg: 400, volumenM3: 3, paquetes: 60 }, porcentajeOcupacion: { peso: 20, volumen: 25, paquetes: 25 },
};
export const monitoreoPrueba: Monitoreo = {
  contenido: [{ idRepartidor: idsPrueba.repartidor, nombre: 'Ana Jornada Prueba', estadoOperativo: 'DISPONIBLE', jornada: jornadaPrueba }],
  pagina: 1, tamanoPagina: 50, totalElementos: 1, totalPaginas: 1,
  resumen: { disponible: 1, enRuta: 0, saturado: 0, fueraDeTurno: 0 }, consultadoEn: '2026-10-17T14:00:00Z',
};
