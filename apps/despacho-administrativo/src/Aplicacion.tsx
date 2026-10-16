import { AppShell, Box, Burger, Group, NavLink, Stack, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconMapPin, IconCalendar, IconAlertTriangle, IconTruck, IconPackage } from '@tabler/icons-react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { PaginaZonas } from './features/zonas/PaginaZonas';
import { FormularioZona } from './features/zonas/FormularioZona';
import { PanelTarifa } from './features/zonas/PanelTarifa';

const secciones = [
  { ruta: '/zonas', titulo: 'Zonas y tarifas', descripcion: 'Gestión de cobertura y tarifas · F-01', endpoint: 'GET /api/v1/zonas', Icono: IconMapPin },
  { ruta: '/programacion', titulo: 'Programación', descripcion: 'Cola de despachos y asignación · F-02', endpoint: 'GET /api/v1/despachos/pendientes', Icono: IconCalendar },
  { ruta: '/entregas-fallidas', titulo: 'Entregas fallidas', descripcion: 'Incidencias y reprogramación · F-04', endpoint: 'GET /api/v1/despachos/fallidos', Icono: IconAlertTriangle },
  { ruta: '/flota', titulo: 'Flota', descripcion: 'Repartidores, vehículos y jornadas · F-05', endpoint: 'GET /api/v1/flota/monitoreo', Icono: IconTruck },
];

function PaginaPendiente({ titulo, descripcion, endpoint }: { titulo: string; descripcion: string; endpoint: string }) {
  return <Stack gap="md" maw={760}>
    <Text size="sm" c="dimmed">Módulo de Despacho</Text>
    <Title order={1}>{titulo}</Title>
    <Text size="lg">{descripcion}</Text>
    <Box p="lg" bg="white" style={{ borderRadius: 'var(--mantine-radius-md)' }}>
      <Text fw={600}>Pantalla lista para implementar</Text>
      <Text c="dimmed" size="sm">Contrato inicial: {endpoint}</Text>
    </Box>
  </Stack>;
}

export function Aplicacion() {
  const [abierto, { toggle, close }] = useDisclosure(false);
  const ubicacion = useLocation();

  return <AppShell header={{ height: 64 }} navbar={{ width: 252, breakpoint: 'sm', collapsed: { mobile: !abierto } }} padding="lg">
    <AppShell.Header>
      <Group h="100%" px="lg" bg="ink.9" c="white">
        <Burger opened={abierto} onClick={toggle} hiddenFrom="sm" size="sm" color="white" aria-label="Abrir menú" />
        <IconPackage size={26} aria-hidden="true" />
        <Text fw={700}>DESPACHO · ADMINISTRACIÓN</Text>
      </Group>
    </AppShell.Header>
    <AppShell.Navbar p="md">
      <Stack gap="xs">
        {secciones.map(({ ruta, titulo, Icono }) => <NavLink key={ruta} component={Link} to={ruta} label={titulo} leftSection={<Icono size={20} />} active={ubicacion.pathname.startsWith(ruta)} onClick={close} />)}
      </Stack>
    </AppShell.Navbar>
    <AppShell.Main>
      <Routes>
        <Route path="/" element={<Navigate to="/zonas" replace />} />
        <Route path="/zonas" element={<PaginaZonas />} />
        <Route path="/zonas/nueva" element={<FormularioZona />} />
        <Route path="/zonas/:id/editar" element={<FormularioZona />} />
        <Route path="/zonas/:id/tarifas" element={<PanelTarifa />} />
        {secciones.filter(({ ruta }) => ruta !== '/zonas').map(({ ruta, titulo, descripcion, endpoint }) => <Route key={ruta} path={`${ruta}/*`} element={<PaginaPendiente titulo={titulo} descripcion={descripcion} endpoint={endpoint} />} />)}
        <Route path="*" element={<PaginaPendiente titulo="Página no encontrada" descripcion="La ruta solicitada no existe." endpoint="—" />} />
      </Routes>
    </AppShell.Main>
  </AppShell>;
}
