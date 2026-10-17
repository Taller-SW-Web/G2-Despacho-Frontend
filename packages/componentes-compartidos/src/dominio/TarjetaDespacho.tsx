import { Card, Group, Stack, Text, UnstyledButton } from '@mantine/core';
import { BadgeEstado } from './BadgeEstado';

export type TarjetaDespachoProps = {
  idDespacho: string;
  codigo: string;
  posicion: number;
  direccion: string;
  destinatario: string;
  /** Valor del estado del despacho; CR-09 resuelve etiqueta, icono y color. */
  estado: string;
  /** Indicación adicional prevista por la UI, p. ej. «Regresa al centro de despacho» para FALLIDO en F-03. */
  complementoEstado?: string;
  etiquetaIntento: string;
  variante?: 'normal' | 'siguiente' | 'resuelto';
  alAbrir: (idDespacho: string) => void;
};

/** CR-16: abrir la tarjeta no inicia traslado ni modifica estado. */
export function TarjetaDespacho({
  idDespacho,
  codigo,
  posicion,
  direccion,
  destinatario,
  estado,
  complementoEstado,
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
      {/* §16.2 y §16.5: siguiente con action/primary-soft; resuelto con cloud-subtle y texto secundario, sin opacidad. */}
      <Card
        bg={siguiente ? 'var(--ia-color-action-primary-soft)' : resuelto ? 'var(--ia-color-surface-cloud-subtle)' : 'white'}
        c={resuelto ? 'var(--ia-color-text-secondary)' : undefined}
        style={{
          borderColor: siguiente ? 'var(--ia-color-action-primary)' : undefined,
          borderWidth: siguiente ? 2 : undefined,
        }}
      >
        <Group align="flex-start" gap="md" wrap="nowrap">
          <Text
            aria-label={`Posición ${posicion}`}
            fw={700}
            size="lg"
            bg={resuelto ? 'white' : 'var(--ia-color-surface-cloud-subtle)'}
            w={32}
            h={32}
            ta="center"
            className="ia-num"
            style={{ borderRadius: '50%', flex: '0 0 32px', lineHeight: '32px' }}
          >
            {posicion}
          </Text>
          <Stack gap={6} style={{ minWidth: 0, flex: 1 }}>
            <Group justify="space-between" align="flex-start" gap="xs" wrap="nowrap">
              <Text fw={700} size="md" style={{ overflowWrap: 'anywhere' }}>{codigo}</Text>
              <BadgeEstado contexto="despacho" valor={estado} size="sm" />
            </Group>
            {siguiente && <BadgeEstado contexto="etiqueta" valor="SIGUIENTE" size="sm" />}
            {complementoEstado && <Text size="sm" fw={600}>{complementoEstado}</Text>}
            <Text size="md" lineClamp={2}>{direccion}</Text>
            <Text size="md" c={resuelto ? undefined : 'var(--ia-color-text-secondary)'}>{destinatario} · {etiquetaIntento}</Text>
          </Stack>
        </Group>
      </Card>
    </UnstyledButton>
  );
}
