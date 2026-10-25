import { detallePrueba } from './fixtures.detalle.prueba';

/** Fixtures de UI: no sustituyen las pruebas HTTP y PostgreSQL de Gestión. */
export function detalleReprogramable() {
  const detalle = detallePrueba({ consultadoEn: '2026-10-25T03:30:00Z' });
  detalle.incidencia.recepcion = { estado: 'RECIBIDO_EN_CENTRO', confirmadaEn: '2026-10-24T22:00:00Z', idUsuario: 'gestor',
    selloIntacto: false, observacion: null, liberacionCapacidad: { idSolicitud: 'lib-1', estado: 'PENDIENTE',
      requiereRevision: true, actualizadaEn: '2026-10-24T22:00:00Z', confirmadaEn: null } };
  detalle.acciones.confirmarRecepcion = { habilitada: false, motivosBloqueo: ['RECEPCION_YA_CONFIRMADA'] };
  detalle.acciones.reprogramar = { habilitada: true, motivosBloqueo: [] };
  detalle.acciones.cerrarComoDevueltoAOrigen = { habilitada: true, motivosBloqueo: [] };
  return detalle;
}
export function respuestaReprogramacion() {
  return { status: 200, data: { idDespacho: 'despacho-1', idIncidencia: 'incidencia-2', estado: 'PENDIENTE_ASIGNACION',
    versionDespacho: 5, fechaProgramada: '2026-10-25', numeroIntentos: 1, observacion: null,
    reprogramadoEn: '2026-10-25T03:31:00Z', idEvento: 'evento-2' } };
}
