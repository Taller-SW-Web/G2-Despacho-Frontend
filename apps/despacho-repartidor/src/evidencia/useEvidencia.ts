import { useCallback, useRef, useState } from 'react';
import type { FaseCapturaEvidencia } from '@despacho/componentes-compartidos';
import { useOperacion } from '../api/ContextoOperacion';
import { aErrorOperacion } from '../api/errores';
import type { TipoEvidencia } from '../api/tipos';
import { optimizarFoto } from './optimizarFoto';

export type EstadoEvidencia = {
  foto: File | null;
  fase: FaseCapturaEvidencia;
  progreso: number | null;
  error: string | undefined;
};

/**
 * Captura → optimización → carga. La foto subida se reutiliza en los reintentos del comando;
 * solo una foto nueva solicita otra autorización de carga.
 */
export function useEvidencia(idDespacho: string, tipo: TipoEvidencia, optimizar = optimizarFoto) {
  const operacion = useOperacion();
  const [estado, setEstado] = useState<EstadoEvidencia>({ foto: null, fase: 'vacia', progreso: null, error: undefined });
  const idEvidencia = useRef<{ foto: File; id: string } | null>(null);
  const generacion = useRef(0);

  const seleccionar = useCallback(async (archivo: File) => {
    const actual = ++generacion.current;
    idEvidencia.current = null;
    setEstado({ foto: null, fase: 'procesando', progreso: null, error: undefined });
    try {
      const foto = await optimizar(archivo);
      if (actual === generacion.current) setEstado({ foto, fase: 'lista', progreso: null, error: undefined });
    } catch (error) {
      if (actual === generacion.current) setEstado({ foto: null, fase: 'error', progreso: null,
        error: error instanceof Error ? error.message : 'No se pudo procesar la foto. Toma otra.' });
    }
  }, [optimizar]);

  const descartar = useCallback(() => {
    generacion.current++;
    idEvidencia.current = null;
    setEstado({ foto: null, fase: 'vacia', progreso: null, error: undefined });
  }, []);

  /** Devuelve el idEvidencia de la foto actual, subiéndola solo si aún no se subió. */
  const asegurarCarga = useCallback(async (): Promise<string> => {
    const foto = estado.foto;
    if (!foto) throw new Error('Toma la foto antes de confirmar.');
    if (idEvidencia.current?.foto === foto) return idEvidencia.current.id;
    setEstado((previo) => ({ ...previo, fase: 'subiendo', progreso: 0, error: undefined }));
    try {
      const id = await operacion.subirEvidencia(idDespacho, tipo, foto,
        (progreso) => setEstado((previo) => ({ ...previo, progreso })));
      idEvidencia.current = { foto, id };
      setEstado((previo) => ({ ...previo, fase: 'cargada', progreso: null }));
      return id;
    } catch (error) {
      const mensaje = aErrorOperacion(error).message;
      setEstado((previo) => ({ ...previo, fase: 'error', progreso: null, error: mensaje }));
      throw error;
    }
  }, [estado.foto, idDespacho, operacion, tipo]);

  return { ...estado, seleccionar, descartar, asegurarCarga };
}
