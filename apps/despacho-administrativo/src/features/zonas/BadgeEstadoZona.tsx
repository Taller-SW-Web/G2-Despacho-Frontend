import { Badge } from '@mantine/core';
import type { EstadoZona } from './tipos';

export function BadgeEstadoZona({ estado }: { estado: EstadoZona }) {
  const activo = estado === 'ACTIVO';
  return (
    <Badge color={activo ? 'teal' : 'gray'} variant="light" radius="sm">
      {activo ? 'Activo' : 'Inactivo'}
    </Badge>
  );
}
