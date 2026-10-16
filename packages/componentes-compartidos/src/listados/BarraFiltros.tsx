import type { ReactNode } from 'react';
import { Button, Group, Paper, Pill, Stack, Text } from '@mantine/core';

/** CR-06 básico para selectores inmediatos, sin buscador. */
export function BarraFiltros({ controles, activos = [], consultando = false, alQuitarFiltro, alLimpiar }: {
  controles: ReactNode; activos?: { id: string; etiqueta: string }[]; consultando?: boolean;
  alQuitarFiltro: (id: string) => void; alLimpiar: () => void;
}) {
  return <Paper component="section" aria-label="Filtros de consulta" p="md" withBorder bg="cloud.1">
    <Stack gap="md">
      {controles}
      <Group justify="space-between" align="flex-start">
        <Group gap="xs" style={{ flex: 1 }}>
          {activos.map(({ id, etiqueta }) => <Pill key={id} withRemoveButton h={44}
            removeButtonProps={{ 'aria-label': `Quitar ${etiqueta}`, 'aria-hidden': false, tabIndex: 0, w: 44, h: 44 }}
            onRemove={() => alQuitarFiltro(id)}>{etiqueta}</Pill>)}
          {consultando && <Text size="sm" c="dimmed" role="status">Consultando…</Text>}
        </Group>
        <Button type="button" variant="subtle" size="sm" mih={44} disabled={!activos.length} onClick={alLimpiar}>Limpiar filtros</Button>
      </Group>
    </Stack>
  </Paper>;
}
