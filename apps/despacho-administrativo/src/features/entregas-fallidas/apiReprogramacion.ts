import { z } from 'zod';
import type { ClienteApi } from '../../cliente/useClienteApi';
import { esquemaDetalle } from './modeloDetalle';

export type SolicitudReprogramacion = {
  idIncidencia: string; versionDespacho: number; nuevaFechaProgramada: string; observacion: string | null;
};
export type OperacionReprogramacion = { id: string; cuerpo: SolicitudReprogramacion; intentos: number };
export function fechaCivilValida(valor: string) {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(valor) || valor.startsWith('0000')) return false;
  const fecha = new Date(valor + 'T12:00:00Z');
  return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}
export function diaLima(consultadoEn: string) {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(consultadoEn));
  return ['year', 'month', 'day'].map((tipo) => partes.find((parte) => parte.type === tipo)?.value).join('-');
}
export function diaSiguiente(dia: string) {
  const fecha = new Date(dia + 'T12:00:00Z');
  fecha.setUTCDate(fecha.getUTCDate() + 1);
  return fecha.toISOString().slice(0, 10);
}
export const presentarFechaCivil = (fecha: string) => fecha.split('-').reverse().join('/');
export const normalizarObservacionReprogramacion = (valor: string) => valor.replace(/^[\s\u001c-\u001f]+|[\s\u001c-\u001f]+$/gu, '') || null;
export const longitudObservacionReprogramacion = (valor: string) => Array.from(normalizarObservacionReprogramacion(valor) ?? '').length;
const esquemaResultado = z.object({
  idDespacho: z.string().min(1), idIncidencia: z.string().min(1), estado: z.literal('PENDIENTE_ASIGNACION'),
  versionDespacho: z.number().int().positive(), fechaProgramada: z.string().refine(fechaCivilValida),
  numeroIntentos: z.number().int().nonnegative(), observacion: z.string().nullable(),
  reprogramadoEn: esquemaDetalle.shape.actualizadoEn, idEvento: z.string().min(1).nullable(),
});
export type ResultadoReprogramacion = z.infer<typeof esquemaResultado>;
export async function reprogramarDespacho(cliente: ClienteApi, operacion: OperacionReprogramacion, signal: AbortSignal) {
  const respuesta = await cliente.post('/api/v1/despachos/' + encodeURIComponent(operacion.id) + '/reprogramacion',
    operacion.cuerpo, { signal, timeout: 15_000 });
  const dato = esquemaResultado.parse(respuesta.data);
  if (respuesta.status !== 200 || dato.idDespacho !== operacion.id || dato.idIncidencia !== operacion.cuerpo.idIncidencia
      || dato.versionDespacho !== operacion.cuerpo.versionDespacho + 1 || dato.fechaProgramada !== operacion.cuerpo.nuevaFechaProgramada
      || dato.observacion !== operacion.cuerpo.observacion || dato.numeroIntentos !== operacion.intentos)
    throw new Error('Resultado de reprogramación no comprobado');
  return dato;
}
