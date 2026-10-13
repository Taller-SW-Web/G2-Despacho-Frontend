import { AppShell, Box, Group, NavLink, Stack, Text, Title } from '@mantine/core';
import { IconPackage, IconRoute, IconClipboardList, IconDoorExit } from '@tabler/icons-react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';

const secciones = [
  { ruta: '/repartidor/ruta', titulo: 'Mi ruta', descripcion: 'Despachos de la jornada', endpoint: 'GET /api/v1/repartidor/mi-ruta', Icono: IconRoute },
  { ruta: '/repartidor/resumen', titulo: 'Resumen', descripcion: 'Resultado de la jornada', endpoint: 'GET /api/v1/repartidor/jornada/resumen', Icono: IconClipboardList },
  { ruta: '/repartidor/cierre', titulo: 'Cerrar jornada', descripcion: 'Cierre y devolución de paquetes', endpoint: 'POST /api/v1/repartidor/jornada/cierre', Icono: IconDoorExit },
];

function PaginaPendiente({ titulo, descripcion, endpoint }: { titulo: string; descripcion: string; endpoint: string }) {
  return <Stack gap="md">
    <Title order={1}>{titulo}</Title>
    <Text>{descripcion}</Text>
    <Box p="lg" bg="white" style={{ borderRadius: 'var(--mantine-radius-md)' }}>
      <Text fw={600}>Pantalla lista para implementar</Text>
      <Text size="sm" c="dimmed">Contrato inicial: {endpoint}</Text>
    </Box>
  </Stack>;
}

export function Aplicacion() {
  const ubicacion = useLocation();
  return <AppShell header={{ height: 56 }} footer={{ height: 72 }} padding="md">
    <AppShell.Header bg="ink.9" c="white">
      <Group h="100%" px="md"><IconPackage size={26} aria-hidden="true" /><Text fw={700}>DESPACHO · REPARTIDOR</Text></Group>
    </AppShell.Header>
    <AppShell.Main maw={680} mx="auto" pb={96}>
      <Routes>
        <Route path="/" element={<Navigate to="/repartidor/ruta" replace />} />
        {secciones.map(({ ruta, titulo, descripcion, endpoint }) => <Route key={ruta} path={ruta} element={<PaginaPendiente titulo={titulo} descripcion={descripcion} endpoint={endpoint} />} />)}
        <Route path="/repartidor/despachos/:id/*" element={<PaginaPendiente titulo="Detalle del despacho" descripcion="Entrega, fallo y evidencia" endpoint="GET /api/v1/repartidor/despachos/{id}" />} />
        <Route path="*" element={<PaginaPendiente titulo="Página no encontrada" descripcion="La ruta solicitada no existe." endpoint="—" />} />
      </Routes>
    </AppShell.Main>
    <AppShell.Footer>
      <Group h="100%" justify="space-around" wrap="nowrap">
        {secciones.map(({ ruta, titulo, Icono }) => <NavLink key={ruta} component={Link} to={ruta} label={titulo} leftSection={<Icono size={20} />} active={ubicacion.pathname === ruta} styles={{ root: { width: 'auto', minHeight: 48 } }} />)}
      </Group>
    </AppShell.Footer>
  </AppShell>;
}
