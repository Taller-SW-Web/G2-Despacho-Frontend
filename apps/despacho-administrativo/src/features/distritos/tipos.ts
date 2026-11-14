import type { DistritoCatalogo, EstadoZona } from '../zonas/tipos';

export type EstadoDistrito = EstadoZona;
export type DistritoAdministrable = DistritoCatalogo & {
  estado: EstadoDistrito;
  versionDistrito: number;
  catalogoBase: boolean;
  identidadEditable: boolean;
  creadoEn: string;
  actualizadoEn: string;
};

export type DatosDistrito = Pick<
  DistritoAdministrable,
  'nombre' | 'provincia' | 'departamento' | 'ubigeo'
>;
