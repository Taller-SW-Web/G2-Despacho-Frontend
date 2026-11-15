import { Component, lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { Alert, Skeleton } from '@mantine/core';
import type { CapaDistritos, EntidadDistrito } from './tipos';

export type PropiedadesMapa = {
  capa: CapaDistritos;
  seleccionados?: string[];
  centrado?: string;
  conflictos?: string[];
  postales?: string[];
  alSeleccionar?: (entidad: EntidadDistrito) => void;
  etiqueta?: string;
};
const Mapa = lazy(() => import('./MapaGeografico'));
class LimiteMapa extends Component<{ children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false };
  static getDerivedStateFromError() {
    return { fallo: true };
  }
  render() {
    return this.state.fallo ? (
      <Alert title="Mapa no disponible">
        Continúa mediante el selector o la lista de distritos.
      </Alert>
    ) : (
      this.props.children
    );
  }
}
export function MapaDiferido(propiedades: PropiedadesMapa) {
  return (
    <LimiteMapa>
      <Suspense fallback={<Skeleton height={400} aria-label="Cargando biblioteca del mapa" />}>
        <Mapa {...propiedades} />
      </Suspense>
    </LimiteMapa>
  );
}
