import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { crearAccesoSeguridad, crearGestorSesion, type EstadoSesion, type GestorSesion } from '@despacho/cliente-api/sesion';

export const SEGURIDAD_LOCAL = import.meta.env.DEV && (import.meta.env.VITE_SEGURIDAD_LOCAL === 'true'
  || (import.meta.env.VITE_SEGURIDAD_LOCAL !== 'false' && !import.meta.env.VITE_SEGURIDAD_URL));
const ORIGEN = import.meta.env.VITE_SEGURIDAD_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
type SesionContexto = EstadoSesion & {
  modoDemo: boolean; gestor: GestorSesion;
  obtenerToken: () => string | null; prepararToken: () => Promise<string | null>;
  guardarToken: (token: string | null) => void;
};
const ContextoSesion = createContext<SesionContexto | null>(null);

export function SesionProveedor({ children }: { children: ReactNode }) {
  const referencia = useRef<GestorSesion | null>(null);
  if (!referencia.current) referencia.current = crearGestorSesion(crearAccesoSeguridad(ORIGEN,
    SEGURIDAD_LOCAL ? '/__sesion-local/codigo-otp' : undefined), true);
  const gestor = referencia.current;
  const estado = useSyncExternalStore(gestor.suscribir, gestor.leer);
  useEffect(gestor.activar, [gestor]);
  const acciones = useMemo<Omit<SesionContexto, keyof EstadoSesion>>(() => {
    const modoDemo = import.meta.env.DEV && import.meta.env.VITE_DEMO_SIN_AUTENTICACION === 'true';
    // Compatibilidad del probador F-01: solo desarrollo, nunca persiste sesiones de G7.
    const obtenerToken = () => {
      if (modoDemo) return null;
      const actual = gestor.obtenerToken();
      if (actual) return actual;
      if (!import.meta.env.DEV) return null;
      try {
        if (localStorage.getItem('despacho.sesionCerrada') === 'true') return null;
        return localStorage.getItem('despacho.token') || import.meta.env.VITE_DEV_TOKEN || null;
      } catch { return null; }
    };
    return { modoDemo, gestor, obtenerToken,
      prepararToken: async () => modoDemo ? null : gestor.leer().sesion ? gestor.prepararToken() : obtenerToken(),
      guardarToken: token => {
        if (!import.meta.env.DEV || modoDemo) return;
        if (token) { localStorage.setItem('despacho.token', token); localStorage.removeItem('despacho.sesionCerrada'); }
        else { localStorage.removeItem('despacho.token'); localStorage.setItem('despacho.sesionCerrada', 'true'); void gestor.cerrar(); }
        window.dispatchEvent(new Event('despacho:sesion'));
      },
    };
  }, [gestor]);
  const valor = useMemo<SesionContexto>(() => ({ ...estado, ...acciones }), [estado, acciones]);
  useEffect(() => { window.dispatchEvent(new Event('despacho:sesion')); }, [estado.sesion?.usuario.id]);
  useEffect(() => {
    if (estado.sesion || estado.motivo === 'expirada') {
      try { localStorage.removeItem('despacho.token'); localStorage.setItem('despacho.sesionCerrada', 'true'); } catch { /* Sin almacenamiento. */ }
    }
  }, [estado.sesion, estado.motivo]);
  useEffect(() => { if (!import.meta.env.DEV) { try { localStorage.removeItem('despacho.token'); } catch { /* Almacenamiento no disponible. */ } } }, []);
  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}
export function useSesion(): SesionContexto {
  const contexto = useContext(ContextoSesion);
  if (!contexto) throw new Error('useSesion debe usarse dentro de <SesionProveedor>');
  return contexto;
}
