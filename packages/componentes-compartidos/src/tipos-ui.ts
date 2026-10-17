/** Modelos de presentación de ECR-01 §1.3; no representan respuestas HTTP. */
export type EstadoConsulta =
  | 'carga'
  | 'datos'
  | 'vacio'
  | 'sinResultados'
  | 'error'
  | 'sinPermiso'
  | 'noEncontrado';

export type AccionUi = {
  id: string;
  etiqueta: string;
  disabled?: boolean;
  loading?: boolean;
  motivoDeshabilitado?: string;
};

export type DestinoUi = { id: string; etiqueta: string; ruta: string };
export type FiltroActivoUi = { id: string; etiqueta: string };
export type OrdenUi = { columna: string; direccion: 'asc' | 'desc' } | null;
export type PaginacionUi = { pagina: number; tamanioPagina: number; total: number };
