import { useEffect, useState } from 'react';
import { useClienteApi } from '../../cliente/useClienteApi';
import { detalleProblema, problemaDe } from '../zonas/api/zonasApi';
import { consultarCapa } from './geometriasApi';
import type { CapaDistritos } from './tipos';

export function useCapaGeografica(zona?: string, revisionExterna = 0) {
  const cliente = useClienteApi();
  const [datos, setDatos] = useState<CapaDistritos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denegado, setDenegado] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const peticion = new AbortController();
    setCargando(true);
    setDatos(null);
    setError(null);
    setDenegado(false);
    consultarCapa(cliente, peticion.signal, zona)
      .then((capa) => {
        if (!peticion.signal.aborted) setDatos(capa);
      })
      .catch((fallo) => {
        if (peticion.signal.aborted) return;
        const status = problemaDe(fallo)?.status;
        setDenegado(status === 401 || status === 403);
        setError(
          detalleProblema(
            fallo,
            'No se pudo consultar el mapa. Puedes continuar mediante la lista.',
          ),
        );
      })
      .finally(() => {
        if (!peticion.signal.aborted) setCargando(false);
      });
    return () => peticion.abort();
  }, [cliente, zona, revision, revisionExterna]);
  return { datos, cargando, error, denegado, reintentar: () => setRevision((valor) => valor + 1) };
}
