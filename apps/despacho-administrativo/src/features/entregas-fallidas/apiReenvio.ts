import axios from 'axios';
import { z } from 'zod';
import type { ClienteApi } from '../../cliente/useClienteApi';

const resultadoReenvio = z.object({
  idEvento: z.string(),
  idDespacho: z.string(),
  estadoEnvio: z.literal('PENDIENTE'),
});

/**
 * Devuelve a la cola un evento hacia Ventas en ENVIO_FALLIDO (contrato §7.3). Gestión lo envía en
 * su siguiente ciclo con el mismo idEvento, por eso la respuesta solo confirma PENDIENTE.
 */
export async function reenviarEventoVentas(
  cliente: ClienteApi,
  idDespacho: string,
  idEvento: string,
  signal: AbortSignal,
) {
  const respuesta = await cliente.post(
    `/api/v1/despachos/${encodeURIComponent(idDespacho)}/eventos-ventas/${encodeURIComponent(idEvento)}/reenvio`,
    undefined,
    { signal },
  );
  const dato = resultadoReenvio.parse(respuesta.data);
  if (respuesta.status !== 202 || dato.idDespacho !== idDespacho || dato.idEvento !== idEvento)
    throw new Error('Resultado de reenvío no comprobado');
  return dato;
}

export function mensajeErrorReenvio(error: unknown) {
  const estado = axios.isAxiosError(error) ? error.response?.status : undefined;
  if (estado === 401) return 'Tu sesión ya no permite reenviar. Accede de nuevo.';
  if (estado === 403) return 'No tienes permiso para reenviar comunicaciones.';
  if (estado === 404) return 'La comunicación ya no corresponde a este despacho.';
  if (estado === 409)
    return 'La comunicación ya no está en envío fallido. Se actualizó el detalle.';
  return 'No se pudo reenviar la comunicación. Reintenta en unos segundos.';
}
