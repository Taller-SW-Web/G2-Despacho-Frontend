import type { ClienteApi } from '../../cliente/useClienteApi';
import type {
  CapaDistritos,
  Correspondencia,
  InformeGeografico,
  ResultadoImportacion,
} from './tipos';

const RECURSO = '/api/v1/distritos/geometrias';
export async function consultarCapa(cliente: ClienteApi, signal: AbortSignal, zona?: string) {
  const { data } = await cliente.get<CapaDistritos>(
    zona ? `/api/v1/zonas/${encodeURIComponent(zona)}/geometria` : RECURSO,
    { signal },
  );
  if (data.type !== 'FeatureCollection' || !Array.isArray(data.features))
    throw new Error('La respuesta geográfica no tiene el formato esperado');
  return data;
}
export async function validarGeometrias(
  cliente: ClienteApi,
  solicitud: {
    geojson: unknown;
    fuente: string;
    versionFuente: string;
    nombreArchivo?: string;
    correspondencias: Correspondencia[];
  },
  signal: AbortSignal,
) {
  const { data } = await cliente.post<InformeGeografico>(`${RECURSO}/validaciones`, solicitud, {
    signal,
  });
  return data;
}
export async function importarGeometrias(
  cliente: ClienteApi,
  validacionId: string,
  clave: string,
  signal: AbortSignal,
) {
  const { data } = await cliente.post<ResultadoImportacion>(
    `${RECURSO}/importaciones`,
    { validacionId },
    {
      signal,
      headers: { 'Idempotency-Key': clave },
    },
  );
  return data;
}
