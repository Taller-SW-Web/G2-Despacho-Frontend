import { z } from 'zod';
import type { ClienteApi } from '../../cliente/useClienteApi';
import { esquemaDetalle } from './modeloDetalle';

export type SolicitudCierre = { idIncidencia: string; versionDespacho: number; motivo: string; observacion: string | null };
export type OperacionCierre = { id: string; cuerpo: SolicitudCierre; intentos: number };
export const normalizarTextoCierre = (valor: string) => valor.replace(/^[\s\u001c-\u001f]+|[\s\u001c-\u001f]+$/gu, '') || null;
export const longitudTextoCierre = (valor: string) => Array.from(normalizarTextoCierre(valor) ?? '').length;
const esquemaResultado = z.object({
  idDespacho: z.string().min(1), idIncidencia: z.string().min(1), estado: z.literal('DEVUELTO_A_ORIGEN'),
  versionDespacho: z.number().int().positive(), motivo: z.string().min(1), observacion: z.string().nullable(),
  numeroIntentos: z.number().int().nonnegative(), cerradoEn: esquemaDetalle.shape.actualizadoEn,
  idEvento: z.string().min(1).nullable(),
});
export type ResultadoCierre = z.infer<typeof esquemaResultado>;
export async function cerrarDespacho(cliente: ClienteApi, operacion: OperacionCierre, signal: AbortSignal) {
  const respuesta = await cliente.post('/api/v1/despachos/' + encodeURIComponent(operacion.id) + '/devolucion-origen',
    operacion.cuerpo, { signal, timeout: 15_000 });
  const dato = esquemaResultado.parse(respuesta.data);
  if (respuesta.status !== 200 || dato.idDespacho !== operacion.id || dato.idIncidencia !== operacion.cuerpo.idIncidencia
      || dato.versionDespacho !== operacion.cuerpo.versionDespacho + 1 || dato.motivo !== operacion.cuerpo.motivo
      || dato.observacion !== operacion.cuerpo.observacion || dato.numeroIntentos !== operacion.intentos)
    throw new Error('Resultado del cierre no comprobado');
  return dato;
}
