import { useId } from 'react';
import type { ReactNode } from 'react';
import { Alert, Box, Button, Loader, Stack, Text, Title, VisuallyHidden } from '@mantine/core';
import { IconAlertCircle, IconFilterOff, IconLock, IconPackageOff, IconSearch } from '@tabler/icons-react';
import type { AccionUi, EstadoConsulta } from '../tipos-ui';
import clases from './EstadoVista.module.css';

type EstadoSinDatos = Exclude<EstadoConsulta, 'carga' | 'datos'>;

type PropiedadesComunes = {
  titulo?: string;
  descripcion?: string;
  accion?: AccionUi;
  alAccionar?: (id: string) => void;
  compacto?: boolean;
};

export type PropiedadesEstadoVista = PropiedadesComunes & (
  | { estado: 'carga'; esqueleto: ReactNode; children?: ReactNode }
  | { estado: 'datos'; children: ReactNode; esqueleto?: ReactNode }
  | { estado: EstadoSinDatos; children?: ReactNode; esqueleto?: ReactNode }
);

const mensajes = {
  vacio: { titulo: 'Todavía no hay registros', descripcion: 'Los registros aparecerán aquí cuando estén disponibles.', Icono: IconPackageOff },
  sinResultados: { titulo: 'No encontramos resultados con estos filtros', descripcion: 'Prueba con otros filtros o limpia la búsqueda.', Icono: IconFilterOff },
  error: { titulo: 'No pudimos cargar la información', descripcion: 'Inténtalo nuevamente.', Icono: IconAlertCircle },
  sinPermiso: { titulo: 'No tienes permisos para ver esta información', descripcion: 'Solicita acceso a la persona responsable.', Icono: IconLock },
  noEncontrado: { titulo: 'No encontramos este registro', descripcion: 'Vuelve al listado para continuar.', Icono: IconSearch },
} satisfies Record<EstadoSinDatos, { titulo: string; descripcion: string; Icono: typeof IconLock }>;

/** CR-08: el consumidor determina el estado y envuelve también los filtros protegidos. */
export function EstadoVista({ estado, titulo, descripcion, accion, alAccionar, compacto = false, esqueleto, children }: PropiedadesEstadoVista) {
  const id = useId();
  const idTitulo = `${id}-titulo`;
  const idDescripcion = `${id}-descripcion`;
  const idMotivo = `${id}-motivo`;
  const mensaje = estado === 'carga' || estado === 'datos' ? null : mensajes[estado];
  const tituloVisible = titulo ?? mensaje?.titulo;
  const descripcionVisible = descripcion ?? mensaje?.descripcion;
  const anuncio = estado === 'carga' ? 'Cargando información.' : estado === 'datos' ? 'Información cargada.' : `${tituloVisible}. ${descripcionVisible}`;
  const bloqueada = Boolean(accion?.disabled || accion?.loading || !alAccionar);
  const boton = accion && (
    <Stack gap="sm" align="center" className={clases.accion}>
      <Button
        type="button"
        variant={estado === 'sinResultados' ? 'subtle' : estado === 'vacio' ? 'filled' : 'outline'}
        color={estado === 'vacio' ? 'orange.7' : 'orange.8'}
        className={clases.boton}
        leftSection={accion.loading ? <Loader size={20} aria-hidden="true" /> : undefined}
        aria-busy={accion.loading ?? false}
        disabled={bloqueada}
        aria-describedby={accion.motivoDeshabilitado ? idMotivo : undefined}
        onClick={() => {
          if (!bloqueada) alAccionar?.(accion.id);
        }}
      >
        {accion.etiqueta}
      </Button>
      {accion.motivoDeshabilitado && <Text id={idMotivo} size="sm" ta="center">{accion.motivoDeshabilitado}</Text>}
    </Stack>
  );

  return (
    <Box className={clases.raiz}>
      {/* Región persistente: los renders con el mismo resultado no vuelven a anunciarlo. */}
      <VisuallyHidden role="status" aria-live="polite" aria-atomic="true">{anuncio}</VisuallyHidden>
      {estado === 'carga' ? (
        <Box aria-busy="true" aria-label="Cargando información" role="region" className={clases.carga}>
          {esqueleto}
        </Box>
      ) : estado === 'datos' ? children : mensaje && (
        <Box
          role="region"
          aria-labelledby={idTitulo}
          aria-describedby={idDescripcion}
          p={compacto && estado !== 'sinPermiso' ? 'md' : { base: 'md', sm: 'xl' }}
        >
          {estado === 'error' ? (
            <Alert color="red.8" variant="light" role="presentation" className={clases.aviso} icon={<IconAlertCircle size={20} aria-hidden="true" />}>
              <Stack gap="md">
                <div>
                  <Title id={idTitulo} order={4} className={clases.titulo}>{tituloVisible}</Title>
                  <Text id={idDescripcion}>{descripcionVisible}</Text>
                </div>
                {boton}
              </Stack>
            </Alert>
          ) : (
            <Stack gap="md" align="center" ta="center">
              <mensaje.Icono size={48} aria-hidden="true" className={clases.icono} />
              <Title id={idTitulo} order={4} className={clases.titulo}>{tituloVisible}</Title>
              <Text id={idDescripcion}>{descripcionVisible}</Text>
              {boton}
            </Stack>
          )}
        </Box>
      )}
    </Box>
  );
}
