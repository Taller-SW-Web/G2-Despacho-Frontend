import axios from 'axios';
import { z } from 'zod';
import type { ClienteApi } from '../../cliente/useClienteApi';
import { listarZonas } from '../zonas/api/zonasApi';
import { esquemaAsignacion, esquemaCreacion, esquemaDisponibles, esquemaPagina, esquemaSimulacion, type SolicitudSimulacion, type ZonaProgramacion } from './modelo';

export async function consultarPendientes(cliente: ClienteApi, params: URLSearchParams, signal: AbortSignal) {
  return esquemaPagina.parse((await cliente.get('/api/v1/despachos/pendientes', { params, signal })).data);
}
export async function consultarDisponibles(cliente: ClienteApi, signal: AbortSignal) {
  const datos = esquemaDisponibles.parse((await cliente.get('/api/v1/repartidores/disponibles', { signal })).data);
  return datos.repartidores.filter((r) => r.estadoOperativo === 'DISPONIBLE' || r.estadoOperativo === 'EN_RUTA');
}
export async function consultarZonas(cliente: ClienteApi, signal: AbortSignal): Promise<ZonaProgramacion[]> {
  const zonas: ZonaProgramacion[] = [];
  let pagina = 1;
  let total = 1;
  do {
    const respuesta = await listarZonas(cliente, { nombre: '', distrito: '', estado: 'ACTIVO', pagina, tamanoPagina: 100 }, signal);
    const datos = z.object({ contenido: z.array(z.object({ id: z.string().min(1), nombre: z.string(), estado: z.literal('ACTIVO') })),
      totalPaginas: z.number().int().nonnegative() }).parse(respuesta);
    zonas.push(...datos.contenido);
    total = datos.totalPaginas;
    pagina++;
  } while (pagina <= total);
  return zonas;
}
export async function generarSimulacion(cliente: ClienteApi, solicitud: SolicitudSimulacion) {
  return esquemaCreacion.parse((await cliente.post('/api/v1/despachos/simulaciones', esquemaSimulacion.parse(solicitud))).data);
}
export async function asignarDespacho(cliente: ClienteApi, id: string, solicitud: { idRepartidor: string; idJornada: string; observacion?: string }) {
  const respuesta = esquemaAsignacion.parse((await cliente.post(`/api/v1/despachos/${encodeURIComponent(id)}/asignacion`, solicitud)).data);
  if (respuesta.idDespacho !== id || respuesta.idJornada !== solicitud.idJornada || respuesta.idRepartidor !== solicitud.idRepartidor)
    throw new Error('La respuesta corresponde a otra asignación.');
  return respuesta;
}
export function interpretarError(error: unknown, mutacion = false) {
  const estado = axios.isAxiosError(error) ? error.response?.status : undefined;
  const codigo = axios.isAxiosError(error) ? error.response?.data?.code : undefined;
  const campos: Record<string, string> = {};
  if (axios.isAxiosError(error) && Array.isArray(error.response?.data?.errores)) {
    for (const campo of error.response.data.errores) {
      if (typeof campo?.campo === 'string') campos[campo.campo] = 'Revisa este valor; el servidor no lo aceptó.';
    }
  }
  return { estado, campos, permiso: estado === 401 || estado === 403, incierto: mutacion && (!estado || estado >= 500),
    mensaje: estado === 401 ? 'Tu sesión ha vencido o no está disponible. Inicia sesión para continuar.'
      : estado === 403 ? 'Tu sesión no tiene permiso para acceder a la programación de despachos.'
      : estado === 409 ? codigo === 'DESP_ERROR_RESERVA_ANTERIOR_ACTIVA'
        ? 'La reserva de la salida anterior sigue activa. Actualiza la cola y espera su liberación.'
        : 'El despacho ya fue procesado o el repartidor cambió de estado. Actualiza la cola antes de continuar.'
      : estado === 422 ? codigo === 'DESP_ERROR_SIN_COBERTURA' ? 'La zona no está activa o no tiene cobertura. Elige otra zona.'
        : 'No se pudo confirmar la capacidad disponible. Revisa el peso, volumen y paquetes y actualiza los repartidores.'
      : estado === 400 ? 'Revisa los campos indicados antes de continuar.'
      : estado === 404 ? 'El recurso ya no está disponible. Actualiza la consulta.'
      : mutacion ? 'No pudimos confirmar el resultado. Consulta la cola antes de volver a enviar la operación.'
      : 'No se pudo obtener la información. Comprueba tu conexión y reintenta.' };
}
export type ErrorProgramacion = ReturnType<typeof interpretarError>;
