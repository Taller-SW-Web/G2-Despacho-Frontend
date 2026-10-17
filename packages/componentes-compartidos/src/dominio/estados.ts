import { IconAlertCircle, IconArrowBackUp, IconBan, IconCircleCheck, IconClockHour4, IconGauge, IconHelpCircle, IconMoon, IconTruckDelivery, IconUserCheck } from '@tabler/icons-react';

type ConfiguracionEstado = {
  etiqueta: string;
  semantica: 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'availability';
  Icono: typeof IconClockHour4;
  textoSecundario?: boolean;
};

/** CR-09: configuración compartida, independiente de la disponibilidad para asignar. */
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

export const estadosOperacionRepartidor = {
  DISPONIBLE: { etiqueta: 'Disponible', semantica: 'availability', Icono: IconCircleCheck },
  EN_RUTA: { etiqueta: 'En ruta', semantica: 'info', Icono: IconTruckDelivery },
  SATURADO: { etiqueta: 'Saturado', semantica: 'error', Icono: IconGauge },
  FUERA_DE_TURNO: { etiqueta: 'Fuera de turno', semantica: 'neutral', Icono: IconMoon, textoSecundario: true },
} as const satisfies Record<string, ConfiguracionEstado>;

export function obtenerEstadoOperacionRepartidor(valor: unknown): ConfiguracionEstado {
  return typeof valor === 'string' && Object.hasOwn(estadosOperacionRepartidor, valor)
    ? estadosOperacionRepartidor[valor as keyof typeof estadosOperacionRepartidor]
    : estadoNoDisponible;
}
