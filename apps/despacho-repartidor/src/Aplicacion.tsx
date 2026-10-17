import { useMemo } from 'react';
import { Alert, Stack, Text } from '@mantine/core';
import { IconClipboardList, IconDoorExit, IconRoute } from '@tabler/icons-react';
import { ShellRepartidor } from '@despacho/componentes-compartidos';
import type { DestinoRepartidor } from '@despacho/componentes-compartidos';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { PaginaDetalle, PaginaResumen, PaginaRuta } from './PaginasRepartidor';
import { AplicacionPruebaF03 } from './AplicacionPruebaF03';

const secciones: DestinoRepartidor[] = [
  { id: 'ruta', ruta: '/repartidor/ruta', titulo: 'Mi ruta', icono: <IconRoute size={20} aria-hidden="true" /> },
  { id: 'resumen', ruta: '/repartidor/resumen', titulo: 'Resumen', icono: <IconClipboardList size={20} aria-hidden="true" /> },
  { id: 'cierre', ruta: '/repartidor/cierre', titulo: 'Cerrar jornada', icono: <IconDoorExit size={20} aria-hidden="true" /> },
];

function OperacionPendiente({ descripcion, endpoint }: { descripcion: string; endpoint: string }) {
  return (
    <Stack gap="md">
      <Text>{descripcion}</Text>
      <Alert color="yellow" title="Integración pendiente">
        No se muestran datos ni se ejecutan cambios de estado hasta que esté conectada la API de Operación.
        <Text component="span" display="block" size="sm" mt="xs">Contrato previsto: {endpoint}</Text>
      </Alert>
    </Stack>
  );
}

function AplicacionProduccion() {
  const ubicacion = useLocation();
  const navigate = useNavigate();
  const esDetalle = ubicacion.pathname.startsWith('/repartidor/despachos/');
  const pagina = useMemo(() => {
    if (esDetalle) {
      return { titulo: 'Detalle del despacho', activo: null };
    }
    const seccion = secciones.find(({ ruta }) => ubicacion.pathname === ruta);
    return seccion
      ? { titulo: seccion.titulo, activo: seccion.id }
      : { titulo: 'Repartidor', activo: null };
  }, [esDetalle, ubicacion.pathname]);

  return (
    <ShellRepartidor
      titulo={pagina.titulo}
      estadoOperativo={null}
      destinos={secciones}
      destinoActivo={pagina.activo}
      modoPie={pagina.activo === null ? 'ninguno' : 'navegacion'}
      alNavegar={(destino) => navigate(destino.ruta)}
      alVolver={esDetalle ? () => navigate('/repartidor/ruta') : undefined}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/repartidor/ruta" replace />} />
        <Route
          path="/repartidor/ruta"
          element={<PaginaRuta />}
        />
        <Route
          path="/repartidor/resumen"
          element={<PaginaResumen />}
        />
        <Route
          path="/repartidor/cierre"
          element={<OperacionPendiente descripcion="Revisa los despachos pendientes antes de cerrar tu jornada." endpoint="POST /api/v1/repartidor/jornada/cierre" />}
        />
        <Route
          path="/repartidor/despachos/:id/*"
          element={<PaginaDetalle />}
        />
        <Route path="*" element={<Text>Página no encontrada.</Text>} />
      </Routes>
    </ShellRepartidor>
  );
}

export function Aplicacion() {
  return import.meta.env.DEV ? <AplicacionPruebaF03 /> : <AplicacionProduccion />;
}
