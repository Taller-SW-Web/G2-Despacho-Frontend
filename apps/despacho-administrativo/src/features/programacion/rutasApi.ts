import { z } from 'zod';
import type { ClienteApi } from '../../cliente/useClienteApi';
import { consultarMonitoreo } from '../jornadas/api';
import { fechaBogota } from '../jornadas/modelo';

const parada = z.object({
  idDespacho: z.string().uuid(), codigoOperativo: z.string(), codigoRastreoInterno: z.string(),
  estado: z.string(), posicion: z.number().int().positive(), version: z.number().int(),
  destinatario: z.string().nullable(), direccion: z.string().nullable(), pesoKg: z.number().positive(),
  volumenM3: z.number().positive(), cantidadPaquetes: z.number().int().positive(), actualizadoEn: z.string().datetime({ offset: true }),
  idPedido: z.string().min(1), idRepartidor: z.string().min(1), reasignacionEnProceso: z.boolean(), cancelacionEnProceso: z.boolean(),
});
export const esquemaRuta = z.object({ idJornada: z.string(), estadoJornada: z.enum(['ACTIVA', 'CERRADA']),
  despachos: z.array(parada), versionRuta: z.string().regex(/^"[a-f0-9]{64}"$/), consultadoEn: z.string().datetime({ offset: true }),
}).superRefine((ruta, contexto) => {
  if (new Set(ruta.despachos.map((p) => p.idDespacho)).size !== ruta.despachos.length
      || new Set(ruta.despachos.map((p) => p.posicion)).size !== ruta.despachos.length)
    contexto.addIssue({ code: z.ZodIssueCode.custom, message: 'Ruta con paradas o posiciones duplicadas.' });
});
export type Ruta = z.infer<typeof esquemaRuta>;
export type ParadaRuta = Ruta['despachos'][number];
export type ComandoSecuencia = { clave: string; jornada: string; version: string; despachos: { idDespacho: string; posicion: number }[] };
export async function consultarJornadasRuta(cliente: ClienteApi, signal: AbortSignal) {
  const jornadas: { value: string; label: string }[] = [];
  let pagina = 1, total = 1;
  do {
    const respuesta = await consultarMonitoreo(cliente, new URLSearchParams({ fecha: fechaBogota(), pagina: String(pagina), tamanoPagina: '100' }), signal);
    for (const fila of respuesta.contenido) if (fila.jornada?.estado === 'ACTIVA')
      jornadas.push({ value: fila.jornada.idJornada, label: `${fila.nombre} · ${fila.jornada.placa}` });
    total = respuesta.totalPaginas; pagina++;
  } while (pagina <= total);
  return jornadas;
}
export async function consultarRuta(cliente: ClienteApi, jornada: string, signal: AbortSignal) {
  const ruta = esquemaRuta.parse((await cliente.get(`/api/v1/jornadas/${encodeURIComponent(jornada)}/ruta`, { signal })).data);
  if (ruta.idJornada !== jornada) throw new Error('Ruta de otra jornada.');
  return ruta;
}
export async function guardarSecuencia(cliente: ClienteApi, comando: ComandoSecuencia) {
  const ruta = esquemaRuta.parse((await cliente.put(`/api/v1/jornadas/${encodeURIComponent(comando.jornada)}/secuencia`,
    { despachos: comando.despachos }, { headers: { 'If-Match': comando.version, 'Idempotency-Key': comando.clave } })).data);
  if (ruta.idJornada !== comando.jornada) throw new Error('Resultado de otra jornada.');
  return ruta;
}

/** Inserta entre asignados: las posiciones fijas y huecos históricos no se desplazan. */
export function moverParada(paradas: ParadaRuta[], origen: number, destino: number): ParadaRuta[] {
  if (origen < 0 || destino < 0 || origen >= paradas.length || destino >= paradas.length
      || paradas[origen].estado !== 'ASIGNADO' || paradas[destino].estado !== 'ASIGNADO'
      || paradas[origen].reasignacionEnProceso || paradas[destino].reasignacionEnProceso
      || paradas[origen].cancelacionEnProceso || paradas[destino].cancelacionEnProceso) return paradas;
  const espacios = paradas.map((p, i) => p.estado === 'ASIGNADO' && !p.reasignacionEnProceso && !p.cancelacionEnProceso ? i : -1).filter((i) => i >= 0);
  const asignados = espacios.map((i) => paradas[i]);
  const [movida] = asignados.splice(espacios.indexOf(origen), 1);
  asignados.splice(espacios.indexOf(destino), 0, movida);
  let siguiente = 0;
  return paradas.map((p) => p.estado === 'ASIGNADO' && !p.reasignacionEnProceso && !p.cancelacionEnProceso ? { ...asignados[siguiente++], posicion: p.posicion } : p);
}
