import { z } from 'zod';

/** Hitos del ciclo vigente informados por Gestión: asignado < en camino < entregado o fallido. */
export const esquemaHitos = z.object({
  asignadoEn: z.string().nullish(),
  enCaminoEn: z.string().nullish(),
  entregadoEn: z.string().nullish(),
  fallidoEn: z.string().nullish(),
});

const camposComunes = {
  idDespacho: z.string().uuid(),
  codigoRastreoInterno: z.string(),
  estado: z.string(),
  secuenciaRuta: z.number().int().nullable(),
  fechaProgramada: z.string().nullable(),
  numeroIntentos: z.number().int().nonnegative(),
  maximoIntentos: z.number().int().positive().nullable(),
  motivoFallo: z.string().nullish(),
  hitos: esquemaHitos.nullish(),
};

export const esquemaDespachoRuta = z.object({
  ...camposComunes,
  // Contrato §3.1: datos personales solo en ASIGNADO y EN_CAMINO; en otros estados llegan en null.
  destinatario: z.string().nullable(),
  direccion: z.string().nullable(),
  distrito: z.string().nullable(),
});

export const esquemaRuta = z.object({
  idJornada: z.string().uuid().nullable(),
  fecha: z.string(),
  estadoOperativo: z.string(),
  despachos: z.array(esquemaDespachoRuta),
});

export const esquemaDetalle = z.object({
  ...camposComunes,
  idJornada: z.string().uuid(),
  destinatario: z.object({ nombre: z.string(), telefono: z.string() }).nullable(),
  destino: z.object({
    direccion: z.string(),
    referencia: z.string().nullable(),
    departamento: z.string().nullable(),
    provincia: z.string().nullable(),
    distrito: z.string(),
    codigoPostal: z.string().nullable(),
  }).passthrough().nullable(),
});

export const esquemaResumen = z.object({
  idJornada: z.string().uuid().nullable(),
  fecha: z.string(),
  estadoJornada: z.string().nullish(),
  cerradaEn: z.string().nullish(),
  asignados: z.number().int().nonnegative(),
  entregados: z.number().int().nonnegative(),
  fallidosConIntento: z.number().int().nonnegative(),
  noIntentados: z.number().int().nonnegative(),
  pendientes: z.number().int().nonnegative(),
  paquetesPorDevolver: z.array(z.object({
    idDespacho: z.string().uuid(),
    codigoRastreoInterno: z.string(),
    direccion: z.string().nullable(),
    distrito: z.string().nullable(),
    motivoFallo: z.string().nullable(),
  })).default([]),
});

export const esquemaMotivos = z.object({
  motivos: z.array(z.object({
    codigo: z.string(),
    etiqueta: z.string(),
    seleccionableEnCampo: z.boolean(),
    consumeIntento: z.boolean(),
    activo: z.boolean(),
  })),
});

export const esquemaAutorizacionCarga = z.object({
  idEvidencia: z.string().uuid(),
  urlCarga: z.string().url(),
  venceEn: z.string(),
});

export type Hitos = z.infer<typeof esquemaHitos>;
export type DespachoRuta = z.infer<typeof esquemaDespachoRuta>;
export type RutaRepartidor = z.infer<typeof esquemaRuta>;
export type DetalleDespacho = z.infer<typeof esquemaDetalle>;
export type ResumenJornada = z.infer<typeof esquemaResumen>;
export type MotivoFallo = z.infer<typeof esquemaMotivos>['motivos'][number];
export type TipoEvidencia = 'ENTREGA' | 'FALLO';

/** Puerto único de la app hacia Operación; la implementación HTTP y la de demostración lo cumplen igual. */
export interface PuertoOperacion {
  consultarRuta(signal?: AbortSignal): Promise<RutaRepartidor>;
  consultarDetalle(idDespacho: string, signal?: AbortSignal): Promise<DetalleDespacho>;
  consultarResumen(signal?: AbortSignal): Promise<ResumenJornada>;
  consultarMotivos(signal?: AbortSignal): Promise<MotivoFallo[]>;
  iniciarTraslado(idDespacho: string, clave: string): Promise<DetalleDespacho>;
  /** Autoriza y sube la foto al bucket privado; devuelve el identificador de evidencia. */
  subirEvidencia(idDespacho: string, tipo: TipoEvidencia, foto: File, alProgreso?: (porcentaje: number) => void): Promise<string>;
  registrarEntrega(idDespacho: string, clave: string, datos: { idEvidencia: string; recibidoPor: string | null }): Promise<DetalleDespacho>;
  registrarFallo(idDespacho: string, clave: string, datos: { motivo: string; idEvidencia: string; comentario: string | null }): Promise<DetalleDespacho>;
  cerrarJornada(idJornada: string, clave: string): Promise<void>;
}

export const estadosPendientes = ['ASIGNADO', 'EN_CAMINO'];
export const esPendiente = (estado: string) => estadosPendientes.includes(estado);
export const esNoIntentado = (estado: string, motivo?: string | null) =>
  estado === 'NO_INTENTADO' || (estado === 'FALLIDO' && motivo === 'NO_INTENTADO');
