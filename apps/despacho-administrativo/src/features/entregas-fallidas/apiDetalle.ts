import axios from 'axios';
import type { ClienteApi } from '../../cliente/useClienteApi';
import { esquemaAccesoEvidencia, esquemaDetalle } from './modeloDetalle';

export async function consultarDetalle(cliente: ClienteApi, idDespacho: string, signal: AbortSignal) {
  const respuesta = await cliente.get(`/api/v1/despachos/${encodeURIComponent(idDespacho)}/incidencia`, { signal });
  const detalle = esquemaDetalle.parse(respuesta.data);
  if (detalle.idDespacho !== idDespacho) throw new Error('La respuesta corresponde a otro despacho');
  return detalle;
}
export async function autorizarEvidencia(cliente: ClienteApi, idDespacho: string, idEvidencia: string, signal: AbortSignal) {
  const respuesta = await cliente.post(`/api/v1/evidencias/${encodeURIComponent(idEvidencia)}/acceso`, undefined, { signal });
  const acceso = esquemaAccesoEvidencia.parse(respuesta.data);
  if (acceso.idDespacho !== idDespacho || acceso.idEvidencia !== idEvidencia || Date.parse(acceso.venceEn) <= Date.now())
    throw new Error('La autorización no corresponde a la evidencia vigente');
  return acceso;
}
export function errorDetalle(error: unknown) {
  const estado = axios.isAxiosError(error) ? error.response?.status : undefined;
  const codigo = axios.isAxiosError(error) ? error.response?.data?.code : undefined;
  return { estado, sinPermiso: estado === 401 || estado === 403, noEncontrado: estado === 404,
    inconsistente: codigo === 'DESP_ERROR_DATOS_INCONSISTENTES',
    mensaje: estado === 401 ? 'Tu sesión ya no permite consultar este detalle. Accede de nuevo.'
      : estado === 403 ? 'No tienes permiso para consultar este detalle.'
      : estado === 404 ? codigo === 'DESP_ERROR_INCIDENCIA_NO_ENCONTRADA' ? 'Este despacho no tiene una incidencia registrada.' : 'No se encontró el despacho solicitado.'
      : 'No se pudo actualizar el detalle. Reintenta para obtener información actual.',
  };
}
