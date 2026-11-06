import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ProblemaApi } from '@despacho/tipos-compartidos';

/** La URL base es el origen público del Gateway; las rutas incluyen /api/v1. */
export function crearClienteApi(urlBase: string, obtenerToken: () => string | null | Promise<string | null>,
  alRechazarToken?: (rechazado: string | null) => void, recuperarToken?: (rechazado: string | null) => Promise<string | null>) {
  const cliente = axios.create({ baseURL: urlBase.replace(/\/$/, ''), timeout: 15000 });

  cliente.interceptors.request.use(async (configuracion) => {
    const token = await obtenerToken();
    if (token) configuracion.headers.Authorization = `Bearer ${token}`;
    else configuracion.headers.delete('Authorization');
    return configuracion;
  });

  cliente.interceptors.response.use(respuesta => respuesta, async error => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) return Promise.reject(error);
    const configuracion = error.config as (InternalAxiosRequestConfig & { sesionReintentada?: boolean }) | undefined;
    const codigo = error.response.data?.code;
    const cabecera = configuracion?.headers.Authorization;
    const rechazado = typeof cabecera === 'string' ? cabecera.replace(/^Bearer /, '') : null;
    // Solo repetir un rechazo explícito del filtro JWT, antes de ejecutar negocio, una vez.
    if (configuracion && !configuracion.sesionReintentada && recuperarToken
      && (codigo === 'TOKEN_INVALIDO' || codigo === 'DESP_ERROR_TOKEN_INVALIDO')) {
      configuracion.sesionReintentada = true;
      const nuevo = await recuperarToken(rechazado);
      if (nuevo) { configuracion.headers.Authorization = `Bearer ${nuevo}`; return cliente.request(configuracion); }
    }
    alRechazarToken?.(rechazado);
    return Promise.reject(error);
  });

  return cliente;
}

export function obtenerProblemaApi(error: unknown): ProblemaApi | null {
  if (!axios.isAxiosError(error)) return null;
  const respuesta = (error as AxiosError<ProblemaApi>).response;
  if (!respuesta) return null;
  return respuesta.data?.status === respuesta.status ? respuesta.data : null;
}
