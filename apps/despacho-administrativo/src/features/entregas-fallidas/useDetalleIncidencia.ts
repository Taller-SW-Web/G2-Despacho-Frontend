import { useEffect, useRef, useState } from 'react';
import { useClienteApi } from '../../cliente/useClienteApi';
import { consultarDetalle, errorDetalle } from './apiDetalle';
import type { DetalleIncidencia } from './modeloDetalle';

type Consulta = { id: string; detalle: DetalleIncidencia | null; cargando: boolean; error: ReturnType<typeof errorDetalle> | null; cambioIncidencia: boolean };

export function useDetalleIncidencia(idDespacho: string, incidenciaOrigen: string | null) {
  const cliente = useClienteApi();
  const [estado, establecer] = useState<Consulta>({ id: idDespacho, detalle: null, cargando: true, error: null, cambioIncidencia: false });
  const recargar = useRef(() => {});
  const revocar = useRef(() => {});
  useEffect(() => {
    let vigente = true;
    let ocupado = false;
    let bloqueado = false;
    let generacion = 0;
    let controlador: AbortController | null = null;
    establecer({ id: idDespacho, detalle: null, cargando: true, error: null, cambioIncidencia: false });
    const retirar = () => {
      generacion++;
      bloqueado = true;
      controlador?.abort();
      ocupado = false;
      establecer({ id: idDespacho, detalle: null, cargando: false, error: errorDetalle({ isAxiosError: true, response: { status: 401 } }), cambioIncidencia: false });
    };
    const consultar = async () => {
      if (!vigente || ocupado || bloqueado) return;
      ocupado = true;
      const solicitud = ++generacion;
      controlador = new AbortController();
      establecer((anterior) => ({ ...anterior, cargando: true, error: null }));
      try {
        const detalle = await consultarDetalle(cliente, idDespacho, controlador.signal);
        if (!vigente || bloqueado || solicitud !== generacion) return;
        establecer((anterior) => ({ id: idDespacho, detalle, cargando: false, error: null,
          cambioIncidencia: anterior.cambioIncidencia || Boolean((anterior.detalle?.incidencia.idIncidencia ?? incidenciaOrigen)
            && (anterior.detalle?.incidencia.idIncidencia ?? incidenciaOrigen) !== detalle.incidencia.idIncidencia) }));
      } catch (fallo) {
        if (!vigente || bloqueado || solicitud !== generacion) return;
        const error = errorDetalle(fallo);
        if (error.sinPermiso) bloqueado = true;
        establecer((anterior) => ({ ...anterior, cargando: false, error,
          detalle: error.sinPermiso || error.noEncontrado || error.inconsistente ? null : anterior.detalle }));
      } finally { if (solicitud === generacion) ocupado = false; }
    };
    recargar.current = () => { bloqueado = false; void consultar(); };
    revocar.current = retirar;
    const alActivar = () => { if (document.visibilityState === 'visible') void consultar(); };
    const alCambiarSesion = (evento: Event) => {
      if (evento instanceof StorageEvent && evento.key && !['despacho.token', 'despacho.sesionCerrada'].includes(evento.key)) return;
      retirar();
    };
    const temporizador = window.setInterval(() => { if (document.visibilityState !== 'hidden') void consultar(); }, 30_000);
    document.addEventListener('visibilitychange', alActivar);
    window.addEventListener('storage', alCambiarSesion);
    window.addEventListener('despacho:sesion', alCambiarSesion);
    void consultar();
    return () => { vigente = false; generacion++; controlador?.abort(); window.clearInterval(temporizador);
      document.removeEventListener('visibilitychange', alActivar); window.removeEventListener('storage', alCambiarSesion); window.removeEventListener('despacho:sesion', alCambiarSesion); };
  }, [cliente, idDespacho, incidenciaOrigen]);
  return { ...estado, detalle: estado.id === idDespacho ? estado.detalle : null,
    cargando: estado.id !== idDespacho || estado.cargando, actualizar: () => recargar.current(), retirarAutorizacion: () => revocar.current() };
}
