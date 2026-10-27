import axios from 'axios';
import { z } from 'zod';
import type { ClienteApi } from '../../cliente/useClienteApi';
import { consultarDisponibilidad } from '../jornadas/api';
import { interpretarError } from './api';

export type CandidatoReasignacion = Awaited<ReturnType<typeof consultarDisponibilidad>>['repartidores'][number];
export type ComandoReasignacion = { clave: string; idDespacho: string; version: number;
  solicitud: { idNuevoRepartidor: string; idNuevaJornada: string; motivo: string } };
const respuesta = z.object({ idDespacho: z.string(), estado: z.literal('ASIGNADO'), version: z.number().int().positive(),
  idRepartidorAnterior: z.string(), idJornadaAnterior: z.string(), idRepartidor: z.string(), idJornada: z.string(),
  idReserva: z.string(), posicionSecuencia: z.number().int().positive(), motivo: z.string(), actualizadoEn: z.string().datetime({ offset: true }),
});
export async function consultarCandidatosReasignacion(cliente: ClienteApi, signal: AbortSignal) {
  return (await consultarDisponibilidad(cliente, new URLSearchParams(), signal)).repartidores;
}
export async function reasignarDespacho(cliente: ClienteApi, comando: ComandoReasignacion) {
  const datos = respuesta.parse((await cliente.post(`/api/v1/despachos/${encodeURIComponent(comando.idDespacho)}/reasignacion`,
    comando.solicitud, { headers: { 'Idempotency-Key': comando.clave, 'If-Match': `"${comando.version}"` } })).data);
  if (datos.idDespacho !== comando.idDespacho || datos.idRepartidor !== comando.solicitud.idNuevoRepartidor
      || datos.idJornada !== comando.solicitud.idNuevaJornada || datos.version !== comando.version + 1 || datos.motivo !== comando.solicitud.motivo)
    throw new Error('El resultado no corresponde a la reasignación solicitada.');
  return datos;
}
export function interpretarReasignacion(error: unknown) {
  const datos = interpretarError(error, true);
  return { ...datos, incierto: datos.incierto || axios.isAxiosError(error) && error.response?.data?.code === 'DESP_ERROR_REASIGNACION_EN_PROCESO' };
}
