export type EstadoZona = 'ACTIVO' | 'INACTIVO';

export type OrigenDelimitacion = 'DISTRITOS' | 'DIBUJO';

export type Distrito = {
  id: string;
  nombre: string;
  codigosPostales: string[];
};

export type DistritoCatalogo = {
  id: string;
  nombre: string;
  provincia: string;
  departamento: string;
  ubigeo: string;
};

export type Tarifa = {
  tarifaBase: number;
  pesoIncluidoKg: number;
  recargoKgAdicional: number;
  factorVolumetrico: number | null;
  moneda: string;
  plazoEstimadoDiasHabiles: number;
  actualizadoEn: string;
};

export type Zona = {
  id: string;
  nombre: string;
  estado: EstadoZona;
  origenDelimitacion: OrigenDelimitacion;
  distritos: Distrito[];
  tarifaVigente: Tarifa | null;
  creadoEn: string;
  actualizadoEn: string;
};

export type PaginaZonas = {
  contenido: Zona[];
  pagina: number;
  tamanoPagina: number;
  totalElementos: number;
  totalPaginas: number;
};

export type SolicitudZona = {
  nombre: string;
  estado: EstadoZona;
  distritos: { distrito: string; codigosPostales: string[] }[];
};

export type SolicitudTarifa = {
  tarifaBase: number;
  pesoIncluidoKg: number;
  recargoKgAdicional: number;
  factorVolumetrico: number | null;
  moneda: string;
  plazoEstimadoDiasHabiles: number;
};

export type ErrorCampo = {
  campo: string;
  motivo: string;
};

/** Problem Detail (RFC 7807) que emite servicio-gestion-despachos. */
export type ProblemaZona = {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code?: string;
  errores?: ErrorCampo[];
};

export type FiltrosZonas = {
  nombre: string;
  distrito: string;
  estado: EstadoZona | 'TODOS';
};

export type EstadoConsulta = 'cargando' | 'actualizando' | 'datos' | 'error' | 'sinPermiso';
