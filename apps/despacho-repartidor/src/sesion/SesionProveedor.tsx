import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { MODO_DEMO, URL_SEGURIDAD } from '../config';
import { iniciarSesionDemo } from '../api/operacionDemo';
import { iniciarSesionSeguridad, type SesionIniciada } from './servicioAcceso';

const CLAVE_TOKEN = 'despacho.token';
const CLAVE_EXPIRA = 'despacho.repartidor.expiraEn';
const CLAVE_USUARIO = 'despacho.repartidor.usuario';

export type MotivoCierre = 'manual' | 'expirada' | null;

type ContextoSesion = {
  sesion: SesionIniciada | null;
  motivoCierre: MotivoCierre;
  iniciar: (usuario: string, clave: string) => Promise<void>;
  cerrar: (motivo?: Exclude<MotivoCierre, null>) => void;
  obtenerToken: () => string | null;
};

const Contexto = createContext<ContextoSesion | null>(null);

function leer(): SesionIniciada | null {
  try {
    const token = localStorage.getItem(CLAVE_TOKEN);
    const expiraEn = Number(localStorage.getItem(CLAVE_EXPIRA));
    if (!token || !Number.isFinite(expiraEn) || expiraEn <= Date.now()) return null;
    return { token, expiraEn, usuario: localStorage.getItem(CLAVE_USUARIO) ?? '' };
  } catch { return null; }
}

function guardar(sesion: SesionIniciada | null) {
  try {
    if (sesion) {
      localStorage.setItem(CLAVE_TOKEN, sesion.token);
      localStorage.setItem(CLAVE_EXPIRA, String(sesion.expiraEn));
      localStorage.setItem(CLAVE_USUARIO, sesion.usuario);
      localStorage.removeItem('despacho.sesionCerrada');
    } else {
      [CLAVE_TOKEN, CLAVE_EXPIRA, CLAVE_USUARIO].forEach((clave) => localStorage.removeItem(clave));
    }
  } catch { /* Sin almacenamiento, la sesión dura mientras la pestaña siga abierta. */ }
}

/** Sesión del repartidor: JWT de acceso de Seguridad; el perfil de campo lo valida Operación en cada solicitud. */
export function SesionProveedor({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<SesionIniciada | null>(leer);
  const [motivoCierre, setMotivoCierre] = useState<MotivoCierre>(null);

  const cerrar = useCallback((motivo: Exclude<MotivoCierre, null> = 'manual') => {
    guardar(null);
    setSesion(null);
    setMotivoCierre(motivo);
  }, []);

  // El token de acceso es corto; al vencer se vuelve al ingreso en vez de fallar en la siguiente acción.
  useEffect(() => {
    if (!sesion) return;
    const restante = sesion.expiraEn - Date.now();
    const temporizador = window.setTimeout(() => cerrar('expirada'), Math.max(0, Math.min(restante, 2_147_000_000)));
    return () => window.clearTimeout(temporizador);
  }, [sesion, cerrar]);

  const valor = useMemo<ContextoSesion>(() => ({
    sesion,
    motivoCierre,
    iniciar: async (usuario, clave) => {
      const nueva = MODO_DEMO ? await iniciarSesionDemo(usuario, clave) : await iniciarSesionSeguridad(URL_SEGURIDAD, usuario, clave);
      guardar(nueva);
      setMotivoCierre(null);
      setSesion(nueva);
    },
    cerrar,
    obtenerToken: () => (sesion && sesion.expiraEn > Date.now() ? sesion.token : null),
  }), [sesion, motivoCierre, cerrar]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): ContextoSesion {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useSesion debe usarse dentro de <SesionProveedor>');
  return contexto;
}
