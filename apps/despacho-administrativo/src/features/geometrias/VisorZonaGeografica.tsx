import { useEffect } from 'react';
import { Alert, Button, Modal, Skeleton, Stack } from '@mantine/core';
import { EstadoVista } from '@despacho/componentes-compartidos';
import { PanelGeografico } from './PanelGeografico';
import { useCapaGeografica } from './useCapaGeografica';

export function VisorZonaGeografica({
  zonaId,
  alCerrar,
  alDenegar,
}: {
  zonaId: string;
  alCerrar: () => void;
  alDenegar?: () => void;
}) {
  const consulta = useCapaGeografica(zonaId);
  useEffect(() => {
    if (consulta.denegado) alDenegar?.();
  }, [consulta.denegado, alDenegar]);
  return (
    <Modal
      opened
      onClose={alCerrar}
      title="Composición geográfica de la zona"
      size="90%"
      closeButtonProps={{ 'aria-label': 'Cerrar visor geográfico' }}
    >
      <Stack>
        {consulta.cargando ? (
          <Skeleton height={440} aria-label="Cargando composición de zona" />
        ) : consulta.denegado ? (
          <EstadoVista estado="sinPermiso" />
        ) : consulta.error ? (
          <Alert title="No se pudo consultar la zona">
            {consulta.error}
            <Button variant="default" onClick={consulta.reintentar}>
              Reintentar
            </Button>
          </Alert>
        ) : (
          consulta.datos && <PanelGeografico capa={consulta.datos} />
        )}
        <Button variant="default" onClick={alCerrar}>
          Cerrar mapa de zona
        </Button>
      </Stack>
    </Modal>
  );
}
