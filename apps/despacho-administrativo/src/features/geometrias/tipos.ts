import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';

export type PropiedadesDistrito = {
  nombreArchivo?: string | null;
  id: string;
  nombre: string;
  provincia: string;
  departamento: string;
  ubigeo: string;
  estado: 'ACTIVO' | 'INACTIVO';
  versionGeometria: number;
  fuente: string | null;
  versionFuente: string | null;
  importadoEn: string | null;
  importadoPor: string | null;
  huella: string | null;
  importacionId: string | null;
  soloCodigosPostales?: boolean;
  zonas: {
    id: string;
    nombre: string;
    estado: 'ACTIVO' | 'INACTIVO';
    soloCodigosPostales: boolean;
  }[];
};
export type EntidadDistrito = Feature<Polygon | MultiPolygon | null, PropiedadesDistrito>;
export type CapaDistritos = FeatureCollection<
  Polygon | MultiPolygon | null,
  PropiedadesDistrito
> & {
  zona?: { id: string; nombre: string; estado: 'ACTIVO' | 'INACTIVO' };
};
export type Correspondencia = { indice: number; ubigeo: string };
export type InformeGeografico = {
  nombreArchivo?: string | null;
  valida: boolean;
  validacionId: string | null;
  expiraEn: string | null;
  fuente: string;
  versionFuente: string;
  entidades: number;
  posiciones: number;
  errores: { campo: string; motivo: string }[];
  sugerencias: { indice: number; nombre: string; ubigeo: string }[];
  distritos: (PropiedadesDistrito & { accion: 'PRIMERA_CARGA' | 'REEMPLAZO' })[];
  actuales: CapaDistritos;
  propuesta: CapaDistritos;
};
export type ResultadoImportacion = {
  nombreArchivo?: string | null;
  importacionId: string;
  validacionId: string;
  importadoEn: string;
  importadoPor: string;
  fuente: string;
  versionFuente: string;
  distritos: { id: string; ubigeo: string; versionGeometria: number }[];
};
