import type { DetalleIncidencia } from './modeloDetalle';

/** Datos sintéticos para presentación y transporte; no acreditan servicios ni almacenamiento reales. */
export function detallePrueba(cambios: Partial<DetalleIncidencia> = {}): DetalleIncidencia {
  return {
    idDespacho: 'despacho-1', codigoRastreoInterno: 'DSP-SINTETICO', estado: 'FALLIDO', versionDespacho: 4,
    actualizadoEn: '2026-10-16T18:00:00Z', ultimoCambioEstadoEn: '2026-10-16T17:00:00Z', consultadoEn: '2026-10-16T18:01:00Z',
    numeroIntentos: 1, maximoIntentos: 3, pedidoAnulado: false,
    incidencia: { idIncidencia: 'incidencia-2', fechaIncidencia: '2026-10-16T17:00:00Z', motivo: { codigo: 'NO_INTENTADO', etiqueta: 'No intentado por fin de jornada' },
      comentario: null, consumeIntento: false, repartidor: { idRepartidor: 'repartidor-2', nombre: null },
      jornada: { idJornada: 'jornada-2', estado: 'DESCONOCIDA', cerradaEn: null, consultadaEn: null }, retornoAtrasado: null,
      recepcion: { estado: 'PENDIENTE_RETORNO', confirmadaEn: null, idUsuario: null, selloIntacto: null, observacion: null, liberacionCapacidad: null },
      evidencia: { idEvidencia: null, estadoReferencia: 'SIN_EVIDENCIA' },
    },
    historial: [{ id: 'historial-1', fechaServidor: '2026-10-15T18:00:00Z', tipoOperacion: 'RECEPCION_EN_CENTRO',
      estadoAnterior: 'FALLIDO', estadoNuevo: 'FALLIDO', funcionalidadOrigen: 'F-04', ejecutorTipo: 'USUARIO', ejecutorId: 'gestor-anterior',
      origen: 'MANUAL', motivo: null, observacion: 'Recepción de la primera salida', datos: { idIncidencia: 'incidencia-1', selloIntacto: false } },
    { id: 'historial-2', fechaServidor: '2026-10-16T17:00:00Z', tipoOperacion: 'TRANSICION', estadoAnterior: 'ASIGNADO', estadoNuevo: 'FALLIDO',
      funcionalidadOrigen: 'F-03', ejecutorTipo: 'SISTEMA', ejecutorId: null, origen: 'AUTOMATICO', motivo: { codigo: 'NO_INTENTADO', etiqueta: 'No intentado' },
      observacion: null, datos: { idIncidencia: 'incidencia-2', consumeIntento: false, numeroIntentos: 1 } }],
    comunicaciones: [{ idEvento: 'evento-1', tipoEvento: 'DESPACHO_FALLIDO', estadoEnvio: 'ENVIO_FALLIDO', creadoEn: '2026-10-16T17:00:00Z', enviadoEn: null }],
    acciones: { confirmarRecepcion: { habilitada: true, motivosBloqueo: [] }, reprogramar: { habilitada: false, motivosBloqueo: ['RECEPCION_PENDIENTE'] },
      cerrarComoDevueltoAOrigen: { habilitada: false, motivosBloqueo: ['RECEPCION_PENDIENTE'] } }, ...cambios,
  };
}
