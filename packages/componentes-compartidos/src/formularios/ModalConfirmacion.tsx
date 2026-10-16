import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Alert, Button, Group, Loader, Modal, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import clases from './ModalConfirmacion.module.css';

export type PropiedadesModalConfirmacion = {
  abierto: boolean;
  titulo: string;
  descripcion: string;
  etiquetaConfirmar: string;
  intencion?: 'principal' | 'destructiva';
  procesando?: boolean;
  confirmacionDeshabilitada?: boolean;
  error?: string;
  children?: ReactNode;
  alConfirmar: () => void;
  alCancelar: () => void;
};

/** CR-12: el consumidor ejecuta la operación y controla apertura, carga y error. */
export function ModalConfirmacion({
  abierto, titulo, descripcion, etiquetaConfirmar,
  intencion = 'principal', procesando = false, confirmacionDeshabilitada = false,
  error, children, alConfirmar, alCancelar,
}: PropiedadesModalConfirmacion) {
  const destructiva = intencion === 'destructiva';
  const contenido = useRef<HTMLDivElement>(null);
  const Icono = destructiva ? IconAlertTriangle : IconInfoCircle;
  const cancelar = () => { if (!procesando) alCancelar(); };

  // Al deshabilitar todos los botones, el foco permanece dentro del diálogo.
  useEffect(() => {
    if (abierto && procesando) contenido.current?.focus({ preventScroll: true });
  }, [abierto, procesando]);

  return (
    <Modal.Root
      opened={abierto}
      onClose={cancelar}
      size={480}
      radius="lg"
      centered
      closeOnClickOutside={false}
      closeOnEscape={!procesando}
      trapFocus
      returnFocus
      keepMounted={false}
      transitionProps={{ duration: 150, transition: 'fade' }}
      className={clases.raiz}
      classNames={{ inner: clases.interior, content: clases.contenido, header: clases.cabecera, title: clases.titulo, body: clases.cuerpo }}
    >
      <Modal.Overlay />
      <Modal.Content ref={contenido} aria-busy={procesando}>
        <Modal.Header>
          <Group gap="sm" wrap="nowrap" align="flex-start" className={clases.encabezado}>
            <Icono size={24} aria-hidden="true" className={destructiva ? clases.advertencia : clases.informacion} />
            <Modal.Title>{titulo}</Modal.Title>
          </Group>
          <Modal.CloseButton aria-label="Cerrar confirmación" type="button" disabled={procesando} className={clases.cerrar} />
        </Modal.Header>
        <Modal.Body>
          <Stack gap="lg">
            <Text>{descripcion}</Text>
            {children}
            {error && (
              <Alert color="red.8" variant="light" className={clases.error} icon={<IconAlertCircle size={20} aria-hidden="true" />}>
                {error}
              </Alert>
            )}
            <div className={clases.acciones}>
              <Button
                type="button"
                variant="outline"
                color="orange.8"
                className={clases.boton}
                disabled={procesando}
                data-autofocus={!procesando && (destructiva || confirmacionDeshabilitada) ? true : undefined}
                onClick={cancelar}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                color={destructiva ? 'red.8' : 'orange.7'}
                autoContrast={!destructiva}
                className={`${clases.boton} ${destructiva ? '' : clases.principal}`}
                disabled={procesando || confirmacionDeshabilitada}
                aria-busy={procesando}
                leftSection={procesando ? <Loader size={20} color="currentColor" aria-hidden="true" /> : undefined}
                data-autofocus={!procesando && !destructiva && !confirmacionDeshabilitada ? true : undefined}
                onClick={() => { if (!procesando && !confirmacionDeshabilitada) alConfirmar(); }}
              >
                {etiquetaConfirmar}
              </Button>
            </div>
          </Stack>
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}
