import { Navigate, useLocation } from 'react-router-dom';
import { FormularioAcceso } from '@despacho/componentes-compartidos';
import { SEGURIDAD_LOCAL, useSesion } from './SesionProveedor';

export function PaginaAcceso() {
  const { sesion, gestor, desafio, aviso } = useSesion();
  const desde = (useLocation().state as { desde?: string } | null)?.desde;
  const destino =
    desde?.startsWith('/') && !desde.startsWith('//') && !desde.startsWith('/acceso')
      ? desde
      : '/zonas';
  if (sesion) return <Navigate to={destino} replace />;
  return (
    <FormularioAcceso
      titulo="Despacho"
      subtitulo="Administración · Acceso del gestor"
      local={SEGURIDAD_LOCAL}
      desafio={desafio}
      aviso={aviso}
      alIngresar={gestor.iniciar}
      alVerificar={gestor.verificar}
      alReenviar={gestor.solicitar}
      alCancelar={() => gestor.cancelarDesafio()}
    />
  );
}
