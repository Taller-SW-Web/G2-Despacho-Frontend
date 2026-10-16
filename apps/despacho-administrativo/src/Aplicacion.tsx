import { Box, Stack, Text, Title } from '@mantine/core';
import { IconMapPin, IconCalendar, IconAlertTriangle, IconTruck } from '@tabler/icons-react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ShellAdministrativo } from '@despacho/componentes-compartidos';
import { PaginaEntregasFallidas } from './features/entregas-fallidas/PaginaEntregasFallidas';
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
  const ubicacion = useLocation();
  const navegar = useNavigate();

  return <ShellAdministrativo destinos={secciones.map(({ ruta, titulo, Icono }) => ({ id: ruta, ruta, etiqueta: titulo, icono: <Icono size={20} aria-hidden="true" /> }))}
    destinoActivo={secciones.find(({ ruta }) => ubicacion.pathname.startsWith(ruta))?.ruta ?? null} alNavegar={(_, ruta) => navegar(ruta)}>
      <Routes>
        <Route path="/" element={<Navigate to="/zonas" replace />} />
        <Route path="/zonas" element={<PaginaZonas />} />
        <Route path="/zonas/nueva" element={<FormularioZona />} />
        <Route path="/zonas/:id/editar" element={<FormularioZona />} />
        <Route path="/zonas/:id/tarifas" element={<PanelTarifa />} />
        <Route path="/entregas-fallidas" element={<PaginaEntregasFallidas />} />
        {secciones.filter(({ ruta }) => ruta !== '/zonas' && ruta !== '/entregas-fallidas').map(({ ruta, titulo, descripcion, endpoint }) => <Route key={ruta} path={`${ruta}/*`} element={<PaginaPendiente titulo={titulo} descripcion={descripcion} endpoint={endpoint} />} />)}
        <Route path="*" element={<PaginaPendiente titulo="Página no encontrada" descripcion="La ruta solicitada no existe." endpoint="—" />} />
      </Routes>
  </ShellAdministrativo>;
}
