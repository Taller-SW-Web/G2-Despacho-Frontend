import type { ClienteApi } from '../../cliente/useClienteApi';
import { consultarMonitoreo } from '../jornadas/api';
import type { FilaMonitoreo } from '../jornadas/modelo';
import { esquemaRuta, esquemaReasignacion, type ComandoSecuencia, type ComandoReasignacion } from './rutasModelo';

export async function consultarJornadasRuta(cliente: ClienteApi, signal: AbortSignal) {
  const filas: FilaMonitoreo[] = [];
  let pagina = 1, total = 1;
  do {
    const respuesta = await consultarMonitoreo(cliente, new URLSearchParams({ pagina: String(pagina), tamanoPagina: '100' }), signal);
    filas.push(...respuesta.contenido);
    total = respuesta.totalPaginas; pagina++;
  } while (pagina <= total);
  const jornadas = filas.flatMap((fila) => fila.jornada ? [{ ...fila.jornada, nombre: fila.nombre }] : []);
  if (new Set(jornadas.map((j) => j.idJornada)).size !== jornadas.length) throw new Error('Jornadas repetidas. Actualiza el catálogo.');
  return jornadas;
}
export async function consultarRuta(cliente: ClienteApi, idJornada: string, signal: AbortSignal, idRepartidor?: string) {
  const ruta = esquemaRuta.parse((await cliente.get(`/api/v1/jornadas/${encodeURIComponent(idJornada)}/ruta`, { signal })).data);
  if (ruta.idJornada !== idJornada || (idRepartidor && ruta.despachos.some((p) => p.idRepartidor !== idRepartidor)))
    throw new Error('La respuesta corresponde a otra jornada o repartidor.');
  return ruta;
}
export async function guardarSecuencia(cliente: ClienteApi, comando: ComandoSecuencia) {
  const respuesta = esquemaRuta.parse((await cliente.put(`/api/v1/jornadas/${encodeURIComponent(comando.idJornada)}/secuencia`, comando.cuerpo,
    { headers: { 'If-Match': comando.version, 'Idempotency-Key': comando.clave } })).data);
  if (respuesta.idJornada !== comando.idJornada || respuesta.despachos.length !== comando.cuerpo.despachos.length
      || respuesta.despachos.some((p) => !comando.cuerpo.despachos.some((s) => s.idDespacho === p.idDespacho && s.posicion === p.posicion)))
    throw new Error('No se pudo comprobar el resultado del guardado.');
  return respuesta;
}
export async function reasignarDespacho(cliente: ClienteApi, comando: ComandoReasignacion) {
  const respuesta = esquemaReasignacion.parse((await cliente.post(`/api/v1/despachos/${encodeURIComponent(comando.idDespacho)}/reasignacion`, comando.cuerpo,
    { headers: { 'If-Match': `"${comando.version}"`, 'Idempotency-Key': comando.clave } })).data);
  if (respuesta.idDespacho !== comando.idDespacho || respuesta.idRepartidorAnterior !== comando.idRepartidorOrigen
      || respuesta.idJornadaAnterior !== comando.idJornadaOrigen || respuesta.idRepartidor !== comando.cuerpo.idNuevoRepartidor
      || respuesta.idJornada !== comando.cuerpo.idNuevaJornada || respuesta.motivo !== comando.cuerpo.motivo || respuesta.version <= comando.version)
    throw new Error('No se pudo comprobar el resultado de la reasignación.');
  return respuesta;
}
