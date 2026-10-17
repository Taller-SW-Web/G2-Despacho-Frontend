import { crearClienteApi } from '@despacho/cliente-api';

type TokenLocal = { accessToken: string; expiresIn: number; entorno: string };

async function emitir(ruta: string, campos: Record<string, string>): Promise<TokenLocal> {
  const respuesta = await fetch(`/__f01/seguridad${ruta}`, {
    method: 'POST', body: new URLSearchParams(campos),
  });
  if (!respuesta.ok) throw new Error('No se pudo emitir el token. Comprueba que el emisor local esté activo en el puerto 8090.');
  const datos = await respuesta.json() as TokenLocal;
  if (!datos.accessToken || datos.entorno !== 'simulado-local') throw new Error('El emisor no devolvió un token local válido.');
  return datos;
}

export const emitirUsuarioLocal = (perfil: string) => emitir('/pruebas/token-usuario', { perfil });
export const emitirServicioLocal = (scope: string) => emitir('/api/v1/auth/token', {
  grant_type: 'client_credentials', client_id: 'modulo-marketplace',
  client_secret: 'despacho-local-no-produccion', scope,
});

export type RespuestaPrueba = { status: number; cuerpo: unknown };

/** Cliente independiente: una cotización nunca hereda el JWT humano del administrativo. */
export async function probarCotizacion(token: string, solicitud: unknown): Promise<RespuestaPrueba> {
  const cliente = crearClienteApi(import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080', () => token || null);
  const respuesta = await cliente.post('/api/v1/cotizaciones', solicitud, { validateStatus: () => true });
  return { status: respuesta.status, cuerpo: respuesta.data };
}
