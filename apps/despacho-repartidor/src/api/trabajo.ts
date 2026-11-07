import type { PuertoOperacion, TipoEvidencia } from './tipos';

export type TipoTrabajo = 'ENTREGA' | 'RECOJO';

/** Las pantallas son las mismas; aquí vive lo que cambia entre una entrega y un recojo. */
export function trabajoDe(operacion: PuertoOperacion, tipo: TipoTrabajo) {
  return tipo === 'RECOJO' ? {
    base: '/repartidor/recojos',
    consultar: operacion.consultarRecojo,
    iniciar: operacion.iniciarTrasladoRecojo,
    registrarFallo: operacion.registrarFalloRecojo,
    motivos: (signal?: AbortSignal) => operacion.consultarMotivos(signal, 'RECOJO'),
    evidenciaFallo: 'FALLO_RECOJO' as TipoEvidencia,
  } : {
    base: '/repartidor/despachos',
    consultar: operacion.consultarDetalle,
    iniciar: operacion.iniciarTraslado,
    registrarFallo: operacion.registrarFallo,
    motivos: (signal?: AbortSignal) => operacion.consultarMotivos(signal),
    evidenciaFallo: 'FALLO' as TipoEvidencia,
  };
}
