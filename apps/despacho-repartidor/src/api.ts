import { crearClienteApi, obtenerProblemaApi } from '@despacho/cliente-api';
import { z } from 'zod';

const URL_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
const cliente = crearClienteApi(URL_BASE, () => {
  if (localStorage.getItem('despacho.sesionCerrada') === 'true') return null;
  const token = localStorage.getItem('despacho.token');
  if (token) return token;
  const tokenDesarrollo = import.meta.env.DEV ? import.meta.env.VITE_DEV_TOKEN : undefined;
  return typeof tokenDesarrollo === 'string' && tokenDesarrollo.length > 0 ? tokenDesarrollo : null;
});

const despachoRuta = z.object({
  idDespacho: z.string().uuid(),
  codigoRastreoInterno: z.string(),
  estado: z.string(),
  secuenciaRuta: z.number().int().nullable(),
  fechaProgramada: z.string().nullable(),
  numeroIntentos: z.number().int().nonnegative(),
  maximoIntentos: z.number().int().positive().nullable(),
  destinatario: z.string().nullable(),
  direccion: z.string().nullable(),
  distrito: z.string().nullable(),
});

const esquemaRuta = z.object({
  idJornada: z.string().uuid().nullable(),
  fecha: z.string(),
  estadoOperativo: z.string(),
  despachos: z.array(despachoRuta),
});

const esquemaDetalle = z.object({
  idJornada: z.string().uuid(),
  idDespacho: z.string().uuid(),
  codigoRastreoInterno: z.string(),
  estado: z.string(),
  secuenciaRuta: z.number().int().nullable(),
  fechaProgramada: z.string().nullable(),
  numeroIntentos: z.number().int().nonnegative(),
  maximoIntentos: z.number().int().positive().nullable(),
  destinatario: z.object({ nombre: z.string(), telefono: z.string() }).nullable(),
  destino: z.object({
    direccion: z.string(),
    referencia: z.string().nullable(),
    departamento: z.string().nullable(),
    provincia: z.string().nullable(),
    distrito: z.string(),
    codigoPostal: z.string().nullable(),
  }).nullable(),
});

const esquemaResumen = z.object({
  idJornada: z.string().uuid().nullable(),
  fecha: z.string(),
  asignados: z.number().int().nonnegative(),
  entregados: z.number().int().nonnegative(),
  fallidosConIntento: z.number().int().nonnegative(),
  noIntentados: z.number().int().nonnegative(),
  pendientes: z.number().int().nonnegative(),
});

export type RutaRepartidor = z.infer<typeof esquemaRuta>;
export type DetalleDespacho = z.infer<typeof esquemaDetalle>;
export type ResumenJornada = z.infer<typeof esquemaResumen>;

export async function consultarRuta(signal: AbortSignal): Promise<RutaRepartidor> {
  return esquemaRuta.parse((await cliente.get('/api/v1/repartidor/mi-ruta', { signal })).data);
}

export async function consultarDetalle(idDespacho: string, signal: AbortSignal): Promise<DetalleDespacho> {
  const detalle = esquemaDetalle.parse((await cliente.get(
    `/api/v1/repartidor/despachos/${encodeURIComponent(idDespacho)}`,
    { signal },
  )).data);
  if (detalle.idDespacho !== idDespacho) throw new Error('La respuesta corresponde a otro despacho.');
  return detalle;
}

export async function consultarResumen(signal: AbortSignal): Promise<ResumenJornada> {
  return esquemaResumen.parse((await cliente.get('/api/v1/repartidor/jornada/resumen', { signal })).data);
}

export function mensajeErrorConsulta(error: unknown): string {
  const problema = obtenerProblemaApi(error);
  if (problema?.detail) return problema.detail;
  if (problema?.status === 401) return 'Tu sesión no está disponible. Inicia sesión para continuar.';
  if (problema?.status === 403) return 'Tu usuario no tiene un perfil de repartidor activo y vinculado.';
  if (problema?.status === 404) return 'El despacho no pertenece a tu jornada activa o ya no está disponible.';
  return 'No se pudo obtener la información. Comprueba la conexión e inténtalo nuevamente.';
}
