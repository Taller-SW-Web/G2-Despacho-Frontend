import { IconAlertCircle, IconArrowBackUp, IconBan, IconCircleCheck, IconClockHour4, IconHelpCircle, IconTruckDelivery, IconUserCheck } from '@tabler/icons-react';

type ConfiguracionEstado = {
  etiqueta: string;
  semantica: 'neutral' | 'info' | 'success' | 'warning' | 'error';
  Icono: typeof IconClockHour4;
  textoSecundario?: boolean;
};

/** CR-09, contexto despacho. Los demás contextos quedan pendientes de su incremento. */
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
