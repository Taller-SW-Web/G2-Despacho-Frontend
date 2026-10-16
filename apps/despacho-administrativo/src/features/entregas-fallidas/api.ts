import axios from 'axios';
import type { ClienteApi } from '../../cliente/useClienteApi';
import { esquemaCatalogo, esquemaPagina } from './modelo';

export async function consultarFallidos(cliente: ClienteApi, parametros: URLSearchParams, signal: AbortSignal) {
  const respuesta = await cliente.get('/api/v1/despachos/fallidos', { params: parametros, signal });
  return esquemaPagina.parse(respuesta.data);
}
export async function consultarMotivos(cliente: ClienteApi, signal: AbortSignal) {
  const respuesta = await cliente.get('/api/v1/catalogos/motivos-fallo', { signal });
  return esquemaCatalogo.parse(respuesta.data).motivos;
}

export function interpretarError(error: unknown) {
  if (!axios.isAxiosError(error)) return { mensaje: 'No se pudo leer la respuesta. Reintenta la consulta.', permiso: false, jornadas: false, campos: {} };
  const estado = error.response?.status;
  const problema = error.response?.data;
  const campos: Record<string, string> = {};
  if (estado === 400 && Array.isArray(problema?.errores)) {
    for (const detalle of problema.errores) if (typeof detalle.campo === 'string') campos[detalle.campo] = 'Revisa el valor de este filtro.';
  }
  const jornadas = estado === 503 && problema?.code === 'DESP_ERROR_JORNADAS_NO_DISPONIBLES';
  return {
    permiso: estado === 401 || estado === 403, jornadas, campos,
    mensaje: estado === 401 ? 'La sesión ha vencido o no está disponible. Accede de nuevo para consultar.'
      : estado === 403 ? 'Tu sesión no tiene permiso para consultar entregas fallidas.'
      : jornadas ? 'No se pudo confirmar el cierre de todas las jornadas. La consulta de solo atrasados no está disponible.'
      : estado === 400 ? 'Hay filtros inválidos. Revisa los campos o limpia los filtros.'
      : 'No se pudo actualizar la consulta. Reintenta en unos momentos.',
  };
}
export type ErrorConsultaFallidos = ReturnType<typeof interpretarError>;
