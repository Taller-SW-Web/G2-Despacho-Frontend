import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { crearAccesoSeguridad, crearGestorSesion, ErrorSesion, type GestorSesion, type Sesion } from '@despacho/cliente-api/sesion';
import { MODO_DEMO, URL_SEGURIDAD } from '../config';
import { iniciarSesionDemo } from '../api/operacionDemo';

export type MotivoCierre = 'manual' | 'expirada' | null;
export const SEGURIDAD_LOCAL = import.meta.env.DEV && !MODO_DEMO && (import.meta.env.VITE_SEGURIDAD_LOCAL === 'true'
  || (import.meta.env.VITE_SEGURIDAD_LOCAL !== 'false' && !import.meta.env.VITE_SEGURIDAD_URL));
function crearGestor() {
  const acceso = crearAccesoSeguridad(URL_SEGURIDAD, SEGURIDAD_LOCAL ? '/__sesion-local/codigo-otp' : undefined);
  if (MODO_DEMO) {
    acceso.iniciar = async (usuario, clave): Promise<Sesion> => {
      const demo = await iniciarSesionDemo(usuario, clave);
      return { accessToken: demo.token, refreshToken: '', tokenType: 'Bearer', expiresIn: 900, expiraEn: demo.expiraEn,
        usuario: { id: 'demo', nombreCompleto: usuario, correo: usuario, roles: [] } };
    };
    acceso.cerrar = async () => {};
    acceso.renovar = async () => { throw new ErrorSesion('REFRESCO_INVALIDO', 'Vuelve a ingresar a la demostración.', 401); };
  }
  return crearGestorSesion(acceso);
}
type ContextoSesion = {
  sesion: { token: string; expiraEn: number; usuario: string } | null;
  motivoCierre: MotivoCierre; gestor: GestorSesion;
  iniciar: (usuario: string, clave: string) => Promise<void>;
  cerrar: (motivo?: Exclude<MotivoCierre, null>) => void;
  obtenerToken: () => string | null; prepararToken: () => Promise<string | null>;
};
const Contexto = createContext<ContextoSesion | null>(null);
export function SesionProveedor({ children }: { children: ReactNode }) {
  const referencia = useRef<GestorSesion | null>(null);
  if (!referencia.current) referencia.current = crearGestor();
  const gestor = referencia.current;
  const estado = useSyncExternalStore(gestor.suscribir, gestor.leer);
  useEffect(gestor.activar, [gestor]);
  const cerrar = useCallback((motivo?: Exclude<MotivoCierre, null>) => {
    if (motivo === 'expirada') gestor.invalidar(); else void gestor.cerrar();
  }, [gestor]);
  useEffect(() => { try {
    ['despacho.token', 'despacho.repartidor.expiraEn', 'despacho.repartidor.usuario'].forEach(clave => localStorage.removeItem(clave));
  } catch { /* La sesión actual solo usa memoria. */ } }, []);
  const valor = useMemo<ContextoSesion>(() => ({
    sesion: estado.sesion ? { token: estado.sesion.accessToken, expiraEn: estado.sesion.expiraEn, usuario: estado.sesion.usuario.nombreCompleto } : null,
    motivoCierre: estado.motivo, gestor, iniciar: gestor.iniciar,
    cerrar,
    obtenerToken: gestor.obtenerToken, prepararToken: gestor.prepararToken,
  }), [estado, gestor, cerrar]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
export function useSesion(): ContextoSesion {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useSesion debe usarse dentro de <SesionProveedor>');
  return contexto;
}
