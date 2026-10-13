import axios from 'axios';
import type { AxiosError } from 'axios';
import type { ProblemaApi } from '@despacho/tipos-compartidos';

/** La URL base es el origen público del Gateway; las rutas incluyen /api/v1. */
export function crearClienteApi(urlBase: string, obtenerToken: () => string | null) {
  const cliente = axios.create({ baseURL: urlBase.replace(/\/$/, ''), timeout: 15000 });

  cliente.interceptors.request.use((configuracion) => {
    const token = obtenerToken();
    if (token) configuracion.headers.Authorization = `Bearer ${token}`;
    return configuracion;
  });

  return cliente;
}

export function obtenerProblemaApi(error: unknown): ProblemaApi | null {
  if (!axios.isAxiosError(error)) return null;
  const respuesta = (error as AxiosError<ProblemaApi>).response;
  return respuesta?.data?.status === respuesta?.status ? respuesta.data : null;
}
