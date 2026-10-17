import { z } from 'zod';
import type { ClienteApi } from '../../cliente/useClienteApi';
import { apertura, detalleRecibido, disponibilidadRecibida, jornadaRecibida, monitoreoRecibido, type Apertura } from './modelo';
import { esquemaPagina, repartidorRecibido, furgonetaRecibida } from '../flota/modelo';

export const consultarMonitoreo = async (cliente: ClienteApi, params: URLSearchParams, signal: AbortSignal) => {
  const respuesta = monitoreoRecibido.parse((await cliente.get('/api/v1/flota/monitoreo', { params, signal })).data);
  if (respuesta.pagina !== Number(params.get('pagina') ?? 1) || respuesta.tamanoPagina !== Number(params.get('tamanoPagina') ?? 50)) throw new Error('Página no correspondiente');
  if (params.has('fecha') && respuesta.contenido.some((fila) => fila.jornada && fila.jornada.fecha !== params.get('fecha'))) throw new Error('Jornada de otra fecha');
  return respuesta;
};
export const abrirJornada = async (cliente: ClienteApi, datos: Apertura) => {
  const respuesta = jornadaRecibida.parse((await cliente.post('/api/v1/jornadas', apertura.parse(datos))).data);
  if (respuesta.idRepartidor !== datos.idRepartidor || respuesta.idFurgoneta !== datos.idFurgoneta
      || respuesta.idZona !== datos.idZona || respuesta.fecha !== datos.fecha || respuesta.estado !== 'ACTIVA') throw new Error('Resultado no correspondiente');
  return respuesta;
};
export const cerrarJornada = async (cliente: ClienteApi, id: string) => {
  const respuesta = jornadaRecibida.parse((await cliente.post(`/api/v1/jornadas/${encodeURIComponent(id)}/cierre`)).data);
  if (respuesta.idJornada !== id || respuesta.estado !== 'CERRADA' || !respuesta.cerradaEn) throw new Error('Cierre no verificable');
  return respuesta;
};
export const consultarDetalle = async (cliente: ClienteApi, id: string, signal: AbortSignal) => {
  const respuesta = detalleRecibido.parse((await cliente.get(`/api/v1/jornadas/${encodeURIComponent(id)}`, { signal })).data);
  if (respuesta.idJornada !== id) throw new Error('Detalle de otra jornada');
  return respuesta;
};
/** Contrato reutilizable por F-02; esta lectura no confirma una reserva. */
export const consultarDisponibilidad = async (cliente: ClienteApi, params: URLSearchParams, signal: AbortSignal) =>
  disponibilidadRecibida.parse((await cliente.get('/api/v1/repartidores/disponibles', { params, signal })).data);
async function catalogo<T extends z.ZodTypeAny>(cliente: ClienteApi, ruta: string, esquema: T, filtros: Record<string, string>, signal: AbortSignal): Promise<z.infer<T>[]> {
  const filas: z.infer<T>[] = [];
  let pagina = 1, total = 1;
  do {
    const params = new URLSearchParams({ ...filtros, pagina: String(pagina), tamanoPagina: '100' });
    const respuesta = esquemaPagina(esquema).parse((await cliente.get(ruta, { params, signal })).data);
    if (respuesta.pagina !== pagina || respuesta.tamanoPagina !== 100) throw new Error('Catálogo incoherente');
    filas.push(...respuesta.contenido); total = respuesta.totalPaginas; pagina++;
  } while (pagina <= total);
  return filas;
}
export async function cargarRecursos(cliente: ClienteApi, signal: AbortSignal) {
  const zona = z.object({ id: z.string().uuid(), nombre: z.string(), estado: z.enum(['ACTIVO', 'INACTIVO']) });
  const [repartidores, furgonetas, zonas] = await Promise.all([
    catalogo(cliente, '/api/v1/repartidores', repartidorRecibido, { estadoRegistro: 'ACTIVO', estadoVinculacion: 'VINCULADO' }, signal),
    catalogo(cliente, '/api/v1/furgonetas', furgonetaRecibida, { estado: 'DISPONIBLE' }, signal),
    catalogo(cliente, '/api/v1/zonas', zona, { estado: 'ACTIVO' }, signal),
  ]);
  return {
    repartidores: repartidores.filter((r) => r.estadoRegistro === 'ACTIVO' && r.estadoVinculacion === 'VINCULADO').map((r) => ({ value: r.idRepartidor, label: `${r.nombres} ${r.apellidos}` })),
    furgonetas: furgonetas.filter((f) => f.estado === 'DISPONIBLE').map((f) => ({ value: f.idFurgoneta, label: f.placa })),
    zonas: zonas.filter((z) => z.estado === 'ACTIVO').map((z) => ({ value: z.id, label: z.nombre })),
  };
}
