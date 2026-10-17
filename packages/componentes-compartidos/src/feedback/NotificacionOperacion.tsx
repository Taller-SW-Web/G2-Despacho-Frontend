import { Button, Stack, Text } from '@mantine/core';
import { notifications, notificationsStore, type NotificationData } from '@mantine/notifications';
import { IconAlertTriangle, IconCircleCheck, IconInfoCircle } from '@tabler/icons-react';
import type { AccionUi } from '../tipos-ui';

export type EntradaNotificacionOperacion = {
  id: string;
  tipo: 'exito' | 'efectoPendiente' | 'informacion';
  mensaje: string;
  accion?: AccionUi;
  alAccionar?: (id: string) => void;
};

/** CR-15. Invocar desde el consumidor después de confirmar el resultado. */
export function notificarOperacion({ id, tipo, mensaje, accion, alAccionar }: EntradaNotificacionOperacion): string {
  const Icono = tipo === 'exito' ? IconCircleCheck : tipo === 'efectoPendiente' ? IconAlertTriangle : IconInfoCircle;
  const datos: NotificationData = {
    id,
    color: tipo === 'exito' ? 'green' : tipo === 'efectoPendiente' ? 'yellow' : 'blue',
    icon: <Icono size={20} aria-hidden="true" />,
    autoClose: tipo === 'exito' ? 4000 : false,
    role: 'status',
    'aria-live': 'polite',
    closeButtonProps: { 'aria-label': 'Cerrar notificación' },
    message: <Stack gap="xs">
      <Text size="sm">{mensaje}</Text>
      {accion && <>
        <Button type="button" variant="subtle" mih={44} loading={accion.loading}
          disabled={accion.disabled || !alAccionar} aria-describedby={accion.motivoDeshabilitado ? `${id}-motivo` : undefined}
          onClick={() => { if (!accion.disabled && !accion.loading) alAccionar?.(accion.id); }}>
          {accion.etiqueta}
        </Button>
        {accion.motivoDeshabilitado && <Text id={`${id}-motivo`} size="sm">{accion.motivoDeshabilitado}</Text>}
      </>}
    </Stack>,
  };
  const { notifications: visibles, queue: cola } = notificationsStore.getState();
  if ([...visibles, ...cola].some((notificacion) => notificacion.id === id)) notifications.update(datos);
  else notifications.show(datos);
  return id;
}
