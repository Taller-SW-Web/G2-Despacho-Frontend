import { useEffect, useRef, useState } from 'react';
import type { z } from 'zod';
import { obtenerProblemaApi } from '@despacho/cliente-api';
import { estadoHttp, sinPermiso } from '../flota/api';
import { conflictoAperturaRecibido } from './modelo';

type Aviso = {
  mensaje: string;
  conflicto?: z.infer<typeof conflictoAperturaRecibido>;
};

export function useMutacionJornada(alDenegar: () => void) {
  const bloqueo = useRef(false),
    vigente = useRef(true);
  const [procesando, procesar] = useState(false),
    [aviso, informar] = useState<Aviso | null>(null),
    [incierta, marcarIncierta] = useState(false);
  useEffect(() => {
    vigente.current = true;
    return () => {
      vigente.current = false;
    };
  }, []);
  const ejecutar = async (tarea: () => Promise<void>) => {
    if (bloqueo.current || incierta) return;
    bloqueo.current = true;
    procesar(true);
    informar(null);
    try {
      await tarea();
    } catch (fallo) {
      if (!vigente.current) return;
      if (sinPermiso(fallo)) alDenegar();
      else {
        const estado = estadoHttp(fallo),
          desconocida = !estado || estado >= 500;
        marcarIncierta(desconocida);
        const conflicto =
          estado === 409 ? conflictoAperturaRecibido.safeParse(obtenerProblemaApi(fallo)) : null;
        informar({
          conflicto: conflicto?.data,
          mensaje: desconocida
            ? 'No pudimos confirmar el resultado. Consulta el estado antes de volver a enviar.'
            : estado === 409
              ? 'El recurso cambió, está ocupado o tiene despachos pendientes. Actualiza para revisar su estado.'
              : estado === 404
                ? 'La jornada ya no está disponible. Actualiza el tablero.'
                : 'Revisa los recursos y la fecha. El servidor no aceptó la operación.',
        });
      }
    } finally {
      bloqueo.current = false;
      if (vigente.current) procesar(false);
    }
  };
  return {
    procesando,
    error: aviso?.mensaje,
    conflicto: aviso?.conflicto,
    incierta,
    ejecutar,
    limpiarError: () => informar(null),
    estaVigente: () => vigente.current,
  };
}
