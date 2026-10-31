import type { FormEvent, ReactNode } from 'react';
import { Alert, Button, Group, Modal, Stack, Text } from '@mantine/core';

export function ModalFormularioFlota({ titulo, procesando, error, desconocido, invalido, children, alEnviar, alCerrar }: {
  titulo: string; procesando: boolean; error: string; desconocido: boolean; invalido: boolean;
  children: ReactNode; alEnviar: (evento: FormEvent<HTMLFormElement>) => void; alCerrar: () => void;
}) {
  return <Modal opened onClose={() => { if (!procesando) alCerrar(); }} title={titulo} size="lg" radius="lg" centered
    closeOnClickOutside={false} closeOnEscape={!procesando} closeButtonProps={{ 'aria-label': 'Cerrar formulario', disabled: procesando }}>
    <form noValidate onSubmit={alEnviar} aria-busy={procesando}>
      <Stack gap="lg">
        {error && <Alert color="red" variant="light" title="No se pudo completar la operación" role="alert">{error}</Alert>}
        <fieldset disabled={procesando || desconocido} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <Stack gap="md">{children}</Stack>
        </fieldset>
        {desconocido && <Text>Se conservaron los datos ingresados. Consulta el listado para comprobar qué quedó registrado.</Text>}
        <Group justify="flex-end">
          <Button type="button" variant="outline" mih={44} disabled={procesando} onClick={alCerrar}>{desconocido ? 'Consultar listado' : 'Cancelar'}</Button>
          <Button type="submit" mih={44} loading={procesando} disabled={invalido || desconocido}>Guardar</Button>
        </Group>
      </Stack>
    </form>
  </Modal>;
}
