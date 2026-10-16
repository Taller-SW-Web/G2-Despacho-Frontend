import { Badge, Box, Text } from '@mantine/core';
import { estadoNoDisponible, obtenerEstadoDespacho } from './estados';
import clases from './BadgeEstado.module.css';

/** Subconjunto CR-09 necesario para CR-19; no implementa los demás contextos. */
export type PropiedadesBadgeEstado = {
  contexto: 'despacho';
  valor: unknown;
  size?: 'sm' | 'md';
  complemento?: string;
};

export function BadgeEstado({ contexto, valor, size = 'md', complemento }: PropiedadesBadgeEstado) {
  const configuracion = contexto === 'despacho' ? obtenerEstadoDespacho(valor) : estadoNoDisponible;
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
