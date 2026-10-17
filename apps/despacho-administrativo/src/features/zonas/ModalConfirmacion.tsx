import type { ReactNode } from 'react';
import { Alert, Button, Group, Modal, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

type Props = {
  abierto: boolean;
  titulo: string;
  descripcion: string;
  etiquetaConfirmar: string;
  intencion?: 'principal' | 'destructiva';
  procesando?: boolean;
  error?: string | null;
  alConfirmar: () => void;
  alCancelar: () => void;
  children?: ReactNode;
};

export function ModalConfirmacion({
  abierto,
  titulo,
  descripcion,
  etiquetaConfirmar,
  intencion = 'principal',
  procesando = false,
  error = null,
  alConfirmar,
  alCancelar,
  children,
}: Props) {
  const destructiva = intencion === 'destructiva';

  return (
    <Modal
      opened={abierto}
      onClose={alCancelar}
      withCloseButton={!procesando}
      closeOnClickOutside={false}
      centered
      title={
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon color={destructiva ? 'red' : 'orange'} variant="light" radius="xl">
            <IconAlertTriangle size={18} />
          </ThemeIcon>
          <Title order={3}>{titulo}</Title>
        </Group>
      }
    >
      <Stack gap="md">
        <Text size="sm">{descripcion}</Text>
        {children}
        {error ? (
          <Alert color="red" variant="light" title="No se pudo completar la operación">
            {error}
          </Alert>
        ) : null}
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={alCancelar} disabled={procesando}>
            Cancelar
          </Button>
          <Button
            color={destructiva ? 'red' : undefined}
            loading={procesando}
            onClick={alConfirmar}
          >
            {etiquetaConfirmar}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
