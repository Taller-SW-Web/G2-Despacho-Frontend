import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Box, Group, Stack, Text, Title, UnstyledButton } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { BadgeEstado } from '../dominio/BadgeEstado';
import clases from './ShellRepartidor.module.css';

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
  const raiz = useRef<HTMLDivElement>(null);
  const pie = useRef<HTMLElement>(null);
  const tienePie = modoPie === 'navegacion' || (modoPie === 'acciones' && Boolean(accionesFijas));
  useLayoutEffect(() => {
    const contenedor = raiz.current;
    const contenidoPie = pie.current;
    if (!contenedor || !contenidoPie || !tienePie) {
      contenedor?.style.setProperty('--shell-altura-pie', '0px');
      return;
    }
    const medir = () => contenedor.style.setProperty('--shell-altura-pie', `${contenidoPie.getBoundingClientRect().height}px`);
    medir();
    const observador = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : undefined;
    observador?.observe(contenidoPie);
    window.addEventListener('resize', medir);
    return () => { observador?.disconnect(); window.removeEventListener('resize', medir); };
  }, [modoPie, tienePie]);

  return (
    <Box ref={raiz} className={clases.raiz} data-pie={tienePie ? modoPie : 'ninguno'}>
      <Box component="header" className={clases.cabecera}>
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap" className={clases.tituloYRegreso}>
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
            <Title order={1} size="h3" m={0} className={clases.titulo}>
              {titulo}
            </Title>
          </Group>
          <Group gap="xs" wrap="nowrap" className={clases.estado}>
            {/* §16.3: mismo BadgeEstado que en administración; sus fondos claros mantienen text/primary sobre ink. */}
            {estadoOperativo && <BadgeEstado contexto="operacionRepartidor" valor={estadoOperativo} size="sm" />}
            {accionEncabezado}
          </Group>
        </Group>
      </Box>

      {franjas}

      <Stack component="main" gap="md" p="md" className={clases.contenido}>
        {children}
      </Stack>

      {modoPie === 'navegacion' && (
        <Box
          component="nav"
          ref={pie}
          className={clases.navegacion}
          aria-label="Navegación del repartidor"
        >
          <Group justify="space-around" gap={4} wrap="nowrap">
            {destinos.map((destino) => {
              const activo = destino.id === destinoActivo;
              return (
                <UnstyledButton
                  key={destino.id}
                  type="button"
                  className={clases.destino}
                  aria-current={activo ? 'page' : undefined}
                  onClick={() => alNavegar(destino)}
                  c={activo ? 'orange.8' : 'var(--ia-color-text-secondary)'}
                >
                  {destino.icono}
                  <Text size="sm" fw={activo ? 600 : 500}>{destino.titulo}</Text>
                </UnstyledButton>
              );
            })}
          </Group>
        </Box>
      )}

      {modoPie === 'acciones' && accionesFijas && (
        <Box
          component="footer"
          ref={pie}
          className={clases.pieAcciones}
        >
          {accionesFijas}
        </Box>
      )}
    </Box>
  );
}
