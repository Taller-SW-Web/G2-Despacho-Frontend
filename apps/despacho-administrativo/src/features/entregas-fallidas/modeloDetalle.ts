import { z } from 'zod';
import type { EntradaHistorialEstados } from '@despacho/componentes-compartidos';

const instante = z.string().datetime();
const identificador = z.string().min(1);
const motivo = z.object({ codigo: identificador, etiqueta: identificador });
const estadoDespacho = z.enum(['PENDIENTE_ASIGNACION', 'ASIGNADO', 'EN_CAMINO', 'ENTREGADO', 'FALLIDO', 'DEVUELTO_A_ORIGEN', 'CANCELADO']);
const bloqueo = z.enum(['ESTADO_NO_FALLIDO', 'RECEPCION_YA_CONFIRMADA', 'RECEPCION_PENDIENTE', 'PEDIDO_ANULADO', 'MAXIMO_INTENTOS_ALCANZADO']);
const accion = z.object({ habilitada: z.boolean(), motivosBloqueo: z.array(bloqueo) })
  .refine((valor) => valor.habilitada === (valor.motivosBloqueo.length === 0), 'Acción incoherente');
const recepcion = z.object({
  estado: z.enum(['PENDIENTE_RETORNO', 'RECIBIDO_EN_CENTRO']), confirmadaEn: instante.nullable(),
  idUsuario: identificador.nullable(), selloIntacto: z.boolean().nullable(), observacion: z.string().nullable(),
  liberacionCapacidad: z.object({ idSolicitud: identificador, estado: z.enum(['PENDIENTE', 'CONFIRMADA']),
    requiereRevision: z.boolean(), actualizadaEn: instante, confirmadaEn: instante.nullable(),
  }).refine((valor) => valor.estado === 'PENDIENTE' ? valor.confirmadaEn === null : valor.confirmadaEn !== null && !valor.requiereRevision).nullable(),
}).refine((valor) => valor.estado === 'PENDIENTE_RETORNO'
  ? valor.confirmadaEn === null && valor.idUsuario === null && valor.selloIntacto === null && valor.observacion === null && valor.liberacionCapacidad === null
  : valor.confirmadaEn !== null && valor.idUsuario !== null && valor.selloIntacto !== null && valor.liberacionCapacidad !== null, 'Recepción incoherente');
const datosHistorial = z.object({
  idIncidencia: identificador.optional(), idRepartidor: identificador.optional(), idJornada: identificador.optional(),
  idReserva: identificador.optional(), consumeIntento: z.boolean().optional(), numeroIntentos: z.number().int().nonnegative().optional(),
  selloIntacto: z.boolean().optional(), observacionRecepcion: z.string().nullable().optional(),
  nuevaFechaProgramada: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), motivoCierre: z.string().optional(),
  idNuevoRepartidor: identificador.optional(), idNuevaJornada: identificador.optional(),
  despachos: z.array(z.object({ idDespacho: identificador, posicion: z.number().int().positive() })).optional(),
});
export const esquemaDetalle = z.object({
  idDespacho: identificador, codigoRastreoInterno: identificador, estado: estadoDespacho, versionDespacho: z.number().int().positive(),
  actualizadoEn: instante, ultimoCambioEstadoEn: instante, consultadoEn: instante,
  numeroIntentos: z.number().int().nonnegative(), maximoIntentos: z.number().int().positive(), pedidoAnulado: z.boolean(),
  incidencia: z.object({ idIncidencia: identificador, fechaIncidencia: instante, motivo, comentario: z.string().nullable(), consumeIntento: z.boolean(),
    repartidor: z.object({ idRepartidor: identificador, nombre: z.string().nullable() }),
    jornada: z.object({ idJornada: identificador, estado: z.enum(['ACTIVA', 'CERRADA', 'DESCONOCIDA']), cerradaEn: instante.nullable(), consultadaEn: instante.nullable() }),
    retornoAtrasado: z.boolean().nullable(), recepcion,
    evidencia: z.object({ idEvidencia: identificador.nullable(), estadoReferencia: z.enum(['REFERENCIADA', 'SIN_EVIDENCIA', 'REFERENCIA_AUSENTE']) })
      .refine((valor) => (valor.idEvidencia !== null) === (valor.estadoReferencia === 'REFERENCIADA')),
  }),
  historial: z.array(z.object({ id: identificador, fechaServidor: instante,
    tipoOperacion: z.enum(['TRANSICION', 'REASIGNACION', 'REORDENAMIENTO', 'RECEPCION_EN_CENTRO', 'ANULACION_REGISTRADA']),
    estadoAnterior: estadoDespacho.nullable(), estadoNuevo: estadoDespacho, funcionalidadOrigen: z.enum(['F-02', 'F-03', 'F-04']),
    ejecutorTipo: z.enum(['USUARIO', 'SERVICIO', 'SISTEMA']), ejecutorId: identificador.nullable(), origen: z.enum(['MANUAL', 'AUTOMATICO']),
    motivo: motivo.nullable(), observacion: z.string().nullable(), datos: datosHistorial,
  })),
  comunicaciones: z.array(z.object({ idEvento: identificador, tipoEvento: identificador, estadoEnvio: z.enum(['PENDIENTE', 'ENVIADO', 'ENVIO_FALLIDO']), creadoEn: instante, enviadoEn: instante.nullable() })),
  acciones: z.object({ confirmarRecepcion: accion, reprogramar: accion, cerrarComoDevueltoAOrigen: accion }),
});
export const esquemaAccesoEvidencia = z.object({ idEvidencia: identificador, idDespacho: identificador,
  urlLectura: z.string().url().refine((valor) => { const url = new URL(valor); return url.protocol === 'https:' && !url.username && !url.password; }), venceEn: instante,
});
export type DetalleIncidencia = z.infer<typeof esquemaDetalle>;
export type AccionIncidencia = keyof DetalleIncidencia['acciones'];
export type ContextoDecisionIncidencia = {
  idDespacho: string; idIncidencia: string; versionDespacho: number;
  alCompletar: (resultado: 'recepcion' | 'resolucion' | 'conflicto') => void;
};
export type DestinosDetalleIncidencia = Partial<Record<AccionIncidencia, (contexto: ContextoDecisionIncidencia) => void>>;

const nombresOperacion = { TRANSICION: 'Cambio de estado', REASIGNACION: 'Reasignación', REORDENAMIENTO: 'Reordenamiento',
  RECEPCION_EN_CENTRO: 'Recepción en centro', ANULACION_REGISTRADA: 'Anulación registrada' };
const nombresDatos: Record<string, string> = { idIncidencia: 'Incidencia', idRepartidor: 'Repartidor', idJornada: 'Jornada', idReserva: 'Reserva',
  consumeIntento: 'Consume intento', numeroIntentos: 'Intentos consumidos', selloIntacto: 'Sello intacto', observacionRecepcion: 'Observación de recepción',
  nuevaFechaProgramada: 'Nueva fecha programada', motivoCierre: 'Motivo de cierre', idNuevoRepartidor: 'Nuevo repartidor', idNuevaJornada: 'Nueva jornada', despachos: 'Secuencia de despachos' };
export function adaptarHistorial(detalle: DetalleIncidencia): EntradaHistorialEstados[] {
  return detalle.historial.map((entrada) => ({ id: entrada.id, fechaServidor: entrada.fechaServidor,
    descripcionEvento: nombresOperacion[entrada.tipoOperacion], estadoAnterior: entrada.estadoAnterior, estadoNuevo: entrada.estadoNuevo,
    ejecutor: `${entrada.ejecutorTipo === 'USUARIO' ? 'Usuario' : entrada.ejecutorTipo === 'SERVICIO' ? 'Servicio' : 'Sistema'}${entrada.ejecutorId ? ` ${entrada.ejecutorId}` : ''}`,
    observacion: [entrada.origen === 'AUTOMATICO' ? 'Origen automático' : 'Origen manual', entrada.funcionalidadOrigen,
      entrada.motivo?.etiqueta, entrada.observacion, ...Object.entries(entrada.datos).map(([campo, valor]) => `${nombresDatos[campo]}: ${
        typeof valor === 'boolean' ? valor ? 'Sí' : 'No' : valor == null ? 'Sin observaciones'
          : Array.isArray(valor) ? valor.map((posicion) => `${posicion.idDespacho} (${posicion.posicion})`).join(', ') : valor}`)].filter(Boolean).join('\n'),
  }));
}
