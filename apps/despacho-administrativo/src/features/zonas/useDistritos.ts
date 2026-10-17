import { useEffect, useState } from 'react';
import { useClienteApi } from '../../cliente/useClienteApi';
import { listarDistritos, problemaDe } from './api/zonasApi';
import type { DistritoCatalogo } from './tipos';

/** El catálogo siempre procede del backend; un fallo no se convierte en una lista vacía. */
export function useDistritos() {
  const cliente = useClienteApi();
  const [distritos, setDistritos] = useState<DistritoCatalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denegado, setDenegado] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controlador = new AbortController();
    setCargando(true);
    setError(null);
    setDenegado(false);
    listarDistritos(cliente, controlador.signal).then((datos) => {
      if (!controlador.signal.aborted) setDistritos(datos);
    }).catch((fallo) => {
      if (controlador.signal.aborted) return;
      const status = problemaDe(fallo)?.status;
      setDenegado(status === 401 || status === 403);
      setDistritos([]);
      setError('No se pudo cargar el catálogo de distritos.');
    }).finally(() => { if (!controlador.signal.aborted) setCargando(false); });
    return () => controlador.abort();
  }, [cliente, revision]);
  return { distritos, cargando, error, denegado, reintentar: () => setRevision((valor) => valor + 1) };
}
