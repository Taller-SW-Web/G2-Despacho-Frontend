import { useEffect, useRef, useState } from 'react';
import { estadoHttp, sinPermiso } from '../flota/api';

export function useMutacionJornada(alDenegar: () => void) {
  const bloqueo = useRef(false), vigente = useRef(true);
  const [procesando, procesar] = useState(false), [error, informar] = useState(''), [incierta, marcarIncierta] = useState(false);
  useEffect(() => { vigente.current = true; return () => { vigente.current = false; }; }, []);
  const ejecutar = async (tarea: () => Promise<void>) => {
    if (bloqueo.current || incierta) return;
    bloqueo.current = true; procesar(true); informar('');
    try { await tarea(); }
    catch (fallo) {
      if (!vigente.current) return;
      if (sinPermiso(fallo)) alDenegar();
      else {
        const estado = estadoHttp(fallo), desconocida = !estado || estado >= 500;
        marcarIncierta(desconocida);
        informar(desconocida ? 'No pudimos confirmar el resultado. Consulta el estado antes de volver a enviar.'
          : estado === 409 ? 'El recurso cambió, está ocupado o tiene despachos pendientes. Actualiza para revisar su estado.'
          : estado === 404 ? 'La jornada ya no está disponible. Actualiza el tablero.'
          : 'Revisa los recursos y la fecha. El servidor no aceptó la operación.');
      }
    } finally { bloqueo.current = false; if (vigente.current) procesar(false); }
  };
  return { procesando, error, incierta, ejecutar, estaVigente: () => vigente.current };
}
