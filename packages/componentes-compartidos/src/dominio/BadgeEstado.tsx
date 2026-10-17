import { Badge, Box, Text, Tooltip } from '@mantine/core';
import { obtenerEstado, type ContextoEstado } from './estados';
import clases from './BadgeEstado.module.css';

/** CR-09: estados de presentación de ambas aplicaciones. */
export type PropiedadesBadgeEstado = {
  contexto: ContextoEstado;
  valor: unknown;
  size?: 'sm' | 'md';
  complemento?: string;
};

export function BadgeEstado({ contexto, valor, size = 'md', complemento }: PropiedadesBadgeEstado) {
  const configuracion = obtenerEstado(contexto, valor);
  const { Icono } = configuracion;
  if (configuracion.presentacion === 'icono' && Icono) return <Tooltip label={configuracion.etiqueta} events={{ hover: true, focus: true, touch: true }}>
    <Box component="span" role="img" aria-label={configuracion.etiqueta} tabIndex={0}><Icono aria-hidden="true" size={20} /></Box>
  </Tooltip>;
  if (configuracion.presentacion === 'texto') return <Text component="span" size={size === 'sm' ? 'xs' : 'sm'} c="dimmed">
    {Icono && <Icono size={16} aria-hidden="true" />} {configuracion.etiqueta}{complemento && ` · ${complemento}`}
  </Text>;
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
      leftSection={Icono && <Icono size={size === 'sm' ? 14 : 16} aria-hidden="true" className={clases.icono} />}
    >
      {configuracion.etiqueta}
    </Badge>
    {complemento && <Text component="span" size="sm">{complemento}</Text>}
  </Box>;
}
