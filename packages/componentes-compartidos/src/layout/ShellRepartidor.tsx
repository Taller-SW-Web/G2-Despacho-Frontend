import type { ReactNode } from 'react';
import { Box, Group, Stack, Text, Title, UnstyledButton } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { BadgeEstado } from '../dominio/BadgeEstado';

export type DestinoRepartidor = {
  id: string;
  titulo: string;
  ruta: string;
  icono: ReactNode;
};

type ShellRepartidorProps = {
  titulo: string;
  children: ReactNode;
  /** Valor del estado operativo (DISPONIBLE, EN_RUTA, SATURADO, FUERA_DE_TURNO); `null` si aún se desconoce. */
  estadoOperativo: string | null;
  destinos: DestinoRepartidor[];
  destinoActivo: string | null;
  modoPie?: 'navegacion' | 'acciones' | 'ninguno';
  accionesFijas?: ReactNode;
  franjas?: ReactNode;
  accionEncabezado?: ReactNode;
  alNavegar: (destino: DestinoRepartidor) => void;
  alVolver?: () => void;
};

export function ShellRepartidor({
  titulo,
  children,
  estadoOperativo,
  destinos,
  destinoActivo,
  modoPie = 'navegacion',
  accionesFijas,
  franjas,
  accionEncabezado,
  alNavegar,
  alVolver,
}: ShellRepartidorProps) {
  const alturaPie = modoPie === 'navegacion' ? 88 : modoPie === 'acciones' ? 96 : 16;

  return (
    <Box mih="100dvh" maw={480} mx="auto" bg="cloud.1" pb={`calc(${alturaPie}px + env(safe-area-inset-bottom, 0px))`}>
      <Box component="header" bg="ink.9" c="white" h={56} px="md">
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            {alVolver && (
              <UnstyledButton
                type="button"
                aria-label="Volver"
                onClick={alVolver}
                c="white"
                style={{ minWidth: 44, minHeight: 44, display: 'grid', placeItems: 'center' }}
              >
                <IconArrowLeft size={24} aria-hidden="true" />
              </UnstyledButton>
            )}
            <Title order={1} size={20} m={0} lineClamp={1}>
              {titulo}
            </Title>
          </Group>
          <Group gap="xs" wrap="nowrap">
            {/* §16.3: mismo BadgeEstado que en administración; sus fondos claros mantienen text/primary sobre ink. */}
            {estadoOperativo && <BadgeEstado contexto="operacionRepartidor" valor={estadoOperativo} size="sm" />}
            {accionEncabezado}
          </Group>
        </Group>
      </Box>

      {franjas}

      <Stack component="main" gap="md" p="md">
        {children}
      </Stack>

      {modoPie === 'navegacion' && (
        <Box
          component="nav"
          aria-label="Navegación del repartidor"
          pos="fixed"
          bottom={0}
          left="50%"
          style={{
            transform: 'translateX(-50%)',
            width: 'min(100%, 480px)',
            zIndex: 100,
            borderTop: '1px solid var(--ia-color-border-default)',
            padding: '4px 8px calc(4px + env(safe-area-inset-bottom, 0px))',
          }}
          bg="white"
        >
          <Group justify="space-around" gap={4} wrap="nowrap">
            {destinos.map((destino) => {
              const activo = destino.id === destinoActivo;
              return (
                <UnstyledButton
                  key={destino.id}
                  type="button"
                  aria-current={activo ? 'page' : undefined}
                  onClick={() => alNavegar(destino)}
                  c={activo ? 'orange.8' : 'var(--ia-color-text-secondary)'}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 56,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    borderRadius: 'var(--mantine-radius-sm)',
                  }}
                >
                  {destino.icono}
                  <Text size="xs" fw={activo ? 700 : 500} lineClamp={1}>{destino.titulo}</Text>
                </UnstyledButton>
              );
            })}
          </Group>
        </Box>
      )}

      {modoPie === 'acciones' && accionesFijas && (
        <Box
          component="footer"
          pos="fixed"
          bottom={0}
          left="50%"
          style={{
            transform: 'translateX(-50%)',
            width: 'min(100%, 480px)',
            zIndex: 100,
            borderTop: '1px solid var(--ia-color-border-default)',
            padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))',
          }}
          bg="white"
        >
          {accionesFijas}
        </Box>
      )}
    </Box>
  );
}
