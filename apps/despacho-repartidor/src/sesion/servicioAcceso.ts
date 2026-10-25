import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { z } from 'zod';
import { ErrorOperacion, aErrorOperacion } from '../api/errores';

export type SesionIniciada = { token: string; expiraEn: number; usuario: string };

const esquemaRespuesta = z.object({
  accessToken: z.string().regex(/^[\w-]+\.[\w-]+\.[\w-]+$/),
  tokenType: z.string().refine((tipo) => tipo.toLowerCase() === 'bearer'),
  expiresIn: z.number().positive(),
});

/**
 * Único punto de integración con el acceso de Seguridad y Usuarios (contrato externo §8.5, propuesto).
 * POST {origen}/api/v1/auth/login, formulario `usuario` + `clave`, responde { accessToken, tokenType, expiresIn }.
 * Si Seguridad publica otra forma, solo cambia esta función; el resto de la app consume SesionIniciada.
 */
export async function iniciarSesionSeguridad(origen: string, usuario: string, clave: string): Promise<SesionIniciada> {
  try {
    const formulario = new URLSearchParams({ usuario: usuario.trim(), clave });
    const { data } = await axios.post(`${origen.replace(/\/$/, '')}/api/v1/auth/login`, formulario, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000,
    });
    const respuesta = esquemaRespuesta.parse(data);
    return { token: respuesta.accessToken, expiraEn: expiracion(respuesta.accessToken, respuesta.expiresIn), usuario: usuario.trim() };
  } catch (error) {
    if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 400)) {
      throw new ErrorOperacion('validacion', 'Usuario o contraseña incorrectos.');
    }
    const traducido = aErrorOperacion(error);
    throw traducido.tipo === 'sinConexion' ? traducido
      : new ErrorOperacion('noDisponible', 'No pudimos validar tu acceso. Inténtalo nuevamente en unos minutos.');
  }
}

/** La vigencia sale del propio JWT; `expiresIn` solo cubre un token sin exp legible. */
export function expiracion(token: string, segundosDeclarados?: number): number {
  try {
    const { exp } = jwtDecode<{ exp?: number }>(token);
    if (typeof exp === 'number') return exp * 1000;
  } catch { /* Token ilegible: se usa la vigencia declarada. */ }
  return Date.now() + (segundosDeclarados ?? 0) * 1000;
}
