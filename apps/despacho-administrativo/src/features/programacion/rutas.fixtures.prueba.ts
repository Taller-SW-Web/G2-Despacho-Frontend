/** Datos sintéticos exclusivos de pruebas de rutas; no se importan desde producción. */
import { jornadaPrueba, monitoreoPrueba, idsPrueba } from '../jornadas/fixtures.prueba';
import type { Ruta } from './rutasModelo';
import { disponiblesPrueba } from './fixtures.prueba';

export const rutaPrueba: Ruta = {
  idJornada: idsPrueba.jornada,
  estadoJornada: 'ACTIVA',
  versionRuta: `"${'a'.repeat(64)}"`,
  consultadoEn: '2026-11-05T14:00:00Z',
  despachos: [1, 2, 3].map((n) => ({
    idDespacho: `10000000-0000-4000-8000-00000000000${n}`,
    codigoOperativo: `DSP-RUTA-${n}`,
    codigoRastreoInterno: `TRK-RUTA-${n}`,
    estado: n === 2 ? 'EN_CAMINO' : 'ASIGNADO',
    posicion: n,
    version: 4,
    destinatario: `Persona sintética ${n}`,
    direccion: `Dirección de prueba ${n}`,
    pesoKg: 12,
    volumenM3: 0.025,
    cantidadPaquetes: 1,
    actualizadoEn: '2026-11-05T13:00:00Z',
    idPedido: `PED-RUTA-${n}`,
    idRepartidor: idsPrueba.repartidor,
    reasignacionEnProceso: false,
    cancelacionEnProceso: false,
  })),
};
export const monitoreoRutasPrueba = { ...monitoreoPrueba, tamanoPagina: 100 };
export const candidatosRutaPrueba = {
  repartidores: [
    {
      ...disponiblesPrueba.repartidores[2],
      idRepartidor: jornadaPrueba.idRepartidor,
      idJornada: jornadaPrueba.idJornada,
      nombre: 'Conductor actual',
    },
    ...disponiblesPrueba.repartidores.filter((r) => r.idRepartidor !== 'rep-centro'),
  ],
};
export const reasignacionPrueba = {
  idDespacho: rutaPrueba.despachos[0].idDespacho,
  estado: 'ASIGNADO',
  version: 5,
  idRepartidorAnterior: idsPrueba.repartidor,
  idJornadaAnterior: idsPrueba.jornada,
  idRepartidor: 'rep-otra-zona',
  idJornada: 'jor-2',
  idReserva: 'reserva-sintetica',
  posicionSecuencia: 4,
  motivo: 'Redistribución',
  actualizadoEn: '2026-11-05T14:01:00Z',
};
