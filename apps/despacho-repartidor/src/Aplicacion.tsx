import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { OperacionProveedor } from './api/ContextoOperacion';
import type { PuertoOperacion } from './api/tipos';
import { PaginaAcceso } from './paginas/PaginaAcceso';
import { PaginaCierre } from './paginas/PaginaCierre';
import { PaginaDetalle } from './paginas/PaginaDetalle';
import { PaginaEntrega } from './paginas/PaginaEntrega';
import { PaginaFallo } from './paginas/PaginaFallo';
import { PaginaFalloRegistrado } from './paginas/PaginaFalloRegistrado';
import { PaginaResumen } from './paginas/PaginaResumen';
import { PaginaRuta } from './paginas/PaginaRuta';
import { useSesion } from './sesion/SesionProveedor';

/** Sin sesión vigente se vuelve al acceso conservando la pantalla pedida. */
function ConSesion({ children }: { children: ReactNode }) {
  const { sesion } = useSesion();
  const ubicacion = useLocation();
  if (!sesion) return <Navigate to="/repartidor/acceso" replace state={{ desde: ubicacion.pathname }} />;
  return <>{children}</>;
}

export function Aplicacion({ puerto }: { puerto?: PuertoOperacion }) {
  const protegida = (pagina: ReactNode) => <ConSesion>{pagina}</ConSesion>;
  return (
    <OperacionProveedor puerto={puerto}>
      <Routes>
        <Route path="/" element={<Navigate to="/repartidor/ruta" replace />} />
        <Route path="/repartidor" element={<Navigate to="/repartidor/ruta" replace />} />
        <Route path="/repartidor/acceso" element={<PaginaAcceso />} />
        <Route path="/repartidor/ruta" element={protegida(<PaginaRuta />)} />
        <Route path="/repartidor/despachos/:id" element={protegida(<PaginaDetalle />)} />
        <Route path="/repartidor/despachos/:id/entrega" element={protegida(<PaginaEntrega />)} />
        <Route path="/repartidor/despachos/:id/fallo" element={protegida(<PaginaFallo />)} />
        <Route path="/repartidor/despachos/:id/fallo-registrado" element={protegida(<PaginaFalloRegistrado />)} />
        <Route path="/repartidor/resumen" element={protegida(<PaginaResumen />)} />
        <Route path="/repartidor/cierre" element={protegida(<PaginaCierre />)} />
        <Route path="*" element={<Navigate to="/repartidor/ruta" replace />} />
      </Routes>
    </OperacionProveedor>
  );
}
