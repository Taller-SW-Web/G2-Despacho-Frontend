import { Alert, Button, Group, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { fechaLegible, type JornadaAnteriorActiva } from './modelo';

export function AvisoJornadasAnteriores({
  jornadas,
  habilitada,
  alVer,
  alCerrar,
}: {
  jornadas: JornadaAnteriorActiva[];
  habilitada: boolean;
  alVer: (jornada: JornadaAnteriorActiva) => void;
  alCerrar: (jornada: JornadaAnteriorActiva) => void;
}) {
  return (
    <Alert
      title="Jornadas anteriores sin cerrar"
      role="region"
      color="yellow"
      variant="light"
      icon={<IconAlertTriangle size={20} aria-hidden="true" />}
    >
      <Stack gap="sm" component="ul" p={0} m={0} style={{ listStyle: 'none' }}>
        {jornadas.map((jornada) => {
          const fecha = fechaLegible(jornada.fecha);
          return (
            <li key={jornada.idJornada}>
              <Group justify="space-between" gap="xs">
                <Stack gap={2}>
                  <Text size="sm" fw={600}>
                    {jornada.nombreRepartidor} · {fecha} · {jornada.placa}
                  </Text>
                  {jornada.pendientes && (
                    <Text size="sm">Resuelve la carga pendiente antes de cerrar.</Text>
                  )}
                </Stack>
                <Group gap="xs">
                  <Button
                    type="button"
                    size="sm"
                    mih={44}
                    variant="subtle"
                    disabled={!habilitada}
                    aria-label={`Ver jornada anterior de ${jornada.nombreRepartidor} del ${fecha}`}
                    onClick={() => alVer(jornada)}
                  >
                    Ver jornada
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    mih={44}
                    variant="subtle"
                    color="red"
                    disabled={!habilitada || jornada.pendientes}
                    aria-label={`Cerrar jornada anterior de ${jornada.nombreRepartidor} del ${fecha}`}
                    onClick={() => alCerrar(jornada)}
                  >
                    Cerrar jornada
                  </Button>
                </Group>
              </Group>
            </li>
          );
        })}
      </Stack>
    </Alert>
  );
}
