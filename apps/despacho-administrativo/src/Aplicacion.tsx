import { lazy, Suspense } from 'react';
import { Alert, Anchor, Box, Loader, Stack, Text, Title } from '@mantine/core';
import { IconMapPin, IconCalendar, IconAlertTriangle, IconTruck, IconUsers } from '@tabler/icons-react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ShellAdministrativo } from '@despacho/componentes-compartidos';
import { PaginaEntregasFallidas } from './features/entregas-fallidas/PaginaEntregasFallidas';
import { PaginaDetalleIncidencia } from './features/entregas-fallidas/PaginaDetalleIncidencia';
import { PaginaZonas } from './features/zonas/PaginaZonas';
import { FormularioZona } from './features/zonas/FormularioZona';
import { PanelTarifa } from './features/zonas/PanelTarifa';
import { useSesion } from './sesion/SesionProveedor';
import { PaginaRepartidores } from './features/flota/PaginaRepartidores';
import { PaginaFurgonetas } from './features/flota/PaginaFurgonetas';
import { PaginaJornadas } from './features/jornadas/PaginaJornadas';

const ProbadorF01 = import.meta.env.DEV ? lazy(() => import('./features/zonas/desarrollo/ProbadorF01')) : null;

const secciones = [
  { ruta: '/jornadas', titulo: 'Jornadas y monitoreo', descripcion: 'Disponibilidad y capacidad diaria · F-06', endpoint: 'GET /api/v1/flota/monitoreo', Icono: IconCalendar },
  { ruta: '/programacion', titulo: 'Programación', descripcion: 'Cola de despachos y asignación · F-02', endpoint: 'GET /api/v1/despachos/pendientes', Icono: IconCalendar },
  { ruta: '/entregas-fallidas', titulo: 'Entregas fallidas', descripcion: 'Incidencias y reprogramación · F-04', endpoint: 'GET /api/v1/despachos/fallidos', Icono: IconAlertTriangle },
  { ruta: '/repartidores', titulo: 'Repartidores', descripcion: 'Catálogo de repartidores · F-05', endpoint: 'GET /api/v1/repartidores', Icono: IconUsers },
  { ruta: '/furgonetas', titulo: 'Vehículos', descripcion: 'Catálogo de furgonetas · F-05', endpoint: 'GET /api/v1/furgonetas', Icono: IconTruck },
  { ruta: '/zonas', titulo: 'Zonas y tarifas', descripcion: 'Gestión de cobertura y tarifas · F-01', endpoint: 'GET /api/v1/zonas', Icono: IconMapPin },
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
  const sesion = useSesion();

  return <ShellAdministrativo destinos={secciones.map(({ ruta, titulo, Icono }) => ({ id: ruta, ruta, etiqueta: titulo, icono: <Icono size={20} aria-hidden="true" /> }))}
    usuario={{ nombre: 'Sesión provisional', etiquetaPerfil: 'Identidad no disponible' }} logoUrl="" rutaInicio="/"
    alCerrarSesion={() => { sesion.guardarToken(null); window.location.assign('/'); }}
    destinoActivo={secciones.find(({ ruta }) => ubicacion.pathname.startsWith(ruta))?.ruta ?? null} alNavegar={(_, ruta) => navegar(ruta)}>
      {import.meta.env.DEV && <Alert mb="lg" color="blue" title="Pruebas locales F-01">
        <Anchor component={Link} to="/desarrollo/f01">Preparar sesión y probar cobertura / cotización</Anchor>
      </Alert>}
      <Routes>
        {ProbadorF01 && <Route path="/desarrollo/f01" element={<Suspense fallback={<Loader />}><ProbadorF01 /></Suspense>} />}
        <Route path="/" element={<Navigate to="/zonas" replace />} />
        <Route path="/zonas" element={<PaginaZonas />} />
        <Route path="/zonas/nueva" element={<FormularioZona />} />
        <Route path="/zonas/:id/editar" element={<FormularioZona />} />
        <Route path="/zonas/:id/tarifas" element={<><PaginaZonas /><PanelTarifa /></>} />
        <Route path="/entregas-fallidas" element={<PaginaEntregasFallidas alVerDetalle={(entrega, consulta) => {
          const parametros = new URLSearchParams({ origen: consulta, incidencia: entrega.idIncidencia });
          navegar(`/entregas-fallidas/${encodeURIComponent(entrega.idDespacho)}?${parametros}`);
        }} />} />
        <Route path="/entregas-fallidas/:idDespacho" element={<PaginaDetalleIncidencia />} />
        <Route path="/repartidores" element={<PaginaRepartidores />} />
        <Route path="/furgonetas" element={<PaginaFurgonetas />} />
        <Route path="/jornadas" element={<PaginaJornadas />} />
        <Route path="/monitoreo" element={<Navigate to="/jornadas" replace />} />
        <Route path="/flota/*" element={<Navigate to="/repartidores" replace />} />
        {secciones.filter(({ ruta }) => ruta === '/programacion').map(({ ruta, titulo, descripcion, endpoint }) => <Route key={ruta} path={`${ruta}/*`} element={<PaginaPendiente titulo={titulo} descripcion={descripcion} endpoint={endpoint} />} />)}
        <Route path="*" element={<PaginaPendiente titulo="Página no encontrada" descripcion="La ruta solicitada no existe." endpoint="—" />} />
      </Routes>
  </ShellAdministrativo>;
}
