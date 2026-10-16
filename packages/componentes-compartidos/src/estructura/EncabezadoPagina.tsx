import type { ReactNode } from 'react';
import { Group, Stack, Text, Title } from '@mantine/core';

/** CR-05: composición básica; las acciones las controla la página. */
export function EncabezadoPagina({ titulo, subtitulo, acciones }: {
  titulo: string; subtitulo?: string; acciones?: ReactNode;
}) {
  return <Group justify="space-between" align="flex-start" wrap="wrap">
    <Stack gap="xs"><Title order={1}>{titulo}</Title>{subtitulo && <Text c="dimmed">{subtitulo}</Text>}</Stack>
    {acciones}
  </Group>;
}
