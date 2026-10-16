import { obtenerProblemaApi } from '@despacho/cliente-api';
import type { ClienteApi } from '../../../cliente/useClienteApi';
import type {
  EstadoZona,
  FiltrosZonas,
  PaginaZonas,
  ProblemaZona,
  SolicitudTarifa,
  SolicitudZona,
  Tarifa,
  Zona,
} from '../tipos';

export type ParametrosListado = FiltrosZonas & { pagina: number; tamanoPagina: number };

const RECURSO = '/api/v1/zonas';

export function problemaDe(error: unknown): ProblemaZona | null {
  const problema = obtenerProblemaApi(error);
  return problema ? (problema as ProblemaZona) : null;
}

export async function listarZonas(
  cliente: ClienteApi,
  parametros: ParametrosListado,
): Promise<PaginaZonas> {
  const { data } = await cliente.get<PaginaZonas>(RECURSO, {
    params: {
      nombre: parametros.nombre.trim() || undefined,
      distrito: parametros.distrito.trim() || undefined,
      estado: parametros.estado === 'TODOS' ? undefined : parametros.estado,
      pagina: parametros.pagina,
      tamanoPagina: parametros.tamanoPagina,
    },
  });
  return data;
}

export async function obtenerZona(cliente: ClienteApi, idZona: string): Promise<Zona> {
  const { data } = await cliente.get<Zona>(`${RECURSO}/${idZona}`);
  return data;
}

export async function crearZona(cliente: ClienteApi, solicitud: SolicitudZona): Promise<Zona> {
  const { data } = await cliente.post<Zona>(RECURSO, solicitud);
  return data;
}

export async function editarZona(
  cliente: ClienteApi,
  idZona: string,
  solicitud: SolicitudZona,
): Promise<Zona> {
  const { data } = await cliente.put<Zona>(`${RECURSO}/${idZona}`, solicitud);
  return data;
}

export async function cambiarEstado(
  cliente: ClienteApi,
  idZona: string,
  estado: EstadoZona,
): Promise<Zona> {
  const { data } = await cliente.patch<Zona>(`${RECURSO}/${idZona}/estado`, { estado });
  return data;
}

/** Devuelve `null` cuando la zona todavía no tiene tarifa vigente (404 del backend). */
export async function obtenerTarifaVigente(
  cliente: ClienteApi,
  idZona: string,
): Promise<Tarifa | null> {
  try {
    const { data } = await cliente.get<Tarifa>(`${RECURSO}/${idZona}/tarifa`);
    return data;
  } catch (error) {
    if (problemaDe(error)?.status === 404) return null;
    throw error;
  }
}

export async function guardarTarifa(
  cliente: ClienteApi,
  idZona: string,
  solicitud: SolicitudTarifa,
): Promise<Tarifa> {
  const { data } = await cliente.put<Tarifa>(`${RECURSO}/${idZona}/tarifa`, solicitud);
  return data;
}
