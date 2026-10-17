import { useMemo } from 'react';
import { Alert, Stack, Text } from '@mantine/core';
import { IconClipboardList, IconDoorExit, IconRoute } from '@tabler/icons-react';
import { CapturaEvidencia, ShellRepartidor } from '@despacho/componentes-compartidos';
import type { DestinoRepartidor } from '@despacho/componentes-compartidos';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

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

export function Aplicacion() {
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
      {import.meta.env.VITE_DEMO_SIN_AUTENTICACION === 'true'
        && <Alert color="yellow" title="Modo demostración">Acceso temporal de demostración.</Alert>}
      <Routes>
        <Route path="/" element={<Navigate to="/repartidor/ruta" replace />} />
        <Route
          path="/repartidor/ruta"
          element={<OperacionPendiente descripcion="Consulta los despachos asignados para tu jornada." endpoint="GET /api/v1/repartidor/mi-ruta" />}
        />
        <Route
          path="/repartidor/resumen"
          element={<OperacionPendiente descripcion="Revisa el resultado de tu jornada." endpoint="GET /api/v1/repartidor/jornada/resumen" />}
        />
        <Route
          path="/repartidor/cierre"
          element={<OperacionPendiente descripcion="Revisa los despachos pendientes antes de cerrar tu jornada." endpoint="POST /api/v1/repartidor/jornada/cierre" />}
        />
        <Route
          path="/repartidor/despachos/:id/*"
          element={
            <Stack gap="md">
              <OperacionPendiente
                descripcion="Entrega, fallo y evidencia del despacho."
                endpoint="GET /api/v1/repartidor/despachos/{id}"
              />
              <CapturaEvidencia
                archivo={null}
                descripcionFoto="Evidencia fotográfica del despacho"
                fase="vacia"
                politicaArchivo={null}
                disabled
                alSeleccionar={() => undefined}
                alVolverATomar={() => undefined}
                alReintentar={() => undefined}
              />
            </Stack>
          }
        />
        <Route path="*" element={<Text>Página no encontrada.</Text>} />
      </Routes>
    </ShellRepartidor>
  );
}
