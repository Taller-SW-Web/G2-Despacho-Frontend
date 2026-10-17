import { IconAlertCircle, IconArrowBackUp, IconBan, IconCircleCheck, IconClockHour4, IconHelpCircle, IconTruckDelivery, IconUserCheck } from '@tabler/icons-react';
import { IconAlertTriangle, IconArrowRight, IconCalendarTime, IconCircleOff, IconClockExclamation, IconClockPause, IconFlask, IconGauge, IconHourglass, IconLink, IconLinkOff, IconMoon, IconPackageImport, IconRepeat, IconTool, IconTruck } from '@tabler/icons-react';

type ConfiguracionEstado = {
  etiqueta: string;
  semantica: 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'availability' | 'signal';
  Icono?: typeof IconClockHour4;
  presentacion?: 'texto' | 'icono';
  textoSecundario?: boolean;
};

/** CR-09: configuración visual; no representa transiciones ni permisos. */
export const estadosDespacho = {
  PENDIENTE_ASIGNACION: { etiqueta: 'Pendiente de asignación', semantica: 'neutral', Icono: IconClockHour4 },
  ASIGNADO: { etiqueta: 'Asignado', semantica: 'info', Icono: IconUserCheck },
  EN_CAMINO: { etiqueta: 'En camino', semantica: 'info', Icono: IconTruckDelivery },
  ENTREGADO: { etiqueta: 'Entregado', semantica: 'success', Icono: IconCircleCheck },
  FALLIDO: { etiqueta: 'Fallido', semantica: 'error', Icono: IconAlertCircle },
  DEVUELTO_A_ORIGEN: { etiqueta: 'Devuelto a origen', semantica: 'warning', Icono: IconArrowBackUp },
  CANCELADO: { etiqueta: 'Cancelado', semantica: 'neutral', Icono: IconBan, textoSecundario: true },
} as const satisfies Record<string, ConfiguracionEstado>;

export const estadoNoDisponible: ConfiguracionEstado = { etiqueta: 'Estado no disponible', semantica: 'neutral', Icono: IconHelpCircle };

export function obtenerEstadoDespacho(valor: unknown): ConfiguracionEstado {
  return typeof valor === 'string' && Object.hasOwn(estadosDespacho, valor)
    ? estadosDespacho[valor as keyof typeof estadosDespacho]
    : estadoNoDisponible;
}

const estadosRegistro = {
  ACTIVO: { etiqueta: 'Activo', semantica: 'success', Icono: IconCircleCheck },
  INACTIVO: { etiqueta: 'Inactivo', semantica: 'neutral', Icono: IconCircleOff, textoSecundario: true },
} as const;

export const estadosPorContexto = {
  despacho: estadosDespacho,
  operacionRepartidor: {
    DISPONIBLE: { etiqueta: 'Disponible', semantica: 'availability', Icono: IconCircleCheck },
    EN_RUTA: { etiqueta: 'En ruta', semantica: 'info', Icono: IconTruckDelivery },
    SATURADO: { etiqueta: 'Saturado', semantica: 'error', Icono: IconGauge },
    FUERA_DE_TURNO: { etiqueta: 'Fuera de turno', semantica: 'neutral', Icono: IconMoon, textoSecundario: true },
  },
  registro: estadosRegistro,
  zona: estadosRegistro,
  vehiculo: {
    DISPONIBLE: { etiqueta: 'Disponible', semantica: 'availability', Icono: IconCircleCheck },
    EN_JORNADA: { etiqueta: 'En jornada', semantica: 'info', Icono: IconTruck },
    EN_MANTENIMIENTO: { etiqueta: 'En mantenimiento', semantica: 'warning', Icono: IconTool },
    FUERA_DE_SERVICIO: { etiqueta: 'Fuera de servicio', semantica: 'neutral', Icono: IconCircleOff, textoSecundario: true },
    INACTIVO: estadosRegistro.INACTIVO,
  },
  vinculacion: {
    VINCULADO: { etiqueta: 'Vinculado', semantica: 'neutral', Icono: IconLink, presentacion: 'texto', textoSecundario: true },
    PENDIENTE: { etiqueta: 'Vinculación pendiente · No puede recibir jornada', semantica: 'warning', Icono: IconLinkOff },
  },
  recepcion: {
    PENDIENTE_RETORNO: { etiqueta: 'Pendiente de retorno', semantica: 'warning', Icono: IconHourglass },
    RECIBIDO_EN_CENTRO: { etiqueta: 'Recibido en centro', semantica: 'success', Icono: IconPackageImport },
  },
  etiqueta: {
    SIMULADO: { etiqueta: 'Simulado', semantica: 'neutral', Icono: IconFlask },
    NUEVO: { etiqueta: 'Nuevo', semantica: 'signal' },
    PROGRAMADO: { etiqueta: 'Programado para', semantica: 'info', Icono: IconCalendarTime },
    REINTENTO: { etiqueta: 'Reintento', semantica: 'warning', Icono: IconRepeat },
    TIEMPO_ESPERA_ELEVADO: { etiqueta: 'Tiempo de espera elevado', semantica: 'neutral', Icono: IconClockExclamation, presentacion: 'icono' },
    NO_INTENTADO: { etiqueta: 'No intentado en esta salida', semantica: 'neutral', Icono: IconClockPause },
    PEDIDO_ANULADO: { etiqueta: 'Pedido anulado', semantica: 'error', Icono: IconBan },
    RETORNO_ATRASADO: { etiqueta: 'Retorno atrasado', semantica: 'error', Icono: IconAlertTriangle },
    SIN_TARIFA_CONFIGURADA: { etiqueta: 'Sin tarifa configurada', semantica: 'warning', Icono: IconAlertTriangle },
    SIGUIENTE: { etiqueta: 'Siguiente', semantica: 'neutral', Icono: IconArrowRight },
  },
} as const satisfies Record<string, Record<string, ConfiguracionEstado>>;

export type ContextoEstado = keyof typeof estadosPorContexto;

export function obtenerEstado(contexto: ContextoEstado, valor: unknown): ConfiguracionEstado {
  const estados: Record<string, ConfiguracionEstado> = estadosPorContexto[contexto];
  return estados && typeof valor === 'string' && Object.hasOwn(estados, valor)
    ? estados[valor] : estadoNoDisponible;
}
