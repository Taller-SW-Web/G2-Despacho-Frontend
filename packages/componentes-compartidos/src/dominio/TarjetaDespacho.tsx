import { Badge, Card, Group, Stack, Text, UnstyledButton } from '@mantine/core';
import { BadgeEstado } from './BadgeEstado';
import clases from './TarjetaDespacho.module.css';

export type TarjetaDespachoProps = {
  idDespacho: string;
  codigo: string;
  posicion: number;
  /** Contrato de Operación §3.1: fuera de ASIGNADO/EN_CAMINO llega en null y no se muestra. */
  direccion: string | null;
  destinatario: string | null;
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
      aria-label={`Abrir despacho ${codigo}${direccion ? `, ${direccion}` : ''}`}
      w="100%"
      className={clases.raiz}
    >
      {/* §16.2 y §16.5: siguiente con borde action/primary; resuelto con cloud-subtle y texto secundario, sin opacidad. */}
      <Card className={clases.tarjeta} data-variante={variante}>
        <Group align="flex-start" gap="md" wrap="nowrap">
          <Text aria-label={`Posición ${posicion}`} fw={700} size="lg" ta="center" className={`ia-num ${clases.posicion}`}>
            {posicion}
          </Text>
          <Stack gap={6} style={{ minWidth: 0, flex: 1 }}>
            {siguiente && <Badge color="orange" variant="light" tt="none" className={clases.siguiente}>Siguiente</Badge>}
            <Text size="sm" c="var(--ia-color-text-secondary)" className={clases.codigo}>{codigo}</Text>
            {direccion && <Text fw={700} size="lg" lineClamp={2} className={clases.direccion}>{direccion}</Text>}
            {destinatario && <Text size="md" c="var(--ia-color-text-secondary)">{destinatario}</Text>}
            {complementoEstado && <Text size="sm" fw={600}>{complementoEstado}</Text>}
            <Group gap="xs" wrap="wrap">
              <BadgeEstado contexto="despacho" valor={estado} size="sm" />
              <Badge color="gray" variant="light" tt="none" className="ia-num">{etiquetaIntento}</Badge>
            </Group>
          </Stack>
        </Group>
      </Card>
    </UnstyledButton>
  );
}
