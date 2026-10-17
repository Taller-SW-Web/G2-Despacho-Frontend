import { useEffect, useRef, useState } from 'react';
import type { EstadoVisorEvidencia } from '@despacho/componentes-compartidos';
import { useClienteApi } from '../../cliente/useClienteApi';
import { autorizarEvidencia, errorDetalle } from './apiDetalle';

type Visor = { clave: string; abierto: boolean; estado: EstadoVisorEvidencia; url: string | null; venceEn: string | null };
export function useEvidenciaIncidencia(idDespacho: string, idIncidencia: string, idEvidencia: string | null, alRevocar: () => void) {
  const cliente = useClienteApi();
  const clave = JSON.stringify([idDespacho, idIncidencia, idEvidencia]);
  const claveVigente = useRef(clave); claveVigente.current = clave;
  const generacion = useRef(0);
  const controlador = useRef<AbortController | null>(null);
  const [visor, establecer] = useState<Visor>({ clave, abierto: false, estado: 'carga', url: null, venceEn: null });
  useEffect(() => {
    generacion.current++; controlador.current?.abort();
    establecer({ clave, abierto: false, estado: 'carga', url: null, venceEn: null });
    return () => { generacion.current++; controlador.current?.abort(); };
  }, [clave]);
  useEffect(() => {
    if (!visor.venceEn || !visor.abierto || visor.clave !== clave) return;
    const temporizador = window.setTimeout(() => establecer((anterior) => ({ ...anterior, estado: 'expirada', url: null, venceEn: null })), Math.max(0, Date.parse(visor.venceEn) - Date.now()));
    return () => window.clearTimeout(temporizador);
  }, [visor.venceEn, visor.abierto, visor.clave, clave]);
  const abrir = async () => {
    if (!idEvidencia) return;
    controlador.current?.abort();
    const actual = ++generacion.current;
    controlador.current = new AbortController();
    establecer({ clave, abierto: true, estado: 'carga', url: null, venceEn: null });
    try {
      const acceso = await autorizarEvidencia(cliente, idDespacho, idEvidencia, controlador.current.signal);
      if (generacion.current !== actual || claveVigente.current !== clave) return;
      establecer({ clave, abierto: true, estado: 'lista', url: acceso.urlLectura, venceEn: acceso.venceEn });
    } catch (error) {
      if (generacion.current !== actual || claveVigente.current !== clave) return;
      const fallo = errorDetalle(error);
      establecer({ clave, abierto: true, estado: fallo.sinPermiso ? 'sinPermiso' : 'error', url: null, venceEn: null });
      if (fallo.estado === 401) alRevocar();
    }
  };
  return { ...visor, abierto: visor.clave === clave && visor.abierto, url: visor.clave === clave ? visor.url : null, abrir,
    cerrar: () => { generacion.current++; controlador.current?.abort(); establecer({ clave, abierto: false, estado: 'carga', url: null, venceEn: null }); },
    fallarImagen: () => establecer((anterior) => ({ ...anterior, estado: 'error', url: null, venceEn: null })),
  };
}
