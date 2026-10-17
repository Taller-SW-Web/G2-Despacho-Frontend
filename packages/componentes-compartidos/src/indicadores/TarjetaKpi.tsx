import type { ReactNode } from 'react';
import { Box, Group, Paper, Skeleton, Stack, Text, UnstyledButton } from '@mantine/core';

export type PropiedadesTarjetaKpi = {
  id: string; etiqueta: string; valor: number | string | null; descripcion?: string; icono?: ReactNode;
  tono?: 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'availability';
  seleccionada?: boolean; cargando?: boolean; accionable?: boolean; disabled?: boolean; alSeleccionar?: (id: string) => void;
};
const tonos = { neutral: 'ink.9', info: 'blue.8', success: 'green.8', warning: 'yellow.9', error: 'red.8', availability: 'volt.6' };
/** CR-10: el consumidor entrega el agregado completo, nunca el total de una página. */
export function TarjetaKpi({ id, etiqueta, valor, descripcion, icono, seleccionada = false, cargando = false,
  accionable = false, disabled = false, tono = 'neutral', alSeleccionar }: PropiedadesTarjetaKpi) {
  const bordeEstado = tono === 'neutral' ? {} : { borderTop: `4px solid var(--mantine-color-${tonos[tono].replace('.', '-')})` };
  const contenido = <Stack gap="xs">
    <Group justify="space-between" wrap="nowrap"><Text fw={600} c="dimmed">{etiqueta}</Text><Box c={tonos[tono]} aria-hidden="true">{icono}</Box></Group>
    {cargando ? <Skeleton height={38} w={90} /> : <Text c="ink.9" fz={28} lh="36px" ff="var(--mantine-font-family-headings)" fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>{valor ?? 'No disponible'}</Text>}
    {descripcion && <Text size="sm" c="dimmed">{descripcion}</Text>}
  </Stack>;
  return accionable ? <UnstyledButton type="button" p="md" w="100%" h="100%" disabled={disabled || cargando}
    aria-pressed={seleccionada} aria-label={`${etiqueta}: ${cargando ? 'Cargando' : valor ?? 'No disponible'}`}
    onClick={() => alSeleccionar?.(id)} style={{ border: `2px solid var(--mantine-color-${seleccionada ? 'orange-8' : 'cloud-3'})`, ...bordeEstado, borderRadius: 'var(--mantine-radius-md)', background: 'var(--mantine-color-white)', cursor: disabled ? 'not-allowed' : 'pointer' }}>
    {contenido}
  </UnstyledButton> : <Paper p="md" radius="md" withBorder style={bordeEstado}>{contenido}</Paper>;
}
