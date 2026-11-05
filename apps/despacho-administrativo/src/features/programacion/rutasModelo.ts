import { z } from 'zod';

const identificador = z.string().min(1);
const entero = z.number().int().positive();
const carga = z.number().finite().positive();
export const esquemaParada = z.object({
  idDespacho: identificador, codigoOperativo: identificador, codigoRastreoInterno: identificador,
  estado: identificador, posicion: entero.max(32767), version: entero,
  destinatario: z.string(), direccion: z.string(), pesoKg: carga, volumenM3: carga, cantidadPaquetes: entero,
  actualizadoEn: z.string().datetime({ offset: true }), idPedido: identificador, idRepartidor: identificador,
  reasignacionEnProceso: z.boolean(), cancelacionEnProceso: z.boolean(),
});
export const esquemaRuta = z.object({
  idJornada: identificador, estadoJornada: identificador, despachos: z.array(esquemaParada),
  versionRuta: z.string().regex(/^"[a-f0-9]{64}"$/), consultadoEn: z.string().datetime({ offset: true }),
}).superRefine(({ despachos }, contexto) => {
  if (new Set(despachos.map((p) => p.idDespacho)).size !== despachos.length
      || new Set(despachos.map((p) => p.posicion)).size !== despachos.length
      || despachos.some((p, i) => i > 0 && p.posicion <= despachos[i - 1].posicion))
    contexto.addIssue({ code: z.ZodIssueCode.custom, message: 'Ruta duplicada o desordenada.' });
});
export type Ruta = z.infer<typeof esquemaRuta>;
export type Parada = z.infer<typeof esquemaParada>;
export type ComandoSecuencia = {
  idJornada: string; version: string; clave: string;
  cuerpo: { despachos: { idDespacho: string; posicion: number }[] };
};
export type ComandoReasignacion = {
  idDespacho: string; idRepartidorOrigen: string; idJornadaOrigen: string; version: number; clave: string;
  cuerpo: { idNuevoRepartidor: string; idNuevaJornada: string; motivo: string };
};
export const esquemaReasignacion = z.object({
  idDespacho: identificador, estado: z.literal('ASIGNADO'), version: entero,
  idRepartidorAnterior: identificador, idJornadaAnterior: identificador, idRepartidor: identificador,
  idJornada: identificador, idReserva: identificador, posicionSecuencia: entero, motivo: identificador,
  actualizadoEn: z.string().datetime({ offset: true }),
});

export const enProceso = (p: Parada) => p.reasignacionEnProceso || p.cancelacionEnProceso;
/** Solo el subconjunto no controvertido: no compactar huecos históricos ni mover paradas iniciadas. */
export function bloqueoSecuencia(ruta: Ruta): string | null {
  if (ruta.estadoJornada !== 'ACTIVA') return 'Esta jornada es de solo lectura.';
  if (ruta.despachos.some(enProceso)) return 'Hay una reasignación o cancelación en proceso. Actualiza cuando termine.';
  if (ruta.despachos.some((p, i) => p.posicion !== i + 1))
    return 'La ruta conserva huecos históricos. El reordenamiento queda bloqueado hasta acordar su tratamiento; no se renumeran paradas.';
  if (ruta.despachos.length > 1000) return 'Esta ruta supera el tamaño admitido para un guardado.';
  if (ruta.despachos.filter((p) => p.estado === 'ASIGNADO').length < 2) return 'Se necesitan al menos dos paradas asignadas para cambiar el orden.';
  return null;
}
export function intercambiar(ruta: Ruta, orden: string[], origen: string, destino: string): string[] {
  if (bloqueoSecuencia(ruta)) return orden;
  const movibles = new Set(ruta.despachos.filter((p) => p.estado === 'ASIGNADO').map((p) => p.idDespacho));
  const originales = ruta.despachos.map((p) => p.idDespacho);
  if (orden.length !== originales.length || new Set(orden).size !== orden.length || orden.some((id) => !originales.includes(id))
      || ruta.despachos.some((p, i) => p.estado !== 'ASIGNADO' && orden[i] !== p.idDespacho)
      || !movibles.has(origen) || !movibles.has(destino)) return orden;
  const resultado = [...orden], a = resultado.indexOf(origen), b = resultado.indexOf(destino);
  [resultado[a], resultado[b]] = [resultado[b], resultado[a]];
  return resultado;
}
export function prepararSecuencia(ruta: Ruta, orden: string[]): ComandoSecuencia {
  if (bloqueoSecuencia(ruta) || orden.length !== ruta.despachos.length || new Set(orden).size !== orden.length
      || orden.some((id) => !ruta.despachos.some((p) => p.idDespacho === id))
      || ruta.despachos.some((p, i) => p.estado !== 'ASIGNADO' && orden[i] !== p.idDespacho))
    throw new Error('No se puede guardar esta secuencia. Actualiza la ruta.');
  return { idJornada: ruta.idJornada, version: ruta.versionRuta, clave: crypto.randomUUID(),
    cuerpo: { despachos: orden.map((idDespacho, i) => ({ idDespacho, posicion: i + 1 })) } };
}
