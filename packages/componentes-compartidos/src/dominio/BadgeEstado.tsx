import { Badge, Box, Text } from '@mantine/core';
import { IconHourglass, IconPackageImport } from '@tabler/icons-react';
import { estadoNoDisponible, obtenerEstadoDespacho, obtenerEstadoOperacionRepartidor } from './estados';
import clases from './BadgeEstado.module.css';

/** CR-09: contextos requeridos por F-02 y F-04. */
export type PropiedadesBadgeEstado = {
  contexto: 'despacho' | 'recepcion' | 'operacionRepartidor';
  valor: unknown;
  size?: 'sm' | 'md';
  complemento?: string;
};

export function BadgeEstado({ contexto, valor, size = 'md', complemento }: PropiedadesBadgeEstado) {
  const configuracion: ReturnType<typeof obtenerEstadoDespacho> = contexto === 'despacho' ? obtenerEstadoDespacho(valor)
    : contexto === 'operacionRepartidor' ? obtenerEstadoOperacionRepartidor(valor)
    : valor === 'PENDIENTE_RETORNO' ? { etiqueta: 'Pendiente de retorno', semantica: 'warning', Icono: IconHourglass }
    : valor === 'RECIBIDO_EN_CENTRO' ? { etiqueta: 'Recibido en centro', semantica: 'success', Icono: IconPackageImport }
    : estadoNoDisponible;
  const { Icono } = configuracion;
  return <Box component="span" className={clases.raiz}>
    <Badge
      component="span"
      variant="light"
      size={size}
      radius="xl"
      data-semantica={configuracion.semantica}
      data-texto-secundario={configuracion.textoSecundario || undefined}
      className={clases.insignia}
      classNames={{ label: clases.etiqueta }}
      leftSection={<Icono size={size === 'sm' ? 14 : 16} aria-hidden="true" className={clases.icono} />}
    >
      {configuracion.etiqueta}
    </Badge>
    {complemento && <Text component="span" size="sm">{complemento}</Text>}
  </Box>;
}
