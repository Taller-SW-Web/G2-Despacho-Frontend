import { useCallback, useEffect, useState } from 'react';
import { aErrorOperacion, type ErrorOperacion } from '../api/errores';

export type Consulta<T> =
  | { estado: 'cargando' }
  | { estado: 'error'; error: ErrorOperacion }
  | { estado: 'lista'; datos: T };

/** Lectura cancelable; `recargar` conserva los datos visibles mientras llega la nueva respuesta. */
export function useConsulta<T>(cargar: (signal: AbortSignal) => Promise<T>) {
  const [revision, setRevision] = useState(0);
  const [consulta, setConsulta] = useState<Consulta<T>>({ estado: 'cargando' });

  useEffect(() => {
    const controlador = new AbortController();
    cargar(controlador.signal).then(
      (datos) => { if (!controlador.signal.aborted) setConsulta({ estado: 'lista', datos }); },
      (error: unknown) => { if (!controlador.signal.aborted) setConsulta({ estado: 'error', error: aErrorOperacion(error) }); },
    );
    return () => controlador.abort();
  }, [cargar, revision]);

  const recargar = useCallback(() => setRevision((actual) => actual + 1), []);
  return { consulta, recargar };
}

/** navigator.onLine con sus eventos: base del aviso «Sin conexión». */
export function useConexion() {
  const [enLinea, setEnLinea] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false);
  useEffect(() => {
    const actualizar = () => setEnLinea(navigator.onLine !== false);
    window.addEventListener('online', actualizar);
    window.addEventListener('offline', actualizar);
    return () => { window.removeEventListener('online', actualizar); window.removeEventListener('offline', actualizar); };
  }, []);
  return enLinea;
}
