import { detalleReprogramable } from './fixtures.reprogramacion.prueba';

/** Datos sintéticos de UI; no acreditan persistencia ni procesamiento de Ventas. */
export const detalleCerrable = detalleReprogramable;
export function respuestaCierre() {
  return { status: 200, data: { idDespacho: 'despacho-1', idIncidencia: 'incidencia-2', estado: 'DEVUELTO_A_ORIGEN',
    versionDespacho: 5, motivo: 'Decisión operativa', numeroIntentos: 1, observacion: null,
    cerradoEn: '2026-10-25T03:31:00Z', idEvento: 'evento-cierre' } };
}
