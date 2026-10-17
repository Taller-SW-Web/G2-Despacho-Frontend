import { useEffect, useRef, useState } from 'react';
import { camposRechazados, estadoHttp, mensajeError, resultadoDesconocido, sinPermiso } from './api';

/** Bloqueo síncrono; un resultado desconocido requiere consultar antes de otro envío. */
export function useOperacionFlota(alDenegar: () => void) {
  const [procesando, establecerProcesando] = useState(false);
  const [error, establecerError] = useState('');
  const [desconocido, establecerDesconocido] = useState(false);
  const [campos, establecerCampos] = useState<Record<string, string>>({});
  const [conflicto, establecerConflicto] = useState(false);
  const bloqueo = useRef(false);
  const vigente = useRef(true);
  useEffect(() => { vigente.current = true; return () => { vigente.current = false; }; }, []);
  const ejecutar = async (operacion: Parameters<typeof mensajeError>[1], tarea: () => Promise<void>) => {
    if (bloqueo.current || desconocido) return;
    bloqueo.current = true; establecerProcesando(true); establecerError(''); establecerCampos({}); establecerConflicto(false);
    try { await tarea(); }
    catch (error: unknown) {
      if (!vigente.current) return;
      if (sinPermiso(error)) alDenegar();
      else { establecerError(mensajeError(error, operacion)); establecerCampos(camposRechazados(error)); establecerConflicto(estadoHttp(error) === 409); establecerDesconocido(resultadoDesconocido(error)); }
    } finally {
      bloqueo.current = false;
      if (vigente.current) establecerProcesando(false);
    }
  };
  return { procesando, error, desconocido, campos, conflicto, ejecutar, establecerError,
    corregirCampo: (campo: string) => {
      establecerConflicto(false);
      establecerCampos((anteriores) => { const siguientes = { ...anteriores }; delete siguientes[campo]; return siguientes; });
    },
    estaVigente: () => vigente.current };
}
