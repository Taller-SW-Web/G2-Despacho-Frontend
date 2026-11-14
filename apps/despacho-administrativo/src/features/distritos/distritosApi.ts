import type { ClienteApi } from '../../cliente/useClienteApi';
import type { DatosDistrito, DistritoAdministrable, EstadoDistrito } from './tipos';

const RECURSO = '/api/v1/distritos';

export async function consultarDistritos(
  cliente: ClienteApi,
  nombre: string,
  estado: EstadoDistrito | 'TODOS',
  signal?: AbortSignal,
): Promise<DistritoAdministrable[]> {
  const { data } = await cliente.get<DistritoAdministrable[]>(RECURSO, {
    params: { nombre: nombre.trim() || undefined, estado },
    signal,
  });
  return data;
}

export async function obtenerDistrito(
  cliente: ClienteApi,
  id: string,
  signal?: AbortSignal,
): Promise<DistritoAdministrable> {
  const { data } = await cliente.get<DistritoAdministrable>(`${RECURSO}/${id}`, { signal });
  return data;
}

export async function guardarDistrito(
  cliente: ClienteApi,
  datos: DatosDistrito,
  original: DistritoAdministrable | null,
): Promise<DistritoAdministrable> {
  const { data } = original
    ? await cliente.put<DistritoAdministrable>(`${RECURSO}/${original.id}`, {
        ...datos,
        versionDistrito: original.versionDistrito,
      })
    : await cliente.post<DistritoAdministrable>(RECURSO, datos);
  return data;
}

export async function cambiarEstadoDistrito(
  cliente: ClienteApi,
  original: DistritoAdministrable,
): Promise<DistritoAdministrable> {
  const { data } = await cliente.patch<DistritoAdministrable>(`${RECURSO}/${original.id}/estado`, {
    estado: original.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO',
    versionDistrito: original.versionDistrito,
  });
  return data;
}
