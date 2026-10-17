import { Badge, Card, Group, Stack, Text, UnstyledButton } from '@mantine/core';

export type TarjetaDespachoProps = {
  idDespacho: string;
  codigo: string;
  posicion: number;
  direccion: string;
  destinatario: string;
  estado: string;
  etiquetaIntento: string;
  variante?: 'normal' | 'siguiente' | 'resuelto';
  alAbrir: (idDespacho: string) => void;
};

export function TarjetaDespacho({
  idDespacho,
  codigo,
  posicion,
  direccion,
  destinatario,
  estado,
  etiquetaIntento,
  variante = 'normal',
  alAbrir,
}: TarjetaDespachoProps) {
  const siguiente = variante === 'siguiente';
  const resuelto = variante === 'resuelto';

  return (
    <UnstyledButton
      type="button"
      onClick={() => alAbrir(idDespacho)}
      aria-label={`Abrir despacho ${codigo}, ${direccion}`}
      w="100%"
      style={{ display: 'block', textAlign: 'left', borderRadius: 'var(--mantine-radius-md)' }}
    >
      <Card
        bg={siguiente ? 'orange.0' : resuelto ? 'cloud.1' : 'white'}
        style={{
          borderColor: siguiente ? 'var(--mantine-color-orange-7)' : undefined,
          borderWidth: siguiente ? 2 : undefined,
        }}
      >
        <Group align="flex-start" gap="md" wrap="nowrap">
          <Text
            aria-label={`Posición ${posicion}`}
            fw={700}
            size="lg"
            bg="cloud.2"
            w={32}
            h={32}
            ta="center"
            style={{ borderRadius: '50%', flex: '0 0 32px', lineHeight: '32px' }}
          >
            {posicion}
          </Text>
          <Stack gap={6} style={{ minWidth: 0, flex: 1 }}>
            <Group justify="space-between" align="flex-start" gap="xs" wrap="nowrap">
              <Text fw={700} size="sm" style={{ overflowWrap: 'anywhere' }}>{codigo}</Text>
              <Badge color={resuelto ? 'gray' : 'orange'} variant="light" flex="0 0 auto">{estado}</Badge>
            </Group>
            {siguiente && <Badge color="orange" variant="filled" w="fit-content">Siguiente</Badge>}
            <Text size="md" lineClamp={2}>{direccion}</Text>
            <Text size="sm" c="ink.7">{destinatario} · {etiquetaIntento}</Text>
          </Stack>
        </Group>
      </Card>
    </UnstyledButton>
  );
}
