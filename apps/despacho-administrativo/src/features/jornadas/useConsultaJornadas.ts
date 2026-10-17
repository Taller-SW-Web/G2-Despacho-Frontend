import { useCallback, useEffect, useRef, useState } from 'react';
import { sinPermiso } from '../flota/api';

/** Solo la respuesta vigente puede reemplazar datos; perder permisos siempre los retira. */
export function useConsultaJornadas<T>(cargar: (signal: AbortSignal) => Promise<T>, activa = true, intervalo = 0) {
  const [datos, establecerDatos] = useState<T>();
  const [error, establecerError] = useState('');
  const [denegado, establecerDenegado] = useState(false);
  const [cargando, establecerCargando] = useState(false);
  const [confirmada, establecerConfirmada] = useState(false);
  const [revision, revisar] = useState(0);
  const vigente = useRef(0);
  const actualizar = useCallback(() => revisar((valor) => valor + 1), []);
  const denegar = useCallback(() => { vigente.current++; establecerDatos(undefined); establecerDenegado(true); establecerConfirmada(false); establecerCargando(false); }, []);
  useEffect(() => {
    const version = ++vigente.current;
    const controlador = new AbortController();
    establecerConfirmada(false);
    if (!activa || denegado) return;
    establecerCargando(true); establecerError('');
    cargar(controlador.signal).then((resultado) => {
      if (controlador.signal.aborted || vigente.current !== version) return;
      establecerDatos(resultado); establecerConfirmada(true);
    }).catch((fallo: unknown) => {
      if (controlador.signal.aborted || vigente.current !== version) return;
      if (sinPermiso(fallo)) denegar();
      else establecerError('No pudimos confirmar la información. Actualiza antes de continuar.');
    }).finally(() => { if (vigente.current === version) establecerCargando(false); });
    return () => controlador.abort();
  }, [cargar, activa, revision, denegado, denegar]);
  useEffect(() => {
    if (!intervalo || !activa || denegado) return;
    const consultarVisible = () => { if (document.visibilityState === 'visible' && !cargando) actualizar(); };
    const temporizador = window.setInterval(consultarVisible, intervalo);
    document.addEventListener('visibilitychange', consultarVisible);
    return () => { window.clearInterval(temporizador); document.removeEventListener('visibilitychange', consultarVisible); };
  }, [intervalo, activa, denegado, cargando, actualizar]);
  return { datos, error, denegado, cargando, confirmada, actualizar, denegar };
}
