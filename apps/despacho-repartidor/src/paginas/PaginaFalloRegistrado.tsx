import { Alert, Button, Card, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconAlertTriangle, IconArrowBackUp, IconArrowRight, IconCamera, IconHome } from '@tabler/icons-react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Pantalla } from '../componentes/Pantalla';

export type EstadoFalloRegistrado = { codigo: string; motivo: string; intento: number; maximo: number | null };

/** 09 · Fallo registrado. RN-07: se presenta como «No entregado» y recuerda devolver el paquete al centro. */
export function PaginaFalloRegistrado() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const estado = useLocation().state as EstadoFalloRegistrado | null;
  // Sin el resultado recién confirmado (p. ej. al recargar) se vuelve al detalle, que consulta el estado real.
  if (!estado) return <Navigate to={`/repartidor/despachos/${id}`} replace />;

  return (
    <Pantalla
      titulo="Fallo registrado"
      acciones={<Button fullWidth size="lg" leftSection={<IconArrowRight size={20} />} onClick={() => navigate('/repartidor/ruta', { replace: true })}>
        Volver a mi ruta
      </Button>}
    >
      <Stack gap="lg" align="center" pt="lg">
        <ThemeIcon size={96} radius="50%" color="orange" variant="light" aria-hidden="true">
          <IconArrowBackUp size={48} color="var(--ia-color-action-primary-hover)" />
        </ThemeIcon>
        <Title order={2} ta="center">Fallo registrado</Title>
        <Text ta="center" size="lg" c="var(--ia-color-text-secondary)">
          {estado.codigo} quedó como No entregado. Este intento contó como {estado.intento}{estado.maximo ? ` de ${estado.maximo}` : ''}.
        </Text>
        <Card w="100%">
          <Stack gap="md">
            <Group gap="md" wrap="nowrap">
              <IconAlertTriangle size={22} aria-hidden="true" />
              <Stack gap={0}><Text size="sm" c="var(--ia-color-text-secondary)">Motivo</Text><Text fw={700}>{estado.motivo}</Text></Stack>
            </Group>
            <Group gap="md" wrap="nowrap">
              <IconCamera size={22} aria-hidden="true" />
              <Stack gap={0}><Text size="sm" c="var(--ia-color-text-secondary)">Evidencia</Text><Text fw={700}>Foto del domicilio guardada</Text></Stack>
            </Group>
          </Stack>
        </Card>
        <Alert w="100%" color="yellow" icon={<IconHome size={20} />}>
          <Text fw={600}>Devuelve el paquete al centro de despacho al terminar tu jornada.</Text>
        </Alert>
      </Stack>
    </Pantalla>
  );
}
