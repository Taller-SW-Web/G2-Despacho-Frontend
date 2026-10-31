import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import { MODO_DEMO, URL_API } from '../config';
import { useSesion } from '../sesion/SesionProveedor';
import { ErrorOperacion } from './errores';
import { crearOperacionDemo } from './operacionDemo';
import { crearOperacionHttp } from './operacionHttp';
import type { PuertoOperacion } from './tipos';

const Contexto = createContext<PuertoOperacion | null>(null);

/** Entrega el puerto de Operación; un 401 en cualquier llamada cierra la sesión por vencimiento. */
export function OperacionProveedor({ children, puerto }: { children: ReactNode; puerto?: PuertoOperacion }) {
  const { obtenerToken, cerrar } = useSesion();
  const token = useRef(obtenerToken);
  token.current = obtenerToken;
  const valor = useMemo<PuertoOperacion>(() => {
    const base = puerto ?? (MODO_DEMO ? crearOperacionDemo() : crearOperacionHttp(URL_API, () => token.current()));
    return new Proxy(base, {
      get(objetivo, propiedad, receptor) {
        const original = Reflect.get(objetivo, propiedad, receptor);
        if (typeof original !== 'function') return original;
        return async (...argumentos: unknown[]) => {
          try { return await original.apply(objetivo, argumentos); }
          catch (error) {
            if (error instanceof ErrorOperacion && error.tipo === 'sesion') cerrar('expirada');
            throw error;
          }
        };
      },
    });
  }, [puerto, cerrar]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useOperacion(): PuertoOperacion {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useOperacion debe usarse dentro de <OperacionProveedor>');
  return contexto;
}
