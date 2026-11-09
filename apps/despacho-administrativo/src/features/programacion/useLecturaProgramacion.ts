import { useCallback, useEffect, useState } from 'react';
import { interpretarError, type ErrorProgramacion } from './api';

/** Lectura cancelable: ignora respuestas de filtros/sesiones anteriores incluso si HTTP no cancela. */
export function useLecturaProgramacion<T>(
  cargar: (signal: AbortSignal) => Promise<T>,
  activa = true,
) {
  const [revision, establecerRevision] = useState(0);
  const actualizar = useCallback(() => establecerRevision((r) => r + 1), []);
  const [estado, establecer] = useState<{
    origen: typeof cargar;
    revision: number;
    datos: T | null;
    cargando: boolean;
    error: ErrorProgramacion | null;
  }>({
    origen: cargar,
    revision,
    datos: null,
    cargando: true,
    error: null,
  });
  useEffect(() => {
    if (!activa) return;
    let vigente = true;
    const controlador = new AbortController();
    establecer({ origen: cargar, revision, datos: null, cargando: true, error: null });
    cargar(controlador.signal)
      .then((datos) => {
        if (vigente) establecer({ origen: cargar, revision, datos, cargando: false, error: null });
      })
      .catch((error: unknown) => {
        if (vigente)
          establecer({
            origen: cargar,
            revision,
            datos: null,
            cargando: false,
            error: interpretarError(error),
          });
      });
    return () => {
      vigente = false;
      controlador.abort();
    };
  }, [cargar, revision, activa]);
  // Antes de que corra el efecto, el estado aún puede pertenecer a la consulta anterior.
  const vigente = estado.origen === cargar && estado.revision === revision && activa;
  return {
    datos: vigente ? estado.datos : null,
    error: vigente ? estado.error : null,
    cargando: activa && (!vigente || estado.cargando),
    actualizar,
  };
}

/** Renueva la lectura cada 30 s y al recuperar el foco, salvo con la pestaña oculta. */
export function useVigenciaProgramacion(actualizar: () => void, activa: boolean) {
  useEffect(() => {
    if (!activa) return;
    const renovar = () => {
      if (document.visibilityState !== 'hidden') actualizar();
    };
    const reloj = window.setInterval(renovar, 30_000);
    window.addEventListener('focus', renovar);
    return () => {
      clearInterval(reloj);
      window.removeEventListener('focus', renovar);
    };
  }, [actualizar, activa]);
}
