import { useMemo } from 'react';
import { crearClienteApi } from '@despacho/cliente-api';
import { useSesion } from '../sesion/SesionProveedor';

export type ClienteApi = ReturnType<typeof crearClienteApi>;

const URL_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

/** Entrega un cliente Axios ya configurado con la URL base del Gateway y el token vigente. */
export function useClienteApi(): ClienteApi {
  const { obtenerToken } = useSesion();
  return useMemo(() => crearClienteApi(URL_BASE, obtenerToken), [obtenerToken]);
}
