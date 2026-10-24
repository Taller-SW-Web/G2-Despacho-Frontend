import type { ReactNode } from 'react';
import { Skeleton, Stack } from '@mantine/core';
import { IconChartBar, IconLogout2, IconRoute } from '@tabler/icons-react';
import { EstadoVista, FranjaEstado, ShellRepartidor, type DestinoRepartidor } from '@despacho/componentes-compartidos';
import { useNavigate } from 'react-router-dom';
import type { ErrorOperacion } from '../api/errores';
import { useConexion } from './useConsulta';

export const destinos: DestinoRepartidor[] = [
  { id: 'ruta', ruta: '/repartidor/ruta', titulo: 'Mi Ruta', icono: <IconRoute size={24} aria-hidden="true" /> },
  { id: 'resumen', ruta: '/repartidor/resumen', titulo: 'Resumen', icono: <IconChartBar size={24} aria-hidden="true" /> },
  { id: 'cierre', ruta: '/repartidor/cierre', titulo: 'Cerrar jornada', icono: <IconLogout2 size={24} aria-hidden="true" /> },
];

type PropiedadesPantalla = {
  titulo: string;
  children: ReactNode;
  /** Pantallas de la navegación inferior. */
  seccion?: 'ruta' | 'resumen' | 'cierre';
  estadoOperativo?: string | null;
  alVolver?: () => void;
  acciones?: ReactNode;
  franja?: ReactNode;
  accionEncabezado?: ReactNode;
};

/** Shell común: cabecera ink, aviso de conexión y pie de navegación o de acciones fijas. */
export function Pantalla({ titulo, children, seccion, estadoOperativo = null, alVolver, acciones, franja, accionEncabezado }: PropiedadesPantalla) {
  const navigate = useNavigate();
  const enLinea = useConexion();
  return (
    <ShellRepartidor
      titulo={titulo}
      estadoOperativo={estadoOperativo}
      destinos={destinos}
      destinoActivo={seccion ?? null}
      modoPie={seccion ? 'navegacion' : acciones ? 'acciones' : 'ninguno'}
      accionesFijas={acciones}
      accionEncabezado={accionEncabezado}
      franjas={<>{!enLinea && <FranjaEstado tipo="sinConexion" />}{franja}</>}
      alNavegar={(destino) => navigate(destino.ruta)}
      alVolver={alVolver}
    >
      {children}
    </ShellRepartidor>
  );
}

export function CargandoTarjetas({ cantidad = 3 }: { cantidad?: number }) {
  return (
    <EstadoVista estado="carga" esqueleto={
      <Stack gap="md">{Array.from({ length: cantidad }, (_, fila) => <Skeleton key={fila} height={112} radius="md" />)}</Stack>
    } />
  );
}

export function ErrorConsulta({ error, alReintentar }: { error: ErrorOperacion; alReintentar: () => void }) {
  if (error.tipo === 'permiso') return <EstadoVista estado="sinPermiso" descripcion={error.message} />;
  if (error.tipo === 'noEncontrado') return <EstadoVista estado="noEncontrado" descripcion={error.message} />;
  return (
    <EstadoVista estado="error" titulo="No se pudo cargar" descripcion={error.message}
      accion={{ id: 'reintentar', etiqueta: 'Reintentar' }} alAccionar={alReintentar} />
  );
}
