import { obtenerProblemaApi } from '@despacho/cliente-api';
import axios from 'axios';

export type TipoError = 'sinConexion' | 'sesion' | 'permiso' | 'noEncontrado' | 'conflicto' | 'validacion' | 'noDisponible';

/** Error presentable. `reintentable` indica que la misma clave de idempotencia debe conservarse. */
export class ErrorOperacion extends Error {
  constructor(readonly tipo: TipoError, mensaje: string, readonly codigo?: string) {
    super(mensaje);
    this.name = 'ErrorOperacion';
  }
  get reintentable() { return this.tipo === 'sinConexion' || this.tipo === 'noDisponible'; }
}

const mensajes: Record<TipoError, string> = {
  sinConexion: 'Sin conexión. El cambio no se registró; reintenta cuando tengas señal.',
  sesion: 'Tu sesión expiró. Vuelve a ingresar para continuar.',
  permiso: 'Tu usuario no tiene un perfil de repartidor activo y vinculado.',
  noEncontrado: 'El despacho no pertenece a tu jornada activa o ya no está disponible.',
  conflicto: 'El despacho fue actualizado. Revisa tu ruta antes de continuar.',
  validacion: 'Revisa los datos ingresados.',
  noDisponible: 'El servicio no respondió. El cambio no se registró; reintenta, no se duplicará.',
};

/** Traduce cualquier fallo a un ErrorOperacion; usa el detalle del backend cuando lo hay. */
export function aErrorOperacion(error: unknown): ErrorOperacion {
  if (error instanceof ErrorOperacion) return error;
  if (axios.isAxiosError(error)) {
    if (!error.response) return new ErrorOperacion('sinConexion', mensajes.sinConexion);
    const estado = error.response.status;
    const problema = obtenerProblemaApi(error);
    const tipo: TipoError = estado === 401 ? 'sesion' : estado === 403 ? 'permiso' : estado === 404 ? 'noEncontrado'
      : estado === 409 ? 'conflicto' : estado === 400 || estado === 422 ? 'validacion' : 'noDisponible';
    const mensaje = tipo === 'sesion' || tipo === 'permiso' ? mensajes[tipo] : problema?.detail ?? mensajes[tipo];
    return new ErrorOperacion(tipo, mensaje, (problema as { code?: string } | null)?.code);
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return new ErrorOperacion('sinConexion', mensajes.sinConexion);
  return new ErrorOperacion('noDisponible', mensajes.noDisponible);
}

export const mensajeError = (error: unknown) => aErrorOperacion(error).message;
