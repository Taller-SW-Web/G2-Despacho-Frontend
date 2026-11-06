import { Navigate, useLocation } from 'react-router-dom';
import { FormularioAcceso } from '@despacho/componentes-compartidos';
import { SEGURIDAD_LOCAL, useSesion } from '../sesion/SesionProveedor';
import { MODO_DEMO } from '../config';

export function PaginaAcceso() {
  const { sesion, gestor } = useSesion();
  const desde = (useLocation().state as { desde?: string } | null)?.desde;
  const destino = desde?.startsWith('/repartidor/') && !desde.startsWith('/repartidor/acceso') ? desde : '/repartidor/ruta';
  const estado = gestor.leer();
  if (sesion) return <Navigate to={destino} replace />;
  return <FormularioAcceso titulo="Despacho" subtitulo={MODO_DEMO ? 'Demostración · Clave: Ruta2026!' : 'Aplicación del repartidor'} local={SEGURIDAD_LOCAL}
    desafio={estado.desafio} aviso={estado.aviso} alIngresar={gestor.iniciar} alVerificar={gestor.verificar}
    alReenviar={gestor.solicitar} alCancelar={() => gestor.cancelarDesafio()} />;
}
