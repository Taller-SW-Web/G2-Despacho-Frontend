import axios from 'axios';
import { z } from 'zod';
import type { ClienteApi } from '../../cliente/useClienteApi';
import { datosContacto, datosFurgoneta, datosRepartidor, datosVinculacion, esquemaPagina, furgonetaRecibida, limitesFurgoneta, repartidorRecibido,
  type DatosContacto, type DatosFurgoneta, type DatosRepartidor, type EstadoFurgoneta, type LimitesFurgoneta } from './modelo';

const rutaRepartidor = (id: string) => `/api/v1/repartidores/${encodeURIComponent(id)}`;
const rutaFurgoneta = (id: string) => `/api/v1/furgonetas/${encodeURIComponent(id)}`;
export const listarRepartidores = async (cliente: ClienteApi, params: URLSearchParams, signal: AbortSignal) =>
  esquemaPagina(repartidorRecibido).parse((await cliente.get('/api/v1/repartidores', { params, signal })).data);
export const listarFurgonetas = async (cliente: ClienteApi, params: URLSearchParams, signal: AbortSignal) =>
  esquemaPagina(furgonetaRecibida).parse((await cliente.get('/api/v1/furgonetas', { params, signal })).data);
export const registrarRepartidor = async (cliente: ClienteApi, datos: DatosRepartidor) =>
  repartidorRecibido.parse((await cliente.post('/api/v1/repartidores', datosRepartidor.parse(datos))).data);
export const editarRepartidor = async (cliente: ClienteApi, id: string, datos: DatosContacto) =>
  repartidorRecibido.parse((await cliente.put(rutaRepartidor(id), datosContacto.parse(datos))).data);
export const darDeBaja = async (cliente: ClienteApi, id: string) => {
  await cliente.patch(`${rutaRepartidor(id)}/estado`, { estado: 'INACTIVO' });
};
export const vincularRepartidor = async (cliente: ClienteApi, id: string, usuarioId: string) => {
  await cliente.put(`${rutaRepartidor(id)}/vinculacion`, datosVinculacion.parse({ usuarioId }));
};
export const registrarFurgoneta = async (cliente: ClienteApi, datos: DatosFurgoneta) =>
  furgonetaRecibida.parse((await cliente.post('/api/v1/furgonetas', datosFurgoneta.parse(datos))).data);
export const editarFurgoneta = async (cliente: ClienteApi, id: string, datos: LimitesFurgoneta) =>
  furgonetaRecibida.parse((await cliente.put(rutaFurgoneta(id), limitesFurgoneta.parse(datos))).data);
export const cambiarEstadoFurgoneta = async (cliente: ClienteApi, id: string, estado: EstadoFurgoneta) => {
  await cliente.patch(`${rutaFurgoneta(id)}/estado`, { estado });
};

export function estadoHttp(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}
export function sinPermiso(error: unknown): boolean { return [401, 403].includes(estadoHttp(error) ?? 0); }
/** No se muestran detail, trazas ni mensajes técnicos que devuelva un servicio. */
export function mensajeError(error: unknown, operacion: 'consulta' | 'registro' | 'edicion' | 'baja' | 'vinculacion' | 'estado'): string {
  const estado = estadoHttp(error);
  if (sinPermiso(error)) return 'Tu sesión no permite acceder a estos datos. Inicia sesión con una cuenta autorizada.';
  if (estado === 404) return 'El registro ya no está disponible. Actualiza el listado.';
  if (estado === 409) {
    if (operacion === 'registro') return 'Ya existe un registro con esos datos. Revisa el DNI, correo o placa.';
    if (operacion === 'vinculacion') return 'La cuenta ya está vinculada o el vínculo cambió. Actualiza antes de continuar.';
    if (operacion === 'baja' || operacion === 'estado') return 'No se pudo cambiar el estado. Puede haber despachos en curso o el recurso pudo cambiar. Actualiza el listado.';
    return 'El registro cambió o tiene una operación en curso. Actualiza el listado antes de editar.';
  }
  if (estado === 400 || estado === 422) return 'Revisa los campos indicados y los valores ingresados.';
  if (error instanceof z.ZodError && operacion === 'consulta') return 'La información recibida no se pudo verificar. Reintenta la consulta.';
  if (operacion !== 'consulta' && (!estado || estado >= 500)) return 'No pudimos confirmar el resultado. Consulta el listado antes de volver a enviar la operación.';
  return 'No se pudo completar la consulta. Comprueba tu conexión y vuelve a intentarlo.';
}
export function resultadoDesconocido(error: unknown): boolean {
  const estado = estadoHttp(error);
  return !estado || estado >= 500;
}

export function camposRechazados(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) return {};
  const cuerpo = error.response?.data;
  const resultado: Record<string, string> = {};
  if (!cuerpo || !Array.isArray(cuerpo.errores)) return resultado;
  const permitidos = new Set(['nombres', 'apellidos', 'dni', 'telefono', 'correo', 'numeroBrevete', 'turnoHabitual', 'placa', 'capacidadPesoKg', 'capacidadVolumenM3', 'maximoPaquetes', 'usuarioId']);
  for (const entrada of cuerpo.errores) {
    if (entrada && typeof entrada.campo === 'string' && permitidos.has(entrada.campo)) {
      resultado[entrada.campo] = error.response?.status === 409 ? 'Este valor ya está registrado o no está disponible.' : 'Revisa este campo; el servidor no aceptó el valor.';
    }
  }
  return resultado;
}
