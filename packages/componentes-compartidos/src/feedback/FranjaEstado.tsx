import { useId } from 'react';
import { Alert, Button, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconMoon, IconWifiOff } from '@tabler/icons-react';
import type { AccionUi } from '../tipos-ui';

export type PropiedadesFranjaEstado = {
  tipo: 'sinConexion' | 'fueraDeTurno' | 'datosDesactualizados';
  mensaje?: string;
  accion?: AccionUi;
  alAccionar?: (id: string) => void;
};
const estados = {
  sinConexion: { titulo: 'Sin conexión', texto: 'Comprueba tu conexión antes de continuar. No se enviarán cambios sin conexión.', Icono: IconWifiOff },
  fueraDeTurno: { titulo: 'Fuera de turno', texto: 'No tienes una jornada activa. Las operaciones de entrega no están habilitadas.', Icono: IconMoon },
  datosDesactualizados: { titulo: 'Datos desactualizados', texto: 'Se conservan los datos anteriores. Actualiza para confirmar el estado antes de operar.', Icono: IconAlertTriangle },
};
/** CR-14 presenta la causa; consultas, reintentos y autorización pertenecen al contenedor. */
export function FranjaEstado({ tipo, mensaje, accion, alAccionar }: PropiedadesFranjaEstado) {
  const estado = estados[tipo];
  const idMotivo = useId();
  return <Alert color={tipo === 'sinConexion' ? 'red' : 'yellow'} variant="light"
    title={estado.titulo} icon={<estado.Icono size={20} aria-hidden="true" />} role="status">
    <Stack gap="xs"><span>{mensaje ?? estado.texto}</span>
      {accion && <Stack gap="xs" align="flex-start"><Button type="button" variant="outline" mih={44} disabled={accion.disabled} loading={accion.loading}
        aria-describedby={accion.motivoDeshabilitado ? idMotivo : undefined} onClick={() => alAccionar?.(accion.id)}>{accion.etiqueta}</Button>
        {accion.motivoDeshabilitado && <Text id={idMotivo} size="sm">{accion.motivoDeshabilitado}</Text>}
      </Stack>}
    </Stack>
  </Alert>;
}
