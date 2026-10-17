import { BadgeEstado } from '@despacho/componentes-compartidos';
import type { EstadoZona } from './tipos';

/** Atajo de F-01 sobre CR-09: la etiqueta, el icono y el color salen de la configuración central. */
export function BadgeEstadoZona({ estado }: { estado: EstadoZona }) {
  return <BadgeEstado contexto="zona" valor={estado} />;
}
