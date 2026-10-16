import { useEffect, useState } from 'react';
import { useClienteApi } from '../../cliente/useClienteApi';
import { consultarFallidos, consultarMotivos, interpretarError, type ErrorConsultaFallidos } from './api';
import type { MotivoFallo, PaginaFallidos } from './modelo';

type Resultado = { clave: string; pagina: PaginaFallidos };
type Estado = {
  clave: string; cargando: boolean; resultado: Resultado | null; motivos: MotivoFallo[];
  error: ErrorConsultaFallidos | null; errorCatalogo: boolean; sinPermiso: boolean;
};

export function useEntregasFallidas(clave: string, valida: boolean, revision: string) {
  const cliente = useClienteApi();
  const [estado, establecer] = useState<Estado>({ clave, cargando: true, resultado: null, motivos: [], error: null, errorCatalogo: false, sinPermiso: false });
  useEffect(() => {
    if (!valida) return;
    let vigente = true;
    const controlador = new AbortController();
    establecer((anterior) => ({ ...anterior, clave, cargando: true, error: null, errorCatalogo: false }));
    const rechazarPermiso = (error: unknown) => {
      const interpretado = interpretarError(error);
      if (interpretado.permiso && vigente) {
        vigente = false;
        controlador.abort();
        establecer({ clave, cargando: false, resultado: null, motivos: [], error: interpretado, errorCatalogo: false, sinPermiso: true });
      }
      return interpretado;
    };
    // Las dos lecturas se ejecutan en paralelo; cualquiera puede revocar todo el contenido.
    const motivos = consultarMotivos(cliente, controlador.signal).catch((error) => {
      rechazarPermiso(error);
      if (vigente) establecer((anterior) => ({ ...anterior, motivos: [], errorCatalogo: true }));
      return null;
    });
    const pagina = consultarFallidos(cliente, new URLSearchParams(clave), controlador.signal).catch((error) => {
      const interpretado = rechazarPermiso(error);
      if (vigente) establecer((anterior) => ({ ...anterior, error: interpretado }));
      return null;
    });
    Promise.all([motivos, pagina]).then(([catalogo, respuesta]) => {
      if (!vigente) return;
      establecer((anterior) => ({ ...anterior, clave, cargando: false, sinPermiso: false,
        motivos: catalogo ?? [], resultado: respuesta ? { clave, pagina: respuesta } : anterior.resultado }));
    });
    return () => { vigente = false; controlador.abort(); };
  }, [cliente, clave, valida, revision]);
  return { ...estado, cargando: valida && (estado.cargando || estado.clave !== clave) };
}
