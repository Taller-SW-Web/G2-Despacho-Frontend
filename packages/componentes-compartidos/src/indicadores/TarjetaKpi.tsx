import type { ReactNode } from 'react';
import { Group, Paper, Skeleton, Stack, Text, UnstyledButton } from '@mantine/core';

/** CR-10 básico: el consumidor entrega el agregado completo. */
export function TarjetaKpi({ id, etiqueta, valor, descripcion, icono, seleccionada = false, cargando = false,
  accionable = false, disabled = false, alSeleccionar }: {
  id: string; etiqueta: string; valor: number | string | null; descripcion?: string; icono?: ReactNode;
  seleccionada?: boolean; cargando?: boolean; accionable?: boolean; disabled?: boolean; alSeleccionar?: (id: string) => void;
}) {
  const contenido = <Stack gap="xs">
    <Group justify="space-between" wrap="nowrap"><Text fw={600}>{etiqueta}</Text>{icono}</Group>
    {cargando ? <Skeleton height={38} w={90} /> : <Text size="xl" fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>{valor ?? 'No disponible'}</Text>}
    {descripcion && <Text size="sm" c="dimmed">{descripcion}</Text>}
  </Stack>;
  return accionable ? <UnstyledButton type="button" p="md" w="100%" h="100%" disabled={disabled || cargando}
    aria-pressed={seleccionada} aria-label={`${etiqueta}: ${cargando ? 'Cargando' : valor ?? 'No disponible'}`}
    onClick={() => alSeleccionar?.(id)} style={{ border: `2px solid var(--mantine-color-${seleccionada ? 'orange-8' : 'cloud-3'})`, borderRadius: 'var(--mantine-radius-md)', background: 'var(--mantine-color-white)', cursor: disabled ? 'not-allowed' : 'pointer' }}>
    {contenido}
  </UnstyledButton> : <Paper p="md" withBorder>{contenido}</Paper>;
}
