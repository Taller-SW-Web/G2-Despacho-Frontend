import { z } from 'zod';
import type { ClienteApi } from '../../cliente/useClienteApi';
import { esquemaDetalle } from './modeloDetalle';

export type SolicitudRecepcion = { idIncidencia: string; versionDespacho: number; selloIntacto: boolean; observacion: string | null };
const resultadoRecepcion = z.object({
  idDespacho: z.string(), idIncidencia: z.string(), estado: z.literal('FALLIDO'), versionDespacho: z.number().int().positive(),
  recepcion: esquemaDetalle.shape.incidencia.shape.recepcion,
});
export async function confirmarRecepcion(cliente: ClienteApi, id: string, solicitud: SolicitudRecepcion, signal: AbortSignal) {
  const respuesta = await cliente.post(`/api/v1/despachos/${encodeURIComponent(id)}/recepcion-centro`, solicitud, { signal, timeout: 15_000 });
  const dato = resultadoRecepcion.parse(respuesta.data);
  if (respuesta.status !== 202 || dato.idDespacho !== id || dato.idIncidencia !== solicitud.idIncidencia
    || dato.versionDespacho !== solicitud.versionDespacho + 1 || dato.recepcion.estado !== 'RECIBIDO_EN_CENTRO'
    || dato.recepcion.selloIntacto !== solicitud.selloIntacto || dato.recepcion.observacion !== solicitud.observacion
    || dato.recepcion.liberacionCapacidad?.estado !== 'PENDIENTE' || dato.recepcion.liberacionCapacidad.requiereRevision)
    throw new Error('Resultado de recepción no comprobado');
  return dato;
}
export const normalizarObservacion = (valor: string) => valor.trim() || null;
export const longitudObservacion = (valor: string) => Array.from(valor.trim()).length;
