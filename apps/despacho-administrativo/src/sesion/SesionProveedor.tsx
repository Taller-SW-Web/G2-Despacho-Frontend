import { createContext, useContext, useMemo, type ReactNode } from 'react';

const CLAVE_TOKEN = 'despacho.token';

type SesionContexto = {
  obtenerToken: () => string | null;
  guardarToken: (token: string | null) => void;
};

const ContextoSesion = createContext<SesionContexto | null>(null);

/**
 * Proveedor provisional de sesión.
 *
 * TODO: reemplazar por el flujo de acceso del módulo Seguridad y Usuarios.
 * Mientras ese módulo no exista, el token se lee de `localStorage` y, si no hay,
 * de la variable pública `VITE_DEV_TOKEN` (solo para desarrollo local). No se
 * guardan secretos en variables `VITE_*`.
 */
export function SesionProveedor({ children }: { children: ReactNode }) {
  const valor = useMemo<SesionContexto>(
    () => ({
      obtenerToken: () => {
        if (localStorage.getItem('despacho.sesionCerrada') === 'true') return null;
        const token = localStorage.getItem(CLAVE_TOKEN);
        if (token) return token;
        const tokenDesarrollo = import.meta.env.DEV ? import.meta.env.VITE_DEV_TOKEN : undefined;
        return typeof tokenDesarrollo === 'string' && tokenDesarrollo.length > 0
          ? tokenDesarrollo
          : null;
      },
      guardarToken: (token) => {
        if (token) {
          localStorage.removeItem('despacho.sesionCerrada');
          localStorage.setItem(CLAVE_TOKEN, token);
        } else {
          localStorage.removeItem(CLAVE_TOKEN);
          localStorage.setItem('despacho.sesionCerrada', 'true');
        }
      },
    }),
    [],
  );

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesion(): SesionContexto {
  const contexto = useContext(ContextoSesion);
  if (!contexto) {
    throw new Error('useSesion debe usarse dentro de <SesionProveedor>');
  }
  return contexto;
}
