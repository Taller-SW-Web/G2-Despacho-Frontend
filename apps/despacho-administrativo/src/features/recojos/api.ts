import type { ClienteApi } from '../../cliente/useClienteApi';
import { interpretarError } from '../programacion/api';
import { esquemaDisponibles } from '../programacion/modelo';
import { esquemaElegibles, esquemaPaginaRecojos, esquemaRecojo, type AccionRecojo, type Recojo } from './modelo';

export async function consultarRecojos(cliente: ClienteApi, estados: string[], pagina: number, signal: AbortSignal) {
  const params = new URLSearchParams({ estado: estados.join(','), pagina: String(pagina), tamanoPagina: '50' });
  return esquemaPaginaRecojos.parse((await cliente.get('/api/v1/recojos', { params, signal })).data);
}
export async function consultarElegibles(cliente: ClienteApi, signal: AbortSignal) {
  return esquemaElegibles.parse((await cliente.get('/api/v1/recojos/elegibles', { signal })).data).despachos;
}
export async function generarRecojoPrueba(cliente: ClienteApi, idDespacho: string) {
  return esquemaRecojo.parse((await cliente.post(`/api/v1/despachos/${encodeURIComponent(idDespacho)}/recojos/simulacion`)).data);
}
/** Solo jornadas de recojos: la reserva vuelve a validar el tipo en el servidor. */
export async function consultarJornadasRecojo(cliente: ClienteApi, signal: AbortSignal) {
  const params = new URLSearchParams({ tipoOperacion: 'RECOJOS' });
  return esquemaDisponibles.parse((await cliente.get('/api/v1/repartidores/disponibles', { params, signal })).data).repartidores
    .filter((r) => r.estadoOperativo === 'DISPONIBLE' || r.estadoOperativo === 'EN_RUTA');
}
const conControl = (clave: string, version: number) => ({ headers: { 'Idempotency-Key': clave, 'If-Match': String(version) } });
export async function asignarRecojo(cliente: ClienteApi, recojo: Recojo, clave: string, datos: { idRepartidor: string; idJornada: string }) {
  const respuesta = esquemaRecojo.parse((await cliente.post(`/api/v1/recojos/${encodeURIComponent(recojo.idRecojo)}/asignacion`, datos, conControl(clave, recojo.version))).data);
  if (respuesta.idRecojo !== recojo.idRecojo || respuesta.idJornada !== datos.idJornada) throw new Error('La respuesta corresponde a otra asignación.');
  return respuesta;
}
export async function resolverRecojo(cliente: ClienteApi, recojo: Recojo, accion: AccionRecojo, clave: string, datos: Record<string, string>) {
  const respuesta = esquemaRecojo.parse((await cliente.post(`/api/v1/recojos/${encodeURIComponent(recojo.idRecojo)}/${accion}`, datos, conControl(clave, recojo.version))).data);
  if (respuesta.idRecojo !== recojo.idRecojo) throw new Error('La respuesta corresponde a otro recojo.');
  return respuesta;
}
const MENSAJES_409: Record<string, string> = {
  DESP_ERROR_RECOJO_ACTIVO: 'Ese despacho ya tiene un recojo activo.',
  DESP_ERROR_TIPO_JORNADA_INCOMPATIBLE: 'La jornada elegida no es de recojos. Actualiza la lista de repartidores.',
  DESP_ERROR_RESERVA_ANTERIOR_ACTIVA: 'La reserva anterior sigue activa. Espera su liberación y vuelve a intentarlo.',
  DESP_ERROR_FECHA_PROGRAMADA_FUTURA: 'Este recojo está programado para una fecha futura.',
};
export function interpretarErrorRecojo(error: unknown, mutacion = false) {
  const base = interpretarError(error, mutacion);
  if (base.estado !== 409) return base;
  return { ...base, mensaje: MENSAJES_409[String(base.codigo)] ?? 'Este recojo cambió. Actualiza la lista antes de continuar.' };
}
