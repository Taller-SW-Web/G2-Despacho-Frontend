/** Datos sintéticos exclusivos de pruebas; nunca son fallback de la aplicación. */
import type { PaginaPendientes, RepartidorDisponible } from './modelo';

export const paginaPrueba: PaginaPendientes = {
  contenido: [0, 1, 2].map((n) => ({
    idDespacho: `despacho-${n}`, codigoOperativo: `DSP-00012${n}`, codigoRastreoInterno: `TRK-7890${n}`, idPedido: `PED-2026-0089${n}`,
    idZona: 'zona-centro', nombreZona: 'Lima Centro', direccion: 'Av. Arequipa 1234, Lince', pesoTotalKg: 12, volumenTotalM3: 0.025,
    cantidadPaquetes: 1, fechaProgramada: n === 2 ? '2026-10-20' : '2026-10-17', numeroIntentos: n === 1 ? 1 : 0,
    tiempoEsperaSegundos: 15_000, esSimulacion: n === 0, reintento: n !== 0, asignable: n !== 2,
    disponibleDesde: n === 2 ? '2026-10-20' : null, versionDespacho: 1,
  })),
  paginaActual: 1, tamanoPagina: 20, totalElementos: 3, totalPaginas: 1,
  indicadores: { pendientesHoy: 32, programadosFuturo: 8, reintentos: 11 },
  fechaActualServidor: '2026-10-17', consultadoEn: '2026-10-17T17:30:00Z',
};
export const zonasPrueba = { contenido: [
  { id: 'zona-centro', nombre: 'Lima Centro', estado: 'ACTIVO' }, { id: 'zona-norte', nombre: 'Lima Norte', estado: 'ACTIVO' },
], pagina: 1, tamanoPagina: 100, totalElementos: 2, totalPaginas: 1 };
export const disponiblesPrueba: { repartidores: RepartidorDisponible[] } = { repartidores: [
  { idRepartidor: 'rep-otra-zona', idJornada: 'jor-2', nombre: 'Ana de otra zona', idZona: 'zona-norte', estadoOperativo: 'EN_RUTA',
    capacidadRemanente: { pesoKg: 50, volumenM3: 0.5, paquetes: 8 } },
  { idRepartidor: 'rep-sin-peso', idJornada: 'jor-3', nombre: 'Pedro sin peso', idZona: 'zona-centro', estadoOperativo: 'DISPONIBLE',
    capacidadRemanente: { pesoKg: 1, volumenM3: 0.5, paquetes: 8 } },
  { idRepartidor: 'rep-centro', idJornada: 'jor-1', nombre: 'Juan de la zona', idZona: 'zona-centro', estadoOperativo: 'DISPONIBLE',
    capacidadRemanente: { pesoKg: 100, volumenM3: 1, paquetes: 20 } },
  { idRepartidor: 'rep-sin-volumen', idJornada: 'jor-4', nombre: 'María sin volumen', idZona: 'zona-centro', estadoOperativo: 'EN_RUTA',
    capacidadRemanente: { pesoKg: 100, volumenM3: 0.001, paquetes: 20 } },
  { idRepartidor: 'rep-sin-paquetes', idJornada: 'jor-5', nombre: 'Luis sin paquetes', idZona: 'zona-centro', estadoOperativo: 'DISPONIBLE',
    capacidadRemanente: { pesoKg: 100, volumenM3: 1, paquetes: 0 } },
] };
export const creacionPrueba = { idDespacho: 'despacho-simulado', codigoOperativo: 'DSP-SIM-0001', codigoRastreoInterno: 'TRK-SIM-0001', estado: 'PENDIENTE_ASIGNACION', esSimulacion: true };
